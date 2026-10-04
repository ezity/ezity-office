import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ChatWindowMode = 'floating' | 'docked'

export type ChatWindowBounds = {
  x: number
  y: number
  width: number
  height: number
}

type WorkspaceState = {
  sidebarCollapsed: boolean
  fileExplorerCollapsed: boolean
  chatFocusMode: boolean
  /** Currently active sub-page route (e.g. '/skills', '/channels') — null means chat-only */
  activeSubPage: string | null
  /** Chat panel visible alongside non-chat routes */
  chatPanelOpen: boolean
  /** Session key for the chat panel (defaults to 'main') */
  chatPanelSessionKey: string
  /** Floating or docked display mode */
  chatWindowMode: ChatWindowMode
  /** Whether the floating chat window is minimized to an avatar pill */
  chatWindowMinimized: boolean
  /** Stored position and dimensions for floating window */
  chatWindowBounds: ChatWindowBounds
  /** Mobile keyboard / composer focus — hides tab bar */
  mobileKeyboardOpen: boolean
  mobileKeyboardInset: number
  mobileComposerFocused: boolean
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleFileExplorer: () => void
  setFileExplorerCollapsed: (collapsed: boolean) => void
  toggleChatFocusMode: () => void
  setChatFocusMode: (enabled: boolean) => void
  setActiveSubPage: (page: string | null) => void
  toggleChatPanel: () => void
  setChatPanelOpen: (open: boolean) => void
  setChatPanelSessionKey: (key: string) => void
  setChatWindowMode: (mode: ChatWindowMode) => void
  setChatWindowMinimized: (minimized: boolean) => void
  setChatWindowBounds: (bounds: Partial<ChatWindowBounds>) => void
  openFloatingChat: (sessionKey?: string) => void
  setMobileKeyboardOpen: (open: boolean) => void
  setMobileKeyboardInset: (inset: number) => void
  setMobileComposerFocused: (focused: boolean) => void
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      fileExplorerCollapsed: true,
      chatFocusMode: false,
      activeSubPage: null,
      chatPanelOpen: false,
      chatPanelSessionKey: 'main',
      chatWindowMode: 'floating',
      chatWindowMinimized: false,
      chatWindowBounds: {
        x: -1,
        y: -1,
        width: 440,
        height: 620,
      },
      mobileKeyboardOpen: false,
      mobileKeyboardInset: 0,
      mobileComposerFocused: false,
      toggleSidebar: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      toggleFileExplorer: () =>
        set((s) => ({ fileExplorerCollapsed: !s.fileExplorerCollapsed })),
      setFileExplorerCollapsed: (collapsed) =>
        set({ fileExplorerCollapsed: collapsed }),
      toggleChatFocusMode: () =>
        set((s) => ({ chatFocusMode: !s.chatFocusMode })),
      setChatFocusMode: (enabled) => set({ chatFocusMode: enabled }),
      setActiveSubPage: (page) => set({ activeSubPage: page }),
      toggleChatPanel: () =>
        set((s) => ({
          chatPanelOpen: !s.chatPanelOpen,
          // When toggling open, un-minimize
          chatWindowMinimized: !s.chatPanelOpen ? false : s.chatWindowMinimized,
        })),
      setChatPanelOpen: (open) =>
        set((s) => ({
          chatPanelOpen: open,
          chatWindowMinimized: open ? false : s.chatWindowMinimized,
        })),
      setChatPanelSessionKey: (key) => set({ chatPanelSessionKey: key }),
      setChatWindowMode: (mode) => set({ chatWindowMode: mode }),
      setChatWindowMinimized: (minimized) =>
        set({ chatWindowMinimized: minimized }),
      setChatWindowBounds: (bounds) =>
        set((s) => ({
          chatWindowBounds: { ...s.chatWindowBounds, ...bounds },
        })),
      openFloatingChat: (sessionKey) =>
        set((s) => ({
          chatPanelOpen: true,
          chatWindowMinimized: false,
          chatPanelSessionKey: sessionKey ?? s.chatPanelSessionKey,
        })),
      setMobileKeyboardOpen: (open) => set({ mobileKeyboardOpen: open }),
      setMobileKeyboardInset: (inset) => set({ mobileKeyboardInset: inset }),
      setMobileComposerFocused: (focused) =>
        set({ mobileComposerFocused: focused }),
    }),
    {
      name: 'hermes-workspace-v1',
      partialize: (state) => ({
        // sidebarCollapsed intentionally NOT persisted — sidebar always opens fresh.
        // Persisting collapsed=true led to users getting stuck with no way back.
        fileExplorerCollapsed: state.fileExplorerCollapsed,
        chatPanelOpen: state.chatPanelOpen,
        chatPanelSessionKey: state.chatPanelSessionKey,
        chatWindowMode: state.chatWindowMode,
        chatWindowMinimized: state.chatWindowMinimized,
        chatWindowBounds: state.chatWindowBounds,
      }),
    },
  ),
)
