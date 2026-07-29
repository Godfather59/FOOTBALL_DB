# Football DB

A responsive football data and recruitment workspace for players, clubs and competitions. It combines search and profile exploration with shortlists, scouting, comparisons, rankings, transfer analysis, squad planning and estimated transfer-fit tools.

## Features

### Multi-provider free data

- Automatic free scouting fallback: API-Football → football-data.org → OpenLigaDB
- Free Data Hub for provider-specific tables, fixtures, scorer lists, team/player metadata and historical open matches
- API-Football league-and-season player statistics without requiring a player name
- football-data.org free competition standings, fixtures and top-scorer lists
- TheSportsDB public v1 metadata, images, player/team search and country league lists
- OpenLigaDB no-key league discovery, standings, matches and goal scorers
- StatsBomb Open Data competition-season and historical match browser
- Provider capability labels so missing assists, minutes, values or contracts are never estimated
- Same-origin development and Vercel proxies with caching, timeouts and server-side key protection

### Recruitment suite

- Goals, assists, appearances, minutes, age, position and rating filters when supplied by the selected provider
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

## Supported providers

| Provider | Private key | Best free use | Important limitation |
|---|---|---|---|
| API-Football | `API_FOOTBALL_KEY` | Detailed league player statistics | Free daily quota and limited historical seasons |
| football-data.org | `FOOTBALL_DATA_TOKEN` | Selected competition fixtures, tables and scorers | Free basic plan covers selected competitions and not full scouting depth |
| TheSportsDB | None | Team/player metadata, images and basic schedules | Public v1 responses and list sizes are limited |
| OpenLigaDB | None | Community fixtures, results, tables and goal scorers | Coverage is strongest for German competitions; scorer feed has goals only |
| StatsBomb Open Data | None | Historical research matches and event datasets | Selected historical datasets, not comprehensive live coverage |
| Market profile source | None configured by this project | Values, contracts and transfer histories | Unofficial, keyword-dependent coverage |

The application does not merge provider IDs. External results use **Find market profile** rather than assuming that an API-Football, football-data.org, TheSportsDB or OpenLigaDB ID matches a market-profile ID.

Transfer-fit and similarity scores are transparent decision-support estimates, not predictions of real transfers or guarantees of sporting performance.

## Architecture

```text
Browser
  └── /api/{provider}/*
        ├── Vite development proxies
        └── Vercel serverless proxy in production
              ├── tm / ce   Market profiles, values and contracts
              ├── af        API-Football
              ├── fd        football-data.org
              ├── tsdb      TheSportsDB public v1
              ├── oldb      OpenLigaDB
              └── sb        StatsBomb Open Data JSON
```

Private keys are attached only by the development or production proxy and are never exposed through `VITE_` browser variables. Browser-side shortlists and squad plans are stored in `localStorage`.

## Local development

Requirements: Node.js 22 or newer.

The no-key providers work immediately:

```bash
npm install
npm run dev
```

To unlock the optional key-based free providers:

1. Copy `.env.example` to `.env.local`.
2. Set one or both values:

```env
API_FOOTBALL_KEY=your_api_football_key
FOOTBALL_DATA_TOKEN=your_football_data_token
```

3. Restart `npm run dev` after changing environment variables.

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
3. Optionally add `API_FOOTBALL_KEY` and `FOOTBALL_DATA_TOKEN` as server environment variables.
4. Deploy. TheSportsDB, OpenLigaDB and StatsBomb Open Data remain usable without private keys.

This project is not affiliated with or endorsed by Transfermarkt, API-Football, football-data.org, TheSportsDB, OpenLigaDB, StatsBomb or Hudl. Review each upstream provider’s terms, attribution requirements, availability and acceptable-use rules before operating a public service.
