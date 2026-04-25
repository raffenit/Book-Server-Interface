# Update Structure Documentation

This workflow ensures STRUCTURE.md stays in sync with code changes.

## When to Run

Run this workflow when:
- Adding new components or functions
- Moving code between files
- Renaming exports
- Significantly changing component props or behavior
- After refactoring large files

## Steps

1. **Identify structural changes**
   - List new exports added
   - List exports removed or renamed
   - Note line number shifts for major components

2. **Update STRUCTURE.md manually**
   - Add new components with line numbers
   - Update line numbers for existing components (if shifted significantly)
   - Document new props or features
   - Add TODOs for any hardcoded colors discovered

3. **Generate auto-structure for comparison**
   - Use the `generate-structure` tool (runs `npm run structure:generate`)
   - Or manually: `grep -rn "^export function\|^export const.*=.*(" app/ components/ hooks/ --include="*.tsx" --include="*.ts" | sort > STRUCTURE_AUTO.md`
   - Compare against STRUCTURE.md to catch anything missed

4. **Commit both files**
   - STRUCTURE.md (manual, detailed)
   - STRUCTURE_AUTO.md (auto-generated reference, optional)

## Checklist

- [ ] New components added to STRUCTURE.md?
- [ ] Component line numbers updated?
- [ ] Props documented?
- [ ] Theme colors used documented?
- [ ] Hardcoded colors noted with TODO?
- [ ] Auto-generated structure matches manual?
- [ ] No duplicates created? (see Duplicate Detection below)

## Duplicate Detection

When adding new components, always check for existing implementations:

1. **Run the `generate-structure` tool** to see all exports:
   - This creates STRUCTURE_AUTO.md for comparison
   - Or run manually: `npm run structure:generate`

2. **Search for similar names** in STRUCTURE.md:
   - Use: `grep -i "componentname" STRUCTURE.md`
   - Or for single files, use the `analyze-file-structure` tool

3. **Check for duplicates table** in STRUCTURE.md "Known Duplicates & Consolidation Opportunities" section

4. **Common duplicate patterns to watch for:**
   - Filter/Chip components (often exist in FilterComponents.tsx)
   - Card components (check if a variant already exists)
   - Utility functions (formatDuration, useGridColumns, etc.)
   - Modal styles (use `makeStyles()` from modalStyles.ts)

5. **Use `analyze-file-structure` tool on conflicting files**
   - See exactly what's exported from each file
   - Compare implementations to decide on consolidation strategy

6. **If duplicate found:**
   - Use the existing component if it fits your needs
   - Or consolidate: update existing component to support both use cases
   - Update imports in all files using the old location
   - Remove the duplicate
   - Update STRUCTURE.md to reflect consolidation

## Example Entry Format

```markdown
### components/NewComponent.tsx
- `NewComponent` (line ~15): Brief description
  - Props: prop1, prop2, optionalProp?
  - Features: key functionality
  - **Theme Colors Used:** colors.surface, colors.accent
  - **TODO:** Any hardcoded colors or future work
```
