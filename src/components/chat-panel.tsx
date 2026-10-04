/**
 * ChatPanel — versatile floating or docked agent chat overlay for non-chat routes.
 *
 * Supports:
 * - Free-floating draggable & resizable window (non-blocking, no page dimming)
 * - Docked right-side panel
 * - Minimized floating agent pill (with active status indicator)
 * - Full-view navigation to /chat/$sessionKey
 */
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowExpand01Icon,
  Cancel01Icon,
  Chat01Icon,
  Drag01Icon,
  Minimize01Icon,
  PencilEdit02Icon,
  SidebarRightIcon,
  WindowsNewIcon,
} from '@hugeicons/core-free-icons'
import { AnimatePresence, motion } from 'motion/react'
import type { SessionMeta } from '@/screens/chat/types'
import { ChatScreen } from '@/screens/chat/chat-screen'
import { chatQueryKeys, moveHistoryMessages } from '@/screens/chat/chat-queries'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { Button } from '@/components/ui/button'
import {
  TooltipContent,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export function ChatPanel() {
  const isOpen = useWorkspaceStore((s) => s.chatPanelOpen)
  const sessionKey = useWorkspaceStore((s) => s.chatPanelSessionKey)
  const windowMode = useWorkspaceStore((s) => s.chatWindowMode)
  const isMinimized = useWorkspaceStore((s) => s.chatWindowMinimized)
  const storedBounds = useWorkspaceStore((s) => s.chatWindowBounds)

  const setChatPanelOpen = useWorkspaceStore((s) => s.setChatPanelOpen)
  const setChatPanelSessionKey = useWorkspaceStore(
    (s) => s.setChatPanelSessionKey,
  )
  const setChatWindowMode = useWorkspaceStore((s) => s.setChatWindowMode)
  const setChatWindowMinimized = useWorkspaceStore(
    (s) => s.setChatWindowMinimized,
  )
  const setChatWindowBounds = useWorkspaceStore((s) => s.setChatWindowBounds)

  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [forcedSession, setForcedSession] = useState<{
    friendlyId: string
    sessionKey: string
  } | null>(null)

  const isNewChat = sessionKey === 'new'
  const activeFriendlyId = sessionKey || 'main'
  const forcedSessionKey =
    forcedSession?.friendlyId === activeFriendlyId
      ? forcedSession.sessionKey
      : undefined

  // Session list query
  const sessionsQuery = useQuery({
    queryKey: chatQueryKeys.sessions,
    queryFn: async () => {
      const res = await fetch('/api/sessions')
      if (!res.ok) return []
      const data = await res.json()
      return Array.isArray(data?.sessions)
        ? data.sessions
        : Array.isArray(data)
          ? data
          : []
    },
    staleTime: 10_000,
  })
  const sessions: Array<SessionMeta> = sessionsQuery.data ?? []

  // Current session & agent identity
  const activeSession = sessions.find((s) => s.friendlyId === activeFriendlyId)
  const panelTitle = activeSession
    ? activeSession.label ||
      activeSession.title ||
      activeSession.derivedTitle ||
      'Agent Chat'
    : activeFriendlyId === 'main'
      ? 'Main Session'
      : isNewChat
        ? 'New Chat'
        : 'Agent Chat'

  // Resolve agent avatar/identity for header & minimized pill
  const agentIdentifier = (activeSession?.agentId || activeFriendlyId || '').toLowerCase()
  const isAccountant = agentIdentifier.includes('accountant') || agentIdentifier.includes('fariz')
  const isDeveloper = agentIdentifier.includes('developer') || agentIdentifier.includes('salmanz')
  const isChiefOfStaff = agentIdentifier.includes('chief') || agentIdentifier.includes('hafiz') || agentIdentifier.includes('cos')

  const agentBadge = isAccountant
    ? { name: 'Fariz', role: 'Accountant', emoji: '📊', color: '#10b981' }
    : isDeveloper
      ? { name: 'Salmanz', role: 'Developer', emoji: '💻', color: '#3b82f6' }
      : isChiefOfStaff
        ? { name: 'Hafiz', role: 'Chief of Staff', emoji: '⚡', color: '#8b5cf6' }
        : { name: 'Hermes', role: 'AI Agent', emoji: '🤖', color: '#6366f1' }

  // ── Drag & Resize Bounds Management ─────────────────────────────────────
  const [bounds, setBounds] = useState(() => {
    const defaultW = storedBounds?.width || 440
    const defaultH = storedBounds?.height || 620
    let x = storedBounds?.x ?? -1
    let y = storedBounds?.y ?? -1

    if (typeof window !== 'undefined') {
      if (x < 0 || x > window.innerWidth - 100) {
        x = Math.max(16, window.innerWidth - defaultW - 24)
      }
      if (y < 0 || y > window.innerHeight - 100) {
        y = Math.max(16, window.innerHeight - defaultH - 24)
      }
    } else {
      x = 100
      y = 100
    }
    return { x, y, width: defaultW, height: defaultH }
  })

  // Keep bounds in sync with stored bounds when reopened or changed externally
  useEffect(() => {
    if (storedBounds && storedBounds.width && storedBounds.height) {
      setBounds((prev) => {
        let nextX = storedBounds.x
        let nextY = storedBounds.y
        if (typeof window !== 'undefined') {
          if (nextX < 0 || nextX > window.innerWidth - 100) {
            nextX = Math.max(16, window.innerWidth - storedBounds.width - 24)
          }
          if (nextY < 0 || nextY > window.innerHeight - 100) {
            nextY = Math.max(16, window.innerHeight - storedBounds.height - 24)
          }
        }
        return {
          x: nextX,
          y: nextY,
          width: storedBounds.width,
          height: storedBounds.height,
        }
      })
    }
  }, [storedBounds])

  // Window resize listener to keep floating window inside viewport
  useEffect(() => {
    function handleResize() {
      setBounds((prev) => {
        const maxX = Math.max(16, window.innerWidth - prev.width - 16)
        const maxY = Math.max(16, window.innerHeight - prev.height - 16)
        const clampedX = Math.max(16, Math.min(prev.x, maxX))
        const clampedY = Math.max(16, Math.min(prev.y, maxY))
        return { ...prev, x: clampedX, y: clampedY }
      })
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Drag interaction
  const isDraggingRef = useRef(false)
  const dragStartRef = useRef({ startX: 0, startY: 0, initX: 0, initY: 0 })

  const handleDragPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (windowMode !== 'floating') return
    // Ignore click on buttons or inputs in header
    if ((e.target as HTMLElement).closest('button, input, [role="button"], a')) return

    isDraggingRef.current = true
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: bounds.x,
      initY: bounds.y,
    }
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {}
  }

  const handleDragPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || windowMode !== 'floating') return
    const dx = e.clientX - dragStartRef.current.startX
    const dy = e.clientY - dragStartRef.current.startY

    const maxX = Math.max(16, window.innerWidth - bounds.width - 8)
    const maxY = Math.max(16, window.innerHeight - bounds.height - 8)
    const newX = Math.max(8, Math.min(maxX, dragStartRef.current.initX + dx))
    const newY = Math.max(8, Math.min(maxY, dragStartRef.current.initY + dy))

    setBounds((prev) => ({ ...prev, x: newX, y: newY }))
  }

  const handleDragPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return
    isDraggingRef.current = false
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {}
    setChatWindowBounds({ x: bounds.x, y: bounds.y })
  }

  // Resize interaction
  const isResizingRef = useRef(false)
  const resizeStartRef = useRef<{
    startX: number
    startY: number
    initW: number
    initH: number
    initX: number
    dir: 'se' | 'sw'
  }>({ startX: 0, startY: 0, initW: 0, initH: 0, initX: 0, dir: 'se' })

  const handleResizePointerDown = (
    e: React.PointerEvent,
    dir: 'se' | 'sw',
  ) => {
    if (windowMode !== 'floating') return
    e.stopPropagation()
    e.preventDefault()

    isResizingRef.current = true
    resizeStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initW: bounds.width,
      initH: bounds.height,
      initX: bounds.x,
      dir,
    }
    try {
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    } catch {}
  }

  const handleResizePointerMove = (e: React.PointerEvent) => {
    if (!isResizingRef.current || windowMode !== 'floating') return
    e.stopPropagation()
    const dx = e.clientX - resizeStartRef.current.startX
    const dy = e.clientY - resizeStartRef.current.startY

    const minW = 340
    const maxW = Math.min(window.innerWidth - 32, 900)
    const minH = 380
    const maxH = Math.min(window.innerHeight - 32, 1000)

    if (resizeStartRef.current.dir === 'se') {
      const newW = Math.max(minW, Math.min(maxW, resizeStartRef.current.initW + dx))
      const newH = Math.max(minH, Math.min(maxH, resizeStartRef.current.initH + dy))
      setBounds((prev) => ({ ...prev, width: newW, height: newH }))
    } else {
      // sw: expand leftwards and downwards
      const newW = Math.max(minW, Math.min(maxW, resizeStartRef.current.initW - dx))
      const newX = resizeStartRef.current.initX + (resizeStartRef.current.initW - newW)
      const newH = Math.max(minH, Math.min(maxH, resizeStartRef.current.initH + dy))
      setBounds((prev) => ({ ...prev, x: newX, width: newW, height: newH }))
    }
  }

  const handleResizePointerUp = (e: React.PointerEvent) => {
    if (!isResizingRef.current) return
    isResizingRef.current = false
    try {
      ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {}
    setChatWindowBounds({ width: bounds.width, height: bounds.height, x: bounds.x })
  }

  // Session resolution callbacks
  const handleSessionResolved = useCallback(
    (payload: { friendlyId: string; sessionKey: string }) => {
      moveHistoryMessages(
        queryClient,
        'new',
        'new',
        payload.friendlyId,
        payload.sessionKey,
      )
      setForcedSession({
        friendlyId: payload.friendlyId,
        sessionKey: payload.sessionKey,
      })
      setChatPanelSessionKey(payload.friendlyId)
    },
    [queryClient, setChatPanelSessionKey],
  )

  const handleExpand = useCallback(() => {
    setChatPanelOpen(false)
    navigate({
      to: '/chat/$sessionKey',
      params: { sessionKey: activeFriendlyId },
    })
  }, [activeFriendlyId, navigate, setChatPanelOpen])

  const handleClose = useCallback(() => {
    setChatPanelOpen(false)
  }, [setChatPanelOpen])

  const handleMinimize = useCallback(() => {
    setChatWindowMinimized(true)
  }, [setChatWindowMinimized])

  const handleRestore = useCallback(() => {
    setChatWindowMinimized(false)
  }, [setChatWindowMinimized])

  const handleToggleMode = useCallback(() => {
    const nextMode = windowMode === 'floating' ? 'docked' : 'floating'
    setChatWindowMode(nextMode)
  }, [setChatWindowMode, windowMode])

  const handleNewChat = useCallback(() => {
    setForcedSession(null)
    setChatPanelSessionKey('new')
  }, [setChatPanelSessionKey])

  const handleSelectSession = useCallback(
    (friendlyId: string) => {
      setForcedSession(null)
      setChatPanelSessionKey(friendlyId)
    },
    [setChatPanelSessionKey],
  )

  // Simple dropdown state
  const [showSessionList, setShowSessionList] = useState(false)

  // Escape key to close or minimize
  useEffect(() => {
    if (!isOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !isMinimized) {
        e.preventDefault()
        setChatWindowMinimized(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, isMinimized, setChatWindowMinimized])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Minimized Floating Pill */}
          {isMinimized && (
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: 15 }}
              transition={{ duration: 0.15 }}
              className="fixed bottom-6 right-6 z-40 flex items-center gap-2 p-1.5 pl-2.5 rounded-full border border-[var(--theme-border)] bg-[var(--theme-bg)]/95 backdrop-blur-md shadow-2xl text-[var(--theme-text)] select-none hover:border-[var(--theme-border-strong)] transition-all hover:scale-[1.02]"
              style={{
                boxShadow: '0 12px 32px -4px rgba(0, 0, 0, 0.35)',
              }}
            >
              <button
                type="button"
                onClick={handleRestore}
                className="flex items-center gap-2.5 cursor-pointer text-left focus:outline-none"
                title="Restore Agent Chat"
              >
                <div
                  className="relative flex items-center justify-center size-8 rounded-full text-base font-semibold shadow-inner"
                  style={{ backgroundColor: `${agentBadge.color}22` }}
                >
                  {agentBadge.emoji}
                  <span
                    className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-[var(--theme-bg)] animate-pulse"
                    style={{ backgroundColor: agentBadge.color }}
                  />
                </div>
                <div className="flex flex-col pr-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold leading-tight truncate max-w-[140px]">
                      {agentBadge.name}
                    </span>
                    <span className="text-[10px] opacity-60">({agentBadge.role})</span>
                  </div>
                  <span className="text-[10px] text-emerald-500 font-medium leading-none mt-0.5">
                    Live Session · Click to expand
                  </span>
                </div>
              </button>

              <div className="h-4 w-px bg-[var(--theme-border)] mx-0.5" />

              <TooltipProvider>
                <TooltipRoot>
                  <TooltipTrigger
                    onClick={handleClose}
                    render={
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        className="size-7 rounded-full text-[var(--theme-text-muted)] hover:text-[var(--theme-text)] hover:bg-[var(--theme-bg-subtle)]"
                        aria-label="Close chat"
                      >
                        <HugeiconsIcon icon={Cancel01Icon} size={14} />
                      </Button>
                    }
                  />
                  <TooltipContent side="top">Close chat</TooltipContent>
                </TooltipRoot>
              </TooltipProvider>
            </motion.div>
          )}

          {/* Active Floating Window or Docked Panel */}
          {!isMinimized && (
            <>
              {/* In docked mode only, show subtle backdrop if desired */}
              {windowMode === 'docked' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="fixed inset-0 z-20 pointer-events-none md:hidden"
                  style={{ background: 'rgba(0,0,0,0.2)' }}
                  aria-hidden
                />
              )}

              <motion.div
                initial={
                  windowMode === 'floating'
                    ? { scale: 0.95, opacity: 0 }
                    : { x: '100%', opacity: 0 }
                }
                animate={
                  windowMode === 'floating'
                    ? { scale: 1, opacity: 1 }
                    : { x: 0, opacity: 1 }
                }
                exit={
                  windowMode === 'floating'
                    ? { scale: 0.95, opacity: 0 }
                    : { x: '100%', opacity: 0 }
                }
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className={[
                  'overflow-hidden flex flex-col z-40 border transition-[border-radius,box-shadow]',
                  windowMode === 'floating'
                    ? 'fixed rounded-2xl shadow-2xl bg-[var(--theme-bg)]/95 backdrop-blur-xl border-[var(--theme-border)]'
                    : 'fixed right-0 bottom-0 top-[var(--titlebar-h,0px)] h-[calc(100dvh-var(--titlebar-h,0px))] w-[440px] max-w-[100vw] border-l bg-[var(--theme-bg)] border-[var(--theme-border)] shadow-xl',
                ].join(' ')}
                style={
                  windowMode === 'floating'
                    ? {
                        left: bounds.x,
                        top: bounds.y,
                        width: bounds.width,
                        height: bounds.height,
                        boxShadow:
                          '0 20px 40px -8px rgba(0, 0, 0, 0.45), 0 0 0 1px var(--theme-border)',
                      }
                    : {}
                }
              >
                {/* Window Header */}
                <div
                  onPointerDown={handleDragPointerDown}
                  onPointerMove={handleDragPointerMove}
                  onPointerUp={handleDragPointerUp}
                  className={[
                    'flex items-center justify-between h-11 px-3 border-b border-[var(--theme-border)] shrink-0 select-none bg-[var(--theme-bg-subtle)]/70',
                    windowMode === 'floating'
                      ? 'cursor-grab active:cursor-grabbing'
                      : '',
                  ].join(' ')}
                >
                  {/* Left: Drag grip & Agent Title with dropdown */}
                  <div className="flex items-center gap-2 min-w-0">
                    {windowMode === 'floating' && (
                      <span className="text-[var(--theme-text-muted)] opacity-60">
                        <HugeiconsIcon icon={Drag01Icon} size={14} />
                      </span>
                    )}

                    <div
                      className="flex items-center justify-center size-6 rounded-lg text-xs"
                      style={{ backgroundColor: `${agentBadge.color}25` }}
                    >
                      {agentBadge.emoji}
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowSessionList((v) => !v)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-[var(--theme-text)] hover:text-accent-500 truncate max-w-[180px] transition-colors"
                      title={panelTitle}
                    >
                      <span className="truncate">{panelTitle}</span>
                      <span className="text-[10px] text-[var(--theme-text-muted)] font-normal">
                        ▾
                      </span>
                    </button>
                  </div>

                  {/* Right Header Window Controls */}
                  <div className="flex items-center gap-0.5">
                    <TooltipProvider>
                      {/* New Chat */}
                      <TooltipRoot>
                        <TooltipTrigger
                          onClick={handleNewChat}
                          render={
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              className="size-7 rounded-lg text-[var(--theme-text-muted)] hover:text-[var(--theme-text)] hover:bg-[var(--theme-bg)]"
                              aria-label="New chat"
                            >
                              <HugeiconsIcon
                                icon={PencilEdit02Icon}
                                size={14}
                                strokeWidth={1.5}
                              />
                            </Button>
                          }
                        />
                        <TooltipContent side="bottom">New chat</TooltipContent>
                      </TooltipRoot>

                      {/* Minimize to Pill */}
                      <TooltipRoot>
                        <TooltipTrigger
                          onClick={handleMinimize}
                          render={
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              className="size-7 rounded-lg text-[var(--theme-text-muted)] hover:text-[var(--theme-text)] hover:bg-[var(--theme-bg)]"
                              aria-label="Minimize to pill"
                            >
                              <HugeiconsIcon
                                icon={Minimize01Icon}
                                size={14}
                                strokeWidth={1.5}
                              />
                            </Button>
                          }
                        />
                        <TooltipContent side="bottom">Minimize</TooltipContent>
                      </TooltipRoot>

                      {/* Dock / Float Toggle */}
                      <TooltipRoot>
                        <TooltipTrigger
                          onClick={handleToggleMode}
                          render={
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              className="size-7 rounded-lg text-[var(--theme-text-muted)] hover:text-[var(--theme-text)] hover:bg-[var(--theme-bg)]"
                              aria-label={
                                windowMode === 'floating'
                                  ? 'Dock to side'
                                  : 'Detach as floating window'
                              }
                            >
                              <HugeiconsIcon
                                icon={
                                  windowMode === 'floating'
                                    ? SidebarRightIcon
                                    : WindowsNewIcon
                                }
                                size={14}
                                strokeWidth={1.5}
                              />
                            </Button>
                          }
                        />
                        <TooltipContent side="bottom">
                          {windowMode === 'floating'
                            ? 'Dock to side'
                            : 'Float window'}
                        </TooltipContent>
                      </TooltipRoot>

                      {/* Expand to Full-Screen Route */}
                      <TooltipRoot>
                        <TooltipTrigger
                          onClick={handleExpand}
                          render={
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              className="size-7 rounded-lg text-[var(--theme-text-muted)] hover:text-[var(--theme-text)] hover:bg-[var(--theme-bg)]"
                              aria-label="Full-screen chat"
                            >
                              <HugeiconsIcon
                                icon={ArrowExpand01Icon}
                                size={14}
                                strokeWidth={1.5}
                              />
                            </Button>
                          }
                        />
                        <TooltipContent side="bottom">Full view</TooltipContent>
                      </TooltipRoot>

                      {/* Close Window */}
                      <TooltipRoot>
                        <TooltipTrigger
                          onClick={handleClose}
                          render={
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              className="size-7 rounded-lg text-[var(--theme-text-muted)] hover:text-red-500 hover:bg-[var(--theme-bg)]"
                              aria-label="Close chat"
                            >
                              <HugeiconsIcon
                                icon={Cancel01Icon}
                                size={14}
                                strokeWidth={1.5}
                              />
                            </Button>
                          }
                        />
                        <TooltipContent side="bottom">Close (Esc)</TooltipContent>
                      </TooltipRoot>
                    </TooltipProvider>
                  </div>
                </div>

                {/* Session Switcher Dropdown */}
                <AnimatePresence>
                  {showSessionList && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="border-b border-[var(--theme-border)] bg-[var(--theme-bg)] overflow-hidden shrink-0"
                    >
                      <div className="max-h-48 overflow-y-auto py-1 divide-y divide-[var(--theme-border)]/50">
                        {sessions.map((s) => (
                          <button
                            key={s.key}
                            type="button"
                            onClick={() => {
                              handleSelectSession(s.friendlyId)
                              setShowSessionList(false)
                            }}
                            className={`w-full text-left px-3 py-2 text-xs truncate flex items-center justify-between transition-colors ${
                              s.friendlyId === activeFriendlyId
                                ? 'bg-accent-500/10 text-accent-500 font-medium'
                                : 'text-[var(--theme-text)] hover:bg-[var(--theme-bg-subtle)]'
                            }`}
                          >
                            <span className="truncate">
                              {s.label || s.title || s.derivedTitle || s.friendlyId}
                            </span>
                            {s.agentId && (
                              <span className="text-[10px] opacity-60 ml-2 shrink-0">
                                {s.agentId}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Chat Screen Body */}
                <div className="relative flex flex-1 min-h-0 flex-col overflow-hidden bg-[var(--theme-bg)]">
                  <ChatScreen
                    key={activeFriendlyId}
                    activeFriendlyId={activeFriendlyId}
                    isNewChat={isNewChat}
                    forcedSessionKey={forcedSessionKey}
                    onSessionResolved={
                      isNewChat ? handleSessionResolved : undefined
                    }
                    compact
                  />
                </div>

                {/* Corner Resize Handles (Floating Mode only) */}
                {windowMode === 'floating' && (
                  <>
                    {/* Bottom-right corner resize */}
                    <div
                      onPointerDown={(e) => handleResizePointerDown(e, 'se')}
                      onPointerMove={handleResizePointerMove}
                      onPointerUp={handleResizePointerUp}
                      className="absolute bottom-0 right-0 size-4 cursor-se-resize flex items-end justify-end p-0.5 text-[var(--theme-text-muted)] hover:text-accent-500 select-none z-10"
                      title="Resize window"
                    >
                      <svg
                        width="8"
                        height="8"
                        viewBox="0 0 8 8"
                        className="opacity-60 hover:opacity-100"
                      >
                        <path
                          d="M7 1L1 7M7 4L4 7M7 7H7"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>

                    {/* Bottom-left corner resize */}
                    <div
                      onPointerDown={(e) => handleResizePointerDown(e, 'sw')}
                      onPointerMove={handleResizePointerMove}
                      onPointerUp={handleResizePointerUp}
                      className="absolute bottom-0 left-0 size-4 cursor-sw-resize flex items-end justify-start p-0.5 text-[var(--theme-text-muted)] hover:text-accent-500 select-none z-10"
                      title="Resize window"
                    >
                      <svg
                        width="8"
                        height="8"
                        viewBox="0 0 8 8"
                        className="opacity-60 hover:opacity-100 scale-x-[-1]"
                      >
                        <path
                          d="M7 1L1 7M7 4L4 7M7 7H7"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                  </>
                )}
              </motion.div>
            </>
          )}
        </>
      )}
    </AnimatePresence>
  )
}
