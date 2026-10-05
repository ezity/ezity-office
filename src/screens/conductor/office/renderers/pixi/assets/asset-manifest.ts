/**
 * Office Asset Manifest & Texture Manager
 *
 * Defines external illustrated assets for the PixiJS virtual office renderer.
 * Keeps assets cleanly decoupled from scene code.
 */

import { Assets, Texture, Graphics, type Application } from 'pixi.js'

export type OfficeAssetCategory = 'environment' | 'furniture' | 'characters' | 'ui'

export interface AssetDescriptor {
  id: string
  category: OfficeAssetCategory
  url: string
  width: number
  height: number
  anchorX?: number
  anchorY?: number
  label: string
}

export const OFFICE_ASSETS: Record<string, AssetDescriptor> = {
  // Environment
  office_world_bg: {
    id: 'office_world_bg',
    category: 'environment',
    url: '/office/environment/office_world_clean.webp',
    width: 1376,
    height: 768,
    anchorX: 0.5,
    anchorY: 0.5,
    label: 'Office Building Environment',
  },
  floor_tile: {
    id: 'floor_tile',
    category: 'environment',
    url: '/office/environment/floor_tile.svg',
    width: 64,
    height: 32,
    anchorX: 0.5,
    anchorY: 0.5,
    label: 'Floor Tile',
  },
  wall_straight: {
    id: 'wall_straight',
    category: 'environment',
    url: '/office/environment/wall_straight.svg',
    width: 64,
    height: 64,
    anchorX: 0.5,
    anchorY: 0.75,
    label: 'Wall Segment',
  },
  rug_executive: {
    id: 'rug_executive',
    category: 'environment',
    url: '/office/environment/rug_executive.svg',
    width: 128,
    height: 64,
    anchorX: 0.5,
    anchorY: 0.5,
    label: 'Executive Rug',
  },
  rug_meeting: {
    id: 'rug_meeting',
    category: 'environment',
    url: '/office/environment/rug_meeting.svg',
    width: 128,
    height: 64,
    anchorX: 0.5,
    anchorY: 0.5,
    label: 'Meeting Rug',
  },
  rug_finance: {
    id: 'rug_finance',
    category: 'environment',
    url: '/office/environment/rug_finance.svg',
    width: 128,
    height: 64,
    anchorX: 0.5,
    anchorY: 0.5,
    label: 'Finance Rug',
  },
  rug_engineering: {
    id: 'rug_engineering',
    category: 'environment',
    url: '/office/environment/rug_engineering.svg',
    width: 128,
    height: 64,
    anchorX: 0.5,
    anchorY: 0.5,
    label: 'Engineering Rug',
  },
  rug_lounge: {
    id: 'rug_lounge',
    category: 'environment',
    url: '/office/environment/rug_lounge.svg',
    width: 128,
    height: 64,
    anchorX: 0.5,
    anchorY: 0.5,
    label: 'Lounge Rug',
  },

  // Furniture
  desk_executive: {
    id: 'desk_executive',
    category: 'furniture',
    url: '/office/furniture/desk_executive.png',
    width: 128,
    height: 95,
    anchorX: 0.5,
    anchorY: 0.5,
    label: 'Executive Walnut Desk',
  },
  desk_finance: {
    id: 'desk_finance',
    category: 'furniture',
    url: '/office/furniture/desk_finance.png',
    width: 160,
    height: 122,
    anchorX: 0.5,
    anchorY: 0.5,
    label: 'Finance Oak Desk',
  },
  desk_engineering: {
    id: 'desk_engineering',
    category: 'furniture',
    url: '/office/furniture/desk_engineering.png',
    width: 135,
    height: 124,
    anchorX: 0.5,
    anchorY: 0.5,
    label: 'Engineering Tech Desk',
  },
  chair_office: {
    id: 'chair_office',
    category: 'furniture',
    url: '/office/furniture/chair_office.png',
    width: 44,
    height: 78,
    anchorX: 0.5,
    anchorY: 0.94,
    label: 'Ergonomic Task Chair',
  },
  chair_office_right: {
    id: 'chair_office_right',
    category: 'furniture',
    url: '/office/furniture/chair_office_right.png',
    width: 44,
    height: 78,
    anchorX: 0.5,
    anchorY: 0.94,
    label: 'Ergonomic Task Chair (Front-Right)',
  },
  chair_office_left: {
    id: 'chair_office_left',
    category: 'furniture',
    url: '/office/furniture/chair_office_left.png',
    width: 48,
    height: 78,
    anchorX: 0.5,
    anchorY: 0.94,
    label: 'Ergonomic Task Chair (Front-Left)',
  },
  chair_office_back: {
    id: 'chair_office_back',
    category: 'furniture',
    url: '/office/furniture/chair_office_back.png',
    width: 57,
    height: 78,
    anchorX: 0.5,
    anchorY: 0.94,
    label: 'Ergonomic Task Chair (Back)',
  },
  table_meeting: {
    id: 'table_meeting',
    category: 'furniture',
    url: '/office/furniture/table_meeting.png',
    width: 156,
    height: 127,
    anchorX: 0.5,
    anchorY: 0.5,
    label: 'Conference Board Table',
  },
  board_operations: {
    id: 'board_operations',
    category: 'furniture',
    url: '/office/furniture/board_operations.png',
    width: 80,
    height: 74,
    anchorX: 0.5,
    anchorY: 0.85,
    label: 'Operations Cork Board',
  },
  desk_review: {
    id: 'desk_review',
    category: 'furniture',
    url: '/office/furniture/desk_review.png',
    width: 115,
    height: 112,
    anchorX: 0.5,
    anchorY: 0.5,
    label: 'Review Verification Desk',
  },
  cabinet_filing: {
    id: 'cabinet_filing',
    category: 'furniture',
    url: '/office/furniture/cabinet_filing.png',
    width: 48,
    height: 64,
    anchorX: 0.5,
    anchorY: 0.8,
    label: 'Filing Cabinet',
  },
  rack_server: {
    id: 'rack_server',
    category: 'furniture',
    url: '/office/furniture/rack_server.svg',
    width: 48,
    height: 74,
    anchorX: 0.5,
    anchorY: 0.85,
    label: 'Mainframe Server Rack',
  },
  plant_potted: {
    id: 'plant_potted',
    category: 'furniture',
    url: '/office/furniture/plant_potted.svg',
    width: 48,
    height: 64,
    anchorX: 0.5,
    anchorY: 0.85,
    label: 'Potted Monstera',
  },
  sofa_lounge: {
    id: 'sofa_lounge',
    category: 'furniture',
    url: '/office/furniture/sofa_lounge.svg',
    width: 96,
    height: 64,
    anchorX: 0.5,
    anchorY: 0.7,
    label: 'Lounge Sofa',
  },
  coffee_machine: {
    id: 'coffee_machine',
    category: 'furniture',
    url: '/office/furniture/coffee_machine.svg',
    width: 48,
    height: 56,
    anchorX: 0.5,
    anchorY: 0.8,
    label: 'Espresso Bar',
  },

  // Characters - Chief of Staff
  cos_idle: {
    id: 'cos_idle',
    category: 'characters',
    url: '/office/characters/cos_idle.png',
    width: 38,
    height: 100,
    anchorX: 0.5,
    anchorY: 0.95,
    label: 'Chief of Staff (Idle)',
  },
  cos_walk: {
    id: 'cos_walk',
    category: 'characters',
    url: '/office/characters/cos_walk_dr.png',
    width: 40,
    height: 100,
    anchorX: 0.5,
    anchorY: 0.95,
    label: 'Chief of Staff (Walk)',
  },
  cos_walk_dr: {
    id: 'cos_walk_dr',
    category: 'characters',
    url: '/office/characters/cos_walk_dr.png',
    width: 39,
    height: 100,
    anchorX: 0.5,
    anchorY: 0.95,
    label: 'Chief of Staff (Walk Down-Right)',
  },
  cos_walk_dl: {
    id: 'cos_walk_dl',
    category: 'characters',
    url: '/office/characters/cos_walk_dl.png',
    width: 39,
    height: 100,
    anchorX: 0.5,
    anchorY: 0.95,
    label: 'Chief of Staff (Walk Down-Left)',
  },
  cos_walk_ur: {
    id: 'cos_walk_ur',
    category: 'characters',
    url: '/office/characters/cos_walk_ur.png',
    width: 37,
    height: 100,
    anchorX: 0.5,
    anchorY: 0.95,
    label: 'Chief of Staff (Walk Up-Right)',
  },
  cos_walk_ul: {
    id: 'cos_walk_ul',
    category: 'characters',
    url: '/office/characters/cos_walk_ul.png',
    width: 37,
    height: 100,
    anchorX: 0.5,
    anchorY: 0.95,
    label: 'Chief of Staff (Walk Up-Left)',
  },
  cos_sit: {
    id: 'cos_sit',
    category: 'characters',
    url: '/office/characters/cos_sit.png',
    width: 38,
    height: 80,
    anchorX: 0.5,
    anchorY: 0.95,
    label: 'Chief of Staff (Seated)',
  },
  cos_work: {
    id: 'cos_work',
    category: 'characters',
    url: '/office/characters/cos_work.png',
    width: 37,
    height: 80,
    anchorX: 0.5,
    anchorY: 0.95,
    label: 'Chief of Staff (Working)',
  },
  cos_meeting: {
    id: 'cos_meeting',
    category: 'characters',
    url: '/office/characters/cos_meeting.png',
    width: 40,
    height: 80,
    anchorX: 0.5,
    anchorY: 0.95,
    label: 'Chief of Staff (Meeting)',
  },
  cos_review: {
    id: 'cos_review',
    category: 'characters',
    url: '/office/characters/cos_review.png',
    width: 50,
    height: 100,
    anchorX: 0.5,
    anchorY: 0.95,
    label: 'Chief of Staff (Review)',
  },
  cos_error: {
    id: 'cos_error',
    category: 'characters',
    url: '/office/characters/cos_error.png',
    width: 44,
    height: 100,
    anchorX: 0.5,
    anchorY: 0.95,
    label: 'Chief of Staff (Error)',
  },

  // Characters - Accountant
  accountant_idle: {
    id: 'accountant_idle',
    category: 'characters',
    url: '/office/characters/accountant_idle.png',
    width: 38,
    height: 100,
    anchorX: 0.5,
    anchorY: 0.95,
    label: 'Accountant (Idle)',
  },
  accountant_walk: {
    id: 'accountant_walk',
    category: 'characters',
    url: '/office/characters/accountant_walk_dr.png',
    width: 40,
    height: 100,
    anchorX: 0.5,
    anchorY: 0.95,
    label: 'Accountant (Walk)',
  },
  accountant_walk_dr: {
    id: 'accountant_walk_dr',
    category: 'characters',
    url: '/office/characters/accountant_walk_dr.png',
    width: 40,
    height: 100,
    anchorX: 0.5,
    anchorY: 0.95,
    label: 'Accountant (Walk Down-Right)',
  },
  accountant_walk_dl: {
    id: 'accountant_walk_dl',
    category: 'characters',
    url: '/office/characters/accountant_walk_dl.png',
    width: 40,
    height: 100,
    anchorX: 0.5,
    anchorY: 0.95,
    label: 'Accountant (Walk Down-Left)',
  },
  accountant_walk_ur: {
    id: 'accountant_walk_ur',
    category: 'characters',
    url: '/office/characters/accountant_walk_ur.png',
    width: 40,
    height: 100,
    anchorX: 0.5,
    anchorY: 0.95,
    label: 'Accountant (Walk Up-Right)',
  },
  accountant_walk_ul: {
    id: 'accountant_walk_ul',
    category: 'characters',
    url: '/office/characters/accountant_walk_ul.png',
    width: 40,
    height: 100,
    anchorX: 0.5,
    anchorY: 0.95,
    label: 'Accountant (Walk Up-Left)',
  },
  accountant_sit: {
    id: 'accountant_sit',
    category: 'characters',
    url: '/office/characters/accountant_sit.png',
    width: 38,
    height: 80,
    anchorX: 0.5,
    anchorY: 0.95,
    label: 'Accountant (Seated)',
  },
  accountant_work: {
    id: 'accountant_work',
    category: 'characters',
    url: '/office/characters/accountant_work.png',
    width: 38,
    height: 80,
    anchorX: 0.5,
    anchorY: 0.95,
    label: 'Accountant (Working)',
  },
  accountant_meeting: {
    id: 'accountant_meeting',
    category: 'characters',
    url: '/office/characters/accountant_meeting.png',
    width: 27,
    height: 80,
    anchorX: 0.5,
    anchorY: 0.95,
    label: 'Accountant (Meeting)',
  },
  accountant_review: {
    id: 'accountant_review',
    category: 'characters',
    url: '/office/characters/accountant_review.png',
    width: 34,
    height: 100,
    anchorX: 0.5,
    anchorY: 0.95,
    label: 'Accountant (Review)',
  },
  accountant_error: {
    id: 'accountant_error',
    category: 'characters',
    url: '/office/characters/accountant_error.png',
    width: 34,
    height: 100,
    anchorX: 0.5,
    anchorY: 0.95,
    label: 'Accountant (Error)',
  },

  // Characters - Developer
  developer_idle: {
    id: 'developer_idle',
    category: 'characters',
    url: '/office/characters/developer_idle.png',
    width: 40,
    height: 100,
    anchorX: 0.5,
    anchorY: 0.95,
    label: 'Developer (Idle)',
  },
  developer_walk: {
    id: 'developer_walk',
    category: 'characters',
    url: '/office/characters/developer_walk_dr.png',
    width: 42,
    height: 100,
    anchorX: 0.5,
    anchorY: 0.95,
    label: 'Developer (Walk)',
  },
  developer_walk_dr: {
    id: 'developer_walk_dr',
    category: 'characters',
    url: '/office/characters/developer_walk_dr.png',
    width: 42,
    height: 100,
    anchorX: 0.5,
    anchorY: 0.95,
    label: 'Developer (Walk Down-Right)',
  },
  developer_walk_dl: {
    id: 'developer_walk_dl',
    category: 'characters',
    url: '/office/characters/developer_walk_dl.png',
    width: 42,
    height: 100,
    anchorX: 0.5,
    anchorY: 0.95,
    label: 'Developer (Walk Down-Left)',
  },
  developer_walk_ur: {
    id: 'developer_walk_ur',
    category: 'characters',
    url: '/office/characters/developer_walk_ur.png',
    width: 42,
    height: 100,
    anchorX: 0.5,
    anchorY: 0.95,
    label: 'Developer (Walk Up-Right)',
  },
  developer_walk_ul: {
    id: 'developer_walk_ul',
    category: 'characters',
    url: '/office/characters/developer_walk_ul.png',
    width: 42,
    height: 100,
    anchorX: 0.5,
    anchorY: 0.95,
    label: 'Developer (Walk Up-Left)',
  },
  developer_sit: {
    id: 'developer_sit',
    category: 'characters',
    url: '/office/characters/developer_sit.png',
    width: 43,
    height: 80,
    anchorX: 0.5,
    anchorY: 0.95,
    label: 'Developer (Seated)',
  },
  developer_work: {
    id: 'developer_work',
    category: 'characters',
    url: '/office/characters/developer_work.png',
    width: 43,
    height: 80,
    anchorX: 0.5,
    anchorY: 0.95,
    label: 'Developer (Working)',
  },
  developer_meeting: {
    id: 'developer_meeting',
    category: 'characters',
    url: '/office/characters/developer_meeting.png',
    width: 31,
    height: 80,
    anchorX: 0.5,
    anchorY: 0.95,
    label: 'Developer (Meeting)',
  },
  developer_review: {
    id: 'developer_review',
    category: 'characters',
    url: '/office/characters/developer_review.png',
    width: 38,
    height: 100,
    anchorX: 0.5,
    anchorY: 0.95,
    label: 'Developer (Review)',
  },
  developer_error: {
    id: 'developer_error',
    category: 'characters',
    url: '/office/characters/developer_error.png',
    width: 38,
    height: 100,
    anchorX: 0.5,
    anchorY: 0.95,
    label: 'Developer (Error)',
  },
}

