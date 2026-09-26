import { create } from 'zustand'

interface UIStore {
  isCreateTaskModalOpen: boolean
  taskDefaults: any
  refreshCount: number
  openCreateTaskModal: (defaults?: any) => void
  closeCreateTaskModal: () => void
  triggerRefresh: () => void
}

export const useUIStore = create<UIStore>((set) => ({
  isCreateTaskModalOpen: false,
  taskDefaults: {},
  refreshCount: 0,
  openCreateTaskModal: (defaults = {}) => set({ isCreateTaskModalOpen: true, taskDefaults: defaults }),
  closeCreateTaskModal: () => set({ isCreateTaskModalOpen: false, taskDefaults: {} }),
  triggerRefresh: () => set((state) => ({ refreshCount: state.refreshCount + 1 })),
}))
