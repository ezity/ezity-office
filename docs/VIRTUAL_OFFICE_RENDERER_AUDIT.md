# Virtual Office Renderer Architecture Audit & Migration Strategy

**Repository:** `ezity-office` (Hermes Studio Fork)  
**Date:** October 2026  
**Auditor:** Antigravity AI  
**Scope:** Conductor Virtual Office Renderer, Runtime State Flow, and 3D/2.5D/SVG Migration Architecture

---

## Executive Summary

The `ezity-office` workspace contains a functional virtual office visualization inside the Conductor subsystem (`src/screens/conductor/components/office-view.tsx`). It currently runs as a **hybrid SVG floorplan + HTML DOM overlay**. While it presents an animated workspace with desks, monitors, social spots, and speech bubbles, the current implementation is heavily reliant on client-side simulation timers, heuristic movement formulas, and hard-coded layout templates. Furthermore, interaction callbacks (`onViewOutput`) are currently passed as no-ops in both `conductor-home.tsx` and `conductor-active.tsx`.

Ezity AI Office has introduced first-class multi-agent operational concepts:
- **Real Agent Identities**: Chief of Staff (`ezity-chief-of-staff`), Accountant (`ezity-accountant`), and Developer (`ezity-developer`).
- **Operational State**: EzityHub financial event stream, Work Inbox items (`WorkItem`), human-in-the-loop approvals, and Conductor mission tasks.

To evolve this into a state-driven, 2.5D/3D interactive office simulation without breaking upstream Hermes Studio compatibility or overwhelming client devices, we evaluate three paths:
1. **Option A: Extend SVG/DOM** (2D Vector + CSS)
2. **Option B: Introduce Three.js** (WebGL 3D / Isometric Scene Graph)
3. **Option C: 2.5D Isometric Canvas** (Sprite / Tile Renderer)

**Core Architectural Finding:** The renderer should **not** consume Hermes Gateway sessions, Conductor tasks, or Work Inbox items directly. The critical architectural missing link is a canonical, renderer-agnostic **`OfficeSceneState`** and a unifying `useOfficeState()` hook. Decoupling state synthesis from presentation enables a **Dual Renderer Architecture** where SVG remains the lightweight, accessible, zero-dependency default, while a Three.js / Canvas 2.5D renderer can be mounted seamlessly behind an administrative feature flag.

---

## Current Conductor Renderer Audit

