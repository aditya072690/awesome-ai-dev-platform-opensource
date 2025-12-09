# Manual Fix Instructions

If the patch files don't apply cleanly, use these manual instructions to implement the fixes.

---

## Fix #1: No-Op Sandbox RCE Prevention

### File: `workflow/packages/engine/src/lib/core/code/code-sandbox.ts`

### Current Code (Lines 4, 16-25):
```typescript
const EXECUTION_MODE = (process.env.AP_EXECUTION_MODE as ExecutionMode)

const loadCodeSandbox = async (): Promise<CodeSandbox> => {
    const loaders = {
        [ExecutionMode.UNSANDBOXED]: loadNoOpCodeSandbox,
        [ExecutionMode.SANDBOXED]: loadNoOpCodeSandbox,
        [ExecutionMode.SANDBOX_CODE_ONLY]: loadV8IsolateSandbox,
    }
    assertNotNullOrUndefined(EXECUTION_MODE, 'AP_EXECUTION_MODE')
    const loader = loaders[EXECUTION_MODE]
    return loader()
}
```

### Replace With:
```typescript
const EXECUTION_MODE = (process.env.AP_EXECUTION_MODE as ExecutionMode) || ExecutionMode.SANDBOX_CODE_ONLY

const loadCodeSandbox = async (): Promise<CodeSandbox> => {
    // SECURITY: Force safe sandbox in production
    if (process.env.NODE_ENV === 'production') {
        console.warn('[CodeSandbox] Production environment detected. Forcing SANDBOX_CODE_ONLY mode.')
        return loadV8IsolateSandbox()
    }

    // SECURITY: Only allow unsafe modes in development with explicit flag
    const allowUnsafe = process.env.ALLOW_UNSANDBOXED === 'true'
    if (!allowUnsafe && (EXECUTION_MODE === ExecutionMode.UNSANDBOXED || EXECUTION_MODE === ExecutionMode.SANDBOXED)) {
        console.warn(
            `[CodeSandbox] Unsafe execution mode (${EXECUTION_MODE}) detected but ALLOW_UNSANDBOXED is not set. ` +
            `Defaulting to SANDBOX_CODE_ONLY for security.`
        )
        return loadV8IsolateSandbox()
    }

    if (allowUnsafe) {
        console.warn(
            `[CodeSandbox] ⚠️  WARNING: Running in ${EXECUTION_MODE} mode with ALLOW_UNSANDBOXED=true. ` +
            `This is UNSAFE and should only be used in development!`
        )
    }

    const loaders: Record<ExecutionMode, () => Promise<CodeSandbox>> = {
        [ExecutionMode.UNSANDBOXED]: allowUnsafe ? loadNoOpCodeSandbox : loadV8IsolateSandbox,
        [ExecutionMode.SANDBOXED]: allowUnsafe ? loadNoOpCodeSandbox : loadV8IsolateSandbox,
        [ExecutionMode.SANDBOX_CODE_ONLY]: loadV8IsolateSandbox,
    }

    assertNotNullOrUndefined(EXECUTION_MODE, 'AP_EXECUTION_MODE')
    const loader = loaders[EXECUTION_MODE] || loadV8IsolateSandbox
    return loader()
}
```

---

## Fix #2: Frontend Custom Property RCE Prevention

### File: `workflow/packages/frontend/src/app/builder/piece-properties/custom-property.tsx`

### Current Code (Lines 24-54):
```typescript
useEffect(() => {
    if (alreadyRendered.current) return;
    alreadyRendered.current = true;
    try {
      // Create function that takes a params object
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

      // If the result is a Promise, handle it
      if (result instanceof Promise) {
        result.then(onChange).catch(console.error);
      } else {
        onChange(result);
      }
    } catch (error) {
      console.error('Error executing custom code:', error);
    }
  }, []);
```

### Add After Line 19 (after `const { project } = projectHooks.useCurrentProject();`):
```typescript
  // SECURITY: Validate code before execution
  const validateCode = (code: string): { valid: boolean; error?: string } => {
    if (!code || typeof code !== 'string') {
      return { valid: false, error: 'Code must be a non-empty string' };
    }

    // Block dangerous patterns that could lead to XSS, data exfiltration, or unauthorized access
    const dangerousPatterns = [
      { pattern: /require\s*\(/, name: 'require() statements' },
      { pattern: /import\s+/, name: 'import statements' },
      { pattern: /eval\s*\(/, name: 'eval() calls' },
      { pattern: /Function\s*\(/, name: 'Function() constructor' },
      { pattern: /fetch\s*\(/, name: 'fetch() calls' },
      { pattern: /XMLHttpRequest/, name: 'XMLHttpRequest' },
      { pattern: /\.cookie/, name: 'cookie access' },
      { pattern: /localStorage/, name: 'localStorage access' },
      { pattern: /sessionStorage/, name: 'sessionStorage access' },
      { pattern: /document\.(cookie|write|writeln)/, name: 'dangerous document operations' },
      { pattern: /window\.(location|open|postMessage)/, name: 'dangerous window operations' },
      { pattern: /<script/i, name: 'script tags' },
      { pattern: /on\w+\s*=/, name: 'event handlers' },
    ];

    for (const { pattern, name } of dangerousPatterns) {
      if (pattern.test(code)) {
        return { valid: false, error: `Code contains forbidden pattern: ${name}` };
      }
    }

    return { valid: true };
  };
```

### Add Import at Top (after line 1):
```typescript
import { showError } from '@/lib/utils';
```

### Replace useEffect (Lines 24-54) With:
```typescript
useEffect(() => {
    if (alreadyRendered.current) return;
    alreadyRendered.current = true;

    // Validate code before execution
    const validation = validateCode(code);
    if (!validation.valid) {
      console.error('[CustomProperty] Invalid code:', validation.error);
      showError(`Invalid custom property code: ${validation.error}`);
      // Use default value instead of executing malicious code
      onChange(value);
      return;
    }

    try {
      // SECURITY: Execute in try-catch with timeout to prevent infinite loops
      const executeWithTimeout = () => {
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Code execution timeout'));
          }, 5000); // 5 second timeout

          try {
            // Create function that takes a params object
            const fn = new Function(
              'params',
              `return (${code})(params);`
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

            clearTimeout(timeout);
            resolve(result);
          } catch (error) {
            clearTimeout(timeout);
            reject(error);
          }
        });
      };

      executeWithTimeout().then((result) => {
        // If the result is a Promise, handle it
        if (result instanceof Promise) {
          result.then(onChange).catch((error) => {
            console.error('Error in custom property promise:', error);
            showError('Error executing custom property code');
          });
        } else {
          onChange(result);
        }
      }).catch((error) => {
        console.error('Error executing custom code:', error);
        showError(`Error executing custom property: ${error.message}`);
        onChange(value); // Fallback to default value
      });
    } catch (error) {
      console.error('Error executing custom code:', error);
      showError('Error executing custom property code');
      onChange(value); // Fallback to default value
    }
  }, []);
```

---

## Alternative: Direct File Edit

If patches still don't work, you can:

1. Open the files directly
2. Make the changes manually using the code above
3. Test the changes
4. Commit and push

The manual instructions above show exactly what to change in each file.

