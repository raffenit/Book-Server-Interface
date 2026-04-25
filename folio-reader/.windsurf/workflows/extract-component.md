# Extract Component Workflow

Move a component from a large file to its own file for reusability.

## When to Use

- Component is used in multiple places (or will be)
- Component is >100 lines and clutters the parent file
- Component needs to be shared between tabs/screens
- You want to standardize behavior across the app

## Steps

1. **Analyze the component**
   - Use `analyze-file-structure` on source file
   - Identify all dependencies (imports, hooks, types)
   - Check for hardcoded colors that need theme conversion
   - Note any helper functions used only by this component

2. **Create the new file**
   - Create `components/ComponentName.tsx`
   - Add standard imports (React, RN components, useTheme)
   - Copy the component code
   - Extract any shared types to appropriate location

3. **Update imports in new file**
   - Replace relative imports from parent (e.g., `../../contexts/`)
   - Ensure all hooks are imported
   - Add `useTheme()` if hardcoded colors need conversion

4. **Remove from original file**
   - Delete component definition
   - Delete any helper functions only used by it
   - Keep shared helpers (move to utils if needed)

5. **Add import to original file**
   - Add: `import { ComponentName } from '../../components/ComponentName'`
   - Verify usage still works

6. **Update STRUCTURE.md**
   - Add entry for new component
   - Document props and theme colors used
   - Run `generate-structure` to verify

## Common Pitfalls

- ❌ Forgetting to move helper functions/types
- ❌ Leaving hardcoded colors in extracted component
- ❌ Missing imports for hooks used by component
- ❌ Not updating file path in relative imports
- ✅ Check for duplicate definitions across files

## Example

```typescript
// Before (in audiobooks.tsx)
function ContinueListeningCard({ item, onPress }) {
  const { colors } = useTheme();
  // ... 80 lines
}

// After
// 1. Create components/ContinueListeningCard.tsx with full implementation
// 2. In audiobooks.tsx:
import { ContinueListeningCard } from '../../components/ContinueListeningCard';
```
