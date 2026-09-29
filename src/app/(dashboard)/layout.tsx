'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { BottomNav } from '@/components/layout/BottomNav'
import { CreateTaskModal } from '@/components/task/CreateTaskModal'
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
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div
        className={cn(
          "flex-1 flex flex-col transition-all duration-200 w-full min-h-screen",
          sidebarOpen ? "md:pl-64" : "md:pl-16"
        )}
      >
        <Header />


        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <BottomNav />
      </div>

      {/* Global Modals */}
      <CreateTaskModal isOpen={isCreateTaskModalOpen} onClose={closeCreateTaskModal} />
    </div>
  )
}
