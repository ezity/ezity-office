/**
 * SVG Office Defs, Palettes & Micro-Animations
 * Phase I-C.2 — Isometric Game-Style Art Pass
 *
 * Provides warm cartoon-game shading gradients, isometric surface
 * lighting, depth shadows, and accessible keyframe animations.
 */

import React from 'react'
import type { AgentAttentionState, OfficeAgentOperationalStatus } from '@/types/office-scene'

export function getStatusColorHex(status: OfficeAgentOperationalStatus): string {
  switch (status) {
    case 'working':
      return '#059669' // emerald-600 (crisp on light backgrounds)
    case 'waiting':
      return '#d97706' // amber-600
    case 'error':
      return '#dc2626' // red-600
    case 'offline':
      return '#94a3b8' // slate-400
    case 'idle':
    default:
      return '#0284c7' // sky-600
  }
}

export function getAttentionBadgeMeta(
  attentionState: AgentAttentionState,
): { label: string; bg: string; text: string; border: string; icon: string } | null {
  switch (attentionState) {
    case 'waiting_approval':
      return {
        label: 'Awaiting Sign-off',
        bg: '#fef3c7',
        text: '#92400e',
        border: '#f59e0b',
        icon: '⚠️',
      }
    case 'needs_input':
      return {
        label: 'Needs Input',
        bg: '#e0f2fe',
        text: '#075985',
        border: '#38bdf8',
        icon: '💬',
      }
    case 'error':
      return {
        label: 'Attention Required',
        bg: '#fee2e2',
        text: '#991b1b',
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
 * SVG defs for isometric game-style office renderer.
 * Provides cartoon shading gradients, isometric surface fills,
 * natural drop-shadows, and character animation keyframes.
 */
export function SvgOfficeDefs({ enableReducedMotion = false }: { enableReducedMotion?: boolean }) {
  return (
    <defs>
      {/* ═══════════════════════════════════════════
          1. ISOMETRIC FLOOR & ENVIRONMENT GRADIENTS
      ═══════════════════════════════════════════ */}

      {/* Main floor — warm light cream */}
      <linearGradient id="ezity-light-floor" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#faf7f2" />
        <stop offset="50%" stopColor="#f5f0e8" />
        <stop offset="100%" stopColor="#ede8df" />
      </linearGradient>

      {/* Hallway floor runner */}
      <linearGradient id="ezity-hallway-light" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#e8e2d8" stopOpacity="0.7" />
        <stop offset="50%" stopColor="#f0ebe3" stopOpacity="0.9" />
        <stop offset="100%" stopColor="#e8e2d8" stopOpacity="0.7" />
      </linearGradient>

      {/* Isometric tile pattern (subtle) */}
      <pattern id="iso-tile-grid" width="60" height="30" patternUnits="userSpaceOnUse">
        <line x1="0" y1="15" x2="30" y2="0" stroke="#ddd6c8" strokeWidth="0.4" strokeOpacity="0.5" />
        <line x1="30" y1="0" x2="60" y2="15" stroke="#ddd6c8" strokeWidth="0.4" strokeOpacity="0.5" />
        <line x1="0" y1="15" x2="30" y2="30" stroke="#ddd6c8" strokeWidth="0.4" strokeOpacity="0.5" />
        <line x1="30" y1="30" x2="60" y2="15" stroke="#ddd6c8" strokeWidth="0.4" strokeOpacity="0.5" />
      </pattern>

      {/* ═══════════════════════════════════════════
          2. DEPARTMENT ROOM RUG GRADIENTS (PASTELS)
      ═══════════════════════════════════════════ */}

      <linearGradient id="grad-room-executive-light" x1="0" y1="0" x2="0.3" y2="1">
        <stop offset="0%" stopColor="#f0eaff" />
        <stop offset="100%" stopColor="#e4d8f8" />
      </linearGradient>

      <linearGradient id="grad-room-finance-light" x1="0" y1="0" x2="0.3" y2="1">
        <stop offset="0%" stopColor="#e6f7ef" />
        <stop offset="100%" stopColor="#d0f0df" />
      </linearGradient>

      <linearGradient id="grad-room-engineering-light" x1="0" y1="0" x2="0.3" y2="1">
        <stop offset="0%" stopColor="#e6f2fd" />
        <stop offset="100%" stopColor="#d0e8fa" />
      </linearGradient>

      <linearGradient id="grad-room-conference-light" x1="0" y1="0" x2="0.3" y2="1">
        <stop offset="0%" stopColor="#f0eef8" />
        <stop offset="100%" stopColor="#e4e0f0" />
      </linearGradient>

      <linearGradient id="grad-room-review-light" x1="0" y1="0" x2="0.3" y2="1">
        <stop offset="0%" stopColor="#fef8e8" />
        <stop offset="100%" stopColor="#fcefc8" />
      </linearGradient>

      <linearGradient id="grad-room-inbox-light" x1="0" y1="0" x2="0.3" y2="1">
        <stop offset="0%" stopColor="#e8f8f2" />
        <stop offset="100%" stopColor="#d0f0e4" />
      </linearGradient>

      {/* ═══════════════════════════════════════════
          3. ISOMETRIC FURNITURE SURFACE GRADIENTS
      ═══════════════════════════════════════════ */}

      {/* Desk top — warm natural oak */}
      <linearGradient id="grad-desk-top" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#e8c98e" />
        <stop offset="100%" stopColor="#d4a373" />
      </linearGradient>

      {/* Desk front face — slightly darker */}
      <linearGradient id="grad-desk-front" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#c4935f" />
        <stop offset="100%" stopColor="#a67c52" />
      </linearGradient>

      {/* Desk side face — darkest */}
      <linearGradient id="grad-desk-side" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#a67c52" />
        <stop offset="100%" stopColor="#8b6843" />
      </linearGradient>

      {/* White desk surface (modern standing desk) */}
      <linearGradient id="grad-desk-white-top" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="100%" stopColor="#f1f5f9" />
      </linearGradient>

      {/* Conference table top */}
      <linearGradient id="grad-table-conference-light" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#e8c98e" />
        <stop offset="100%" stopColor="#d4a373" />
      </linearGradient>

      {/* Wall face gradient — light concrete/drywall */}
      <linearGradient id="grad-wall-face" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#e8e4de" />
        <stop offset="100%" stopColor="#d8d2c8" />
      </linearGradient>

      {/* Wall side face — darker */}
      <linearGradient id="grad-wall-side" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#d0ccc4" />
        <stop offset="100%" stopColor="#c0bab0" />
      </linearGradient>

      {/* Monitor screen glow */}
      <linearGradient id="grad-monitor-screen" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#e0f2fe" />
        <stop offset="100%" stopColor="#bae6fd" />
      </linearGradient>

      {/* Chair upholstery */}
      <linearGradient id="grad-chair-dark" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#475569" />
        <stop offset="100%" stopColor="#334155" />
      </linearGradient>

      {/* Plant pot terracotta */}
      <linearGradient id="grad-pot-terra" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#d97706" />
        <stop offset="100%" stopColor="#b45309" />
      </linearGradient>

      {/* Cork board */}
      <linearGradient id="grad-cork" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#f5d9a0" />
        <stop offset="100%" stopColor="#e8c580" />
      </linearGradient>

      {/* Legacy compatibility aliases */}
      <linearGradient id="grad-desk-wood-light" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#e8c98e" />
        <stop offset="100%" stopColor="#d4a373" />
      </linearGradient>

      <linearGradient id="grad-desk-wood-edge" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#c4935f" />
        <stop offset="100%" stopColor="#a67c52" />
      </linearGradient>

      {/* ═══════════════════════════════════════════
          4. DROP SHADOW FILTERS
      ═══════════════════════════════════════════ */}

      {/* Ground shadow for objects and characters */}
      <filter id="soft-shadow" x="-8%" y="-8%" width="116%" height="120%">
        <feDropShadow dx="2" dy="3" stdDeviation="3" floodColor="#5c4a2e" floodOpacity="0.12" />
      </filter>

      {/* Heavier furniture shadow */}
      <filter id="furniture-shadow" x="-10%" y="-10%" width="120%" height="125%">
        <feDropShadow dx="3" dy="5" stdDeviation="5" floodColor="#5c4a2e" floodOpacity="0.15" />
      </filter>

      {/* Subtle badge shadow */}
      <filter id="badge-soft-shadow" x="-12%" y="-12%" width="124%" height="124%">
        <feDropShadow dx="1" dy="2" stdDeviation="2" floodColor="#5c4a2e" floodOpacity="0.15" />
      </filter>

      {/* ═══════════════════════════════════════════
          5. CSS ANIMATIONS & INTERACTION STYLES
      ═══════════════════════════════════════════ */}
      <style>
        {`
          .office-interactive-focus:focus-visible {
            outline: 2px solid #6366f1;
            outline-offset: 2px;
          }
          .office-hover-card {
            transition: transform 0.15s ease-out, filter 0.15s ease-out;
          }
          .office-hover-card:hover {
            filter: drop-shadow(0 4px 8px rgba(92, 74, 46, 0.18));
          }
          ${
            enableReducedMotion
              ? `
            .char-walking-bob, .char-left-leg-walk, .char-right-leg-walk,
            .char-arm-swing-l, .char-arm-swing-r,
            .office-pulse-working, .office-pulse-alert {
              animation: none !important;
            }
          `
              : `
            @keyframes char-bob {
              0%, 100% { transform: translateY(0); }
              25% { transform: translateY(-2px); }
              75% { transform: translateY(1px); }
            }
            @keyframes left-leg-swing {
              0%, 100% { transform: rotate(-12deg); }
              50% { transform: rotate(12deg); }
            }
            @keyframes right-leg-swing {
              0%, 100% { transform: rotate(12deg); }
              50% { transform: rotate(-12deg); }
            }
            @keyframes arm-swing-left {
              0%, 100% { transform: rotate(6deg); }
              50% { transform: rotate(-6deg); }
            }
            @keyframes arm-swing-right {
              0%, 100% { transform: rotate(-6deg); }
              50% { transform: rotate(6deg); }
            }
            .char-walking-bob {
              animation: char-bob 0.35s infinite ease-in-out;
            }
            .char-left-leg-walk {
              animation: left-leg-swing 0.35s infinite ease-in-out;
              transform-origin: center 0px;
            }
            .char-right-leg-walk {
              animation: right-leg-swing 0.35s infinite ease-in-out;
              transform-origin: center 0px;
            }
            .char-arm-swing-l {
              animation: arm-swing-left 0.35s infinite ease-in-out;
              transform-origin: center 0px;
            }
            .char-arm-swing-r {
              animation: arm-swing-right 0.35s infinite ease-in-out;
              transform-origin: center 0px;
            }
            @keyframes soft-pulse-active {
              0%, 100% { opacity: 0.85; }
              50% { opacity: 1; }
            }
            .office-pulse-working {
              animation: soft-pulse-active 2s infinite ease-in-out;
            }
            .office-pulse-alert {
              animation: soft-pulse-active 1.5s infinite ease-in-out;
            }
          `
          }
        `}
      </style>
    </defs>
  )
}
