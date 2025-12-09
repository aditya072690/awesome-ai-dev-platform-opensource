# Additional Security Vulnerabilities Found

## 🔴 CRITICAL: Server-Side Request Forgery (SSRF) in HTTP Request Action

### Description
The HTTP request action block allows users to make HTTP requests to any URL without validation, enabling SSRF attacks against internal services, cloud metadata endpoints, and other internal resources.

### Location
- **File**: `workflow/packages/blocks/community/http/src/lib/actions/send-http-request-action.ts`
- **Lines**: 150-217

### Vulnerability Details

The HTTP request action accepts any URL without validation:
```typescript
async run(context) {
    const { url, method, headers, queryParams, body } = context.propsValue;
    // No URL validation!
    const request: HttpRequest = {
        method,
        url,  // User-controlled URL
        headers: headers as HttpHeaders,
        queryParams: queryParams as QueryParams,
    };
    return await httpClient.sendRequest(request);
}
```

**Attack Scenarios**:
1. **Cloud Metadata Access**: `http://169.254.169.254/latest/meta-data/` (AWS, GCP, Azure)
2. **Internal Service Discovery**: `http://localhost:8080`, `http://127.0.0.1:3306`
3. **Internal Network Scanning**: `http://10.0.0.1`, `http://192.168.1.1`
4. **File Protocol**: `file:///etc/passwd` (if supported)
5. **Internal API Access**: Access to internal APIs without authentication

### Impact
- **CVSS Score**: 9.1 (Critical)
- **Severity**: Critical
- **Impact**: 
  - Access to cloud metadata (credentials, tokens)
  - Internal network reconnaissance
  - Bypass of network security controls
  - Access to internal services

### Proof of Concept

1. Create a workflow with HTTP request action
2. Set URL to: `http://169.254.169.254/latest/meta-data/iam/security-credentials/`
3. Execute workflow
4. Retrieve cloud instance credentials

### Recommended Fix

```typescript
// Add URL validation
function validateUrl(url: string): void {
    let parsedUrl: URL;
    try {
        parsedUrl = new URL(url);
    } catch {
        throw new Error('Invalid URL format');
    }

    // Block private IP ranges
    const privateIpPatterns = [
        /^127\./,           // 127.0.0.0/8
        /^10\./,            // 10.0.0.0/8
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./,  // 172.16.0.0/12
        /^192\.168\./,      // 192.168.0.0/16
        /^169\.254\./,      // Link-local
        /^::1$/,            // IPv6 localhost
        /^fc00:/,           // IPv6 private
        /^fe80:/,           // IPv6 link-local
    ];

    const hostname = parsedUrl.hostname;
    
    // Block localhost variations
    if (hostname === 'localhost' || hostname === '0.0.0.0') {
        throw new Error('Localhost URLs are not allowed');
    }

    // Block private IPs
    for (const pattern of privateIpPatterns) {
        if (pattern.test(hostname)) {
            throw new Error('Private IP addresses are not allowed');
        }
    }

    // Block file:// protocol
    if (parsedUrl.protocol === 'file:') {
        throw new Error('File protocol is not allowed');
    }

    // Only allow http/https
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Only HTTP and HTTPS protocols are allowed');
    }
}

// In the action
async run(context) {
    const { url } = context.propsValue;
    validateUrl(url);  // Add validation
    // ... rest of code
}
```

---

## 🔴 CRITICAL: TLS Certificate Verification Disabled

### Description
The HTTP client disables TLS certificate verification globally, making the application vulnerable to man-in-the-middle attacks.

### Location
- **File**: `workflow/packages/blocks/community/common/src/lib/http/axios/axios-http-client.ts`
- **Line**: 25

### Vulnerability Details

```typescript
async sendRequest<ResponseBody extends HttpMessageBody = any>(
    request: HttpRequest<HttpRequestBody>
): Promise<HttpResponse<ResponseBody>> {
    try {
        process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';  // ⚠️ CRITICAL
        // ... rest of code
    }
}
```

**Security Issues**:
1. Disables SSL/TLS certificate verification globally
2. Vulnerable to MITM attacks
3. Accepts self-signed certificates
4. No warning to users about insecure connections

### Impact
- **CVSS Score**: 7.4 (High)
- **Severity**: High (Critical in certain contexts)
- **Impact**: 
  - Man-in-the-middle attacks
  - Credential theft
  - Data interception
  - Compromised API communications

### Recommended Fix

```typescript
async sendRequest<ResponseBody extends HttpMessageBody = any>(
    request: HttpRequest<HttpRequestBody>
): Promise<HttpResponse<ResponseBody>> {
    try {
        // SECURITY: Never disable TLS verification
        // Only allow disabling in development with explicit flag
        if (process.env.NODE_ENV === 'development' && 
            process.env.ALLOW_INSECURE_TLS === 'true') {
            console.warn('⚠️  WARNING: TLS verification disabled. This is unsafe!');
            process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
        } else {
            // Ensure TLS verification is enabled
            process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '1';
        }
        
        // ... rest of code
    } finally {
        // Always restore secure defaults
        process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '1';
    }
}
```

---

## 🟠 HIGH: CORS Misconfiguration - Allows All Origins

### Description
The CORS configuration allows requests from any origin (`*`), which can lead to unauthorized cross-origin requests and potential data leakage.

### Location
- **File**: `workflow/packages/backend/api/src/app/server.ts`
- **Lines**: 77-81

### Vulnerability Details

