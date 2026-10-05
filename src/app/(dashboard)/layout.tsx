'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { BottomNav } from '@/components/layout/BottomNav'
import { CreateTaskModal } from '@/components/task/CreateTaskModal'
import { CreateOrganizationModal } from '@/components/organization/CreateOrganizationModal'
import { PushManager } from '@/components/pwa/PushManager'
import { useUIStore } from '@/hooks/use-ui-store'
import { cn } from '@/lib/utils'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { isCreateTaskModalOpen, closeCreateTaskModal } = useUIStore()

  return (
    <div className="min-h-screen bg-background flex w-full max-w-[100vw] overflow-x-hidden">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div
        className={cn(
          "flex-1 flex flex-col transition-all duration-200 w-full min-w-0 min-h-screen overflow-x-hidden",
          sidebarOpen ? "md:pl-64" : "md:pl-16"
        )}
      >
        <Header />


        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 pb-24 md:pb-6 overflow-x-hidden overflow-y-auto w-full">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <BottomNav />
      </div>

      {/* Global Modals */}
      <CreateTaskModal isOpen={isCreateTaskModalOpen} onClose={closeCreateTaskModal} />
      <CreateOrganizationModal />
      <PushManager />
    </div>
  )
}