### 1. Technology Stack & Hybrid Rendering Model
- **Primary Component:** [`OfficeView`](file:///Users/solehuddin/Documents/WebProject/ezity-office/src/screens/conductor/components/office-view.tsx#L684-L1283) (`src/screens/conductor/components/office-view.tsx`, 1,284 lines, 42.9 KB).
- **Rendering Technology:** **Hybrid SVG + Absolute HTML/CSS DOM Overlay**.
  - **Background & Furniture:** Rendered in an `<svg viewBox="0 0 1040 600" preserveAspectRatio="xMidYMid meet" aria-hidden>` (lines 1029–1111). Contains floor rects, furniture SVGs, and desk groups.
  - **Interactive Agents & Bubbles:** Rendered in standard HTML `<button>` elements absolutely positioned over the SVG container (lines 1123–1226).
  - **Avatars:** Hybrid Pixel-Art SVG ([`AgentAvatar`](file:///Users/solehuddin/Documents/WebProject/ezity-office/src/screens/conductor/components/agent-avatar.tsx#L80-L100)) or Native Unicode Emojis inside an HTML `<span>`.
  - **Canvas:** Currently **0% Canvas / WebGL**. Pure DOM/SVG.

### 2. Layout Definition & Desk Positioning
Layouts are statically defined via coordinate arrays based on a selected template (`grid`, `roundtable`, `warroom`):
- **Grid Layout (`GRID_DESK_POSITIONS`):** 12 desks arranged in 3 rows across a 1040×600 canvas (lines 139–152).
- **Roundtable Layout (`ROUNDTABLE_DESK_POSITIONS`):** 12 desks radially calculated around center `cx=450, cy=320, r=240` with 30° offsets (lines 154–163).
- **War Room Layout (`WARROOM_DESK_POSITIONS`):** 12 desks lined in two facing banks (lines 165–178).
- **Social Spots (`SOCIAL_SPOTS_BY_TEMPLATE`):** Fixed coordinates for `'coffee'`, `'water'`, `'plant'`, and `'snack'` stations per layout (lines 182–201).
- **Persistence:** Layout choice is stored in `localStorage` under key `hermes-studio:office-layout` (lines 706, 725).

### 3. Avatar Rendering
- Located in [`AgentAvatar`](file:///Users/solehuddin/Documents/WebProject/ezity-office/src/screens/conductor/components/agent-avatar.tsx) and [`OfficeView`](file:///Users/solehuddin/Documents/WebProject/ezity-office/src/screens/conductor/components/office-view.tsx#L898-L908).
- If the agent object provides `emoji` or `avatarEmoji` (e.g. `'👔'` for Chief of Staff, `'📊'` for Accountant, `'💻'` for Developer), it renders an emoji at 26px–30px font size.
- Otherwise, it renders a procedurally shaded 10-variant SVG robot avatar via `<AgentAvatar index={index % 10} color={accent.hex} size={40} />`.

### 4. Furniture & Background Drawing
Vector furniture is drawn with hardcoded SVG `<g>` elements:
- `DeskSVG` (lines 393–495): Surface rectangle, legs, computer monitor with bezel and text, chair ellipse.
- `CoffeeMachineSVG` (lines 498–512): Machine body, drip nozzle, espresso cup emoji.
- `WaterCoolerSVG` (lines 515–541): Base cabinet, blue water jug reservoir, hot/cold spigots.
- `SnackBarSVG` (lines 544–564): Snack tray with cookie emoji.
- `PlantSVG` (lines 567–575): Plant pot with overlapping foliage circles.
- Floor pattern is created via an HTML `<div>` with CSS `radial-gradient` background (lines 1019–1026).

### 5. Responsive Scaling & Coordinate Desynchronization Bug
- The SVG uses `viewBox="0 0 1040 600"` and `preserveAspectRatio="xMidYMid meet"` (line 1031).
- However, the agent avatars are HTML buttons positioned with `style={{ transform: translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -50%) }}` (lines 1133–1149).
- **Critical Flaw:** The SVG scales down proportionally when the container shrinks, but the HTML overlay uses **fixed pixel coordinates** assuming an unscaled 1040×600 canvas. If `OfficeView` is placed in a container with a constrained width or custom height (such as `containerHeight={360}` in `conductor-active.tsx`), the SVG furniture and the HTML agent avatars drift out of alignment.

### 6. Interaction & Navigation Handlers
- Agent avatars are `<button type="button">` with `onClick={() => onViewOutput(agent.id)}` (line 1139).
- In [`conductor-home.tsx`](file:///Users/solehuddin/Documents/WebProject/ezity-office/src/screens/conductor/components/conductor-home.tsx#L543): `onViewOutput={() => {}}` (NO-OP).
- In [`conductor-active.tsx`](file:///Users/solehuddin/Documents/WebProject/ezity-office/src/screens/conductor/components/conductor-active.tsx#L348): `onViewOutput={() => {}}` (NO-OP).
- Desks, furniture, and whiteboard do not possess click handlers.
- Only `RemoteSessionCard` triggers a working handler: `onViewRemoteOutput(sessionKey, label)`.

---

## Runtime-to-Renderer Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             RUNTIME SOURCES                                 │
├───────────────────────┬───────────────────────────┬─────────────────────────┤
│   Hermes Gateway      │   Conductor Gateway API   │  Ezity Work Inbox &     │
│   Sessions & Events   │   Workers, Tasks, Stream  │  Approvals Store        │
│   (lib/gateway-api)   │ (use-conductor-gateway)   │ (server/task-store.ts)  │
└───────────┬───────────┴─────────────┬─────────────┴────────────┬────────────┘
            │                         │                          │
            ▼                         ▼                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SCREEN ADAPTER LAYER                              │
│                                                                             │
│  conductor-home.tsx                               conductor-active.tsx      │
│  ------------------                               --------------------      │
│  Derives: homeOfficeRows                          Derives: officeAgentRows  │
│  - Checks isEZityStaff setting                    - Iterates workers        │
│  - Injects Chief of Staff,                        - Maps worker outputs     │
│    Accountant, Developer                          - Finds running task      │
│  - Falls back to recentSessions                   - Sets status:            │
│    or generic placeholders                          active/idle/paused/err  │
└───────────────────────┬───────────────────────────┬─────────────────────────┘
                        │                           │
                        └─────────────┬─────────────┘
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        RENDERER PROPS (OfficeViewProps)                     │
│                                                                             │
│   agentRows: Array<AgentWorkingRow>                                         │
│   missionRunning: boolean                                                   │
│   agentTasks: Record<string, string>                                        │
│   remoteSessions: Array<RemoteSession>                                      │
│   onViewOutput: (agentId: string) => void [Currently no-op]                 │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           OFFICE-VIEW.TSX (RENDERER)                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  State Simulation:                                                          │
│  - 200ms tick timer (setTick)                                               │
│  - Heuristic wanderCycle: (tick + i * 17) / 25 % 4                          │
│  - Math.sin(phase) bobbing                                                  │
│  - Speech generator (getSpeechLine cycling "Grabbing coffee", etc.)         │
├──────────────────────────────────────┬──────────────────────────────────────┤
│  SVG Background (viewBox 1040x600)   │  HTML Overlay                        │
│  - DeskSVG (monitorText, glow)       │  - Agent Avatar buttons (translate3d)│
│  - Furniture SVG (coffee, water)     │  - Speech bubble tooltip             │
│  - Floor rects                       │  - Status dot / pulsing rings        │
└──────────────────────────────────────┴──────────────────────────────────────┘
```

### Exact Intermediate Data Structures

#### `AgentWorkingRow` ([`office-view.tsx:31-45`](file:///Users/solehuddin/Documents/WebProject/ezity-office/src/screens/conductor/components/office-view.tsx#L31-L45))
```typescript
export type AgentWorkingStatus =
  | 'spawning'
  | 'ready'
  | 'active'
  | 'idle'
  | 'paused'
  | 'error'
  | 'none'
  | 'waiting_for_input'

export type AgentWorkingRow = {
  id: string
  name: string
  modelId: string
  status: AgentWorkingStatus
  lastLine?: string
  lastAt?: number
  taskCount: number
  currentTask?: string
  sessionKey?: string
  roleDescription?: string
  emoji?: string | null
  avatarEmoji?: string | null
  agentId?: string | null
}
```

#### `ConductorWorker` ([`types/conductor.ts:21-37`](file:///Users/solehuddin/Documents/WebProject/ezity-office/src/types/conductor.ts#L21-L37))
```typescript
export type ConductorWorker = {
  key: string
  label: string
  model: string | null
  status: 'running' | 'complete' | 'stale' | 'idle'
  updatedAt: string | null
  displayName: string
  totalTokens: number
  contextTokens: number
  tokenUsageLabel: string
  raw: import('@/lib/gateway-api').GatewaySession
  agentId?: string | null
  agentName?: string | null
  agentEmoji?: string | null
  agentRole?: string | null
  agentColor?: string | null
}
```

---

## Current Renderer Coupling

### Coupling Analysis
The current `OfficeView` is **semi-decoupled at the prop boundary, but deeply entangled in its presentation logic**:

1. **Decoupled:** `OfficeView` does not import `useConductorGateway()` directly; it receives `agentRows: Array<AgentWorkingRow>`.
2. **Duplicated Mapping Logic:** Both `conductor-home.tsx` (lines 182–285) and `conductor-active.tsx` (lines 126–215) independently implement hand-crafted mapping functions converting Conductor workers/sessions into `AgentWorkingRow`.
3. **Missing Business State:** `OfficeView` has zero awareness of:
   - Ezity Work Inbox items (`WorkItem`)
   - Pending human approvals (`approvals-store.ts`)
   - Department boundaries (Finance, Engineering, Operations)
   - Real desk assignments or office zones
4. **Synthetic Simulation Intrusion:** Because the renderer does not receive true operational sub-states (e.g. "Accountant waiting for manager approval on credit note"), it relies on artificial mathematical timers (`tick`) and fake text generators (`"Grabbing coffee"`, `"Checking messages"`) to appear alive.

---

## Proposed OfficeSceneState

To support both 2D SVG and 3D WebGL renderers, we must define a canonical, renderer-neutral intermediate representation.

```typescript
// src/types/office-scene.ts

export type OfficeDepartment = 'executive' | 'finance' | 'engineering' | 'operations'

export type OfficeZoneId =
  | 'desk_executive'
  | 'desk_finance'
  | 'desk_engineering'
  | 'lounge_break'
  | 'meeting_room'
  | 'review_station'
  | 'inbox_board'

export type AgentAttentionState =
  | 'nominal'
  | 'working'
  | 'waiting_approval'
  | 'needs_input'
  | 'error'

export type OfficeAgentSceneNode = {
  id: string
  agentDefinitionId: string // 'ezity-chief-of-staff' | 'ezity-accountant' | 'ezity-developer' | custom
  name: string
  roleTitle: string
  department: OfficeDepartment
  emoji: string
  colorHex: string
  modelId: string

  // Operational State
  status: 'idle' | 'working' | 'waiting' | 'error' | 'offline'
  attentionState: AgentAttentionState
  currentTaskTitle?: string
  lastActivityText?: string
  lastActivityAt?: number

  // Spatial / Navigation Mapping
  homeDeskId: string
  currentZoneId: OfficeZoneId
  targetZoneId?: OfficeZoneId
  isMoving: boolean

  // Relational Links
  sessionKey?: string
  activeTaskId?: string
  pendingApprovalIds: Array<string>
  activeWorkItemIds: Array<string>
}

export type OfficeRoomSceneNode = {
  id: OfficeZoneId
  name: string
  department?: OfficeDepartment
  capacity: number
  occupantAgentIds: Array<string>
  hasPendingAction: boolean
  actionBadgeCount?: number
}

export type OfficeWorkItemSummary = {
  id: string
  type: 'finance_event' | 'approval' | 'task' | 'failure'
  title: string
  assignedAgentId: string
  status: 'needs_attention' | 'in_progress' | 'waiting' | 'completed'
  priority: 'high' | 'medium' | 'low'
}

export type OfficeSceneState = {
  companyName: string
  missionRunning: boolean
  activeMissionGoal?: string
  missionProgressPercent?: number
  
  agents: Array<OfficeAgentSceneNode>
  rooms: Array<OfficeRoomSceneNode>
  workItems: Array<OfficeWorkItemSummary>
  pendingApprovalCount: number
  
  // Real-time synchronization
  lastSyncAt: number
}
```

---

## Renderer Contract

Every renderer (SVG, Canvas 2.5D, or Three.js) must implement this strict contract:

```typescript
// src/screens/conductor/renderers/office-renderer.types.ts

export interface OfficeInteractionHandlers {
  onAgentClick: (agentId: string, sessionKey?: string) => void
  onDeskClick: (deskId: string, occupantAgentId?: string) => void
  onZoneClick: (zoneId: OfficeZoneId) => void
  onWorkItemClick: (workItemId: string) => void
  onApprovalClick: (approvalId: string) => void
  onMissionClick: () => void
}

export interface OfficeRendererProps extends OfficeInteractionHandlers {
  scene: OfficeSceneState
  className?: string
  height?: number | string
  enableReducedMotion?: boolean
  selectedAgentId?: string
  selectedZoneId?: OfficeZoneId
}

export type OfficeRendererComponent = React.ComponentType<OfficeRendererProps>
```

---

## Option A — Extend SVG/DOM

### Architecture
Refactor the current SVG layout from an undifferentiated desk grid into distinct department zones with real SVG `<svg viewBox="0 0 1200 700">` architecture. Avatars can either be converted to native SVG `<g>` elements (fixing the responsive coordinate drift) or mapped via CSS Percentage/Container Queries.

### Strengths
1. **Zero Added Bundle Weight:** Requires 0 KB of new runtime libraries.
2. **Upstream Resilience:** Matches the existing Hermes Studio paradigm; upstream updates to styling or icons port cleanly.
3. **Built-in DOM Accessibility:** Tooltips, semantic buttons, focus outlines, ARIA roles, and screen readers work out of the box.
4. **Performance:** Exceptional on low-powered machines, phones, and remote tablets. React only re-renders nodes whose props changed.
5. **NAS Server Simplicity:** Trivial static bundle delivery; no GPU shader compilation.

### Limitations
1. **Visual Ceiling:** Lacks realistic lighting, dynamic shadows, camera perspective tilt, and organic 3D character meshes.
2. **Movement Smoothness:** Continuous pathfinding (agents walking around desks) requires complex SVG path calculations or CSS offset-path interpolations.

### Code Evidence
Lines 1034–1109 in [`office-view.tsx`](file:///Users/solehuddin/Documents/WebProject/ezity-office/src/screens/conductor/components/office-view.tsx#L1034-L1109) prove that multi-room grouping is simply a matter of rendering multiple `<rect>` zones (e.g. `<rect id="finance-wing" .../>`) and grouping desk arrays by department instead of the flat `DESK_POSITIONS_BY_TEMPLATE`.

---

## Option B — Three.js

### Architecture
Introduce a WebGL canvas executing a 3D isometric or orthographic camera scene. Desks, monitors, and walls are modeled either with low-poly Three.js primitives (`BoxGeometry`, `CylinderGeometry`) or loaded via optimized `.glb` / `.gltf` assets.

### Detailed Evaluation

1. **Bundle Impact:**
   - `three`: ~600 KB minified (~155 KB gzipped).
   - `@react-three/fiber` + `@react-three/drei`: ~240 KB minified (~65 KB gzipped).
   - Total initial bundle increase: **~220 KB gzipped / ~840 KB parsed JS**.
2. **SSR & TanStack Start Boundary:**
   - **Severe SSR Constraint:** Hermes Studio uses `@tanstack/react-start` with Node.js SSR (`server-entry.js`). Three.js requires `window`, `document`, and WebGL context.
   - **Requirement:** Three.js **must** be isolated behind a dynamic client-only import (`React.lazy()` with `typeof window !== 'undefined'` guard or `<ClientOnly>`).
3. **Camera & Interaction (Raycasting):**
   - Click interactions require a `Raycaster` mapping mouse pointer `(x, y)` to 3D meshes.
   - Tooltips cannot be pure DOM unless projected using 2D screen coordinate converters (`vector.project(camera)`) or `@react-three/drei`'s `<Html>` component.
4. **Performance by Platform:**
   - **MacBook / Modern PC:** Smooth 60 FPS / 120 FPS. Minimal strain.
   - **Mobile (iOS Safari / Android Chrome):** Higher battery drain and thermal throttling. WebGL context can be discarded by mobile OS if backgrounded.
   - **NAS Server:** **Zero impact on NAS CPU/RAM.** The NAS only serves the static JS bundle. Execution is 100% client-side in the browser.
5. **Maintainability & Upstream Merges:**
   - High risk if intertwined with Conductor screen logic. Must remain strictly behind a modular adapter.

---

## Option C — 2.5D / Canvas

### Architecture
An HTML5 2D Canvas rendering isometric tiles (e.g., 64×32 diamond grid) with 2D sprite sheets for agents (e.g. Habbo Hotel / SimCity / AI Town style).

### Comparison Matrix

| Factor | Option A: SVG/DOM | Option B: Three.js | Option C: 2.5D Canvas |
| :--- | :--- | :--- | :--- |
| **Visual Aesthetic** | Clean, flat, diagrammatic | Premium 3D, depth, lighting | Retro isometric, pixel/sprite |
| **Bundle Cost** | **0 KB** | ~840 KB (220 KB gzip) | ~15 KB (math utilities) |
| **SSR Safety** | 100% native SSR safe | Requires client-only wrapper | Requires client-only wrapper |
| **Animation Fidelity** | CSS transitions (discrete) | Skeletal / 3D transforms | Frame-by-frame 2D sprites |
| **Click / Tooltips** | Native DOM `<button>` | Raycasting + projected DOM | Manual bounding-box math |
| **Accessibility (a11y)** | Native ARIA & Tab order | Requires parallel DOM tree | Requires parallel DOM tree |
| **Asset Pipeline** | Pure code / SVG strings | 3D GLB models / Shaders | Sprite sheets / Tile atlases |
| **Implementation Effort** | Low (3–4 days) | High (3–4 weeks) | Medium (2–3 weeks) |

### Verdict on 2.5D Canvas
While 2.5D Canvas gives a nostalgic "AI Town" aesthetic, it combines the asset creation burden of custom sprite sheets with the interaction friction of manual canvas hit-testing, without providing the dynamic lighting and model flexibility of Three.js. **It is an awkward middle ground.**

---

## Dual Renderer Architecture

A Dual Renderer Architecture is completely viable and represents the safest engineering path.

```
                          ┌────────────────────────┐
                          │   Runtime Collectors   │
                          │ (Conductor, Tasks,     │
                          │  Approvals, EzityHub)  │
                          └───────────┬────────────┘
                                      │
                                      ▼
                          ┌────────────────────────┐
                          │   useOfficeState()     │
                          │  (State Store Hook)    │
                          └───────────┬────────────┘
                                      │
                                      ▼
                          ┌────────────────────────┐
                          │    OfficeSceneState    │
                          │ (Canonical Data Model) │
                          └───────────┬────────────┘
                                      │
                                      ▼
                          ┌────────────────────────┐
                          │   OfficeRendererHost   │
                          │ (Feature Flag Router)  │
                          └─────┬────────────┬─────┘
                                │            │
            renderer == 'svg'   │            │   renderer == 'three'
                                ▼            ▼
                     ┌──────────────┐    ┌──────────────────────┐
                     │ SvgOffice    │    │ Suspense / Lazy      │
                     │ Renderer     │    │ ThreeOfficeRenderer  │
                     └──────────────┘    └──────────────────────┘
```

### Abstraction Boundaries

1. **`useOfficeState()` (`src/screens/conductor/hooks/use-office-state.ts`)**
   - Merges `useConductorGateway()`, `useQuery(['work-items'])`, and `EZITY_STAFF` definitions.
   - Outputs a unified `OfficeSceneState`.
2. **`OfficeRendererHost` (`src/screens/conductor/components/office-renderer-host.tsx`)**
   - Reads the user/system preference (`'svg'` vs `'three'`).
   - Handles WebGL capability detection; automatically falls back to `SvgOfficeRenderer` if WebGL is unavailable or if user prefers reduced graphics/motion.
3. **`SvgOfficeRenderer` (`src/screens/conductor/renderers/svg/svg-office-renderer.tsx`)**
   - Modularized, clean SVG renderer consuming `OfficeRendererProps`.
4. **`ThreeOfficeRenderer` (`src/screens/conductor/renderers/three/three-office-renderer.tsx`)**
   - Dynamically imported client-only component consuming identical `OfficeRendererProps`.

---

## Spatial / Zone Model

The office space must be modeled logically, completely decoupled from visual coordinates:

```typescript
export interface OfficeSpatialZone {
  id: OfficeZoneId
  title: string
  department: OfficeDepartment
  type: 'desk_cluster' | 'room' | 'utility_station'
  capacity: number
  // Visual positions are mapped separately by renderer adapters:
  // SvgRenderer maps to { svgX, svgY }
  // ThreeRenderer maps to Vector3(x, y, z)
}

export const OFFICE_ZONES: Record<OfficeZoneId, OfficeSpatialZone> = {
  desk_executive: {
    id: 'desk_executive',
    title: 'Executive Suite',
    department: 'executive',
    type: 'desk_cluster',
    capacity: 2,
  },
  desk_finance: {
    id: 'desk_finance',
    title: 'Finance & Accounting Wing',
    department: 'finance',
    type: 'desk_cluster',
    capacity: 3,
  },
  desk_engineering: {
    id: 'desk_engineering',
    title: 'Engineering Bay',
    department: 'engineering',
    type: 'desk_cluster',
    capacity: 4,
  },
  review_station: {
    id: 'review_station',
    title: 'Approval & Review Area',
    department: 'operations',
    type: 'utility_station',
    capacity: 4,
  },
  inbox_board: {
    id: 'inbox_board',
    title: 'Work Inbox Board',
    department: 'operations',
    type: 'utility_station',
    capacity: 2,
  },
  meeting_room: {
    id: 'meeting_room',
    title: 'Strategic Conference Room',
    department: 'operations',
    type: 'room',
    capacity: 8,
  },
  lounge_break: {
    id: 'lounge_break',
    title: 'Staff Lounge & Coffee',
    department: 'operations',
    type: 'room',
    capacity: 6,
  },
}
```

---

## Department Layout

The physical office layout is divided into 6 distinct logical zones:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             EZITY VIRTUAL OFFICE                            │
├──────────────────────┬───────────────────────────────┬──────────────────────┤
│  EXECUTIVE SUITE     │   STRATEGIC CONFERENCE ROOM   │   WORK INBOX & OPS   │
│  - Chief of Staff    │   - Multi-agent meetings      │   - WorkItem status  │
│  - Strategic Plans   │   - Roundtable discussions    │   - System alerts    │
│  (Zone: executive)   │   (Zone: meeting_room)        │   (Zone: inbox_board)│
├──────────────────────┴───────────────────────────────┴──────────────────────┤
│                               CENTRAL HALLWAY                               │
├──────────────────────┬───────────────────────────────┬──────────────────────┤
│  FINANCE WING        │   APPROVAL & REVIEW STATION   │   ENGINEERING BAY    │
│  - Accountant        │   - Pending Human Approvals   │   - Developer        │
│  - Ledger stream     │   - Journal reviews           │   - Code builds      │
│  (Zone: finance)     │   (Zone: review_station)      │   (Zone: engineering)│
└──────────────────────┴───────────────────────────────┴──────────────────────┘
```

---

## Real-State Movement & Animation Model

### Audit of Current Animations in `office-view.tsx`

| Current Animation | Implementation | Classification | Target in Future Architecture |
| :--- | :--- | :--- | :--- |
| **Idle agent wandering** | `Math.floor((tick + i * 17) / 25) % 4` (lines 788–824) | **D. Random / Heuristic** | **Eliminate**. Agent stays at desk unless real work moves them. |
| **Speech bubble generation** | `getSpeechLine` cycling fake coffee/chat text | **D. Random / Fake** | **Replace**. Display real current task or verified last activity line. |
| **Status Glow Pulses** | CSS `@keyframes office-status-glow-*` | **A. Driven by Real State** | **Retain & Refine**. Colors map to active, waiting, error, idle. |
| **Desk Monitor Text** | `getDeskMonitorText` (task title or 'Ready') | **A. Driven by Real State** | **Retain**. Real task titles displayed on workstation monitors. |
| **Idle bobbing** | `office-idle-float` (translateY ±3px) | **C. Decorative** | **Retain as subtle life-breathing micro-motion**. |

### Future State-Driven Movement Rules

Agents change zones **only** when triggered by verifiable business runtime events:

1. **`idle` / `ready`** $\rightarrow$ Stationed at their primary **Home Desk**.
2. **`working`** $\rightarrow$ Active at their **Home Desk** (monitors lit, typing/processing pulse).
3. **`approval_required` / `waiting_for_input`** $\rightarrow$ Physical agent token moves to the **Approval & Review Station**.
4. **`inbox_processing`** $\rightarrow$ Moves temporarily to the **Work Inbox Board**.
5. **`collaborating` / `multi-agent mission`** $\rightarrow$ Moves into the **Strategic Conference Room**.
6. **`error` / `stale`** $\rightarrow$ Stationed at **Home Desk** with alert beacon / red glow.
7. **`break` / `paused`** $\rightarrow$ Moves to the **Staff Lounge & Coffee Bar**.

---

## Interaction Model & Routing

Renderer clicks should immediately route to real application contexts:

```
┌──────────────────────────┬─────────────────────────────┬────────────────────────────────────┐
│ Clicked Visual Element   │ Internal Action Event       │ Application Route / Side Effect    │
├──────────────────────────┼─────────────────────────────┼────────────────────────────────────┤
│ Click Agent (Accountant) │ onAgentClick('ezity-acc...')│ Opens Chat with Accountant session │
│                          │                             │ or opens Agent Info Sheet          │
├──────────────────────────┼─────────────────────────────┼────────────────────────────────────┤
│ Click Chief of Staff     │ onAgentClick('chief-of...') │ Focuses Conductor Mission Drawer   │
├──────────────────────────┼─────────────────────────────┼────────────────────────────────────┤
│ Click Active Desk        │ onDeskClick(deskId)         │ Opens Task Output Drawer / Modal   │
├──────────────────────────┼─────────────────────────────┼────────────────────────────────────┤
│ Click Review Station     │ onZoneClick('review_...')   │ Opens `/inbox?tab=needs_attention` │
│                          │                             │ or Approvals Modal                 │
├──────────────────────────┼─────────────────────────────┼────────────────────────────────────┤
│ Click Work Inbox Board   │ onZoneClick('inbox_board')  │ Navigates directly to `/inbox`     │
├──────────────────────────┼─────────────────────────────┼────────────────────────────────────┤
│ Click Conference Room    │ onZoneClick('meeting_room') │ Expands Multi-Agent Stream Log     │
└──────────────────────────┴─────────────────────────────┴────────────────────────────────────┘
```

---

## Performance Comparison

| Area | Option A: SVG/DOM | Option B: Three.js / WebGL | Option C: 2.5D Canvas |
| :--- | :--- | :--- | :--- |
| **Initial Load / Bundle** | **Instant (0 ms parse)** | 100–300 ms initial JS compile | 20–50 ms sprite atlas load |
| **3 Agents (Current)** | ~60 FPS / <1% CPU | 60–120 FPS / 2–4% CPU | 60 FPS / 2% CPU |
| **10 Agents (Target)** | ~60 FPS / 1–2% CPU | 60–120 FPS / 3–5% CPU | 60 FPS / 3% CPU |
| **25 Agents (Scale)** | ~60 FPS / 3–5% CPU | 60–120 FPS / 4–6% CPU | 60 FPS / 4% CPU |
| **DOM Node Count** | ~150–250 SVG/HTML nodes | Exactly **1 `<canvas>`** node | Exactly **1 `<canvas>`** node |
| **GPU Memory Overhead**| Negligible (<5 MB) | 40–120 MB (VRAM textures) | 10–25 MB (VRAM) |
| **Input Latency** | Instant browser event loop | Raycasting hit test required | Mathematical grid hit test |
| **State Sync Bottleneck**| React prop re-rendering | Three.js scene-graph mutations | Canvas full-redraw tick loop |

---

## Upstream Risk & Codebase Sensitivity

To protect `ezity-office` from painful merge conflicts when rebasing against Hermes Studio upstream releases:

1. **High-Risk Files (Do NOT Overhaul In-Place):**
   - [`src/screens/conductor/hooks/use-conductor-gateway.ts`](file:///Users/solehuddin/Documents/WebProject/ezity-office/src/screens/conductor/hooks/use-conductor-gateway.ts) (upstream gateway streaming core).
   - [`src/screens/conductor/conductor-screen.tsx`](file:///Users/solehuddin/Documents/WebProject/ezity-office/src/screens/conductor/conductor-screen.tsx) (conductor router).
   - [`src/screens/conductor/components/conductor-active.tsx`](file:///Users/solehuddin/Documents/WebProject/ezity-office/src/screens/conductor/components/conductor-active.tsx).
2. **Recommended Isolated Directory Structure:**
   Create a dedicated sub-package for all Ezity Office rendering logic:
   ```
   src/screens/conductor/office/
   ├── state/
   │   ├── office-scene.types.ts       # Renderer-agnostic scene state
   │   └── use-office-state.ts         # Runtime aggregator hook
   ├── renderers/
   │   ├── office-renderer.types.ts    # Common renderer contract
   │   ├── svg/
   │   │   ├── svg-office-renderer.tsx # Cleaned-up SVG renderer
   │   │   ├── svg-departments.tsx     # Department rooms
   │   │   └── svg-furniture.tsx       # Desks & stations
   │   └── three/                      # Future WebGL implementation
   │       ├── three-office-renderer.tsx
   │       ├── office-scene-graph.tsx
   │       └── office-camera.tsx
   └── office-renderer-host.tsx        # Switcher & feature flag bridge
   ```
   This keeps upstream edits restricted to just referencing `<OfficeRendererHost />` inside `conductor-home.tsx` and `conductor-active.tsx`.

---

## Mobile & Accessibility

### Mobile Audit
- The current implementation in `office-view.tsx` completely hides the SVG office on mobile devices (`md:hidden`, lines 878–930) and displays a vertical list of agent cards.
- **Three.js Mobile Penalty:** Rendering a 3D scene on a mobile phone for an operational dashboard often results in cramped controls, touch-manipulation difficulty, and accelerated battery drain.
- **Strategy:** Retain the responsive fallback:
  - Mobile screens (`< 768px`) should **always default to the compact SVG/DOM card list**, regardless of whether 3D is active on desktop.

### Accessibility (a11y) Requirements
1. **WCAG Compliance:** A pure 3D canvas is completely opaque to screen readers. All agents, alerts, and pending approvals must be mirrored in accessible DOM attributes or a hidden screen-reader live region (`aria-live="polite"`).
2. **Keyboard Navigation:** Users must be able to `Tab` through active agents and press `Enter` to open sessions. This is effortless in SVG/DOM, but requires a virtual focus manager in Three.js.
3. **`prefers-reduced-motion`:** Respect user OS accessibility settings: disable walking transitions and camera pans when reduced motion is requested.

---

## Phased Migration Plan

```
Phase 1: State Extraction
Extract useOfficeState() & OfficeSceneState. Clean data flow.
                   │
                   ▼
Phase 2: Modernize SVG Renderer
Add real department rooms (Finance, Exec, Dev, Inbox) in SVG.
Fix responsive coordinate bug. Connect real click handlers.
                   │
                   ▼
Phase 3: Interactive Workflows
Connect Approval Station to /inbox and click actions to sessions.
State-driven desk movements.
                   │
                   ▼
Phase 4: Three.js Prototype (Feature Flag)
Implement ThreeOfficeRenderer behind officeRenderer: 'three' flag.
Client-only dynamic import.
                   │
                   ▼
Phase 5: Evaluation & Final Delivery
Benchmark performance across devices. Choose default renderer.
```

- **Phase 1: Decouple State & Presentation (Immediate)**
  - Create `OfficeSceneState` and `useOfficeState()`.
  - Consolidate the duplicate row-generation logic currently scattered between `conductor-home.tsx` and `conductor-active.tsx`.
- **Phase 2: Overhaul SVG Renderer with Departments (Short-term)**
  - Redesign SVG floorplan to include explicit department rooms: Executive Suite, Finance Wing, Engineering Bay, Review Area, Work Inbox Board.
  - Fix the HTML/SVG coordinate scaling mismatch by rendering agent avatars within SVG `<foreignObject>` or viewBox-normalized coordinates.
  - Wire real click handlers (`onAgentClick` opens chat sessions, `onApprovalClick` opens modal).
- **Phase 3: Real State-Driven Movement (Medium-term)**
  - Bind agent positions to operational status: Accountant moves to Review Area when EzityHub drafts await approval; Chief of Staff moves to Conference Room during multi-agent missions.
- **Phase 4: Prototype Three.js Renderer Behind Flag (Optional / Parallel)**
  - Add Three.js renderer isolated inside `src/screens/conductor/office/renderers/three/`.
  - Guard with `React.lazy()` and WebGL context check.
- **Phase 5: UX & Performance Benchmark**
  - Compare usability, bundle impact, and satisfaction before deciding whether to make Three.js the default desktop renderer.

---

## Feature Flag Architecture

Configuration should live in the existing Conductor settings schema:
- **Location:** Added to `ConductorSettings` in [`src/types/conductor.ts`](file:///Users/solehuddin/Documents/WebProject/ezity-office/src/types/conductor.ts#L10-L17) as `officeRenderer?: 'svg' | 'three' | 'auto'`.
- **Storage:** Persisted in `localStorage` under `ezity:office-renderer` and mirrored in `.runtime/conductor-settings.json`.
- **Audience:** Developer/Admin toggle inside `conductor-settings.tsx` drawer.
- **Graceful Fallback:**
  ```typescript
  function resolveRenderer(pref: string): 'svg' | 'three' {
    if (pref !== 'three') return 'svg'
    if (typeof window === 'undefined') return 'svg'
    const hasWebGL = Boolean(
      window.WebGLRenderingContext &&
      document.createElement('canvas').getContext('webgl2')
    )
    return hasWebGL ? 'three' : 'svg'
  }
  ```

---

## Recommended Architecture

**The Verdict:** **Dual Renderer Architecture with Option A (SVG/DOM) as the primary production engine and Option B (Three.js) as an opt-in visual enhancement.**

### Rationale
1. **Product Maturity:** Ezity AI Office is an operational ERP and AI workflow platform. Users require clarity, rapid task inspection, low latency, and rock-solid reliability.
2. **Current Implementation Gap:** The existing office fails not because it is SVG, but because it is an unstructured 12-desk grid using fake wandering timers and disabled click callbacks. Upgrading the SVG renderer to structured department rooms with real work-state navigation solves 90% of the product vision with **zero bundle bloat and zero risk to upstream compatibility**.
3. **Future-Proofing:** By introducing `OfficeSceneState` now, Three.js can be developed as a drop-in visual module without altering a single line of business orchestration logic.

---

## Relevant Files Reference Table

| File Path | Role in Office Visualization | Upstream Sensitivity |
| :--- | :--- | :--- |
| [`src/screens/conductor/components/office-view.tsx`](file:///Users/solehuddin/Documents/WebProject/ezity-office/src/screens/conductor/components/office-view.tsx) | Current hybrid SVG/HTML office renderer | High (Target for refactoring into modular renderers) |
| [`src/screens/conductor/components/agent-avatar.tsx`](file:///Users/solehuddin/Documents/WebProject/ezity-office/src/screens/conductor/components/agent-avatar.tsx) | Procedural pixel robot SVG generator & palette | Low |
| [`src/screens/conductor/components/conductor-home.tsx`](file:///Users/solehuddin/Documents/WebProject/ezity-office/src/screens/conductor/components/conductor-home.tsx) | Conductor idle home screen; synthesizes `homeOfficeRows` | Medium |
| [`src/screens/conductor/components/conductor-active.tsx`](file:///Users/solehuddin/Documents/WebProject/ezity-office/src/screens/conductor/components/conductor-active.tsx) | Conductor active mission screen; synthesizes `officeAgentRows` | Medium |
| [`src/screens/conductor/hooks/use-conductor-gateway.ts`](file:///Users/solehuddin/Documents/WebProject/ezity-office/src/screens/conductor/hooks/use-conductor-gateway.ts) | Primary Conductor gateway orchestration hook | **Critical (Do NOT modify for rendering)** |
| [`src/types/conductor.ts`](file:///Users/solehuddin/Documents/WebProject/ezity-office/src/types/conductor.ts) | Type definitions for Conductor workers and tasks | Medium |
| [`src/types/task.ts`](file:///Users/solehuddin/Documents/WebProject/ezity-office/src/types/task.ts) | WorkItem and HermesTask definitions | Low |
| [`src/server/agent-definitions-store.ts`](file:///Users/solehuddin/Documents/WebProject/ezity-office/src/server/agent-definitions-store.ts) | Defines `EZITY_STAFF` (Chief of Staff, Accountant, Developer) | Low |
| [`src/screens/inbox/inbox-screen.tsx`](file:///Users/solehuddin/Documents/WebProject/ezity-office/src/screens/inbox/inbox-screen.tsx) | Work Inbox UI for alerts and EzityHub approvals | Low |

---

## Recommended Next Step

**Do NOT write code or install packages yet.**

When authorized to begin implementation, execute **Phase 1 only**:
1. Formally create the type definitions in `src/types/office-scene.ts`.
2. Implement the state extractor hook `useOfficeState()`, unifying Conductor workers, `EZITY_STAFF`, and `WorkItem` statuses into a clean `OfficeSceneState`.
3. Verify that zero visual or functional regressions occur in the existing Conductor home and active screens.
