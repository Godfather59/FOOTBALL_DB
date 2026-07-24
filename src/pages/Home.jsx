import SearchBox from '../components/SearchBox'

export default function Home() {
  return (
    <div className="home-page">
      <section className="hero">
        <span className="eyebrow">Players · Clubs · Competitions</span>
        <h1>Explore world football data</h1>
        <p>Search profiles, squads, transfers, market values, statistics and league standings from one fast interface.</p>
      </section>

      <section className="home-searches" aria-label="Football data searches">
        <div className="search-tile">
          <div>
            <span className="tile-icon">10</span>
            <h2>Players</h2>
            <p>Profiles, values, transfers and performance.</p>
          </div>
          <SearchBox type="players" placeholder="Search a player…" />
        </div>
        <div className="search-tile">
          <div>
            <span className="tile-icon">FC</span>
            <h2>Clubs</h2>
            <p>Squads, stadiums and total market value.</p>
          </div>
          <SearchBox type="clubs" placeholder="Search a club…" />
        </div>
        <div className="search-tile">
          <div>
            <span className="tile-icon">★</span>
            <h2>Competitions</h2>
            <p>League information and current standings.</p>
          </div>
          <SearchBox type="competitions" placeholder="Search a competition…" />
        </div>
      </section>
    </div>
  )
}
