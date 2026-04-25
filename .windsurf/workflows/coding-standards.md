---
description: Coding standards and best practices for the Folio project
tags: [standards, guidelines, best-practices]
---

# Folio Coding Standards

## Configuration Management Rules

### 1. No Hardcoded Paths or URLs

**Rule**: All paths, URLs, and endpoint configurations must be defined in centralized config files, never hardcoded directly in source code.

**Rationale**: 
- Changing a path should require editing only ONE file
- Prevents inconsistencies across the codebase
- Makes the app more configurable for different environments

**Implementation**:
- Use `/config/proxy.ts` for all proxy-related paths
- Use environment variables for server URLs (`EXPO_PUBLIC_*`)
- Create new config files in `/config/` directory as needed

**Examples**:

❌ **DON'T** hardcode paths:
```typescript
// BAD - scattered throughout codebase
fetch('/dynamic-proxy?url=' + encodeURIComponent(url))
kavitaAPI.setProxy('/dynamic-proxy?url=')
if (url.includes('/dynamic-proxy?url=')) { ... }
```

✅ **DO** use centralized config:
```typescript
// GOOD - single source of truth in config/proxy.ts
import { PROXY_PATH, proxyUrl, isProxied } from '../config/proxy';

fetch(proxyUrl(targetUrl))
kavitaAPI.setProxy(PROXY_PATH)
if (isProxied(url)) { ... }
```

**Affected Areas**:
- API endpoints (`/api/*`, `/proxy`, `/dynamic-proxy`)
- External service URLs (OpenLibrary, Google Books, etc.)
- Route paths in navigation
- Static asset paths
- Storage keys

### 2. Use Helper Functions

When a pattern is used more than once, create a helper function:

```typescript
// config/proxy.ts
export function proxyUrl(targetUrl: string): string {
  return `${PROXY_PATH}${encodeURIComponent(targetUrl)}`;
}
```

Benefits:
- Reduces boilerplate
- Ensures consistent encoding
- Easier to modify behavior globally

### 3. Config File Structure

All config files should:
- Export constants in UPPER_SNAKE_CASE
- Export typed helper functions
- Include JSDoc comments
- Be co-located in `/config/` directory

Example structure:
```
/config/
  ├── proxy.ts      # Proxy path configuration
  ├── api.ts        # API endpoint definitions
  ├── storage.ts    # Storage keys
  └── external.ts   # External service URLs
```

### 4. Environment-Specific Values

Use environment variables for values that change between environments:

```typescript
const KAVITA_URL = process.env.EXPO_PUBLIC_KAVITA_URL || 'http://localhost:8050';
const API_TIMEOUT = parseInt(process.env.EXPO_PUBLIC_API_TIMEOUT || '30000', 10);
```

Never commit secrets or production credentials to config files.

---

## Code Review Checklist

Before submitting changes, verify:
- [ ] No new hardcoded paths introduced
- [ ] URLs use centralized config
- [ ] Helper functions used for repeated patterns
- [ ] New config needs documented in this file
