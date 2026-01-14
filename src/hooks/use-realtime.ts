"use client"

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'

interface UseRealtimeProps {
  userId?: string
  onDataChange: () => void
  enabled?: boolean
  tables?: string[]
}

export function useRealtime({ userId, onDataChange, enabled = true, tables = ['friend_requests', 'notifications'] }: UseRealtimeProps) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (!userId || !enabled) {
      setIsConnected(false)
      return
    }

    const supabase = createClient()

    // Create unique channel name with timestamp
    const channelName = `realtime_${userId}_${Date.now()}`
    const channel = supabase.channel(channelName)

    // Add listeners for each table
    tables.forEach(table => {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
        },
        () => {
          // Instant updates without loading states
          const tableKey = `${table}_${userId}`

          if (window.realtimeThrottle?.[tableKey]) {
            clearTimeout(window.realtimeThrottle[tableKey])
            return; // Skip if already throttled
          }

          if (!window.realtimeThrottle) {
            window.realtimeThrottle = {}
          }

          // Immediate silent update for instant UX
          onDataChange()

          // Debounce additional calls to prevent spam
          window.realtimeThrottle[tableKey] = setTimeout(() => {
            if (window.realtimeThrottle) {
              delete window.realtimeThrottle[tableKey]
            }
          }, 500) // Increased from 100ms to 500ms
        }
      )
    })

    // Subscribe with status handling
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    channel.subscribe((status, err) => {
      switch (status) {
        case 'SUBSCRIBED':
          setIsConnected(true)
          break
        case 'CHANNEL_ERROR':
        case 'TIMED_OUT':
          setIsConnected(false)
          break
        case 'CLOSED':
          setIsConnected(false)
          break
      }
    })

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
        setIsConnected(false)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, enabled, tables.join(','), onDataChange])

  return {
    channel: channelRef.current,
    isConnected
  }
}