// In-memory texture cache
const textureCache = new Map<string, Texture>()

/**
 * Preload all registered assets or return existing cached textures.
 */
export async function preloadOfficeAssets(app?: Application): Promise<void> {
  if (typeof window === 'undefined') return

  const loadPromises = Object.entries(OFFICE_ASSETS).map(async ([key, descriptor]) => {
    if (textureCache.has(key)) return
    try {
      const texture = await Assets.load(descriptor.url)
      if (texture) {
        textureCache.set(key, texture)
      }
    } catch {
      // Safe 2D canvas fallback if network fetch fails (e.g. in test or offline)
      const fallback = generateFallbackTexture(descriptor)
      textureCache.set(key, fallback)
    }
  })

  await Promise.allSettled(loadPromises)
}

/**
 * Synchronous texture retrieval.
 * Returns the cached texture, or a safe fallback texture if not yet loaded.
 */
export function getOfficeTexture(id: string, _app?: Application): Texture {
  if (textureCache.has(id)) {
    return textureCache.get(id)!
  }

  const descriptor = OFFICE_ASSETS[id]
  if (!descriptor) {
    // Smart fallback for character roles if pose key not found directly (e.g. prefix_work -> prefix_sit -> prefix_idle)
    const underscoreIdx = id.lastIndexOf('_')
    if (underscoreIdx > 0) {
      const prefix = id.substring(0, underscoreIdx)
      if (textureCache.has(`${prefix}_sit`)) {
        return textureCache.get(`${prefix}_sit`)!
      }
      if (textureCache.has(`${prefix}_idle`)) {
        return textureCache.get(`${prefix}_idle`)!
      }
      if (OFFICE_ASSETS[`${prefix}_sit`]) {
        return getOfficeTexture(`${prefix}_sit`, _app)
      }
      if (OFFICE_ASSETS[`${prefix}_idle`]) {
        return getOfficeTexture(`${prefix}_idle`, _app)
      }
    }
    return Texture.WHITE
  }

  const fallback = generateFallbackTexture(descriptor)
  textureCache.set(id, fallback)
  return fallback
}

