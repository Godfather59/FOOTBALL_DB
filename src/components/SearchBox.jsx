import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function SearchBox({ type = 'players', placeholder }) {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const label = type === 'players' ? 'Players' : type === 'clubs' ? 'Clubs' : 'Competitions'

  function handleSubmit(event) {
    event.preventDefault()
    const value = query.trim()
    if (!value) return
    navigate(`/${type}?q=${encodeURIComponent(value)}`)
  }

  return (
    <form className="search-box" onSubmit={handleSubmit}>
      <input
        value={query}
        onChange={event => setQuery(event.target.value)}
        placeholder={placeholder || `Search ${label}…`}
        aria-label={`Search ${label}`}
      />
      <button type="submit">Search</button>
    </form>
  )
}
