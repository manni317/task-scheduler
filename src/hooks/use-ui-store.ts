import { create } from 'zustand'

interface UIStore {
  isCreateTaskModalOpen: boolean
  isCreateOrgModalOpen: boolean
  taskDefaults: any
  refreshCount: number
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  openCreateTaskModal: (defaults?: any) => void
  closeCreateTaskModal: () => void
  openCreateOrgModal: () => void
  closeCreateOrgModal: () => void
  triggerRefresh: () => void
}

const getInitialSidebarState = (): boolean => {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('taskflow_sidebar_open')
      if (saved !== null) {
        return saved === 'true'
      }
    } catch (e) {}
  }
  return true
}

export const useUIStore = create<UIStore>((set) => ({
  isCreateTaskModalOpen: false,
  isCreateOrgModalOpen: false,
  taskDefaults: {},
  refreshCount: 0,
  sidebarOpen: getInitialSidebarState(),
  setSidebarOpen: (open: boolean) => {
    if (typeof window !== 'undefined') {
      try { localStorage.setItem('taskflow_sidebar_open', String(open)) } catch (e) {}
    }
    set({ sidebarOpen: open })
  },
  toggleSidebar: () => set((state) => {
    const next = !state.sidebarOpen
    if (typeof window !== 'undefined') {
      try { localStorage.setItem('taskflow_sidebar_open', String(next)) } catch (e) {}
    }
    return { sidebarOpen: next }
  }),
  openCreateTaskModal: (defaults = {}) => set({ isCreateTaskModalOpen: true, taskDefaults: defaults }),
  closeCreateTaskModal: () => set({ isCreateTaskModalOpen: false, taskDefaults: {} }),
  openCreateOrgModal: () => set({ isCreateOrgModalOpen: true }),
  closeCreateOrgModal: () => set({ isCreateOrgModalOpen: false }),
  triggerRefresh: () => set((state) => ({ refreshCount: state.refreshCount + 1 })),
}))
