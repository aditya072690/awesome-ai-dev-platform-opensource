# Remaining 7 Medium-Severity Vulnerabilities

## Summary

These 7 medium-severity vulnerabilities were identified but **not yet fixed**. They are documented here for reference.

**Reward per vulnerability**: $200 cash + 500 tokens worth (if fixed with PR)

**Total potential reward**: $1,400 cash + 3,500 tokens worth

---

## 1. 🟡 Path Traversal in File Operations

### Description
File uploads may not properly validate file paths and names, potentially allowing path traversal attacks.

### Location
- **Files**: Multiple files handling file uploads
- **Pattern**: File operations without proper path sanitization

### Impact
- **CVSS Score**: 6.5 (Medium)
- **Severity**: Medium
- **Impact**: Unauthorized file access, potential for arbitrary file write/read

### Recommended Fix
```typescript
import path from 'path'

function sanitizeFileName(fileName: string): string {
    // Remove path traversal sequences
    let sanitized = fileName.replace(/\.\./g, '').replace(/[\/\\]/g, '_')
    
    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '')
    
    // Limit length
    sanitized = sanitized.substring(0, 255)
    
    // Validate it's a safe path
    const resolved = path.resolve('/safe/upload/dir', sanitized)
    if (!resolved.startsWith('/safe/upload/dir')) {
        throw new Error('Invalid file path')
    }
    
    return sanitized
}
```

### Files to Fix
- File upload handlers throughout the codebase
- Need to identify specific file upload endpoints

---

## 2. 🟡 Information Disclosure via Error Messages

### Description
Error messages may leak sensitive information about the system, including stack traces, file paths, and internal system details.

### Location
- **Files**: Error handling throughout the codebase
- **Pattern**: Detailed error messages exposed to users

### Impact
- **CVSS Score**: 5.3 (Medium)
- **Severity**: Medium
- **Impact**: Information disclosure, easier exploitation of other vulnerabilities

### Recommended Fix
1. Implement proper error handling that sanitizes error messages in production
2. Log detailed errors server-side only
3. Return generic error messages to clients

### Files to Fix
- Error handlers
- Exception handlers
- API response formatters

---

## 3. 🟡 Global API Key Grants Super User Access

### Description
A single global API key grants SUPER_USER access with full system privileges, creating a single point of failure.

### Location
- **File**: `workflow/packages/backend/api/src/app/core/security/authn/global-api-key-authn-handler.ts`
- **Lines**: 24-42

### Impact
- **CVSS Score**: 6.0 (Medium)
- **Severity**: Medium-High
- **Impact**: Complete system compromise if key is leaked, no granular access control

### Recommended Fix
1. Implement API key rotation
2. Add audit logging for super user actions
3. Consider per-service API keys instead of global key
4. Add rate limiting for super user operations
5. Implement key expiration

### Files to Fix
- `global-api-key-authn-handler.ts`

---

## 4. 🟡 Insecure Logging of Sensitive Data

### Description
Multiple `console.log()` statements throughout the codebase log sensitive information including principals, authentication data, and API keys.

### Location
- **Files**: Multiple files
- **Examples**:
  - `workflow/packages/backend/api/src/app/flows/flow/aixblock/aixblock.service.ts:22`
  - `workflow/packages/backend/api/src/app/ai/ai-provider-proxy.ts:22,28`
  - `workflow/packages/blocks/community/krisp-call/src/lib/actions/send-sms.ts:64`

### Impact
- **CVSS Score**: 5.3 (Medium)
- **Severity**: Medium
- **Impact**: Information disclosure, credential leakage, privacy violations, compliance violations

### Recommended Fix
1. Remove all `console.log()` statements that log sensitive data
2. Use structured logging with sanitization
3. Implement log filtering to redact sensitive fields
4. Use environment-based logging (only log in development)

### Files to Fix
- Multiple files with `console.log()` statements
- Need to search and replace throughout codebase

---

## 5. 🟡 Potential IDOR in File Access

### Description
The `getFile()` function only validates `projectId` and `fileId` but doesn't verify that the requesting user has access to that project.

### Location
- **File**: `workflow/packages/backend/api/src/app/file/file.service.ts`
- **Lines**: 74-80

### Impact
- **CVSS Score**: 6.5 (Medium)
- **Severity**: Medium
- **Impact**: Unauthorized file access, data leakage, privacy violations

