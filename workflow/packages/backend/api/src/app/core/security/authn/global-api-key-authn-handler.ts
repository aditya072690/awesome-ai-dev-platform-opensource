import { FastifyRequest } from 'fastify'
import { AppSystemProp } from 'workflow-server-shared'
import {
    AIxBlockError,
    apId,
    ErrorCode,
    isNil,
    PrincipalType,
} from 'workflow-shared'
import { system } from '../../../helper/system/system'
import { BaseSecurityHandler } from '../security-handler'

export class GlobalApiKeyAuthnHandler extends BaseSecurityHandler {
    private static readonly HEADER_NAME = 'api-key'
    private static readonly API_KEY = system.get(AppSystemProp.API_KEY)

    protected canHandle(request: FastifyRequest): Promise<boolean> {
        const routeMatches =
            request.headers[GlobalApiKeyAuthnHandler.HEADER_NAME] !== undefined
        const skipAuth = request.routeConfig.skipAuth
        return Promise.resolve(routeMatches && !skipAuth)
    }

    protected async doHandle(request: FastifyRequest): Promise<void> {
        const requestApiKey = request.headers[GlobalApiKeyAuthnHandler.HEADER_NAME]
        const keyNotMatching = requestApiKey !== GlobalApiKeyAuthnHandler.API_KEY

        if (keyNotMatching || isNil(GlobalApiKeyAuthnHandler.API_KEY)) {
            request.log.warn({
                hasApiKey: !!requestApiKey,
                path: request.url,
                method: request.method,
            }, 'Invalid API key attempt')
            throw new AIxBlockError({
                code: ErrorCode.INVALID_API_KEY,
                params: {},
            })
        }

        const principalId = `SUPER_USER_${apId()}`
        request.principal = {
            id: principalId,
            type: PrincipalType.SUPER_USER,
            projectId: `SUPER_USER_${apId()}`,
            platform: {
                id: `SUPER_USER_${apId()}`,
            },
        }

        request.log.info({
            principalId,
            path: request.url,
            method: request.method,
        }, 'Super user access granted via global API key')

        return Promise.resolve()
    }
}