```typescript
await app.register(cors, {
    origin: '*',              // ⚠️ Allows any origin
    exposedHeaders: ['*'],    // ⚠️ Exposes all headers
    methods: ['*'],           // ⚠️ Allows all methods
})
```

**Security Issues**:
1. Any website can make requests to the API
2. Credentials can be sent from untrusted origins
3. All headers are exposed to any origin
4. No origin validation

### Impact
- **CVSS Score**: 6.5 (Medium-High)
- **Severity**: High
- **Impact**:
  - Unauthorized API access from malicious websites
  - CSRF attacks
  - Data leakage through exposed headers
  - Credential theft

### Recommended Fix

```typescript
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
    'https://app.aixblock.io',
    'https://aixblock.io',
];

await app.register(cors, {
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) {
            return callback(null, true);
        }
        
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    exposedHeaders: ['Content-Type', 'Authorization'],  // Only expose necessary headers
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
})
```

---

## 🟠 HIGH: Webhook Authentication Bypass

### Description
Webhook endpoints have `skipAuth: true` and generic webhooks don't verify signatures, allowing unauthenticated users to trigger workflows.

### Location
- **File**: `workflow/packages/backend/api/src/app/webhooks/webhook-controller.ts`
- **Lines**: 109-114

### Vulnerability Details

```typescript
const WEBHOOK_PARAMS = {
    config: {
        allowedPrincipals: ALL_PRINCIPAL_TYPES,
        skipAuth: true,  // ⚠️ No authentication required
        rawBody: true,
    },
}
```

**Security Issues**:
1. No authentication required for webhook endpoints
2. Generic webhooks don't verify signatures
3. Anyone with the webhook URL can trigger workflows
4. Can lead to DoS attacks by spamming webhooks
5. Can trigger expensive operations

### Impact
- **CVSS Score**: 7.5 (High)
- **Severity**: High
- **Impact**:
  - Unauthorized workflow execution
  - Denial of service
  - Resource exhaustion
  - Unauthorized data access if workflows process sensitive data

### Recommended Fix

```typescript
// Add webhook signature verification
async function verifyWebhookSignature(
    request: FastifyRequest,
    flowId: string
): Promise<boolean> {
    const flow = await flowService().getOneById(flowId);
    if (!flow?.webhookSecret) {
        return false;  // Require secret for webhooks
    }

    const signature = request.headers['x-webhook-signature'] as string;
    if (!signature) {
        return false;
    }

    const payload = request.rawBody as string;
    const expectedSignature = crypto
        .createHmac('sha256', flow.webhookSecret)
        .update(payload)
        .digest('hex');

    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
    );
}

// In webhook handler
app.all('/:flowId', WEBHOOK_PARAMS, async (request, reply) => {
    const verified = await verifyWebhookSignature(request, request.params.flowId);
    if (!verified) {
        return reply.status(401).send({ error: 'Invalid webhook signature' });
    }
    // ... rest of handler
});
```

---

## 🟡 MEDIUM: Global API Key Grants Super User Access

### Description
A single global API key grants SUPER_USER access with full system privileges, creating a single point of failure.

### Location
- **File**: `workflow/packages/backend/api/src/app/core/security/authn/global-api-key-authn-handler.ts`
- **Lines**: 24-42

### Vulnerability Details

```typescript
protected doHandle(request: FastifyRequest): Promise<void> {
    const requestApiKey = request.headers[GlobalApiKeyAuthnHandler.HEADER_NAME]
    const keyNotMatching = requestApiKey !== GlobalApiKeyAuthnHandler.API_KEY

    if (keyNotMatching || isNil(GlobalApiKeyAuthnHandler.API_KEY)) {
        throw new AIxBlockError({
            code: ErrorCode.INVALID_API_KEY,
            params: {},
        })
    }

    request.principal = {
        id: `SUPER_USER_${apId()}`,
        type: PrincipalType.SUPER_USER,  // ⚠️ Full system access
        projectId: `SUPER_USER_${apId()}`,
        platform: {
            id: `SUPER_USER_${apId()}`,
        },
    }
}
```

**Security Issues**:
1. Single API key for all super user access
2. No key rotation mechanism visible
3. No audit logging of super user actions
4. Key stored in environment variable (may be logged/exposed)

### Impact
- **CVSS Score**: 6.0 (Medium)
- **Severity**: Medium-High
- **Impact**:
  - Complete system compromise if key is leaked
  - No granular access control
  - Difficult to revoke access

### Recommended Fix

1. Implement API key rotation
2. Add audit logging for super user actions
3. Consider per-service API keys instead of global key
4. Add rate limiting for super user operations
5. Implement key expiration

---

## Summary of Additional Vulnerabilities

| Severity | Count | Total Reward Estimate |
|----------|-------|----------------------|
| Critical | 2     | $1,500 + 3,000 tokens |
| High     | 2     | $900 + 2,000 tokens   |
| Medium   | 1     | $200 + 500 tokens     |
| **Total** | **5** | **$2,600 + 5,500 tokens** |

### Combined Total (All Findings)

| Severity | Count | Total Reward Estimate |
|----------|-------|----------------------|
| Critical | 4     | $3,000 + 6,000 tokens |
| High     | 3     | $1,350 + 3,000 tokens |
| Medium   | 3     | $600 + 1,500 tokens   |
| **Total** | **10** | **$4,950 + 10,500 tokens** |

**Note**: This exceeds the $10,000 cash pool mentioned in the bug bounty program, so rewards may be adjusted proportionally.

