# Docker Files Reference

Quick guide to all Docker-related files in this project.

## Core Files (Used for running Folio)

| File | Purpose | When to Use |
|------|---------|-------------|
| `Dockerfile` | Builds Folio PWA container | Always - this is the main app image |
| `docker-compose.yml` | Development setup | Local testing, simple deployment |
| `docker-compose.caddy.template.yml` | Production template | Full-stack with reverse proxy (copy & customize) |

## Deploy/Webhook Files (CI/CD automation)

| File | Purpose | When to Use |
|------|---------|-------------|
| `Dockerfile.deploy` | Builds webhook container | Automated deployments via git push |
| `../docker-compose.deploy.yml` | Runs webhook server | In root directory - for production CI/CD |

## Build Scripts

| File | Purpose |
|------|---------|
| `deploy.bat` | Windows batch deployment (build, stop, start container) |
| `deploy.ps1` | PowerShell deployment with more features |

## Common Confusion

### "What's the difference between .deploy files and the regular ones?"

**NOT .deploy (Regular files):**
- Build and run Folio itself (the app you use)
- What users see in their browser
- Serves the PWA on port 3000 (or 80 inside container)

**.deploy files:**
- Build and run a **webhook server** for automation
- Watches for git pushes and rebuilds Folio automatically
- Runs on port 9000 (separate from the app)
- Think: CI/CD helper, not the app itself

### "Which compose file should I use?"

| Scenario | File |
|----------|------|
| "I just want to run Folio" | `docker-compose.yml` |
| "I have Caddy/Nginx reverse proxy" | `docker-compose.caddy.template.yml` (copy & edit) |
| "I want auto-deploy on git push" | `../docker-compose.deploy.yml` (in root) |

## File Locations

```
Folio/
├── folio-reader/               # Main app code
│   ├── Dockerfile              # ← Main app image
│   ├── Dockerfile.deploy        # ← Webhook image (for CI/CD)
│   ├── docker-compose.yml       # ← Simple dev setup
│   ├── docker-compose.caddy.template.yml  # ← Production template
│   ├── deploy.bat              # ← Windows helper
│   ├── deploy.ps1              # ← PowerShell helper
│   └── server.js               # ← Node.js server (used by Dockerfile)
│
└── docker-compose.deploy.yml    # ← Webhook runner (in ROOT, not folio-reader/)
```

## Quick Commands

```bash
# Development (simple)
cd folio-reader
docker-compose up -d

# Production with template (copy first)
cd folio-reader
cp docker-compose.caddy.template.yml ../docker-compose.yml
cd ..
# Edit ../docker-compose.yml for your setup
docker-compose up -d

# Enable auto-deploy webhook
cd ..  # Root directory
docker-compose -f docker-compose.deploy.yml up -d
```
