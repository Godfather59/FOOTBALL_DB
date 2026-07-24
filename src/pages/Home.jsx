import { Link } from 'react-router-dom'
import SearchBox from '../components/SearchBox'

const tools = [
  { to: '/scout', icon: '◎', title: 'Advanced scouting', text: 'Filter exposed profiles by age, value, output, position and contract status.' },
  { to: '/compare', icon: '⇄', title: 'Player comparison', text: 'Compare up to four saved players across profile and performance metrics.' },
  { to: '/watchlist', icon: '★', title: 'Watchlist', text: 'Save targets locally and build comparison shortlists without an account.' },
  { to: '/opportunities', icon: '⌛', title: 'Contract opportunities', text: 'Discover free agents and contracts approaching expiry within search results.' }
]

export default function Home() {
  return (
    <div className="home-page">
      <section className="hero">
        <span className="eyebrow">Search · Scout · Compare</span>
        <h1>Turn football data into recruitment decisions</h1>
        <p>Explore profiles, build shortlists, compare targets and identify contract opportunities from one fast interface.</p>
      </section>

      <section className="home-searches" aria-label="Football data searches">
        <div className="search-tile"><div><span className="tile-icon">10</span><h2>Players</h2><p>Profiles, values, transfers and performance.</p></div><SearchBox type="players" placeholder="Search a player…" /></div>
        <div className="search-tile"><div><span className="tile-icon">FC</span><h2>Clubs</h2><p>Squads, stadiums and total market value.</p></div><SearchBox type="clubs" placeholder="Search a club…" /></div>
        <div className="search-tile"><div><span className="tile-icon">★</span><h2>Competitions</h2><p>League information and current standings.</p></div><SearchBox type="competitions" placeholder="Search a competition…" /></div>
      </section>

      <section className="tool-section">
        <div className="section-heading"><span className="eyebrow">Recruitment toolkit</span><h2>Go beyond basic search</h2></div>
        <div className="tool-grid">
          {tools.map(tool => <Link key={tool.to} to={tool.to} className="tool-card"><span className="tool-icon">{tool.icon}</span><h3>{tool.title}</h3><p>{tool.text}</p><strong>Open tool →</strong></Link>)}
        </div>
      </section>
    </div>
  )
}
