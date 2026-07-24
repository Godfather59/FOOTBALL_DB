import SearchBox from '../components/SearchBox'

export default function Home() {
  return (
    <div className="search-section">
      <h2>Discover Football Data</h2>
      <p>Search for players, clubs, and competitions across the globe</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 500, margin: '24px auto 0' }}>
        <SearchBox type="players" />
        <SearchBox type="clubs" placeholder="Search Clubs..." />
        <SearchBox type="competitions" placeholder="Search Competitions..." />
      </div>
    </div>
  )
}
