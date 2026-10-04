'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sidebar } from './Sidebar'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { profile } = useAuth()

  useEffect(() => {
    setMounted(true)
  }, [])

  const content = (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50 transition-opacity lg:hidden',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />
      <Sidebar isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )

  if (!mounted) return null

  return createPortal(content, document.body)
}

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="lg:hidden"
      onClick={onClick}
      aria-label="Open menu"
    >
      <Menu className="h-6 w-6" />
    </Button>
  )
}

export function MobileCloseButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="lg:hidden absolute top-4 right-4 z-50"
      onClick={onClick}
      aria-label="Close menu"
    >
      <X className="h-6 w-6" />
    </Button>
  )
}