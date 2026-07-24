import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { getClubFromAssignments, getClubName, getContractEndDate, getPositionName } from '../api/utils'

const STORAGE_KEY = 'football-db-watchlist-v2'
const FOLDER_KEY = 'football-db-shortlist-folders-v1'
const WatchlistContext = createContext(null)
const DEFAULT_FOLDER = { id: 'general', name: 'General shortlist' }

function readJson(key, fallback) {
  if (typeof window === 'undefined') return fallback
  try {
    const value = JSON.parse(window.localStorage.getItem(key) || 'null')
    return value ?? fallback
  } catch {
    return fallback
  }
}

function readStoredItems() {
  const current = readJson(STORAGE_KEY, null)
  if (Array.isArray(current)) return current.filter(item => item?.id).map(item => ({ folderId: 'general', priority: 'Medium', status: 'Watching', rating: 0, estimatedFee: '', notes: '', ...item }))
  const legacy = readJson('football-db-watchlist-v1', [])
  return Array.isArray(legacy) ? legacy.filter(item => item?.id).map(item => ({ folderId: 'general', priority: 'Medium', status: 'Watching', rating: 0, estimatedFee: '', notes: '', ...item })) : []
}

function readFolders() {
  const stored = readJson(FOLDER_KEY, [])
  const folders = Array.isArray(stored) ? stored.filter(folder => folder?.id && folder?.name) : []
  return folders.some(folder => folder.id === DEFAULT_FOLDER.id) ? folders : [DEFAULT_FOLDER, ...folders]
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
    folderId: 'general',
    priority: 'Medium',
    status: 'Watching',
    rating: 0,
    estimatedFee: '',
    notes: '',
    savedAt: new Date().toISOString()
  }
}

export function WatchlistProvider({ children }) {
  const [items, setItems] = useState(readStoredItems)
  const [folders, setFolders] = useState(readFolders)

  const saveItems = useCallback(updater => {
    setItems(current => {
      const next = typeof updater === 'function' ? updater(current) : updater
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const saveFolders = useCallback(updater => {
    setFolders(current => {
      const next = typeof updater === 'function' ? updater(current) : updater
      window.localStorage.setItem(FOLDER_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const add = useCallback((player, folderId = 'general') => {
    const item = { ...toWatchlistItem(player), folderId }
    if (!item.id) return
    saveItems(current => [item, ...current.filter(existing => existing.id !== item.id)])
  }, [saveItems])

  const remove = useCallback(id => saveItems(current => current.filter(item => item.id !== String(id))), [saveItems])
  const clear = useCallback(() => saveItems([]), [saveItems])
  const has = useCallback(id => items.some(item => item.id === String(id)), [items])

  const toggle = useCallback(player => {
    const id = String(player?.id || '')
    if (!id) return
    saveItems(current => current.some(item => item.id === id)
      ? current.filter(item => item.id !== id)
      : [toWatchlistItem(player), ...current])
  }, [saveItems])

  const updateItem = useCallback((id, changes) => {
    saveItems(current => current.map(item => item.id === String(id) ? { ...item, ...changes } : item))
  }, [saveItems])

  const addFolder = useCallback(name => {
    const cleanName = String(name || '').trim()
    if (!cleanName) return null
    const folder = { id: `${Date.now()}-${cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`, name: cleanName }
    saveFolders(current => [...current, folder])
    return folder
  }, [saveFolders])

  const removeFolder = useCallback(id => {
    if (id === 'general') return
    saveFolders(current => current.filter(folder => folder.id !== id))
    saveItems(current => current.map(item => item.folderId === id ? { ...item, folderId: 'general' } : item))
  }, [saveFolders, saveItems])

  const value = useMemo(() => ({ items, folders, add, remove, toggle, clear, has, updateItem, addFolder, removeFolder }), [items, folders, add, remove, toggle, clear, has, updateItem, addFolder, removeFolder])
  return <WatchlistContext.Provider value={value}>{children}</WatchlistContext.Provider>
}

export function useWatchlist() {
  const value = useContext(WatchlistContext)
  if (!value) throw new Error('useWatchlist must be used inside WatchlistProvider')
  return value
}
