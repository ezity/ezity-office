/**
 * Canonical useOfficeState Hook
 *
 * Aggregates runtime data from Conductor Gateway, WorkItems Inbox, and
 * Agent Definitions into a single canonical OfficeSceneState, while
 * providing a legacy adapter for backward compatibility.
 */

import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchWorkItems } from '@/lib/work-items-api'
import type { WorkItem } from '@/types/task'
import type { OfficeSceneState } from '@/types/office-scene'
import type { AgentWorkingRow } from '@/screens/conductor/components/office-view'
import { useConductorGateway } from '@/screens/conductor/hooks/use-conductor-gateway'
import { useAgentActivityStore } from '@/stores/agent-activity-store'
import {
  synthesizeOfficeSceneState,
  toLegacyAgentWorkingRows,
  type ConductorSnapshot,
} from './office-state-synthesizer'

export interface UseOfficeStateOptions {
  conductor?: ConductorSnapshot
  workItems?: Array<WorkItem>
  companyName?: string
  enablePeriodicTick?: boolean
}

export interface UseOfficeStateResult {
  scene: OfficeSceneState
  legacyRows: Array<AgentWorkingRow>
}

/**
 * Main state hook for the Virtual Office.
 * Accepts existing conductor state to prevent duplicate Hermes gateway queries.
 */
export function useOfficeState(
  options?: UseOfficeStateOptions,
): UseOfficeStateResult {
  const conductor = options?.conductor
  const liveActivities = useAgentActivityStore((s) => s.activities)

  // Query work items with TanStack Query (shares cache with Inbox and Dashboard)
  const { data: workItemsData } = useQuery({
    queryKey: ['work-items'],
    queryFn: () => fetchWorkItems(),
    enabled: !options?.workItems,
    staleTime: 5_000,
    refetchInterval: 10_000,
  })

  const effectiveWorkItems = useMemo(
    () => options?.workItems ?? workItemsData?.items ?? [],
    [options?.workItems, workItemsData?.items],
  )

  // Periodic tick for relative timestamps and session freshness
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (options?.enablePeriodicTick === false) return
    const interval = window.setInterval(() => setNow(Date.now()), 5_000)
    return () => window.clearInterval(interval)
  }, [options?.enablePeriodicTick])

  // Synthesize canonical scene state
  const scene = useMemo<OfficeSceneState>(() => {
    return synthesizeOfficeSceneState({
      conductor,
      workItems: effectiveWorkItems,
      now,
      companyName: options?.companyName ?? 'EZity AI Office',
      liveActivities,
    })
  }, [conductor, effectiveWorkItems, now, options?.companyName, liveActivities])

  // Legacy adapter for backward compatibility with OfficeView
  const legacyRows = useMemo<Array<AgentWorkingRow>>(() => {
    return toLegacyAgentWorkingRows(scene)
  }, [scene])

  return { scene, legacyRows }
}

/**
 * Standalone variant that mounts useConductorGateway() directly if invoked
 * outside ConductorHome/ConductorActive.
 */
export function useStandaloneOfficeState(
  options?: Omit<UseOfficeStateOptions, 'conductor'>,
): UseOfficeStateResult {
  const conductor = useConductorGateway()
  return useOfficeState({ ...options, conductor })
}
