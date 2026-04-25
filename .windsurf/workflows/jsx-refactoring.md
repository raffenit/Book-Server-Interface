---
description: Safe JSX refactoring workflow with validation guardrails
tags: [jsx, refactoring, validation, react-native]
---

# JSX Refactoring Workflow

This workflow prevents syntax errors when refactoring React Native/JSX components, especially during large-scale structure changes.

## The Problem

Large JSX block replacements often break component hierarchy:
- Parent/child relationships get disrupted
- Closing tags become mismatched
- Sibling elements lose their container
- Fragments (`<>...</>`) are forgotten

## Pre-Refactoring Checklist

Before replacing any JSX structure, verify:

1. **Identify the container boundary**
   - What element wraps the block you're replacing?
   - Where does it start and end?
   - What siblings share the same parent?

2. **Map the JSX tree**
   ```
   Parent (View)
   ├── Sibling 1 (Text)
   ├── BLOCK_TO_REPLACE (View) ← Note this level
   │   ├── Child 1
   │   └── Child 2
   └── Sibling 2 (ActivityIndicator)
   ```

3. **Preserve fragment requirements**
   - If replacing a block that has siblings, the new block must return ONE element
   - Use `<></>` fragments when you need multiple elements at the same level

## Safe Replacement Rules

### Rule 1: Single Parent Constraint
Always ensure the replacement has exactly ONE root element:

```tsx
// ❌ BAD - Multiple roots
<FilterSection ... />
<ActivityIndicator ... />

// ✅ GOOD - Single root
<>
  <FilterSection ... />
  <ActivityIndicator ... />
</>
```

### Rule 2: Preserve Container Structure
Don't remove the container when replacing content:

```tsx
// ❌ BAD - Removing container
{recentSeries.length > 0 && (
  <View> {/* This View is the ListHeaderComponent root */}
    ...
  </View>  {/* Don't remove this! */}
  <ActivityIndicator />  {/* This is now outside! */}
)}

// ✅ GOOD - Keep container intact
{recentSeries.length > 0 && (
  <>
    <View> {/* Container preserved */}
      ...
    </View>
    <ActivityIndicator /> {/* Now properly inside fragment */}
  </>
)}
```

### Rule 3: Match Closing Tags
When removing a block, ensure you're not orphaning closing tags:

```tsx
// Original structure
<View>     ← Parent A
  <View>   ← Parent B
    ...    ← BLOCK_TO_REPLACE
  </View>  ← /Parent B
</View>    ← /Parent A

// ❌ BAD - Orphaned closing tags
<NewComponent />  ← Replaces block but loses Parent B
</View>         ← Orphan!
</View>         ← Orphan!

// ✅ GOOD - Replace entire subtree
<NewComponent />  ← Contains its own structure
```

### Rule 4: Validate Sibling Elements
After replacement, ensure all siblings still have ONE parent:

```tsx
// Original
<View>
  <Sibling1 />
  <OldBlock>      ← Being replaced
    <OldChild />
  </OldBlock>
  <Sibling2 />
</View>

// ❌ BAD - Sibling2 lost its parent
<View>
  <Sibling1 />
</View>
<NewBlock />    ← Wrong! Sibling2 should be inside View
<Sibling2 />

// ✅ GOOD - All siblings share parent
<View>
  <Sibling1 />
  <NewBlock />
  <Sibling2 />
</View>
```

## Post-Edit Validation

After every JSX edit, run this validation:

### Step 1: Syntax Check
```bash
npx tsc --noEmit --jsx react-native
```
// turbo

### Step 2: Build Verification
```bash
npm run build:pwa
```
// turbo

### Step 3: Manual Inspection Points
Check these common failure points:

- [ ] **Adjacent JSX elements** - Look for multiple elements at the same level without a parent
- [ ] **Orphaned closing tags** - Search for `</` that doesn't match an opening tag
- [ ] **Missing fragments** - Verify `<></>` wraps sibling elements
- [ ] **Import changes** - Ensure new component imports don't conflict with existing ones
- [ ] **Prop drilling** - Verify all required props are passed to new components

## Common Patterns

### Pattern 1: Replacing Filter Sections

**Before:**
```tsx
{showFilters && (
  <View style={styles.container}>
    <ScrollView horizontal>
      <Tab1 />
      <Tab2 />
    </ScrollView>
    <Divider />
    <Content />
  </View>
)}
```

**After (Safe):**
```tsx
{showFilters && (
  <FilterSection
    tabs={...}
    content={...}
    style={styles.container}
  />
)}
```

**Key:** The `FilterSection` component must internally replicate the View/ScrollView/Divider/Content structure.

### Pattern 2: Extracting Components

**Before:**
```tsx
<FlatList
  ListHeaderComponent={
    <View>
      <Text>Header</Text>
      {loading && <ActivityIndicator />}
    </View>
  }
/>
```

**After (Safe):**
```tsx
const HeaderComponent = () => (
  <View>
    <Text>Header</Text>
    {loading && <ActivityIndicator />}
  </View>
);

<FlatList
  ListHeaderComponent={<HeaderComponent />}
/>
```

**Key:** Extract the ENTIRE ListHeaderComponent value, not just part of it.

## Emergency Recovery

If you encounter a syntax error:

1. **Don't panic** - The file is recoverable
2. **Check the line number** - The error is usually NEAR the reported line, not exactly on it
3. **Look for mismatched tags** - Use IDE highlighting to find orphaned `</View>` or missing `</>`
4. **Revert if needed** - It's better to revert and retry than to chase cascading errors
5. **Add fragments liberally** - When in doubt, wrap in `<></>`

## Validation Commands

Run these after any significant JSX changes:

```bash
# Quick syntax check
npx tsc --noEmit

# Full build (catches runtime JSX issues)
npm run build:pwa

# If build fails, check for:
# - "Adjacent JSX elements" → Add fragment wrapper
# - "Unexpected token" → Check for mismatched braces
# - "has no corresponding closing tag" → Find the orphan
```
// turbo

## Example: Centralizing Filter Components

**Scenario:** Replace 50 lines of inline filter JSX with a `<FilterSection>` component.

**Correct Approach:**
1. Read the entire container structure first
2. Identify ALL siblings that share the parent
3. Replace the ENTIRE block including the container wrapper
4. Ensure the new component handles its own container styling
5. Run build immediately after

**Incorrect Approach:**
1. Replace just the inner content
2. Leave behind closing tags
3. Forget sibling elements exist
4. Skip validation

---

**Remember:** JSX refactoring is surgery, not demolition. Preserve the tree structure.