/**
 * Generates an aesthetic geometric placeholder texture using standard 2D Canvas.
 * Crucial: Does NOT invoke WebGL shader compilation, preventing context lost errors under strict CSP.
 */
function generateFallbackTexture(descriptor: AssetDescriptor): Texture {
  if (typeof document === 'undefined') return Texture.WHITE

  try {
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(16, descriptor.width)
    canvas.height = Math.max(16, descriptor.height)
    const ctx = canvas.getContext('2d')
    if (!ctx) return Texture.WHITE

    const w = canvas.width
    const h = canvas.height

    if (descriptor.category === 'environment') {
      if (descriptor.id.startsWith('rug_')) {
        ctx.fillStyle = 'rgba(59, 130, 246, 0.3)'
        ctx.beginPath()
        ctx.ellipse(w / 2, h / 2, w / 2 - 4, h / 2 - 4, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = '#60a5fa'
        ctx.lineWidth = 2
        ctx.stroke()
      } else {
        // Floor diamond
        ctx.fillStyle = '#f8f5ee'
        ctx.beginPath()
        ctx.moveTo(w / 2, 0)
        ctx.lineTo(w, h / 2)
        ctx.lineTo(w / 2, h)
        ctx.lineTo(0, h / 2)
        ctx.closePath()
        ctx.fill()
        ctx.strokeStyle = '#e6decb'
        ctx.lineWidth = 1
        ctx.stroke()
      }
    } else if (descriptor.category === 'characters') {
      // Ground shadow
      ctx.fillStyle = 'rgba(66, 32, 6, 0.25)'
      ctx.beginPath()
      ctx.ellipse(w / 2, h - 6, 12, 4, 0, 0, Math.PI * 2)
      ctx.fill()

      // Body & head
      ctx.fillStyle = descriptor.id.includes('cos')
        ? '#1e3a8a'
        : descriptor.id.includes('accountant')
          ? '#065f46'
          : '#0284c7'
      ctx.beginPath()
      ctx.roundRect(w / 2 - 8, h / 2, 16, 20, 4)
      ctx.fill()

      ctx.fillStyle = '#fbd5b5'
      ctx.beginPath()
      ctx.arc(w / 2, h / 2 - 8, 12, 0, Math.PI * 2)
      ctx.fill()
    } else {
      // Furniture box
      ctx.fillStyle = '#dfbe99'
      ctx.beginPath()
      ctx.roundRect(4, 4, w - 8, h - 8, 4)
      ctx.fill()
      ctx.strokeStyle = '#b08b5e'
      ctx.lineWidth = 1.5
      ctx.stroke()
    }

    return Texture.from(canvas)
  } catch {
    return Texture.WHITE
  }
}

/**
 * Clears texture cache when disposing renderer.
 */
export function clearOfficeTextureCache(): void {
  textureCache.clear()
}
