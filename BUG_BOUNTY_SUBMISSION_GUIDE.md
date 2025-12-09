# Bug Bounty Submission Guide

## Summary

I've identified **17 security vulnerabilities** in the AIxBlock platform:

- **4 Critical** vulnerabilities (RCE, SSRF, TLS)
- **6 High** vulnerabilities (Authorization bypasses, CORS, Webhooks, OAuth, Sessions, Encryption)
- **7 Medium** vulnerabilities (Path traversal, Info disclosure, Logging, IDOR, Session management, API Keys)

**Total Estimated Reward**: $6,900 cash + 15,000 tokens worth

**Note**: This guide was initially created for 5 vulnerabilities but the process is the same for all 17. See `COMPLETE_VULNERABILITY_REPORT.md` for the full list.

---

## Files Created

### Documentation
1. **`COMPLETE_VULNERABILITY_REPORT.md`** - Master summary of all 17 vulnerabilities
2. **`SECURITY_FINDINGS.md`** - Initial 5 vulnerabilities
3. **`ADDITIONAL_VULNERABILITIES.md`** - 5 additional vulnerabilities
4. **`MORE_VULNERABILITIES.md`** - 5 more vulnerabilities
5. **`FINAL_VULNERABILITIES.md`** - 2 final vulnerabilities
6. **`README_SECURITY_FINDINGS.md`** - Comprehensive README
7. **`ISSUE_CRITICAL_RCE_NOOP_SANDBOX.md`** - GitHub issue template for Critical RCE #1
8. **`ISSUE_CRITICAL_FRONTEND_RCE.md`** - GitHub issue template for Critical RCE #2
9. **`BUG_BOUNTY_SUBMISSION_GUIDE.md`** - This file (submission instructions)
10. **`SUBMISSION_READINESS_CHECKLIST.md`** - Readiness verification checklist

### Fix Patches
1. **`FIX_noop_sandbox.patch`** - Fix for the no-op sandbox vulnerability
2. **`FIX_custom_property.patch`** - Fix for the frontend code execution vulnerability

---

## Next Steps

### 1. Fork and Clone the Repository

```bash
# Fork the repository on GitHub first, then:
git clone https://github.com/YOUR_USERNAME/aixblock-ai-dev-platform-public.git
cd aixblock-ai-dev-platform-public
```

### 2. Create Branches for Each Fix

**⚠️ Note**: If patch files don't apply cleanly, use the complete fixed files or manual instructions (see `PATCH_APPLICATION_GUIDE.md`).

```bash
# For Critical RCE #1 (No-Op Sandbox)
git checkout -b bugfix/critical-rce-noop-sandbox

# Option A: Use complete fixed file (Recommended)
cp FIXED_code-sandbox.ts workflow/packages/engine/src/lib/core/code/code-sandbox.ts

# Option B: Try patch (may have issues)
# git apply FIX_noop_sandbox.patch

# Option C: Manual edit (see MANUAL_FIX_INSTRUCTIONS.md)

git add workflow/packages/engine/src/lib/core/code/code-sandbox.ts
git commit -m "fix: prevent RCE by forcing safe sandbox in production

- Force SANDBOX_CODE_ONLY mode in production
- Require explicit ALLOW_UNSANDBOXED flag for unsafe modes
- Add security warnings for unsafe execution modes

Fixes: [Issue #XXX]"
git push origin bugfix/critical-rce-noop-sandbox

# For Critical RCE #2 (Frontend Custom Property)
git checkout -b bugfix/critical-frontend-rce-custom-property

# Option A: Use complete fixed file (Recommended)
cp FIXED_custom-property.tsx workflow/packages/frontend/src/app/builder/piece-properties/custom-property.tsx

# Option B: Try patch (may have issues)
# git apply FIX_custom_property.patch

# Option C: Manual edit (see MANUAL_FIX_INSTRUCTIONS.md)

git add workflow/packages/frontend/src/app/builder/piece-properties/custom-property.tsx
git commit -m "fix: add input validation to prevent XSS/RCE in custom properties

- Add code validation to block dangerous patterns
- Add execution timeout to prevent infinite loops
- Improve error handling and user feedback

Fixes: [Issue #XXX]"
git push origin bugfix/critical-frontend-rce-custom-property
```

### 3. Create GitHub Issues

For each vulnerability:

