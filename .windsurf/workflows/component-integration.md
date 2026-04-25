---
description: Validation workflow for component integration
---

# Component Integration Checklist

When adding, removing, or replacing components, verify the full data flow:

## 1. Data Layer (Backend/Fetching)

- [ ] **Data fetching functions exist**
  - Are there API calls to get the data this component needs?
  - Example: `kavitaAPI.getSeriesByGenre()`, `kavitaAPI.getLibraries()`

- [ ] **State management is set up**
  - `useState` for storing data
  - `useEffect` for triggering fetches
  - Dependencies properly declared in effect arrays

## 2. Component Interface (Props)

- [ ] **Props are properly typed**
  - Check the component's interface/propTypes
  - Ensure data types match between parent and child
  - Example: `string | number | null` vs `number | null`

- [ ] **Required callbacks are provided**
  - `onSelect`, `onContextMenu`, `onClearAll`, etc.
  - Verify callback signatures match
  - Wrap setters if type conversion needed: `(id) => setState(id === null ? null : Number(id))`

## 3. Component Instantiation (UI)

- [ ] **Component is actually rendered in JSX**
  - Import statement exists
  - Component tag is placed in the render tree
  - NOT just imported but forgotten (common bug!)

- [ ] **Component is in correct location**
  - Proper parent wrapper
  - Correct sibling order
  - Proper styling/container props

## 4. Integration Verification Commands

```bash
# Check if component is imported
grep -n "import.*ComponentName" file.tsx

# Check if component is used in JSX
grep -n "<ComponentName" file.tsx

# Verify data flow - find state declarations
grep -n "const \[data, setData\]" file.tsx

# Verify fetch calls exist
grep -n "await kavitaAPI" file.tsx
```

## 5. Example: Adding FilterSection

**Before:**
```tsx
import { FilterSection } from '../../components/FilterComponents';  // ✅ Imported

// ... later in JSX
<TabHeader ... />
<FlatList ... />  // ❌ FilterSection never rendered!
```

**After checklist applied:**
```tsx
import { FilterSection } from '../../components/FilterComponents';  // ✅ Imported

// ✅ State for data
const [genres, setGenres] = useState<Genre[]>([]);

// ✅ Fetch function exists
const fetchGenres = async () => {
  const data = await kavitaAPI.getGenres();
  setGenres(data);
};

// ✅ Effect triggers fetch
useEffect(() => { fetchGenres(); }, []);

// ... later in JSX
<TabHeader ... />
<FilterSection              // ✅ Actually rendered
  genres={genres}          // ✅ Data passed
  selectedGenreId={selectedGenreId}  // ✅ State passed
  onSelectGenre={setSelectedGenreId}   // ✅ Callback with correct type
/>
<FlatList ... />
```

## 6. Pre-Commit Verification

Before committing component changes:

```bash
# 1. Type check
npm run validate:types

# 2. Build check
npm run build:pwa

# 3. Manual UI verification
# - Open browser
# - Navigate to affected page
# - Verify component appears
# - Test interactions (clicks, filters, etc.)
```

## Common Integration Failures

| Issue | Symptom | Fix |
|-------|---------|-----|
| Imported but not rendered | Component missing from UI | Add `<Component ... />` to JSX |
| Type mismatch | TS error on prop | Convert types: `(id) => setState(Number(id))` |
| Missing data | Empty/no content | Add `useEffect` to fetch data |
| Wrong callback signature | Runtime error on click | Check component interface, wrap callback |
| Wrong prop name | TS error or silent failure | Verify exact prop names in component definition |

---

**Rule: Never assume import = usage. Always verify the component tag exists in the JSX tree.**
