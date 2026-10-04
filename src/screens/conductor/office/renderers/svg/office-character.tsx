/**
 * Isometric Game-Style Office Character
 * Phase I-C.2 — Game-Style Art Pass
 *
 * Renders a readable cartoon management-sim character with:
 * - Larger head-to-body ratio (chibi/cute proportions)
 * - Distinct role-based outfits with clear color coding
 * - Seated, standing, and walking pose states
 * - Subtle walking animation (bob + leg swing + arm swing)
 * - ~1.5-2× larger than Phase I-C.1 characters
 *
 * Does NOT use emoji as main body. Emoji is tiny role badge only.
 */

import React from 'react'
import type { OfficeAgentSceneNode } from '@/types/office-scene'

export interface OfficeCharacterProps {
  agent: OfficeAgentSceneNode
  isMoving?: boolean
  isSeated?: boolean
  isSelected?: boolean
  isTyping?: boolean
  isThinking?: boolean
  isToolCalling?: boolean
  facing?: 'left' | 'right' | 'front'
  roleColor?: string
}

/** Character palette per department */
function getCharacterPalette(agent: OfficeAgentSceneNode) {
  const isCos = agent.agentDefinitionId === 'ezity-chief-of-staff' || agent.department === 'executive'
  const isAcct = agent.agentDefinitionId === 'ezity-accountant' || agent.department === 'finance'
  const isDev = agent.agentDefinitionId === 'ezity-developer' || agent.department === 'engineering'

  if (isCos) {
    return {
      role: 'cos' as const,
      skinTone: '#fcd9b6',
      hairColor: '#2d2040',
      outfitPrimary: '#1e1b4b',   // Navy blazer
      outfitSecondary: '#ffffff', // White shirt
      accent: '#7c3aed',          // Purple tie
      pantsColor: '#334155',
      shoeColor: '#1e293b',
    }
  }
  if (isAcct) {
    return {
      role: 'acct' as const,
      skinTone: '#fde2c0',
      hairColor: '#5c3a1e',
      outfitPrimary: '#064e3b',   // Dark green vest
      outfitSecondary: '#ffffff', // White shirt
      accent: '#10b981',          // Green accent
      pantsColor: '#334155',
      shoeColor: '#1e293b',
    }
  }
  if (isDev) {
    return {
      role: 'dev' as const,
      skinTone: '#fcd9b6',
      hairColor: '#1e293b',
      outfitPrimary: '#0369a1',   // Blue hoodie
      outfitSecondary: '#7dd3fc', // Light blue inner
      accent: '#38bdf8',          // Cyan accent
      pantsColor: '#475569',
      shoeColor: '#334155',
    }
  }
  // Fallback
  return {
    role: 'generic' as const,
    skinTone: '#fcd9b6',
    hairColor: '#475569',
    outfitPrimary: '#6366f1',
    outfitSecondary: '#e0e7ff',
    accent: '#818cf8',
    pantsColor: '#475569',
    shoeColor: '#334155',
  }
}

