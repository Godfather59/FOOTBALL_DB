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

- API-Football league-and-season scouting without requiring a player name
- Goals, assists, appearances, minutes and rating filters from seasonal league statistics
- Legacy keyword scouting for market values, contracts and wider career periods
- Player comparison for two to four targets
- Similar-player discovery with adjustable position, age, value, output and preferred-foot weights
- Advanced shortlist folders with notes, ratings, priorities and recruitment status
- Squad planner with multiple formations, drag-and-drop placement, saved plans and depth warnings
- Contract opportunity discovery for free agents and expiring deals
- Transfer explorer with season, club, transfer type and fee filters
- Club comparison for squad value, age, composition, position depth and top players
- Player rankings for young players, free agents, value for money, goal contributions, market value, contract expiry, value risers and fallers
- Estimated transfer-fit score using destination squad depth, age target, budget and contract leverage

## Data sources and scope

API-Football is the primary source for competition and season scouting. The free plan is quota-limited, so Football DB loads and caches up to eight 20-player pages per scouting search. Available seasons and player-statistics coverage depend on the API-Football subscription and competition.

The Transfermarkt-based providers remain responsible for profile search, market values, contracts and market-value history. Their keyword endpoints can expose fewer profile IDs than their reported totals. API-Football player IDs are not treated as Transfermarkt IDs; league scouting results provide a separate **Find market profile** action to avoid mismatched profiles.

Transfer-fit and similarity scores are transparent decision-support estimates, not predictions of real transfers or guarantees of sporting performance.

## Architecture

```text
Browser
  └── /api/tm/*, /api/ce/* and /api/af/*
        ├── Vite development proxies
        └── Vercel serverless proxy in production
              ├── Transfermarkt Technology API
              ├── Transfermarkt CE API
              └── API-Football v3
```

The API-Football key is attached only by the development or production proxy and is never exposed through a `VITE_` browser variable. Browser-side shortlists and squad plans are stored in `localStorage`.

## Local development

Requirements: Node.js 22 or newer.

1. Create a free API-Football account and copy the API key from its dashboard.
2. Copy `.env.example` to `.env.local`.
3. Set `API_FOOTBALL_KEY` in `.env.local`.
4. Install and run the app.

```bash
npm install
npm run dev
```

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
3. Add `API_FOOTBALL_KEY` as a server environment variable.
4. Optionally configure `API_FOOTBALL_BASE_URL`, `TMAPI_BASE_URL` and `TRANSFERMARKT_CEAPI_BASE_URL`.
5. Deploy.

This project is not affiliated with or endorsed by Transfermarkt or API-Football. Review upstream terms, availability and acceptable-use requirements before operating a public service.
