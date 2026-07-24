import { Link } from 'react-router-dom'
import SearchBox from '../components/SearchBox'

const tools = [
  { to: '/scout', icon: '◎', title: 'Advanced scouting', text: 'Filter profiles by age, value, output, position and contract status.' },
  { to: '/rankings', icon: '↟', title: 'Player rankings', text: 'Build young-player, free-agent, value, output and market-momentum rankings.' },
  { to: '/transfers', icon: '⇢', title: 'Transfer explorer', text: 'Analyze transfer histories by season, club, type and fee.' },
  { to: '/squad-planner', icon: '▦', title: 'Squad planner', text: 'Build formations, test targets and expose missing positions.' },
  { to: '/compare', icon: '⇄', title: 'Player comparison', text: 'Compare up to four saved players across profile and performance metrics.' },
  { to: '/club-compare', icon: 'FC', title: 'Club comparison', text: 'Compare squad value, age, composition, depth and leading players.' },
  { to: '/watchlist', icon: '★', title: 'Advanced shortlists', text: 'Use folders, ratings, notes, priorities and recruitment statuses.' },
  { to: '/opportunities', icon: '⌛', title: 'Contract opportunities', text: 'Discover free agents and contracts approaching expiry.' }
]

export default function Home() {
  return <div className="home-page"><section className="hero"><span className="eyebrow">Search · Scout · Plan · Decide</span><h1>A complete football recruitment workspace</h1><p>Explore players and clubs, build rankings and transfer datasets, create shortlists, compare targets, plan squads and estimate destination fit.</p></section>
    <section className="home-searches" aria-label="Football data searches"><div className="search-tile"><div><span className="tile-icon">10</span><h2>Players</h2><p>Profiles, values, transfers and performance.</p></div><SearchBox type="players" placeholder="Search a player…" /></div><div className="search-tile"><div><span className="tile-icon">FC</span><h2>Clubs</h2><p>Squads, stadiums and total market value.</p></div><SearchBox type="clubs" placeholder="Search a club…" /></div><div className="search-tile"><div><span className="tile-icon">★</span><h2>Competitions</h2><p>League information and current standings.</p></div><SearchBox type="competitions" placeholder="Search a competition…" /></div></section>
    <section className="tool-section"><div className="section-heading"><span className="eyebrow">Recruitment suite</span><h2>From discovery to squad planning</h2></div><div className="tool-grid">{tools.map(tool => <Link key={tool.to} to={tool.to} className="tool-card"><span className="tool-icon">{tool.icon}</span><h3>{tool.title}</h3><p>{tool.text}</p><strong>Open tool →</strong></Link>)}</div></section>
  </div>
}
