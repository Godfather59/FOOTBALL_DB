import { BrowserRouter, Route, Routes } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'
import Header from './components/Header'
import { WatchlistProvider } from './context/WatchlistContext'
import Home from './pages/Home'
import PlayerSearch from './pages/PlayerSearch'
import PlayerDetail from './pages/PlayerDetail'
import ClubSearch from './pages/ClubSearch'
import ClubDetail from './pages/ClubDetail'
import CompetitionSearch from './pages/CompetitionSearch'
import CompetitionDetail from './pages/CompetitionDetail'
import Scouting from './pages/Scouting'
import PlayerCompare from './pages/PlayerCompare'
import Watchlist from './pages/Watchlist'
import Opportunities from './pages/Opportunities'
import SquadPlanner from './pages/SquadPlanner'
import SimilarPlayers from './pages/SimilarPlayers'
import TransferExplorer from './pages/TransferExplorer'
import ClubCompare from './pages/ClubCompare'
import Rankings from './pages/Rankings'
import TransferFit from './pages/TransferFit'
import NotFound from './pages/NotFound'

export default function App() {
  return <ErrorBoundary><WatchlistProvider><BrowserRouter><div className="app"><Header /><main className="main"><Routes>
    <Route path="/" element={<Home />} />
    <Route path="/players" element={<PlayerSearch />} />
    <Route path="/players/:id" element={<PlayerDetail />} />
    <Route path="/clubs" element={<ClubSearch />} />
    <Route path="/clubs/:id" element={<ClubDetail />} />
    <Route path="/competitions" element={<CompetitionSearch />} />
    <Route path="/competitions/:id" element={<CompetitionDetail />} />
    <Route path="/scout" element={<Scouting />} />
    <Route path="/compare" element={<PlayerCompare />} />
    <Route path="/watchlist" element={<Watchlist />} />
    <Route path="/opportunities" element={<Opportunities />} />
    <Route path="/squad-planner" element={<SquadPlanner />} />
    <Route path="/similar/:id" element={<SimilarPlayers />} />
    <Route path="/transfers" element={<TransferExplorer />} />
    <Route path="/club-compare" element={<ClubCompare />} />
    <Route path="/rankings" element={<Rankings />} />
    <Route path="/fit/:id" element={<TransferFit />} />
    <Route path="*" element={<NotFound />} />
  </Routes></main></div></BrowserRouter></WatchlistProvider></ErrorBoundary>
}
