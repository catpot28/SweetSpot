# Frontend — BUNQ Lens PWA

Mobile-first React 18 + TypeScript app, built with Vite and styled with Tailwind CSS. Runs in the browser on a phone (installable as a PWA), uses the device camera via `getUserMedia`, and talks to the [backend](../backend/) over REST.

## Purpose

Surface the three product layers from [../bunq-lens-product-concept.md](../bunq-lens-product-concept.md):

- **Scan** — capture a product photo, send to backend, render 3-tier results (budget / match / premium) with affordability badges.
- **Wishlist** — list of tracked items, each with a live status dot (affordable / price-dropped / sweet-spot).
- **Detail** — item price history, Claude-generated reasoning, one-tap "Buy it" that triggers a BUNQ payment.

## Structure

- [src/](src/) — app source
- [public/](public/) — static assets (PWA manifest, icons, favicon)

## Tooling

Vite + TS + Tailwind. `package.json`, `vite.config.ts`, `tsconfig.json`, and `tailwind.config.js` land here when the frontend is scaffolded (`npm create vite@latest`). Deployed as a static build on Railway; calls the FastAPI service via `VITE_API_BASE_URL` (see [../.env.example](../.env.example)).
