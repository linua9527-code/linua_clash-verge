import { useEffect, useSyncExternalStore } from 'react'

import {
  getConnectionSnapshot,
  subscribeConnectionData,
} from './use-connection-data'
import {
  getProcessTrafficSnapshot,
  recordProcessTrafficSnapshot,
  subscribeProcessTrafficHistory,
  type ProcessTrafficQuery,
} from '@/services/process-traffic-history'

export const useProcessTrafficMonitor = () => {
  useEffect(() => {
    const recordSnapshot = () => {
      recordProcessTrafficSnapshot(getConnectionSnapshot())
    }

    recordSnapshot()
    const unsubscribe = subscribeConnectionData(recordSnapshot)
    return () => {
      unsubscribe()
    }
  }, [])
}

export const useProcessTrafficHistory = (query: ProcessTrafficQuery) =>
  useSyncExternalStore(
    subscribeProcessTrafficHistory,
    () => getProcessTrafficSnapshot(query),
    () => getProcessTrafficSnapshot(query),
  )