1. Go to: https://github.com/AIxBlock-2023/aixblock-ai-dev-platform-public/issues
2. Click "New Issue"
3. Copy the content from the corresponding `ISSUE_CRITICAL_*.md` file
4. Fill in the template with:
   - Current date for discovery/report dates
   - Any additional context
   - Reference to your fix branch/PR

### 4. Create Pull Requests

For each fix branch:

1. Go to: https://github.com/AIxBlock-2023/aixblock-ai-dev-platform-public/pulls
2. Click "New Pull Request"
3. Select your fork and branch
4. Use this PR template:

```markdown
## Security Fix: [Vulnerability Name]

### Description
This PR fixes [brief description of vulnerability].

### Changes
- [List of changes]

### Security Impact
- **Severity**: Critical/High/Medium
- **CVSS Score**: X.X
- **Issue**: #[issue number]

### Testing
- [ ] Verified fix prevents exploitation
- [ ] Added/updated tests
- [ ] Tested in development environment

### References
- Related Issue: #[issue number]
- Bug Bounty Report: [Link to issue]
```

### 5. Submit All Issues and PRs

**Recommended Submission Order** (17 vulnerabilities total):

**Batch 1 - Critical (4 issues)** - Submit first:
1. **Critical RCE #1** (No-Op Sandbox) - Fix: `FIX_noop_sandbox.patch`
2. **Critical RCE #2** (Frontend) - Fix: `FIX_custom_property.patch`
3. **SSRF in HTTP Request** - See `ADDITIONAL_VULNERABILITIES.md`
4. **TLS Verification Disabled** - See `ADDITIONAL_VULNERABILITIES.md`

**Batch 2 - High (6 issues)** - Submit next:
5. Authorization Bypass - See `SECURITY_FINDINGS.md`
6. CORS Misconfiguration - See `ADDITIONAL_VULNERABILITIES.md`
7. Webhook Auth Bypass - See `ADDITIONAL_VULNERABILITIES.md`
8. OAuth Redirect Bypass - See `MORE_VULNERABILITIES.md`
9. MCP Session Hijacking - See `MORE_VULNERABILITIES.md`
10. Weak Encryption Key - See `FINAL_VULNERABILITIES.md`

**Batch 3 - Medium (7 issues)** - Submit last:
11-17. See all documentation files for details

---

## Vulnerability Details

### 🔴 Critical #1: RCE via No-Op Sandbox
- **File**: `workflow/packages/engine/src/lib/core/code/no-op-code-sandbox.ts`
- **Reward**: $750 + 1,500 tokens
- **Fix**: `FIX_noop_sandbox.patch`

### 🔴 Critical #2: Frontend RCE via Custom Properties
- **File**: `workflow/packages/frontend/src/app/builder/piece-properties/custom-property.tsx`
- **Reward**: $750 + 1,500 tokens
- **Fix**: `FIX_custom_property.patch`

### 🟠 High: Authorization Bypass
- **File**: `workflow/packages/backend/api/src/app/authentication/authorization.ts`
- **Reward**: $450 + 1,000 tokens
- **Fix**: See SECURITY_FINDINGS.md for recommended fix

### 🟡 Medium: Path Traversal
- **Files**: Multiple file upload handlers
- **Reward**: $200 + 500 tokens
- **Fix**: See SECURITY_FINDINGS.md for recommended fix

### 🟡 Medium: Information Disclosure
- **Files**: Error handling throughout
- **Reward**: $200 + 500 tokens
- **Fix**: See SECURITY_FINDINGS.md for recommended fix

---

## Tips for Maximum Reward

According to the bug bounty program:

1. **Submit working fixes** - You get 50% more reward if you provide a working patch
2. **Detailed PoCs** - Include step-by-step reproduction steps
3. **Clear impact assessment** - Explain the security consequences
4. **Professional communication** - Be clear and respectful

---

## Timeline Expectations

- **Acknowledgment**: Within 48 hours
- **Validation**: Within 7 business days
- **Reward Payment**: After validation and fix merge

---

## Important Notes

1. **Don't disclose publicly** until the fix is merged and approved
2. **Follow responsible disclosure** - Give them time to fix
3. **Keep your fork updated** - They may ask for changes
4. **Document everything** - Screenshots, videos, logs help

---

## Contact

If you have questions about the submission process:
- **Discord**: https://discord.gg/nePjg9g5v6
- **Email**: contact@aixblock.io (for critical post-closure findings)

---

## Good Luck! 🎯

You've found some serious vulnerabilities. Follow this guide, submit professionally, and you should receive your rewards!

