import { NavLink } from 'react-router-dom'
import { useWatchlist } from '../context/WatchlistContext'

export default function Header() {
  const { items } = useWatchlist()
  const linkClass = ({ isActive }) => isActive ? 'active' : ''
  return <header className="header"><NavLink to="/" className="brand" aria-label="Football DB home"><span className="brand-mark">⚽</span><span>Football DB</span></NavLink><nav aria-label="Main navigation">
    <NavLink to="/" className={linkClass} end>Home</NavLink><NavLink to="/players" className={linkClass}>Players</NavLink><NavLink to="/clubs" className={linkClass}>Clubs</NavLink><NavLink to="/scout" className={linkClass}>Scout</NavLink><NavLink to="/rankings" className={linkClass}>Rankings</NavLink><NavLink to="/transfers" className={linkClass}>Transfers</NavLink><NavLink to="/squad-planner" className={linkClass}>Planner</NavLink><NavLink to="/club-compare" className={linkClass}>Club compare</NavLink><NavLink to="/opportunities" className={linkClass}>Contracts</NavLink><NavLink to="/watchlist" className={linkClass}>Shortlists <span className="nav-count">{items.length}</span></NavLink>
  </nav></header>
}
