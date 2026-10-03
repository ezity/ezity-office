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
    url: '/office/furniture/desk_executive.svg',
    width: 80,
    height: 64,
    anchorX: 0.5,
    anchorY: 0.65,
    label: 'Executive Walnut Desk',
  },
  desk_finance: {
    id: 'desk_finance',
    category: 'furniture',
    url: '/office/furniture/desk_finance.svg',
    width: 80,
    height: 64,
    anchorX: 0.5,
    anchorY: 0.65,
    label: 'Finance Oak Desk',
  },
  desk_engineering: {
    id: 'desk_engineering',
    category: 'furniture',
    url: '/office/furniture/desk_engineering.svg',
    width: 80,
    height: 64,
    anchorX: 0.5,
    anchorY: 0.65,
    label: 'Engineering Tech Desk',
  },
  chair_office: {
    id: 'chair_office',
    category: 'furniture',
    url: '/office/furniture/chair_office.svg',
    width: 48,
    height: 54,
    anchorX: 0.5,
    anchorY: 0.85,
    label: 'Ergonomic Task Chair',
  },
  table_meeting: {
    id: 'table_meeting',
    category: 'furniture',
    url: '/office/furniture/table_meeting.svg',
    width: 128,
    height: 80,
    anchorX: 0.5,
    anchorY: 0.6,
    label: 'Conference Board Table',
  },
  board_operations: {
    id: 'board_operations',
    category: 'furniture',
    url: '/office/furniture/board_operations.svg',
    width: 80,
    height: 74,
    anchorX: 0.5,
    anchorY: 0.85,
    label: 'Operations Cork Board',
  },
  desk_review: {
    id: 'desk_review',
    category: 'furniture',
    url: '/office/furniture/desk_review.svg',
    width: 80,
    height: 64,
    anchorX: 0.5,
    anchorY: 0.65,
    label: 'Review Verification Desk',
  },
  cabinet_filing: {
    id: 'cabinet_filing',
    category: 'furniture',
    url: '/office/furniture/cabinet_filing.svg',
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

  // Characters
  cos_idle: {
    id: 'cos_idle',
    category: 'characters',
    url: '/office/characters/cos_idle.svg',
    width: 48,
    height: 64,
    anchorX: 0.5,
    anchorY: 0.88,
    label: 'Chief of Staff (Idle)',
  },
  cos_walk: {
    id: 'cos_walk',
    category: 'characters',
    url: '/office/characters/cos_walk.svg',
    width: 48,
    height: 64,
    anchorX: 0.5,
    anchorY: 0.88,
    label: 'Chief of Staff (Walk)',
  },
  cos_sit: {
    id: 'cos_sit',
    category: 'characters',
    url: '/office/characters/cos_sit.svg',
    width: 48,
    height: 64,
    anchorX: 0.5,
    anchorY: 0.88,
    label: 'Chief of Staff (Seated)',
  },

  accountant_idle: {
    id: 'accountant_idle',
    category: 'characters',
    url: '/office/characters/accountant_idle.svg',
    width: 48,
    height: 64,
    anchorX: 0.5,
    anchorY: 0.88,
    label: 'Accountant (Idle)',
  },
  accountant_walk: {
    id: 'accountant_walk',
    category: 'characters',
    url: '/office/characters/accountant_walk.svg',
    width: 48,
    height: 64,
    anchorX: 0.5,
    anchorY: 0.88,
    label: 'Accountant (Walk)',
  },
  accountant_sit: {
    id: 'accountant_sit',
    category: 'characters',
    url: '/office/characters/accountant_sit.svg',
    width: 48,
    height: 64,
    anchorX: 0.5,
    anchorY: 0.88,
    label: 'Accountant (Seated)',
  },

  developer_idle: {
    id: 'developer_idle',
    category: 'characters',
    url: '/office/characters/developer_idle.svg',
    width: 48,
    height: 64,
    anchorX: 0.5,
    anchorY: 0.88,
    label: 'Developer (Idle)',
  },
  developer_walk: {
    id: 'developer_walk',
    category: 'characters',
    url: '/office/characters/developer_walk.svg',
    width: 48,
    height: 64,
    anchorX: 0.5,
    anchorY: 0.88,
    label: 'Developer (Walk)',
  },
  developer_sit: {
    id: 'developer_sit',
    category: 'characters',
    url: '/office/characters/developer_sit.svg',
    width: 48,
    height: 64,
    anchorX: 0.5,
    anchorY: 0.88,
    label: 'Developer (Seated)',
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
      // Fallback texture generation if network fetch fails (e.g. in test or offline)
      if (app?.renderer) {
        const fallback = generateFallbackTexture(app, descriptor)
        textureCache.set(key, fallback)
      }
    }
  })

  await Promise.allSettled(loadPromises)
}

/**
 * Synchronous texture retrieval.
 * Returns the cached texture, or a fallback graphics texture if not yet loaded.
 */
export function getOfficeTexture(id: string, app?: Application): Texture {
  if (textureCache.has(id)) {
    return textureCache.get(id)!
  }

  const descriptor = OFFICE_ASSETS[id]
  if (!descriptor) {
    return Texture.WHITE
  }

  if (app?.renderer) {
    const fallback = generateFallbackTexture(app, descriptor)
    textureCache.set(id, fallback)
    return fallback
  }

  return Texture.WHITE
}

/**
 * Generates an aesthetic geometric placeholder texture for an asset descriptor.
 */
function generateFallbackTexture(app: Application, descriptor: AssetDescriptor): Texture {
  const g = new Graphics()
  const w = descriptor.width
  const h = descriptor.height

  if (descriptor.category === 'environment') {
    if (descriptor.id.startsWith('rug_')) {
      g.ellipse(w / 2, h / 2, w / 2 - 4, h / 2 - 4)
      g.fill({ color: 0x3b82f6, alpha: 0.25 })
      g.stroke({ color: 0x60a5fa, width: 2 })
    } else {
      // Floor diamond
      g.poly([w / 2, 0, w, h / 2, w / 2, h, 0, h / 2])
      g.fill({ color: 0xf8f5ee })
      g.stroke({ color: 0xe6decb, width: 1 })
    }
  } else if (descriptor.category === 'characters') {
    // Ground shadow
    g.ellipse(w / 2, h - 6, 12, 4)
    g.fill({ color: 0x000000, alpha: 0.2 })
    // Body capsule
    g.roundRect(w / 2 - 8, h / 2, 16, 20, 4)
    g.fill({ color: 0x2563eb })
    // Head circle
    g.circle(w / 2, h / 2 - 8, 12)
    g.fill({ color: 0xfcd34d })
  } else {
    // Isometric box for furniture
    g.roundRect(4, 4, w - 8, h - 8, 4)
    g.fill({ color: 0xa87349 })
    g.stroke({ color: 0x784a22, width: 1 })
  }

  return app.renderer.generateTexture(g)
}

/**
 * Clears texture cache when disposing renderer.
 */
export function clearOfficeTextureCache(): void {
  textureCache.clear()
}
