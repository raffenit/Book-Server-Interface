---
description: Safe editing strategy for large/complex files (500+ lines or deep nesting)
---

# Large File Editing Protocol

Applies to files >500 lines or with complex nested JSX/conditionals.

## Pre-Edit Analysis (REQUIRED)

1. **Analyze file structure first**
   - Run `analyze-file-structure` tool on the target file
   - Note all exported components, functions, and their line numbers
   - Check `STRUCTURE.md` for component documentation
   - Look for similar patterns in `STRUCTURE_AUTO.md` (run `generate-structure` if needed)

2. **Read the full file content**
   - Use `read_file` with offset/limit to view entire file in chunks
   - Identify all major sections and boundaries
   - Map conditional rendering chains (error ? loading ? data ?)
   - Note JSX nesting depth

3. **Identify edit boundaries**
   - Never cross JSX tag boundaries in a single edit
   - Never cross ternary/conditional boundaries
   - Keep edits within single function/component blocks

4. **Check for dependencies**
   - Will this edit affect imports?
   - Will it affect the styles object?
   - Are there multiple similar patterns that might conflict?

## Edit Strategy

### Option A: Surgical Single Edits (Preferred)
- Make ONE change at a time
- Verify with read_file before next edit
- Accept that this is slower but safer

### Option B: Extract Then Edit (For repetitive changes)
- If fixing colors across multiple components:
  1. Extract sub-component to separate file first
  2. Edit the smaller extracted file
  3. Update imports

### Option C: Pattern-Based Batch (Only if safe)
- Use `multi_edit` ONLY when:
  - All edits are in separate, non-overlapping blocks
  - No edit crosses a JSX boundary
  - No edit affects conditional chains
  - Can verify each old_string is unique

## Verification Steps (REQUIRED)

After ANY edit to large files:

1. Read the edited section + 10 lines before/after
2. Check that JSX tags are balanced
3. Verify imports are still valid
4. Confirm no orphaned code fragments
5. **Run `analyze-file-structure` on the file**
   - Ensure exports are still present and line numbers make sense
   - Check that no functions were accidentally removed
   - Verify new exports appear correctly

## Red Flags - STOP and Reassess

- Edit string appears in multiple places (non-unique)
- Edit crosses `{` or `(` or `<` boundaries
- Previous edit caused lint errors
- File has >3 levels of nested conditionals
- JSX ternary chains (a ? b : c ? d : e)

## Workflow Decision Tree

```
File >500 lines OR complex nesting?
├── Yes → Read full structure first
│         └── How many changes needed?
│               ├── 1-2 changes → Surgical single edits
│               ├── 3-5 similar changes → Extract component
│               └── Many scattered changes → Stop, ask user
└── No → Normal editing allowed
```

## Post-Edit Rule

Always verify build succeeds before declaring task complete:
- Check for syntax errors
- Ensure imports resolve
- Verify no TypeScript errors
