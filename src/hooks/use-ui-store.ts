import { create } from 'zustand'

interface UIStore {
  isCreateTaskModalOpen: boolean
  isCreateOrgModalOpen: boolean
  taskDefaults: any
  refreshCount: number
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  initSidebarState: () => void
  openCreateTaskModal: (defaults?: any) => void
  closeCreateTaskModal: () => void
  openCreateOrgModal: () => void
  closeCreateOrgModal: () => void
  triggerRefresh: () => void
}

export const useUIStore = create<UIStore>((set) => ({
  isCreateTaskModalOpen: false,
  isCreateOrgModalOpen: false,
  taskDefaults: {},
  refreshCount: 0,
  // Start with true to ensure SSR and initial client hydration match 100%
  sidebarOpen: true,
  initSidebarState: () => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('taskflow_sidebar_open')
        if (saved !== null) {
          set({ sidebarOpen: saved === 'true' })
        }
      }
    } catch (e) {}
  },
  setSidebarOpen: (open: boolean) => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('taskflow_sidebar_open', String(open))
      }
    } catch (e) {}
    set({ sidebarOpen: open })
  },
  toggleSidebar: () => set((state) => {
    const next = !state.sidebarOpen
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('taskflow_sidebar_open', String(next))
      }
    } catch (e) {}
    return { sidebarOpen: next }
  }),
  openCreateTaskModal: (defaults = {}) => set({ isCreateTaskModalOpen: true, taskDefaults: defaults }),
  closeCreateTaskModal: () => set({ isCreateTaskModalOpen: false, taskDefaults: {} }),
  openCreateOrgModal: () => set({ isCreateOrgModalOpen: true }),
  closeCreateOrgModal: () => set({ isCreateOrgModalOpen: false }),
  triggerRefresh: () => set((state) => ({ refreshCount: state.refreshCount + 1 })),
}))
