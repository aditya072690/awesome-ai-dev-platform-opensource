import { useEffect, useId, useRef } from 'react';

import { showError } from '@/lib/utils';
import { useEmbedding } from '@/components/embed-provider';
import { projectHooks } from '@/hooks/project-hooks';

const CUSTOM_PROPERTY_CONTAINER_ID = 'custom-property-container';

const CustomProperty = ({
  value,
  onChange,
  code,
  disabled,
}: {
  value: unknown;
  onChange: (value: unknown) => void;
  code: string;
  disabled: boolean;
}) => {
  const { project } = projectHooks.useCurrentProject();

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

  const { embedState } = useEmbedding();
  const alreadyRendered = useRef(false);
  const id = useId();
  const containerId = CUSTOM_PROPERTY_CONTAINER_ID + '-' + id;
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

  return <div id={containerId}></div>;
};

CustomProperty.displayName = 'CustomProperty';
export default CustomProperty;

