# Patch Application Guide

## ⚠️ Patch File Issues

The patch files may have formatting issues. Here are **3 ways** to apply the fixes:

---

## Method 1: Use Complete Fixed Files (Easiest)

### For Fix #1 (No-Op Sandbox):

```bash
# Copy the complete fixed file
cp FIXED_code-sandbox.ts workflow/packages/engine/src/lib/core/code/code-sandbox.ts

# Verify the changes
git diff workflow/packages/engine/src/lib/core/code/code-sandbox.ts

# Commit
git add workflow/packages/engine/src/lib/core/code/code-sandbox.ts
git commit -m "fix: prevent RCE by forcing safe sandbox in production"
```

### For Fix #2 (Custom Property):

```bash
# Copy the complete fixed file
cp FIXED_custom-property.tsx workflow/packages/frontend/src/app/builder/piece-properties/custom-property.tsx

# Verify the changes
git diff workflow/packages/frontend/src/app/builder/piece-properties/custom-property.tsx

# Commit
git add workflow/packages/frontend/src/app/builder/piece-properties/custom-property.tsx
git commit -m "fix: add input validation to prevent XSS/RCE in custom properties"
```

---

## Method 2: Manual Edit (Recommended)

Follow the detailed instructions in `MANUAL_FIX_INSTRUCTIONS.md` which shows:
- Exact lines to change
- Complete code blocks to replace
- Step-by-step instructions

---

## Method 3: Try Alternative Patch Format

If you want to try the patch again:

```bash
# For Fix #1
cd workflow/packages/engine/src/lib/core/code
patch -p3 < ../../../../../FIX_noop_sandbox_FIXED.patch

# For Fix #2
cd workflow/packages/frontend/src/app/builder/piece-properties
patch -p6 < ../../../../../../FIX_custom_property.patch
```

---

## Recommended Approach

**Use Method 1 (Complete Fixed Files)** - It's the simplest and most reliable:

1. Copy `FIXED_code-sandbox.ts` to replace the original
2. Copy `FIXED_custom-property.tsx` to replace the original
3. Verify with `git diff`
4. Commit and push

This ensures the fixes are applied correctly without patch format issues.

---

## Verification

After applying fixes, verify:

```bash
# Check Fix #1
grep -A 5 "SECURITY: Force safe sandbox" workflow/packages/engine/src/lib/core/code/code-sandbox.ts

# Check Fix #2
grep -A 5 "SECURITY: Validate code" workflow/packages/frontend/src/app/builder/piece-properties/custom-property.tsx
```

Both should show the security code if fixes are applied correctly.

