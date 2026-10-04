/**
 * Conductor Screen — Option A Command Center Redesign
 *
 * The Virtual Office canvas (OfficeRendererHost) is mounted permanently
 * at the root viewport (100% width & height) and never unmounts across phases.
 * Telemetry, mission controls, and task streams float as responsive HUD layers.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useConductorGateway } from './hooks/use-conductor-gateway'
import { useOfficeState } from './office/state/use-office-state'
import { OfficeRendererHost } from './office/office-renderer-host'
import { ConductorTopHud } from './components/conductor-top-hud'
import { ConductorCommandBar } from './components/conductor-command-bar'
import { ConductorMissionDrawer } from './components/conductor-mission-drawer'
import { ConductorAgentInspector } from './components/conductor-agent-inspector'
import { ConductorHistoryDrawer } from './components/conductor-history-drawer'
import { ConductorSettingsDrawer } from './components/conductor-settings'
import { ConductorInboxDrawer } from './components/conductor-inbox-drawer'
import type { OfficeAgentSceneNode } from '@/types/office-scene'
import type { OfficeRendererType } from './office/types'

export function ConductorScreen() {
  const conductor = useConductorGateway()
  const { scene: officeScene } = useOfficeState({
    conductor: conductor as unknown as import('./office/state/office-state-synthesizer').ConductorSnapshot,
    companyName: 'EZity Solutions',
  })

  const [goalDraft, setGoalDraft] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [inboxOpen, setInboxOpen] = useState(false)
  const [missionDrawerOpen, setMissionDrawerOpen] = useState(false)
  const [selectedAgentNode, setSelectedAgentNode] =
    useState<OfficeAgentSceneNode | null>(null)
  const [now, setNow] = useState(() => Date.now())

  // Office renderer preference (defaults to SVG, persisted in localStorage)
  const [rendererType, setRendererType] = useState<OfficeRendererType>(() => {
    try {
      const saved = window.localStorage.getItem('ezity-office:renderer')
      if (saved === 'pixi' || saved === 'svg') return saved
    } catch {}
    return 'svg'
  })

  const handleRendererChange = useCallback((nextRenderer: OfficeRendererType) => {
    setRendererType(nextRenderer)
    try {
      window.localStorage.setItem('ezity-office:renderer', nextRenderer)
    } catch {}
  }, [])

  // Auto-open activity drawer when mission starts or completes
  useEffect(() => {
    if (conductor.phase === 'running' || conductor.phase === 'complete') {
      setMissionDrawerOpen(true)
    }
  }, [conductor.phase])

  // Update clock for relative timestamps
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const handleSubmit = async () => {
    const trimmed = goalDraft.trim()
    if (!trimmed) return
    setMissionDrawerOpen(true)
    await conductor.sendMission(trimmed)
  }

  const handleNewMission = () => {
    conductor.resetMission()
    setGoalDraft('')
    setMissionDrawerOpen(false)
  }

  const handleResumeMission = () => {
    setMissionDrawerOpen(true)
  }

  const handleAgentClick = useCallback(
    (agentId: string) => {
      const found = officeScene.agents.find((a) => a.id === agentId)
      if (found) {
        setSelectedAgentNode(found)
      }
    },
    [officeScene.agents],
  )

  const updateSettings = (
    patch: Partial<typeof conductor.conductorSettings>,
  ) => {
    conductor.setConductorSettings({ ...conductor.conductorSettings, ...patch })
  }

  return (
    <div
      className="relative h-full w-full overflow-hidden select-none"
      style={{ background: 'var(--theme-bg)', color: 'var(--theme-text)' }}
    >
      {/* ─────────────────────────────────────────────────────────────
          1. PERSISTENT MASTER STAGE: VIRTUAL OFFICE CANVAS (Never Unmounts)
      ───────────────────────────────────────────────────────────── */}
      <div className="absolute inset-0 z-0 h-full w-full">
        <OfficeRendererHost
          scene={officeScene}
          officeRenderer={rendererType}
          onRendererChange={handleRendererChange}
          companyName="EZity Solutions"
          hideHeader
          onAgentClick={handleAgentClick}
          onWorkItemClick={() => setInboxOpen(true)}
          className="h-full w-full rounded-none border-none shadow-none"
        />
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. FLOATING TOP HUD (Status, Live Telemetry, Controls)
      ───────────────────────────────────────────────────────────── */}
      <ConductorTopHud
        companyName="EZity AI Office"
        officeScene={officeScene}
        conductor={conductor}
        rendererType={rendererType}
        onRendererChange={handleRendererChange}
        onHistoryOpen={() => setHistoryOpen(true)}
        onSettingsOpen={() => setSettingsOpen(true)}
        inboxOpen={inboxOpen}
        onInboxOpen={() => setInboxOpen((open) => !open)}
        missionDrawerOpen={missionDrawerOpen}
        onToggleMissionDrawer={() => setMissionDrawerOpen((open) => !open)}
      />

      {/* ─────────────────────────────────────────────────────────────
          3. PLANNING INDICATOR (Decomposing Phase Toast)
      ───────────────────────────────────────────────────────────── */}
      {conductor.phase === 'decomposing' && (
        <div className="pointer-events-auto absolute top-20 left-1/2 z-30 -translate-x-1/2 transform">
          <div className="flex items-center gap-3 rounded-2xl border border-[var(--theme-accent)]/40 bg-[var(--theme-card)]/90 px-4 py-2.5 shadow-xl backdrop-blur-xl">
            <span className="relative flex size-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--theme-accent)] opacity-75" />
              <span className="relative inline-flex size-3 rounded-full bg-[var(--theme-accent)]" />
            </span>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-[var(--theme-text)]">
                Lead Architect Decomposing Objective...
              </span>
              <span className="text-[10px] text-[var(--theme-muted)]">
                Analyzing requirements & synthesizing task graph in Conference Room
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. FLOATING COMMAND BAR (Idle Phase)
      ───────────────────────────────────────────────────────────── */}
      {conductor.phase === 'idle' && (
        <ConductorCommandBar
          goalDraft={goalDraft}
          setGoalDraft={setGoalDraft}
          onSubmit={handleSubmit}
          isSending={conductor.isSending}
          hasPersistedMission={conductor.hasPersistedMission}
          onResumeMission={handleResumeMission}
        />
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. COLLAPSIBLE RIGHT ACTIVITY DRAWER (Tasks, Stream, Cost)
      ───────────────────────────────────────────────────────────── */}
      <ConductorMissionDrawer
        conductor={conductor}
        open={missionDrawerOpen}
        onClose={() => setMissionDrawerOpen(false)}
        onNewMission={handleNewMission}
        now={now}
      />

      {/* ─────────────────────────────────────────────────────────────
          6. AGENT SPOTLIGHT INSPECTOR (Activated upon Canvas Agent Click)
      ───────────────────────────────────────────────────────────── */}
      <ConductorAgentInspector
        agent={selectedAgentNode}
        onClose={() => setSelectedAgentNode(null)}
      />

      {/* ─────────────────────────────────────────────────────────────
          7. RECENT MISSIONS HISTORY DRAWER (Slide-Over)
      ───────────────────────────────────────────────────────────── */}
      <ConductorHistoryDrawer
        conductor={conductor}
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        now={now}
      />

      {/* ─────────────────────────────────────────────────────────────
          8. CONDUCTOR SETTINGS DRAWER
      ───────────────────────────────────────────────────────────── */}
      <ConductorSettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={conductor.conductorSettings}
        onUpdate={updateSettings}
      />

      {/* ─────────────────────────────────────────────────────────────
          9. WORK INBOX OPERATIONS DRAWER
      ───────────────────────────────────────────────────────────── */}
      <ConductorInboxDrawer
        open={inboxOpen}
        onClose={() => setInboxOpen(false)}
        scene={officeScene}
        onLocateAgent={handleAgentClick}
      />
    </div>
  )
}
