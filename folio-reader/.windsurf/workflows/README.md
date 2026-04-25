# Folio Project Workflows

Step-by-step guides for common development tasks.

## Available Workflows

### [large-file-editing.md](./large-file-editing.md)
**When:** Editing files >500 lines or with complex nesting  
**Tools used:** `analyze-file-structure`  
Pre-edit analysis, surgical edit strategies, and post-edit verification.

---

### [update-structure.md](./update-structure.md)
**When:** Adding/modifying components, moving code, renaming exports  
**Tools used:** `generate-structure`, `analyze-file-structure`  
Keep STRUCTURE.md in sync with code changes and avoid duplicates.

---

### [extract-component.md](./extract-component.md)
**When:** Moving a component from a large file to its own file  
**Tools used:** `analyze-file-structure`  
Safe extraction with dependency checking and import updates.

---

### [fix-hardcoded-colors.md](./fix-hardcoded-colors.md)
**When:** Replacing hex/rgba colors with theme colors  
Color mapping reference and systematic approach to theme compliance.

---

### [api-error-handling.md](./api-error-handling.md)
**When:** Adding API calls, handling errors, implementing retries  
Error patterns, retry logic, and offline state handling.

---

### [context-menu-pattern.md](./context-menu-pattern.md)
**When:** Implementing right-click (web) or long-press (native) menus  
Universal context menu that works across platforms.

---

### [modal-pattern.md](./modal-pattern.md)
**When:** Creating dialogs, confirmation prompts, popups  
Consistent modal styling with `makeStyles()` from modalStyles.ts.

---

### [list-virtualization.md](./list-virtualization.md)
**When:** Rendering large lists (50+ items), optimizing grid performance  
FlashList usage and performance optimization patterns.

---

## Quick Reference

| Task | Workflow | Tool |
|------|----------|------|
| Edit large/complex file | `large-file-editing.md` | `analyze-file-structure` |
| Update documentation | `update-structure.md` | `generate-structure` |
| Move component to new file | `extract-component.md` | `analyze-file-structure` |
| Fix hardcoded colors | `fix-hardcoded-colors.md` | - |
| Check for duplicates | `update-structure.md` → Duplicate Detection | Both tools |
| Handle API errors | `api-error-handling.md` | - |
| Add context menu | `context-menu-pattern.md` | - |
| Create modal/dialog | `modal-pattern.md` | - |
| Optimize large lists | `list-virtualization.md` | - |

## Tool Reference

See [../tools/README.md](../tools/README.md) for tool definitions.

- **generate-structure** - Full codebase analysis
- **analyze-file-structure** - Single file analysis
