import type { ConnectionMonitorData } from '@/hooks/use-connection-data'

const STORAGE_KEY = 'verge-process-traffic-history-v1'
const RETENTION_DAYS = 90

export type ProcessTrafficPeriod = 'day' | 'week' | 'month'

export interface ProcessTrafficDateRange {
  startDate: string
  endDate: string
}

export type ProcessTrafficQuery = ProcessTrafficPeriod | ProcessTrafficDateRange

export interface ProcessTrafficSummary {
  key: string
  process: string
  path: string
  upload: number
  download: number
}

interface StoredProcessTrafficSummary {
  process: string
  path: string
  upload: number
  download: number
}

type StoredProcessTrafficHistory = Record<
  string,
  Record<string, StoredProcessTrafficSummary>
>

interface ConnectionCursor {
  upload: number
  download: number
}

const listeners = new Set<() => void>()
const connectionCursors = new Map<string, ConnectionCursor>()
const snapshotCache = new Map<string, ProcessTrafficSummary[]>()

let persistTimer: ReturnType<typeof setTimeout> | null = null

const getDateKey = (timestamp: number) => {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getProcessKey = (process: string, path: string) =>
  path || process || '__unknown__'

const pruneHistory = (source: StoredProcessTrafficHistory) => {
  const cutoff = new Date()
  cutoff.setHours(0, 0, 0, 0)
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS + 1)
  const cutoffKey = getDateKey(cutoff.getTime())

  for (const dateKey of Object.keys(source)) {
    if (dateKey < cutoffKey) delete source[dateKey]
  }

  return source
}

const loadHistory = (): StoredProcessTrafficHistory => {
  if (typeof window === 'undefined') return {}

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as StoredProcessTrafficHistory
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {}
    }
    return pruneHistory(parsed)
  } catch (error) {
    console.warn('[ProcessTraffic] Failed to load history:', error)
    return {}
  }
}

let history = loadHistory()

const persistHistory = () => {
  persistTimer = null
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
  } catch (error) {
    console.warn('[ProcessTraffic] Failed to persist history:', error)
  }
}

const schedulePersist = () => {
  if (persistTimer) return
  persistTimer = window.setTimeout(persistHistory, 1_000)
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', persistHistory)
}

const notify = () => {
  snapshotCache.clear()
  listeners.forEach((listener) => listener())
}

const getPresetDateRange = (period: ProcessTrafficPeriod) => {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const offset = period === 'day' ? 0 : period === 'week' ? 6 : 29
  start.setDate(start.getDate() - offset)
  return {
    startDate: getDateKey(start.getTime()),
    endDate: getDateKey(Date.now()),
  }
}

const getQueryDateRange = (query: ProcessTrafficQuery) =>
  typeof query === 'string' ? getPresetDateRange(query) : query

const normalizeConnectionList = (data: ConnectionMonitorData) => {
  const connections = new Map<string, IConnectionsItem>()

  for (const connection of data.activeConnections) {
    connections.set(connection.id, connection)
  }
  for (const connection of data.closedConnections) {
    if (!connections.has(connection.id)) {
      connections.set(connection.id, connection)
    }
  }

  return connections.values()
}

export const recordProcessTrafficSnapshot = (data: ConnectionMonitorData) => {
  const presentConnectionIds = new Set<string>()
  const dateKey = getDateKey(Date.now())
  let changed = false

  for (const connection of normalizeConnectionList(data)) {
    presentConnectionIds.add(connection.id)
    const previous = connectionCursors.get(connection.id)
    const upload = connection.upload ?? 0
    const download = connection.download ?? 0

    connectionCursors.set(connection.id, { upload, download })
    if (!previous) continue

    const uploadDelta =
      upload >= previous.upload ? upload - previous.upload : upload
    const downloadDelta =
      download >= previous.download ? download - previous.download : download
    if (uploadDelta === 0 && downloadDelta === 0) continue

    const process = connection.metadata.process || ''
    const path = connection.metadata.processPath || ''
    const processKey = getProcessKey(process, path)
    const dailyHistory = (history[dateKey] ??= {})
    const summary = (dailyHistory[processKey] ??= {
      process,
      path,
      upload: 0,
      download: 0,
    })

    summary.process = process || summary.process
    summary.path = path || summary.path
    summary.upload += uploadDelta
    summary.download += downloadDelta
    changed = true
  }

  for (const connectionId of connectionCursors.keys()) {
    if (!presentConnectionIds.has(connectionId)) connectionCursors.delete(connectionId)
  }

  if (!changed) return

  history = pruneHistory(history)
  schedulePersist()
  notify()
}

export const subscribeProcessTrafficHistory = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const getProcessTrafficSnapshot = (query: ProcessTrafficQuery) => {
  const { startDate, endDate } = getQueryDateRange(query)
  const cacheKey = `${startDate}:${endDate}`
  const cached = snapshotCache.get(cacheKey)
  if (cached) return cached

  const summaries = new Map<string, ProcessTrafficSummary>()

  for (const [dateKey, dailyHistory] of Object.entries(history)) {
    if (dateKey < startDate || dateKey > endDate) continue

    for (const [key, summary] of Object.entries(dailyHistory)) {
      const previous = summaries.get(key)
      if (previous) {
        previous.upload += summary.upload
        previous.download += summary.download
        previous.process = summary.process || previous.process
        previous.path = summary.path || previous.path
        continue
      }

      summaries.set(key, {
        key,
        process: summary.process,
        path: summary.path,
        upload: summary.upload,
        download: summary.download,
      })
    }
  }

  const snapshot = [...summaries.values()].sort((left, right) => {
    const rightTotal = right.upload + right.download
    const leftTotal = left.upload + left.download
    return rightTotal - leftTotal
  })
  snapshotCache.set(cacheKey, snapshot)
  return snapshot
}
