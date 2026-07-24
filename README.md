# Football DB

A responsive football data and recruitment workspace for players, clubs and competitions. It combines search and profile exploration with shortlists, scouting, comparisons, rankings, transfer analysis, squad planning and estimated transfer-fit tools.

## Features

### Football data

- Player, club and competition search with shareable URL parameters
- Paginated player and club results
- Player filtering by name, club, position, age and market value
- Player profile tabs for values, statistics, transfers, injuries and national career
- Interactive market-value history charts
- Enriched club squads and competition tables
- Same-origin API proxy with caching, request timeouts and stale-request cancellation

### Recruitment suite

- Advanced scouting by keyword, age, value, position, performance and contract status
- Player comparison for two to four targets
- Similar-player discovery with adjustable position, age, value, output and preferred-foot weights
- Advanced shortlist folders with notes, ratings, priorities and recruitment status
- Squad planner with multiple formations, drag-and-drop placement, saved plans and depth warnings
- Contract opportunity discovery for free agents and expiring deals
- Transfer explorer with season, club, transfer type and fee filters
- Club comparison for squad value, age, composition, position depth and top players
- Player rankings for young players, free agents, value for money, goal contributions, market value, contract expiry, value risers and fallers
- Estimated transfer-fit score using destination squad depth, age target, budget and contract leverage

## Data scope and estimates

The upstream provider requires search keywords and can expose fewer profile IDs than its reported totals. Recruitment tools analyze the profiles returned for the selected keyword rather than claiming to represent a complete worldwide database.

The transfer-fit score and similarity score are transparent estimates built from returned football data. They are decision-support indicators, not predictions of real transfers or guarantees of sporting performance.

## Architecture

```text
Browser
  └── /api/tm/* and /api/ce/*
        ├── Vite development proxies
        └── Vercel serverless proxy in production
              ├── Transfermarkt Technology API
              └── Transfermarkt CE API
```

Browser-side shortlists and squad plans are stored in `localStorage`. The frontend uses controlled concurrency for enrichment requests and aborts stale searches.

## Local development

Requirements: Node.js 22 or newer.

```bash
npm install
npm run dev
```

Optional environment variables can be copied from `.env.example`.

## Validation

```bash
npm run lint
npm test
npm run build
```

GitHub Actions runs installation, linting, tests and the production build for pull requests and pushes to `master`.

## Deployment

The repository includes Vercel configuration and a catch-all serverless proxy under `api/[...path].js`.

1. Import the repository into Vercel.
2. Keep Vite as the detected framework.
3. Optionally configure `TMAPI_BASE_URL` and `TRANSFERMARKT_CEAPI_BASE_URL`.
4. Deploy.

This project is not affiliated with or endorsed by Transfermarkt. Review upstream terms, availability and acceptable-use requirements before operating a public service.