### Recommended Fix
```typescript
async getFile({ 
    projectId, 
    fileId, 
    type,
    principal // Add principal parameter
}: GetOneParams & { principal: Principal }): Promise<File | null> {
    // Verify user has access to project
    if (principal.projectId !== projectId) {
        throw new AIxBlockError({
            code: ErrorCode.AUTHORIZATION,
            params: {
                message: 'Access denied to project',
            },
        })
    }

    // Additional: Verify user is project member
    const isMember = await projectMemberService.isMember({
        userId: principal.id,
        projectId,
    });
    
    if (!isMember) {
        throw new AIxBlockError({
            code: ErrorCode.AUTHORIZATION,
            params: {
                message: 'Not a project member',
            },
        })
    }

    const file = await fileRepo().findOneBy({
        projectId,
        id: fileId,
        type,
    })
    return file
}
```

### Files to Fix
- `file.service.ts`

---

## 6. 🟡 Weak Session ID Generation

### Description
MCP sessions use `apId()` for session IDs, but there's no validation that session IDs are cryptographically random or sufficiently long, potentially allowing session ID prediction or enumeration.

### Location
- **File**: `workflow/packages/backend/api/src/app/mcp/mcp-sse-controller.ts`
- **Related**: Session ID generation

### Impact
- **CVSS Score**: 5.3 (Medium)
- **Severity**: Medium
- **Impact**: Session enumeration, session fixation, unauthorized session access

### Recommended Fix
1. Use cryptographically secure random session IDs
2. Implement session expiration
3. Add rate limiting
4. Validate session ownership for all operations

### Files to Fix
- `mcp-sse-controller.ts`
- `mcp-session-manager.ts`

---

## 7. 🟡 Potential IDOR in App Connection Access

### Description
The `getOne()` method for app connections may not properly validate that the requesting user has access to all projects associated with the connection.

### Location
- **File**: `workflow/packages/backend/api/src/app/app-connection/app-connection-service/app-connection-service.ts`
- **Lines**: 81-86, 100+

### Impact
- **CVSS Score**: 6.5 (Medium)
- **Severity**: Medium
- **Impact**: Unauthorized access to app connection credentials from other projects

### Recommended Fix
```typescript
async getOne(params: GetOneParams): Promise<AppConnection | null> {
    const connection = await appConnectionsRepo().findOneBy({
        // ... existing query
    });
    
    if (!connection) {
        return null;
    }
    
    // Verify user has access to ALL projects in connection
    if (connection.projectIds && connection.projectIds.length > 0) {
        const hasAccessToAll = await Promise.all(
            connection.projectIds.map(projectId => 
                verifyProjectAccess(principal.id, projectId)
            )
        );
        
        if (!hasAccessToAll.every(hasAccess => hasAccess)) {
            throw new AIxBlockError({
                code: ErrorCode.AUTHORIZATION,
                params: {
                    message: 'Access denied to one or more projects',
                },
            });
        }
    }
    
    return decryptConnection(connection);
}
```

### Files to Fix
- `app-connection-service.ts`

---

## Summary Table

| # | Vulnerability | CVSS | Files to Fix | Complexity |
|---|--------------|------|--------------|------------|
| 1 | Path Traversal | 6.5 | Multiple upload handlers | Medium |
| 2 | Information Disclosure | 5.3 | Error handlers | Low |
| 3 | Global API Key | 6.0 | `global-api-key-authn-handler.ts` | Medium |
| 4 | Insecure Logging | 5.3 | Multiple files | Low-Medium |
| 5 | File IDOR | 6.5 | `file.service.ts` | Low |
| 6 | Weak Session ID | 5.3 | `mcp-sse-controller.ts` | Medium |
| 7 | App Connection IDOR | 6.5 | `app-connection-service.ts` | Low |

---

## Next Steps

### Option 1: Implement All Fixes
- Create branches for each fix
- Implement the fixes
- Create PRs
- Submit all 7 vulnerabilities

### Option 2: Prioritize High-Value Fixes
- Fix the easier ones first (Information Disclosure, Insecure Logging, File IDOR, App Connection IDOR)
- Then tackle the more complex ones

### Option 3: Submit What You Have
- Submit the 4 critical fixes you already have
- Optionally add these medium-severity fixes later

---

## Would You Like Me To:

1. **Implement fixes for all 7 medium-severity vulnerabilities?**
2. **Implement fixes for specific ones (which ones)?**
3. **Just document them for future reference?**

Let me know and I'll proceed!

