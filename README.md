# Football DB

A responsive football data explorer for players, clubs and competitions. The application provides player profiles, transfer and injury history, market values, career statistics, enriched club squads, stadium information and league standings.

## Features

- Player, club and competition search with shareable URL parameters
- Paginated player and club results
- Player filtering by name, club, position, age and market value
- Rate-limited advanced goals and assists loading
- Player profile tabs for values, statistics, transfers, injuries and national career
- Club squad enrichment with player names, portraits, ages, positions and values
- Competition catalogue with normalized names and codes
- Mobile-friendly tables and navigation
- Loading skeletons, empty states, retry actions, 404 handling and an application error boundary
- Same-origin API proxy with timeouts and CDN caching
- Node tests and GitHub Actions validation

## Architecture

```text
Browser
  └── /api/tm/* and /api/ce/*
        ├── Vite development proxies
        └── Vercel serverless proxy in production
              ├── Transfermarkt Technology API
              └── Transfermarkt CE API
```

The browser never calls the external providers directly in production. The proxy applies a request timeout and cache headers, while the frontend adds a short in-memory cache and aborts stale requests.

## Local development

Requirements: Node.js 22 or newer.

```bash
npm install
npm run dev
```

The Vite development server proxies `/api/tm` and `/api/ce` to the configured upstream providers.

Optional environment variables can be copied from `.env.example`:

```bash
cp .env.example .env.local
```

## Validation

```bash
npm run lint
npm test
npm run build
```

GitHub Actions runs all three commands for pull requests and pushes to `master`.

## Deployment

The repository includes `vercel.json` and a catch-all serverless function under `api/[...path].js`.

1. Import the repository into Vercel.
2. Keep the detected framework as Vite.
3. Optionally configure `TMAPI_BASE_URL` and `TRANSFERMARKT_CEAPI_BASE_URL`.
4. Deploy.

The fallback route keeps React Router pages working when opened directly.

## Data-provider limitations

Search providers may report more matches than they expose as profile IDs. The interface clearly shows both the reported total and the number of profiles actually made available. Filters are applied to the loaded result page.

This project is not affiliated with or endorsed by Transfermarkt. Review the upstream providers' terms, availability and acceptable-use requirements before operating a public production service.
