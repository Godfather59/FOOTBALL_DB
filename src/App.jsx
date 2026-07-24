import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Home from './pages/Home'
import PlayerSearch from './pages/PlayerSearch'
import PlayerDetail from './pages/PlayerDetail'
import ClubSearch from './pages/ClubSearch'
import ClubDetail from './pages/ClubDetail'
import CompetitionSearch from './pages/CompetitionSearch'
import CompetitionDetail from './pages/CompetitionDetail'

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Header />
        <main className="main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/players" element={<PlayerSearch />} />
            <Route path="/players/:id" element={<PlayerDetail />} />
            <Route path="/clubs" element={<ClubSearch />} />
            <Route path="/clubs/:id" element={<ClubDetail />} />
            <Route path="/competitions" element={<CompetitionSearch />} />
            <Route path="/competitions/:id" element={<CompetitionDetail />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
