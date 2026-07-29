# Football DB

A responsive football data and recruitment workspace for players, clubs and competitions. It combines search and profile exploration with shortlists, scouting, comparisons, rankings, transfer analysis, squad planning and estimated transfer-fit tools.

## Zero-key operation

Football DB now runs without creating API accounts, copying tokens or adding private environment variables.

### No-key data sources

- **No-key league scouting:** competition and squad discovery through the existing market-profile and statistics sources
- **No-key keyword scouting:** player, club, league, country and position search with market values, contracts and career statistics when returned upstream
- **TheSportsDB public v1:** team/player metadata, images and country league discovery through its built-in public access
- **OpenLigaDB:** no-key league discovery, tables, matches, results and goal scorers
- **StatsBomb Open Data:** historical competition seasons and match datasets for research and analysis
- Provider capability labels ensure missing assists, minutes, values or contracts are displayed as unavailable rather than estimated

The application does not use API-Football or football-data.org and does not request their keys.

## Recruitment suite

- Competition scouting without requiring an exact player name
- Goals, assists, appearances, minutes, age, position, value and contract filters when returned by the selected source
- Player comparison for two to four targets
- Similar-player discovery with adjustable position, age, value, output and preferred-foot weights
- Advanced shortlist folders with notes, ratings, priorities and recruitment status
- Squad planner with multiple formations, drag-and-drop placement, saved plans and depth warnings
- Contract opportunity discovery for free agents and expiring deals
- Transfer explorer with season, club, transfer type and fee filters
- Club comparison for squad value, age, composition, position depth and top players
- Player rankings for young players, free agents, value for money, goal contributions, market value, contract expiry, value risers and fallers
- Estimated transfer-fit score using destination squad depth, age target, budget and contract leverage

## Supported providers

| Provider | User key | Best use | Important limitation |
|---|---|---|---|
| Market profile and statistics sources | None | Profiles, values, contracts, transfers and scouting | Unofficial and dependent on upstream coverage |
| TheSportsDB public v1 | None | Team/player metadata, images and league lists | Free responses and list sizes are limited |
| OpenLigaDB | None | Community fixtures, results, tables and goal scorers | Coverage is strongest for German competitions; scorer data has goals only |
| StatsBomb Open Data | None | Historical research matches and event datasets | Selected historical datasets, not comprehensive live coverage |

Provider IDs are never merged automatically. External results use **Find market profile** rather than assuming unrelated IDs represent the same player.

Transfer-fit and similarity scores are transparent decision-support estimates, not predictions of real transfers or guarantees of sporting performance.

## Architecture

```text
Browser
  └── /api/{provider}/*
        ├── Vite development proxies
        └── Vercel serverless proxy in production
              ├── tm / ce   Market profiles, values, contracts and statistics
              ├── tsdb      TheSportsDB public v1
              ├── oldb      OpenLigaDB
              └── sb        StatsBomb Open Data JSON
```

Browser-side shortlists and squad plans are stored in `localStorage`. Provider responses are cached and stale requests are cancelled.

## Local development

Requirements: Node.js 22 or newer.

```bash
npm install
npm run dev
```

No `.env.local` file is required.

`.env.example` contains only optional base-URL overrides for development or self-hosting. It contains no private-key variables.

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
3. Deploy without adding environment variables.

This project is not affiliated with or endorsed by Transfermarkt, TheSportsDB, OpenLigaDB, StatsBomb or Hudl. Review each upstream provider’s terms, attribution requirements, availability and acceptable-use rules before operating a public service.
