# src/

Top-level application source. Entry point (`main.tsx`) and root component (`App.tsx`) will live here once scaffolded.

## Subfolders

- [components/](components/) — reusable UI building blocks
- [pages/](pages/) — route-level screens
- [hooks/](hooks/) — custom React hooks (data, side effects)
- [lib/](lib/) — API client and utilities
- [types/](types/) — shared TypeScript types mirroring backend responses

## Conventions

- One component per file, PascalCase filenames.
- Pages compose components + hooks; components stay presentational where possible.
- No direct `fetch` calls from components — go through [lib/](lib/).
