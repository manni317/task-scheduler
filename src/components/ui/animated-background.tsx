'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

export function AnimatedBackground() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  // We use Framer Motion to create smooth floating 3D-like blobs (balloons)
  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none opacity-50 dark:opacity-20">
      {/* Balloon 1 */}
      <motion.div
        className="absolute w-[40vw] h-[40vw] max-w-[400px] max-h-[400px] bg-blue-500/20 rounded-[40%_60%_70%_30%/40%_50%_60%_50%] blur-2xl"
        animate={{
          x: [0, 50, 0, -50, 0],
          y: [0, -50, -100, -50, 0],
          rotate: [0, 90, 180, 270, 360],
          scale: [1, 1.1, 1, 0.9, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear"
        }}
        style={{
          top: '10%',
          left: '10%',
        }}
      />

      {/* Balloon 2 */}
      <motion.div
        className="absolute w-[50vw] h-[50vw] max-w-[500px] max-h-[500px] bg-indigo-500/20 rounded-[60%_40%_30%_70%/50%_30%_70%_50%] blur-3xl"
        animate={{
          x: [0, -60, 0, 60, 0],
          y: [0, 60, 120, 60, 0],
          rotate: [360, 270, 180, 90, 0],
          scale: [1, 0.8, 1, 1.2, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "linear"
        }}
        style={{
          bottom: '10%',
          right: '5%',
        }}
      />

      {/* Balloon 3 */}
      <motion.div
        className="absolute w-[30vw] h-[30vw] max-w-[300px] max-h-[300px] bg-sky-400/20 rounded-[50%_50%_60%_40%/40%_60%_50%_50%] blur-2xl"
        animate={{
          x: [0, 80, 0, -80, 0],
          y: [0, -30, 0, 30, 0],
          rotate: [0, 180, 360],
          scale: [1, 1.2, 0.9, 1],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "linear"
        }}
        style={{
          top: '40%',
          right: '30%',
        }}
      />
    </div>
  )
}
