# Windsurf Tools for Folio

Custom tool definitions for the Folio project.

## Available Tools

### generate-structure

**When to use:**
- Before adding new components to check for existing similar components
- After refactoring to verify structure changes
- When looking for duplicate implementations
- To compare against STRUCTURE.md for completeness

**What it does:**
Runs `npm run structure:generate` which extracts all exported functions and components from the codebase and creates `STRUCTURE_AUTO.md`.

**Follow-up actions:**
- Read `STRUCTURE_AUTO.md` to see current exports
- Compare against `STRUCTURE.md` for gaps
- Check for duplicate component names
- Use findings to decide whether to reuse existing components or create new ones

**Usage:**
```bash
npm run structure:generate
```

Or reference the tool at `.windsurf/tools/generate-structure.json` when asking me to check structure.

---

### analyze-file-structure

**When to use:**
- Before editing a large file to understand its structure
- When looking for specific functions or components in a file
- To check what a file exports before importing from it
- To find line numbers of specific code sections
- When refactoring to see what needs to be moved or updated

**What it does:**
Runs grep to extract exported functions, components, interfaces from a single file with their line numbers.

**Parameters:**
- `file_path` - Absolute path to the file (e.g., `/home/jewelshadow/Documents/Projects/Folio/folio-reader/components/SeriesCard.tsx`)

**Follow-up actions:**
- Read specific line ranges to see implementation details
- Use line numbers to target edits precisely
- Check for hardcoded colors or duplicate patterns

**Example:**
Reference `.windsurf/tools/analyze-file-structure.json` and provide a file path to see its structure.
