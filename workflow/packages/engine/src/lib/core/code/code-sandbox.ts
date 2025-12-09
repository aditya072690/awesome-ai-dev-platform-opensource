import { assertNotNullOrUndefined, ExecutionMode } from 'workflow-shared'
import { CodeSandbox } from '../../core/code/code-sandbox-common'

const EXECUTION_MODE = (process.env.AP_EXECUTION_MODE as ExecutionMode) || ExecutionMode.SANDBOX_CODE_ONLY

const loadNoOpCodeSandbox = async (): Promise<CodeSandbox> => {
    const noOpCodeSandboxModule = await import('./no-op-code-sandbox')
    return noOpCodeSandboxModule.noOpCodeSandbox
}

const loadV8IsolateSandbox = async (): Promise<CodeSandbox> => {
    const v8IsolateCodeSandboxModule = await import('./v8-isolate-code-sandbox')
    return v8IsolateCodeSandboxModule.v8IsolateCodeSandbox
}

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

let instance: CodeSandbox | null = null

export const initCodeSandbox = async (): Promise<CodeSandbox> => {
    if (instance === null) {
        instance = await loadCodeSandbox()
    }

    return instance
}