export function OfficeCharacter({
  agent,
  isMoving = false,
  isSeated = false,
  isSelected = false,
  isTyping = false,
  isThinking = false,
  isToolCalling = false,
}: OfficeCharacterProps) {
  const pal = getCharacterPalette(agent)

  return (
    <g id={`character-${agent.id}`} className={isMoving ? 'char-walking-bob' : ''}>
      {/* ═══ Selection Halo ═══ */}
      {isSelected && (
        <ellipse
          cx="0"
          cy={isSeated ? 8 : 28}
          rx="30"
          ry="14"
          fill="none"
          stroke="#6366f1"
          strokeWidth="2.5"
          strokeDasharray="5 3"
          opacity="0.8"
        />
      )}

      {/* ═══ Ground Shadow ═══ */}
      <ellipse
        cx="0"
        cy={isSeated ? 16 : 32}
        rx={isSeated ? 22 : 18}
        ry="6"
        fill="#5c4a2e"
        fillOpacity="0.15"
      />

      {/* ═══ LEGS (visible when standing or walking) ═══ */}
      {!isSeated && (
        <g id="char-legs">
          {/* Left Leg */}
          <g className={isMoving ? 'char-left-leg-walk' : ''}>
            <rect
              x="-10"
              y="10"
              width="8"
              height="18"
              rx="4"
              fill={pal.pantsColor}
            />
            {/* Shoe */}
            <ellipse cx="-6" cy="28" rx="6" ry="3" fill={pal.shoeColor} />
          </g>
          {/* Right Leg */}
          <g className={isMoving ? 'char-right-leg-walk' : ''}>
            <rect
              x="2"
              y="10"
              width="8"
              height="18"
              rx="4"
              fill={pal.pantsColor}
            />
            {/* Shoe */}
            <ellipse cx="6" cy="28" rx="6" ry="3" fill={pal.shoeColor} />
          </g>
        </g>
      )}

      {/* ═══ BODY / TORSO ═══ */}
      <g id="char-body">
        {/* Main torso shape */}
        <path
          d={
            isSeated
              ? 'M -16,-4 Q -18,-8 -14,-10 L 14,-10 Q 18,-8 16,-4 L 14,14 L -14,14 Z'
              : 'M -16,-4 Q -18,-8 -14,-12 L 14,-12 Q 18,-8 16,-4 L 14,12 L -14,12 Z'
          }
          fill={pal.outfitPrimary}
          stroke={pal.outfitPrimary}
          strokeWidth="0.5"
        />

        {/* Outfit Details */}
        {pal.role === 'cos' && (
          <>
            {/* Blazer lapels */}
            <path d="M -6,-10 L 0,-2 L 6,-10" fill="none" stroke={pal.outfitSecondary} strokeWidth="1.5" />
            {/* Purple tie */}
            <polygon points="-3,-8 0,-1 3,-8" fill={pal.accent} />
            <polygon points="-2,-1 0,8 2,-1" fill={pal.accent} />
            {/* Blazer pocket square */}
            <rect x="-12" y="-4" width="5" height="4" rx="1" fill={pal.accent} fillOpacity="0.6" />
          </>
        )}
        {pal.role === 'acct' && (
          <>
            {/* Vest over white shirt */}
            <path d="M -8,-10 L 0,-3 L 8,-10" fill={pal.outfitSecondary} stroke={pal.outfitSecondary} strokeWidth="0.5" />
            {/* Vest front buttons */}
            <circle cx="0" cy="0" r="1.2" fill={pal.accent} />
            <circle cx="0" cy="5" r="1.2" fill={pal.accent} />
          </>
        )}
        {pal.role === 'dev' && (
          <>
            {/* Hoodie details — zipper line */}
            <line x1="0" y1="-10" x2="0" y2="10" stroke={pal.outfitSecondary} strokeWidth="1" />
            {/* Hood collar */}
            <path d="M -8,-10 Q 0,-5 8,-10" fill="none" stroke={pal.outfitSecondary} strokeWidth="1.5" />
            {/* Kangaroo pocket */}
            <rect x="-8" y="2" width="16" height="7" rx="3" fill={pal.outfitSecondary} fillOpacity="0.3" stroke={pal.outfitSecondary} strokeWidth="0.5" />
          </>
        )}

        {/* Arms */}
        <g
          className={
            isMoving
              ? 'char-arm-swing-l'
              : isTyping || isToolCalling
                ? 'char-typing-arm-l'
                : ''
          }
        >
          <rect
            x="-20"
            y={isSeated ? -8 : -10}
            width="7"
            height="16"
            rx="3.5"
            fill={pal.outfitPrimary}
            transform={
              isTyping || isToolCalling
                ? 'rotate(32, -20, -8)'
                : isSeated
                  ? 'rotate(20, -20, -8)'
                  : 'rotate(5, -20, -10)'
            }
          />
          {/* Hand */}
          <circle
            cx={isTyping || isToolCalling ? -11 : isSeated ? -14 : -17}
            cy={isTyping || isToolCalling ? 6 : isSeated ? 8 : 8}
            r="3.5"
            fill={pal.skinTone}
          />
        </g>
        <g
          className={
            isMoving
              ? 'char-arm-swing-r'
              : isTyping || isToolCalling
                ? 'char-typing-arm-r'
                : ''
          }
        >
          <rect
            x="13"
            y={isSeated ? -8 : -10}
            width="7"
            height="16"
            rx="3.5"
            fill={pal.outfitPrimary}
            transform={
              isTyping || isToolCalling
                ? 'rotate(-32, 13, -8)'
                : isSeated
                  ? 'rotate(-20, 13, -8)'
                  : 'rotate(-5, 13, -10)'
            }
          />
          {/* Hand */}
          <circle
            cx={isTyping || isToolCalling ? 11 : isSeated ? 14 : 17}
            cy={isTyping || isToolCalling ? 6 : isSeated ? 8 : 8}
            r="3.5"
            fill={pal.skinTone}
          />
        </g>

        {/* Desk mini-keyboard & typing sparks when seated & typing/running tools */}
        {isSeated && (isTyping || isToolCalling) && (
          <g id="char-desk-typing-surface" transform="translate(0, 7)">
            <rect
              x="-11"
              y="-1"
              width="22"
              height="6"
              rx="1.5"
              fill="#1e293b"
              stroke={isToolCalling ? '#22d3ee' : '#34d399'}
              strokeWidth="0.8"
            />
            <line x1="-8" y1="2" x2="-3" y2="2" stroke="#38bdf8" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="-1" y1="2" x2="3" y2="2" stroke="#38bdf8" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="5" y1="2" x2="8" y2="2" stroke="#38bdf8" strokeWidth="1.2" strokeLinecap="round" />
            <circle cx="-5" cy="-3" r="1.2" fill="#38bdf8" className="char-sparkle-dot" />
            <circle cx="5" cy="-3" r="1.2" fill="#34d399" className="char-sparkle-dot" />
          </g>
        )}
      </g>

      {/* ═══ HEAD & FACE ═══ */}
      <g
        id="char-head"
        transform="translate(0, -20)"
        className={isThinking ? 'char-thinking-head' : ''}
      >
        {/* Thinking / Tool call floating badge */}
        {isThinking && (
          <g transform="translate(13, -10)" className="char-sparkle-dot">
            <circle cx="0" cy="0" r="4.5" fill="#eef2ff" stroke="#818cf8" strokeWidth="0.8" />
            <text x="0" y="2.8" textAnchor="middle" fontSize="6">💭</text>
          </g>
        )}
        {isToolCalling && (
          <g transform="translate(13, -10)" className="char-sparkle-dot">
            <circle cx="0" cy="0" r="4.5" fill="#ecfeff" stroke="#06b6d4" strokeWidth="0.8" />
            <text x="0" y="2.8" textAnchor="middle" fontSize="6">⚡</text>
          </g>
        )}
        {/* Neck */}
        <rect x="-4" y="10" width="8" height="7" fill={pal.skinTone} />

        {/* Head (slightly larger for chibi/cute game proportions) */}
        <circle cx="0" cy="0" r="14" fill={pal.skinTone} stroke="#e0cba8" strokeWidth="0.5" />

        {/* Hair Styles */}
        {pal.role === 'cos' && (
          <path
            d="M -14,-2 C -14,-16 14,-16 14,-2 C 12,-6 8,-11 0,-11 C -8,-11 -12,-6 -14,-2 Z"
            fill={pal.hairColor}
          />
        )}
        {pal.role === 'acct' && (
          <path
            d="M -14,0 C -15,-15 15,-15 14,0 C 12,-6 5,-11 -1,-11 C -7,-11 -11,-6 -14,0 Z"
            fill={pal.hairColor}
          />
        )}
        {pal.role === 'dev' && (
          <>
            <path
              d="M -14,2 C -15,-16 14,-17 14,2 C 10,-4 6,-12 0,-12 C -6,-12 -10,-5 -14,2 Z"
              fill={pal.hairColor}
            />
            {/* Headphone band */}
            <path
              d="M -14,-2 C -14,-14 14,-14 14,-2"
              fill="none"
              stroke="#475569"
              strokeWidth="2.5"
            />
            <rect x="-16" y="-4" width="5" height="8" rx="2" fill="#475569" />
            <rect x="11" y="-4" width="5" height="8" rx="2" fill="#475569" />
          </>
        )}

        {/* Glasses */}
        {pal.role === 'acct' && (
          <g stroke="#047857" strokeWidth="1.2" fill="none">
            <circle cx="-5" cy="1" r="4" fill="#ecfdf5" fillOpacity="0.5" />
            <circle cx="5" cy="1" r="4" fill="#ecfdf5" fillOpacity="0.5" />
            <line x1="-1" y1="1" x2="1" y2="1" />
            <line x1="-9" y1="0" x2="-13" y2="-1" />
            <line x1="9" y1="0" x2="13" y2="-1" />
          </g>
        )}
        {pal.role === 'dev' && (
          <g stroke="#0369a1" strokeWidth="1" fill="none">
            <rect x="-8" y="-2" width="7" height="6" rx="2" fill="#f0f9ff" fillOpacity="0.4" />
            <rect x="1" y="-2" width="7" height="6" rx="2" fill="#f0f9ff" fillOpacity="0.4" />
            <line x1="-1" y1="1" x2="1" y2="1" />
          </g>
        )}

        {/* Eyes (when not covered by glasses) */}
        {pal.role === 'cos' && (
          <g fill="#1e293b">
            <circle cx="-5" cy="1" r="1.8" />
            <circle cx="5" cy="1" r="1.8" />
            {/* Eye shine */}
            <circle cx="-4" cy="0" r="0.6" fill="#ffffff" />
            <circle cx="6" cy="0" r="0.6" fill="#ffffff" />
          </g>
        )}

        {/* Smile */}
        <path d="M -4,5 Q 0,9 4,5" fill="none" stroke="#a0845c" strokeWidth="1.2" strokeLinecap="round" />

        {/* Cheek blush (cute game touch) */}
        <ellipse cx="-9" cy="4" rx="3" ry="1.8" fill="#f9a8d4" fillOpacity="0.3" />
        <ellipse cx="9" cy="4" rx="3" ry="1.8" fill="#f9a8d4" fillOpacity="0.3" />
      </g>

      {/* ═══ Tiny Role Badge (below character) ═══ */}
      <g transform={`translate(16, ${isSeated ? -18 : -8})`}>
        <circle cx="0" cy="0" r="6" fill="#ffffff" stroke="#e2e8f0" strokeWidth="0.8" filter="url(#badge-soft-shadow)" />
        <text x="0" y="3.5" textAnchor="middle" fontSize="7">
          {agent.emoji || (pal.role === 'cos' ? '👔' : pal.role === 'acct' ? '📊' : '💻')}
        </text>
      </g>
    </g>
  )
}
