import { NavLink } from 'react-router-dom'

export default function Header() {
  return (
    <header className="header">
      <NavLink to="/" className="brand" aria-label="Football DB home">
        <span className="brand-mark">⚽</span>
        <span>Football DB</span>
      </NavLink>
      <nav aria-label="Main navigation">
        <NavLink to="/" className={({ isActive }) => isActive ? 'active' : ''} end>Home</NavLink>
        <NavLink to="/players" className={({ isActive }) => isActive ? 'active' : ''}>Players</NavLink>
        <NavLink to="/clubs" className={({ isActive }) => isActive ? 'active' : ''}>Clubs</NavLink>
        <NavLink to="/competitions" className={({ isActive }) => isActive ? 'active' : ''}>Competitions</NavLink>
      </nav>
    </header>
  )
}
