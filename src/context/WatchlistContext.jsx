import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { getClubFromAssignments, getClubName, getContractEndDate, getPositionName } from '../api/utils'

const STORAGE_KEY = 'football-db-watchlist-v1'
const WatchlistContext = createContext(null)

function readStoredItems() {
  if (typeof window === 'undefined') return []
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(parsed) ? parsed.filter(item => item?.id) : []
  } catch {
    return []
  }
}

export function toWatchlistItem(player) {
  const club = getClubFromAssignments(player?.clubAssignments)
  return {
    id: String(player?.id || ''),
    name: player?.name || `Player ${player?.id || ''}`,
    portraitUrl: player?.portraitUrl || '',
    position: getPositionName(player?.attributes?.position),
    age: player?.lifeDates?.age ?? null,
    clubName: getClubName(club),
    marketValue: player?.marketValueDetails?.current?.value ?? null,
    contractEndDate: getContractEndDate(club),
    savedAt: new Date().toISOString()
  }
}

export function WatchlistProvider({ children }) {
  const [items, setItems] = useState(readStoredItems)

  const persist = useCallback(nextItems => {
    setItems(nextItems)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextItems))
  }, [])

  const add = useCallback(player => {
    const item = toWatchlistItem(player)
    if (!item.id) return
    setItems(current => {
      const next = [item, ...current.filter(existing => existing.id !== item.id)]
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const remove = useCallback(id => {
    setItems(current => {
      const next = current.filter(item => item.id !== String(id))
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const toggle = useCallback(player => {
    const id = String(player?.id || '')
    if (!id) return
    setItems(current => {
      const exists = current.some(item => item.id === id)
      const next = exists
        ? current.filter(item => item.id !== id)
        : [toWatchlistItem(player), ...current]
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const clear = useCallback(() => persist([]), [persist])
  const has = useCallback(id => items.some(item => item.id === String(id)), [items])

  const value = useMemo(() => ({ items, add, remove, toggle, clear, has }), [items, add, remove, toggle, clear, has])
  return <WatchlistContext.Provider value={value}>{children}</WatchlistContext.Provider>
}

export function useWatchlist() {
  const value = useContext(WatchlistContext)
  if (!value) throw new Error('useWatchlist must be used inside WatchlistProvider')
  return value
}
