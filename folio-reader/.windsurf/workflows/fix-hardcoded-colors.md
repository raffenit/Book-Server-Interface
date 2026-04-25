# Fix Hardcoded Colors Workflow

Systematic approach to replacing hardcoded colors with theme colors.

## When to Use

- When you find hex colors (#RRGGBB) in component files
- When you find rgba() values that should use theme
- When refactoring for theme consistency
- After extracting components to ensure they use theme colors

## Color Mapping Reference

| Hardcoded Value | Theme Equivalent | Usage |
|-----------------|------------------|-------|
| `#1e2132` | `colors.surface` | Card backgrounds |
| `#1a1a2e` | `colors.textOnAccent` | Text on accent buttons |
| `#F5E6D3` | `colors.textOnAccent` | Selected chip text/border |
| `rgba(10, 12, 25, 0.85)` | `colors.overlay` | Overlays, scrims |
| `rgba(0, 0, 0, 0.4)` | `colors.overlay` | Progress bar backgrounds |
| `rgba(255, 255, 255, 0.08)` | `colors.border` | Subtle borders |
| `#8B6DB8`, `#A85A95` | `getRainbowGradient()` | Rainbow gradients only |

## Steps

1. **Identify hardcoded colors**
   - Use `grep -n "rgba\|#[0-9a-fA-F]" <file>` to find candidates
   - Check if they're in the mapping above
   - Note: Some web-only gradients may need to stay (rainbow effects)

2. **Replace one at a time** (surgical approach)
   - Replace `colors` parameter with `useTheme()` hook if needed
   - Replace hardcoded value with theme equivalent
   - Don't cross JSX boundaries in single edit
   - Test build after each change

3. **Verify theme compliance**
   - Check that component works with different themes
   - Ensure contrast is maintained
   - Verify no visual regressions

4. **Document in STRUCTURE.md**
   - Add "Theme Colors Used" section
   - Note any TODOs for future color derivation

## Common Mistakes to Avoid

- ❌ Don't replace rainbow gradient colors directly - use `getRainbowGradient()`
- ❌ Don't replace shadow colors (keep as rgba with low opacity)
- ❌ Don't cross multiple component boundaries in one edit
- ✅ Do test with multiple themes (Midnight, Light, etc.)

## Example

```typescript
// Before
<Text style={{ color: '#1a1a2e' }}>Title</Text>

// After
const { colors } = useTheme();
<Text style={{ color: colors.textOnAccent }}>Title</Text>
```
