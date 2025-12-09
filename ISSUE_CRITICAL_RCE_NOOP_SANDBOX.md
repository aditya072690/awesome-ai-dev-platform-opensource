---
name: Critical Security Vulnerability
about: CRITICAL: Remote Code Execution via Unsafe Code Execution in No-Op Sandbox
title: '[CRITICAL] RCE via Unsafe Code Execution in No-Op Sandbox'
labels: security, critical, bug
assignees: ''
---

## 🔴 CRITICAL: Remote Code Execution via Unsafe Code Execution in No-Op Sandbox

### Description
The workflow engine contains a critical vulnerability that allows remote code execution when the `AP_EXECUTION_MODE` environment variable is set to `UNSANDBOXED` or `SANDBOXED`. The `no-op-code-sandbox.ts` file uses the unsafe `Function()` constructor to execute user-provided JavaScript code without any sandboxing or isolation.

### Location
- **File**: `workflow/packages/engine/src/lib/core/code/no-op-code-sandbox.ts`
- **Lines**: 11-17
- **Function**: `runScript()`

### Vulnerability Details

The vulnerable code:
```typescript
async runScript({ script, scriptContext }) {
    const params = Object.keys(scriptContext)
    const args = Object.values(scriptContext)
    const body = `return (${script})`
    const fn = Function(...params, body)
    return fn(...args)
}
```

**Security Issues**:
1. Direct execution of user-provided JavaScript using `Function()` constructor
2. No sandboxing or isolation from the Node.js process
3. Full access to Node.js APIs including:
   - `require('child_process')` - Execute system commands
   - `require('fs')` - Read/write files
   - `process.env` - Access environment variables and secrets
   - `require('http')` / `require('https')` - Make network requests
   - All other Node.js built-in modules

### Impact Assessment

- **CVSS Score**: 9.8 (Critical)
- **Severity**: Critical
- **Attack Vector**: Network
- **Attack Complexity**: Low
- **Privileges Required**: None (if user can create workflows)
- **User Interaction**: None
- **Scope**: Changed (can affect other users' data)

**Potential Consequences**:
- Complete system compromise
- Data exfiltration (database, files, secrets)
- Lateral movement to other services
- Denial of service
- Unauthorized access to other users' workflows and data

### Proof of Concept

**Steps to Reproduce**:

1. Set environment variable:
   ```bash
   export AP_EXECUTION_MODE=UNSANDBOXED
   ```

2. Create a workflow that uses variable resolution with malicious code:
   ```
   Variable: {{require('child_process').execSync('cat /etc/passwd').toString()}}
   ```

3. Execute the workflow

4. The malicious code executes with full Node.js process privileges

**Alternative PoC** (if workflow variables are sanitized):
```javascript
// In a code action block
const { execSync } = require('child_process');
const result = execSync('id').toString();
return { output: result };
```

### Affected Components

- Workflow execution engine
- Variable resolution system (`props-resolver.ts`)
- Code sandbox initialization (`code-sandbox.ts`)

### Recommended Fix

**Option 1: Remove Unsafe Modes (Recommended)**
```typescript
// In code-sandbox.ts
const loadCodeSandbox = async (): Promise<CodeSandbox> => {
    // Force SANDBOX_CODE_ONLY in all environments
    if (process.env.NODE_ENV === 'production') {
        return loadV8IsolateSandbox()
    }
    
    // Only allow no-op in development with explicit flag
    if (process.env.ALLOW_UNSANDBOXED === 'true' && 
        process.env.NODE_ENV === 'development' &&
        EXECUTION_MODE === ExecutionMode.UNSANDBOXED) {
        console.warn('⚠️  WARNING: Running in UNSANDBOXED mode. This is unsafe!')
        return loadNoOpCodeSandbox()
    }
    
    // Default to safe sandbox
    return loadV8IsolateSandbox()
}
```

**Option 2: Add Runtime Validation**
```typescript
// In no-op-code-sandbox.ts
async runScript({ script, scriptContext }) {
    // Block dangerous patterns
    const dangerousPatterns = [
        /require\s*\(['"]child_process['"]/,
        /require\s*\(['"]fs['"]/,
        /process\.env/,
        /eval\s*\(/,
        /Function\s*\(/,
    ]
    
    if (dangerousPatterns.some(pattern => pattern.test(script))) {
        throw new Error('Script contains dangerous patterns and cannot be executed')
    }
    
    const params = Object.keys(scriptContext)
    const args = Object.values(scriptContext)
    const body = `return (${script})`
    const fn = Function(...params, body)
    return fn(...args)
}
```

**Option 3: Use V8 Isolates Always**
Remove the no-op sandbox entirely and always use V8 isolates, even in development.

### Additional Recommendations

1. **Immediate Action**: 
   - Verify production environments use `AP_EXECUTION_MODE=SANDBOX_CODE_ONLY`
   - Add monitoring/alerting for any attempts to use unsafe modes

2. **Configuration Validation**:
   - Add startup checks that warn/fail if unsafe modes are detected in production
   - Document the security implications of each execution mode

3. **Testing**:
   - Add security tests that verify unsafe code cannot execute
   - Test that V8 isolate sandbox properly isolates code execution

### References

- [OWASP Top 10 - A03:2021 Injection](https://owasp.org/Top10/A03_2021-Injection/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [V8 Isolate Documentation](https://github.com/laverdet/isolated-vm)

### Timeline

- **Discovery Date**: [Current Date]
- **Reported Date**: [Current Date]
- **Expected Fix**: Within 7 business days per bug bounty program

### Additional Notes

This vulnerability is particularly dangerous because:
1. It can be exploited by any user who can create workflows
2. The impact is system-wide, not limited to the attacker's data
3. It's difficult to detect exploitation without proper monitoring
4. The fix is straightforward but requires careful deployment

