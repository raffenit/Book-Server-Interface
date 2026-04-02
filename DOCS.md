# Book Player + Reader Infrastructure Guide

Last Updated: April 1, 2026
Primary IP: 100.104.199.67 (Tailscale)

## 1. The Architecture

Because mobile browsers and Expo Go enforce CORS (Cross-Origin Resource Sharing), the app cannot talk directly to Kavita or Audiobookshelf (ABS). We use Caddy in a Docker container as a "Reverse Proxy" to inject the necessary permissions.
Kavita Path: App (:8050) → Caddy (:80) → Kavita (:8050)
ABS Path: App (:8080) → Caddy (:81) → ABS (:13378)

## 2. The Caddy Configuration (Caddyfile)

This file lives at C:\Users\hudsons\Documents\Caddyfile. It tells Caddy to listen on specific ports and "stamp" every request with CORS approval.Code snippet

### Kavita Proxy

:80 {
    reverse_proxy 100.104.199.67:8050
    @cors_preflight method OPTIONS
    handle @cors_preflight {
        header Access-Control-Allow-Origin "*"
        header Access-Control-Allow-Methods "GET, POST, OPTIONS, PUT, DELETE"
        header Access-Control-Allow-Headers "*"
        header Access-Control-Max-Age "1728000"
        respond "" 204
    }

    header Access-Control-Allow-Origin "*"
    header Access-Control-Allow-Methods "GET, POST, OPTIONS, PUT, DELETE"
    header Access-Control-Allow-Headers "*"
}

### Audiobookshelf Proxy

:81 {
    reverse_proxy 100.104.199.67:13378
    @cors_preflight method OPTIONS
    handle @cors_preflight {
        header Access-Control-Allow-Origin "*"
        header Access-Control-Allow-Methods "GET, POST, OPTIONS, PUT, DELETE"
        header Access-Control-Allow-Headers "*"
        header Access-Control-Max-Age "1728000"
        respond "" 204
    }

    header Access-Control-Allow-Origin "*"
    header Access-Control-Allow-Methods "GET, POST, OPTIONS, PUT, DELETE"
    header Access-Control-Allow-Headers "*"
}

## 3. Docker Deployment Command

If the container is deleted or you need to restart from scratch, use this PowerShell command:

PowerShell
docker run -d --name caddy-proxy -p 8050:80 -p 8080:81 -v C:\Users\hudsons\Documents\Caddyfile:/etc/caddy/Caddyfile caddy

## 4. Key Troubleshooting Wins (The "Lessons Learned")

Error: ERR_SSL_PROTOCOL_ERROR
Cause: App was using https:// on a port configured for http://. 
Solution: Ensure app settings use http:// for local development.

Error: Preflight Blocked
Cause: Browser sent an OPTIONS request that Caddy didn't handle.
Solution: Added the handle @cors_preflight block with a 204 response.

Error: Convention Violation
Cause: Caddy refused to run http on Port 443.
Solution: Moved internal ABS port to :81 and updated Docker mapping.

Error: Not a directory (Mount)
Cause: Docker created a folder named Caddyfile because it couldn't find the file.
Solution: Fixed file extension (removed .txt) and deleted the fake folder.

Error: 404 Not Found (Kavita)
Cause: Endpoint /api/Series/recently-read doesn't exist.
Solution: Switched to /api/Series/on-deck using a POST request.

## 5. Important API Differences

### Kavita (E-books)

- Term: "On Deck" (not Recently Read).
- Method: POST request.
- Auth: Requires ApiKey header (handled by Axios interceptor).

### Audiobookshelf (Audio)

- Auth: Requires Bearer token (generated in ABS User Settings, not your login password).
- Connection: Very sensitive to CORS; requires the explicit OPTIONS handler in Caddy.
