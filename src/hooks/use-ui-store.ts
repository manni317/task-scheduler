import { create } from 'zustand'

interface UIStore {
  isCreateTaskModalOpen: boolean
  isCreateOrgModalOpen: boolean
  taskDefaults: any
  refreshCount: number
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
  openCreateTaskModal: (defaults = {}) => set({ isCreateTaskModalOpen: true, taskDefaults: defaults }),
  closeCreateTaskModal: () => set({ isCreateTaskModalOpen: false, taskDefaults: {} }),
  openCreateOrgModal: () => set({ isCreateOrgModalOpen: true }),
  closeCreateOrgModal: () => set({ isCreateOrgModalOpen: false }),
  triggerRefresh: () => set((state) => ({ refreshCount: state.refreshCount + 1 })),
}))
