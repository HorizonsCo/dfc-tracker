# Horizons 30×30 Tracker

A live tracker for the Dubai Fitness Challenge (31 Oct – 29 Nov 2026).
People open the link, register their name once, then tap their name to see
their own calendar and tick off today. Includes a top-3 leaderboard and team totals.

## What's inside
- `public/index.html` – the website
- `netlify/functions/api.mjs` – saves names and ticks (Netlify Blobs storage)
- `netlify.toml`, `package.json` – settings for Netlify

## Rules built in
- Only today can be ticked (Dubai time, decided by the server).
- 31 Oct and 1 Nov count as done for everyone.
- "Undo" works for today only.

## Deploy
1. Create a free GitHub account and a new repository; upload all these files.
2. In Netlify: Add new project → Import an existing project → GitHub → pick the repository → Deploy.
3. Share the site link.
