# public/

Static assets served as-is by Vite. No TypeScript / JavaScript here.

## Planned files

- `manifest.webmanifest` — PWA manifest (name, icons, start_url, display: standalone)
- `icon-192.png`, `icon-512.png` — PWA icons
- `favicon.ico`

Anything referenced from here is fetched via absolute path (`/icon-192.png`) and is **not** bundled — keep it small.
