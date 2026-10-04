'use client'

import { motion, useAnimation, useMotionValue, useTransform } from 'framer-motion'
import { Check, ChevronRight } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface SwipeToCompleteProps {
  onComplete: () => void
  text?: string
}

export function SwipeToComplete({ onComplete, text = 'Drag to mark done' }: SwipeToCompleteProps) {
  const [isCompleted, setIsCompleted] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  
  const x = useMotionValue(0)
  const controls = useAnimation()
  
  // Calculate the button width (approximate)
  const buttonWidth = 56
  
  useEffect(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.offsetWidth)
    }
    
    const handleResize = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth)
      }
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  
  const maxDrag = containerWidth > 0 ? containerWidth - buttonWidth - 8 : 200 // 8px for padding

  const handleDragEnd = async (event: any, info: any) => {
    if (isCompleted) return

    if (info.offset.x > maxDrag * 0.7) {
      // Complete action
      setIsCompleted(true)
      await controls.start({ x: maxDrag, transition: { type: 'spring', stiffness: 300, damping: 20 } })
      onComplete()
    } else {
      // Snap back
      controls.start({ x: 0, transition: { type: 'spring', stiffness: 400, damping: 25 } })
    }
  }

  // Visual effects based on drag position
  const textOpacity = useTransform(x, [0, maxDrag * 0.5], [1, 0])
  const bgOpacity = useTransform(x, [0, maxDrag], [1, 0.2])
  
  return (
    <div 
      ref={containerRef}
      className="relative flex h-16 w-full items-center rounded-full bg-primary overflow-hidden shadow-lg shadow-primary/20"
    >
      {/* Background layer that fades out on drag */}
      <motion.div 
        className="absolute inset-0 bg-primary"
        style={{ opacity: bgOpacity }}
      />
      
      {/* Text */}
      <motion.div 
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{ opacity: textOpacity }}
      >
        <span className="text-primary-foreground font-semibold text-sm mr-6">
          {text}
        </span>
      </motion.div>
      
      {/* Draggable button */}
      <motion.div
        drag={isCompleted ? false : "x"}
        dragConstraints={{ left: 0, right: maxDrag }}
        dragElastic={0.05}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        animate={controls}
        style={{ x }}
        className="absolute left-1 flex h-14 w-14 cursor-grab active:cursor-grabbing items-center justify-center rounded-full bg-white text-primary shadow-sm z-10"
      >
        {isCompleted ? (
          <Check className="h-6 w-6 text-emerald-500" />
        ) : (
          <ChevronRight className="h-6 w-6" />
        )}
      </motion.div>
    </div>
  )
}
