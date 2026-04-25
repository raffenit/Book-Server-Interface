---
description: Real-time validation checks during development
---

# Validation Checks

This workflow provides commands to validate code quality during development.

## Quick Syntax Check

Run TypeScript compiler to catch JSX and syntax errors:

```bash
cd /home/jewelshadow/Documents/Projects/Folio/folio-reader && npm run validate:types 2>&1 | head -20
```

## Build Test

Run full PWA build to catch runtime issues:

```bash
cd /home/jewelshadow/Documents/Projects/Folio/folio-reader && npm run build:pwa 2>&1 | head -30
```

## JSX Structure Check

Run custom JSX validation:

```bash
cd /home/jewelshadow/Documents/Projects/Folio/folio-reader && npm run validate:jsx
```

## When to Use

**After any JSX edit:**
1. Run `validate:types` first (fastest - catches 90% of issues)
2. If clean, run `build:pwa` (catches runtime JSX issues)

**After large refactoring:**
1. Run all three checks in sequence
2. Fix errors incrementally

## Common Error Patterns

| Error | Likely Cause | Fix |
|-------|--------------|-----|
| `Adjacent JSX elements` | Missing fragment wrapper | Wrap siblings in `<></>` |
| `No corresponding closing tag` | Orphaned closing tag | Find and remove or match with opener |
| `'}' expected` | Unclosed function/object | Add missing `}` |
| `Unexpected token` | Mismatched braces/parens | Check balance around reported line |

## Example Session

```bash
# Edit made to component
$ npm run validate:types
app/(tabs)/ebooks.tsx:950:9 - error TS1381: Unexpected token. Did you mean '{'}'}'?

# Fix the error...

$ npm run validate:types
✅ No errors found

$ npm run build:pwa
✅ Build successful
```
