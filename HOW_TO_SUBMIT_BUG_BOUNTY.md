# 🐛 How to Submit Your Bug Bounty

## Step-by-Step Submission Guide

---

## 📋 Prerequisites

1. **GitHub Account**: Make sure you're logged into GitHub
2. **Fork**: You should have forked the repository: `AIxBlock-2023/aixblock-ai-dev-platform-public`
3. **Branches**: Your fixes should be pushed to your fork

---

## 🚀 Step 1: Create GitHub Issues

Go to the **upstream repository** (not your fork):
👉 https://github.com/AIxBlock-2023/aixblock-ai-dev-platform-public/issues

### For Each Vulnerability:

1. Click **"New Issue"**
2. Choose **"Bug Report"** or **"Security Vulnerability"** template (if available)
3. Fill in the details:

**Title Format:**
```
[CRITICAL/HIGH/MEDIUM] Brief Description of Vulnerability
```

**Example Titles:**
- `[CRITICAL] RCE via Unsafe Code Execution in No-Op Sandbox`
- `[CRITICAL] Client-Side RCE via Unsafe Function() in Custom Properties`
- `[CRITICAL] SSRF in HTTP Request Action`
- `[HIGH] TLS Certificate Verification Disabled`

**Issue Body Template:**
```markdown
## Vulnerability Description
[Describe the vulnerability]

## Location
- File: `path/to/file.ts`
- Lines: X-Y

## Impact
- CVSS Score: X.X
- Severity: Critical/High/Medium
- Impact: [What can an attacker do?]

## Proof of Concept
[Steps to reproduce]

## Recommended Fix
[Describe the fix or reference the PR]

## References
- Fix PR: #[PR number from your fork]
- Branch: `your-username:bugfix/branch-name`
```

4. Click **"Submit new issue"**
5. **Note the issue number** (e.g., #123)

---

## 🔀 Step 2: Create Pull Requests

Go to the **upstream repository**:
👉 https://github.com/AIxBlock-2023/aixblock-ai-dev-platform-public

### For Each Fix Branch:

1. Click **"Pull requests"** tab
2. Click **"New pull request"**
3. Click **"compare across forks"**
4. Set:
   - **Base repository**: `AIxBlock-2023/aixblock-ai-dev-platform-public`
   - **Base branch**: `main` (or their default branch)
   - **Head repository**: `aditya072690/awesome-ai-dev-platform-opensource`
   - **Compare branch**: `bugfix/critical-rce-noop-sandbox` (or your branch name)

5. Fill in PR details:

**Title:**
```
[CRITICAL] Fix: Prevent RCE via Unsafe Code Execution in No-Op Sandbox
```

**Description Template:**
```markdown
## Security Fix

This PR fixes a critical RCE vulnerability where user-provided code could execute with full Node.js process privileges.

### Changes
- Force `SANDBOX_CODE_ONLY` mode in production
- Require explicit `ALLOW_UNSANDBOXED` flag for unsafe modes
- Add security warnings for unsafe execution modes

### Security Impact
- **Severity**: Critical
- **CVSS Score**: 9.8
- **Issue**: #[issue number]

### Testing
- [x] Verified fix prevents exploitation
- [x] Code compiles successfully
- [x] Production mode forces safe sandbox

### References
- Related Issue: #[issue number]
- Branch: `aditya072690:bugfix/critical-rce-noop-sandbox`
```

6. Click **"Create pull request"**

---

## 📝 Step 3: Your Fix Branches

Based on your repository, you should have these branches:

### Critical Fixes:
1. **`bugfix/critical-rce-noop-sandbox`**
   - Fixes: RCE via No-Op Sandbox
   - File: `workflow/packages/engine/src/lib/core/code/code-sandbox.ts`

2. **`bugfix/critical-frontend-rce-custom-property`**
   - Fixes: Frontend RCE via Custom Properties
   - File: `workflow/packages/frontend/src/app/builder/piece-properties/custom-property.tsx`

3. **`bugfix/critical-ssrf-tls`**
   - Fixes: SSRF and TLS verification
   - Files: 
     - `workflow/packages/blocks/community/http/src/lib/actions/send-http-request-action.ts`
     - `workflow/packages/blocks/community/common/src/lib/http/axios/axios-http-client.ts`

### High Severity Fixes:
4. **`bugfix/high-security-fixes`** (if still valid)
   - Multiple high-severity fixes

---

## 🔗 Quick Links

### Your Repository:
- https://github.com/aditya072690/awesome-ai-dev-platform-opensource

### Upstream Repository (for issues/PRs):
- Issues: https://github.com/AIxBlock-2023/aixblock-ai-dev-platform-public/issues
- PRs: https://github.com/AIxBlock-2023/aixblock-ai-dev-platform-public/pulls
- Compare: https://github.com/AIxBlock-2023/aixblock-ai-dev-platform-public/compare

---

## 📋 Submission Checklist

### For Each Vulnerability:

- [ ] Create GitHub issue in upstream repo
- [ ] Note the issue number
- [ ] Create PR from your fork to upstream
- [ ] Link PR to the issue (use `Fixes #123` or `Related to #123`)
- [ ] Add clear description of the vulnerability
- [ ] Add clear description of the fix
- [ ] Include CVSS score and severity
- [ ] Test that your fix works
- [ ] Ensure code compiles without errors

### After Submission:

- [ ] Wait for maintainer response
- [ ] Respond to any questions or feedback
- [ ] Follow up if no response after 1-2 weeks
- [ ] Keep your branches updated if requested

---

## 💡 Tips

1. **One Issue Per Vulnerability**: Create separate issues for each vulnerability
2. **One PR Per Fix**: Create separate PRs for each fix (easier to review)
3. **Link Everything**: Always link PRs to issues using `Fixes #123` or `Related to #123`
4. **Be Clear**: Write clear, concise descriptions
5. **Be Professional**: Use professional language
6. **Be Patient**: Security reviews take time

---

## 📧 Contact

If you need to contact the maintainers:
- Check the repository's `SECURITY.md` or `CONTRIBUTING.md` for security contact info
- Use GitHub discussions if available
- Check if they have a security email in their profile

---

## ✅ Example Submission Flow

1. **Issue #1**: Create issue for "RCE via No-Op Sandbox" → Get issue #123
2. **PR #1**: Create PR from `bugfix/critical-rce-noop-sandbox` → Link to issue #123
3. **Issue #2**: Create issue for "Frontend RCE" → Get issue #124
4. **PR #2**: Create PR from `bugfix/critical-frontend-rce-custom-property` → Link to issue #124
5. **Issue #3**: Create issue for "SSRF" → Get issue #125
6. **PR #3**: Create PR from `bugfix/critical-ssrf-tls` → Link to issue #125

---

## 🎯 Quick Start Commands

```bash
# 1. Verify your branches are pushed
git push origin --all

# 2. Check your branches
git branch -a

# 3. View your commits
git log --oneline --all
```

---

## 🚨 Important Notes

1. **Don't disclose vulnerabilities publicly** until they're fixed or you have permission
2. **Follow responsible disclosure** - give them time to fix before public disclosure
3. **Check their bug bounty program** for specific submission requirements
4. **Keep your fixes clean** - no debug code, no unnecessary changes
5. **Test your fixes** before submitting

---

Good luck with your submission! 🎉

