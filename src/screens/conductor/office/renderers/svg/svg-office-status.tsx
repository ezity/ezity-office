/**
 * SVG Office Status & Badging Helpers
 *
 * Provides visual cues for operational status, attention states, and monitor labels.
 * Strictly uses real scene state without synthetic random animations.
 */

import React from 'react'
import type { AgentAttentionState, OfficeAgentOperationalStatus } from '@/types/office-scene'

export function getStatusColorHex(status: OfficeAgentOperationalStatus): string {
  switch (status) {
    case 'working':
      return '#10b981' // emerald-500
    case 'waiting':
      return '#f59e0b' // amber-500
    case 'error':
      return '#ef4444' // red-500
    case 'offline':
      return '#64748b' // slate-500
    case 'idle':
    default:
      return '#94a3b8' // slate-400
  }
}

export function getAttentionBadgeMeta(
  attentionState: AgentAttentionState,
): { label: string; bg: string; text: string; border: string; icon: string } | null {
  switch (attentionState) {
    case 'waiting_approval':
      return {
        label: 'Awaiting Sign-off',
        bg: '#78350f',
        text: '#fef3c7',
        border: '#f59e0b',
        icon: '⚠️',
      }
    case 'needs_input':
      return {
        label: 'Needs Input',
        bg: '#1e3a8a',
        text: '#dbeafe',
        border: '#3b82f6',
        icon: '💬',
      }
    case 'error':
      return {
        label: 'Attention Required',
        bg: '#7f1d1d',
        text: '#fee2e2',
        border: '#ef4444',
        icon: '❌',
      }
    case 'working':
    case 'nominal':
    default:
      return null
  }
}

export function getCleanMonitorText(
  currentTaskTitle?: string,
  lastActivityText?: string,
  status: OfficeAgentOperationalStatus = 'idle',
): string {
  if (currentTaskTitle && currentTaskTitle.trim()) {
    const clean = currentTaskTitle.replace(/\s+/g, ' ').trim()
    return clean.length > 36 ? `${clean.slice(0, 35)}…` : clean
  }
  if (status === 'working' && lastActivityText && lastActivityText.trim()) {
    const clean = lastActivityText.replace(/\s+/g, ' ').trim()
    return clean.length > 36 ? `${clean.slice(0, 35)}…` : clean
  }
  if (status === 'working') return 'Processing task…'
  if (status === 'waiting') return 'Waiting for action'
  if (status === 'error') return 'System Alert'
  if (status === 'offline') return 'Offline'
  return 'Ready'
}

/**
 * SVG defs for gradients and glow filters used across the office.
 */
export function SvgOfficeDefs({ enableReducedMotion = false }: { enableReducedMotion?: boolean }) {
  return (
    <defs>
      {/* Background & Room Gradients */}
      <radialGradient id="ezity-floor-glow" cx="50%" cy="50%" r="70%">
        <stop offset="0%" stopColor="#0f172a" stopOpacity="0.8" />
        <stop offset="100%" stopColor="#020617" stopOpacity="1" />
      </radialGradient>

      <linearGradient id="ezity-hallway-gradient" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#1e293b" stopOpacity="0.4" />
        <stop offset="50%" stopColor="#0ea5e9" stopOpacity="0.1" />
        <stop offset="100%" stopColor="#1e293b" stopOpacity="0.4" />
      </linearGradient>

      {/* Department Room Panel Gradients */}
      <linearGradient id="grad-room-executive" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#3b0764" stopOpacity="0.35" />
        <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0.15" />
      </linearGradient>

      <linearGradient id="grad-room-finance" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#064e3b" stopOpacity="0.35" />
        <stop offset="100%" stopColor="#022c22" stopOpacity="0.15" />
      </linearGradient>

      <linearGradient id="grad-room-engineering" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#0369a1" stopOpacity="0.35" />
        <stop offset="100%" stopColor="#082f49" stopOpacity="0.15" />
      </linearGradient>

      <linearGradient id="grad-room-conference" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#1e293b" stopOpacity="0.5" />
        <stop offset="100%" stopColor="#0f172a" stopOpacity="0.3" />
      </linearGradient>

      <linearGradient id="grad-room-review" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#713f12" stopOpacity="0.3" />
        <stop offset="100%" stopColor="#1e293b" stopOpacity="0.2" />
      </linearGradient>

      <linearGradient id="grad-room-inbox" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#134e4a" stopOpacity="0.35" />
        <stop offset="100%" stopColor="#042f2e" stopOpacity="0.2" />
      </linearGradient>

      {/* Desk and Furniture Gradients */}
      <linearGradient id="grad-desk-executive" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#334155" />
        <stop offset="100%" stopColor="#1e293b" />
      </linearGradient>

      <linearGradient id="grad-desk-workstation" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#1e293b" />
        <stop offset="100%" stopColor="#0f172a" />
      </linearGradient>

      <linearGradient id="grad-conference-table" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#1e293b" />
        <stop offset="50%" stopColor="#334155" />
        <stop offset="100%" stopColor="#1e293b" />
      </linearGradient>

      {/* Monitor Display Gradient */}
      <linearGradient id="grad-monitor-active" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#0c4a6e" />
        <stop offset="100%" stopColor="#082f49" />
      </linearGradient>

      <linearGradient id="grad-monitor-idle" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#1e293b" />
        <stop offset="100%" stopColor="#0f172a" />
      </linearGradient>

      {/* Filter Effects */}
      <filter id="desk-shadow" x="-10%" y="-10%" width="120%" height="130%">
        <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#000000" floodOpacity="0.5" />
      </filter>

      <filter id="badge-glow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#0ea5e9" floodOpacity="0.4" />
      </filter>

      <filter id="alert-glow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#f59e0b" floodOpacity="0.6" />
      </filter>

      {/* Embedded CSS animations */}
      <style>
        {`
          .office-interactive-focus:focus-visible {
            outline: 2px solid #38bdf8;
            outline-offset: 2px;
          }
          .office-hover-card {
            transition: transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), filter 0.18s ease;
          }
          .office-hover-card:hover {
            transform: translateY(-2px);
            filter: drop-shadow(0 6px 12px rgba(0, 0, 0, 0.45));
          }
          ${
            enableReducedMotion
              ? `
            .office-pulse-working, .office-pulse-alert, .office-pulse-mission {
              animation: none !important;
            }
          `
              : `
            @keyframes office-pulse-working {
              0%, 100% { opacity: 0.85; transform: scale(1); }
              50% { opacity: 1; transform: scale(1.05); }
            }
            @keyframes office-pulse-alert {
              0%, 100% { opacity: 0.9; }
              50% { opacity: 0.5; }
            }
            @keyframes office-pulse-mission {
              0%, 100% { opacity: 0.8; stroke: #38bdf8; }
              50% { opacity: 1; stroke: #06b6d4; }
            }
            .office-pulse-working {
              animation: office-pulse-working 2.5s infinite ease-in-out;
            }
            .office-pulse-alert {
              animation: office-pulse-alert 1.8s infinite ease-in-out;
            }
            .office-pulse-mission {
              animation: office-pulse-mission 3s infinite ease-in-out;
            }
          `
          }
        `}
      </style>
    </defs>
  )
}
