# Everline Roofing — Project Progress Reports

One-page, branded progress reports for a single roofing site. Same engine as the LRES tool
(Next.js + Browserless PDF). Features: site % + status, progress bar, a **beautified satellite
panel** (upload a label-off screenshot, trace your building — neighbors fade, your building keeps
full color with an orange outline), 1–4 progress photos, and Progress / Next-Steps lists.

## Deploy (browser-only)
1. Push this folder to a new GitHub repo (e.g. `everline-reports`).
2. vercel.com → Add New → Project → Import → Deploy.
3. Settings → Environment Variables → add `BROWSERLESS_TOKEN` (reuse the LRES/TLC token) → redeploy.
4. (Optional) Storage → Upstash for Redis → connect → redeploy, for shared/persistent data.

## Use
- Password: `EVERLINE2026!` (change in `pages/index.js`).
- New Site → fill name/address/status/%, add the site image and trace your building, add photos,
  fill the two lists → Generate PDF.
- Satellite screenshots: in Google Maps, Satellite view, turn OFF Layers → Labels first, so the
  image has no business names or pins. Then trace your building.
