import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function SearchBox({ type = 'players', placeholder }) {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  const label = type === 'players' ? 'Players' : type === 'clubs' ? 'Clubs' : 'Competitions'

  function handleSubmit(e) {
    e.preventDefault()
    if (!query.trim()) return
    navigate(`/${type}?q=${encodeURIComponent(query.trim())}`)
  }

  return (
    <form className="search-box" onSubmit={handleSubmit}>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder={placeholder || `Search ${label}...`}
      />
      <button type="submit">Search</button>
    </form>
  )
}
