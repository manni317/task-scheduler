'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

export function AnimatedBackground() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none bg-slate-950">
      {/* Balloon 1 */}
      <motion.div
        className="absolute w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] bg-cyan-500/20 rounded-full blur-[100px]"
        animate={{
          x: [0, 100, 0, -100, 0],
          y: [0, -100, -200, -100, 0],
          scale: [1, 1.2, 1, 0.8, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "linear"
        }}
        style={{
          top: '0%',
          left: '0%',
        }}
      />

      {/* Balloon 2 */}
      <motion.div
        className="absolute w-[70vw] h-[70vw] max-w-[1000px] max-h-[1000px] bg-purple-500/20 rounded-full blur-[120px]"
        animate={{
          x: [0, -150, 0, 150, 0],
          y: [0, 150, 250, 150, 0],
          scale: [1, 0.9, 1, 1.3, 1],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "linear"
        }}
        style={{
          bottom: '0%',
          right: '0%',
        }}
      />

      {/* Balloon 3 */}
      <motion.div
        className="absolute w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] bg-indigo-500/20 rounded-full blur-[100px]"
        animate={{
          x: [0, 100, 200, 100, 0],
          y: [0, 100, 0, -100, 0],
          scale: [1, 1.5, 1, 1.2, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear"
        }}
        style={{
          top: '30%',
          left: '20%',
        }}
      />
    </div>
  )
}
