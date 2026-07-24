# Football DB

A responsive football data and recruitment explorer for players, clubs and competitions. It combines profile discovery with shortlisting, comparison, scouting filters, contract opportunities, market-value visualization and performance analysis.

## Features

- Player, club and competition search with shareable URL parameters
- Paginated player and club results
- Player filtering by name, club, position, age and market value
- Advanced scouting across up to 40 exposed profiles with age, value, position, goals, assists and contract filters
- Local browser watchlist with saved player snapshots and shortlist management
- Shareable side-by-side comparison for two to four players
- Contract-expiry and free-agent discovery scoped to provider search results
- SVG market-value history charts without an additional charting dependency
- Rate-limited goals and assists loading
- Player profile tabs for values, statistics, transfers, injuries and national career
- Club squad enrichment with player names, portraits, ages, positions and values
- Competition catalogue with normalized names and codes
- Mobile-friendly tables, navigation, comparison and scouting cards
- Loading skeletons, empty states, retry actions, 404 handling and an application error boundary
- Same-origin API proxy with timeouts and CDN caching
- Node tests and GitHub Actions validation

## Recruitment workflow

1. Search normally or open **Advanced Scouting**.
2. Save interesting profiles to the browser watchlist.
3. Select two to four saved players and open **Compare**.
4. Review market-value charts and detailed profile tabs.
5. Use **Contracts** to inspect free agents and expiring deals within a search set.

Watchlists are stored in `localStorage`; no account or backend database is required.

## Architecture

```text
Browser
  ├── React recruitment tools and local watchlist
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

The Vite development server proxies `/api/tm` and `/api/ce` to the configured upstream providers. Optional environment variables can be copied from `.env.example`.

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

## Data-provider limitations

Search providers may report more matches than they expose as profile IDs. Scouting and contract discovery analyze only exposed profiles for the submitted keyword; they are not complete global player or free-agent databases. The interface states these limitations instead of presenting estimates as exhaustive facts.

This project is not affiliated with or endorsed by Transfermarkt. Review the upstream providers' terms, availability and acceptable-use requirements before operating a public production service.
