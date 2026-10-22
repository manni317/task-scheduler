'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

export type ColorThemeId = 
  | 'aurora' 
  | 'ocean' 
  | 'emerald' 
  | 'sunset' 
  | 'cyberpunk' 
  | 'midnight' 
  | 'ruby' 
  | 'slate'

export interface ColorThemeDefinition {
  id: ColorThemeId
  name: string
  subtitle: string
  bannerGradient: string
  bannerGlow1: string
  bannerGlow2: string
  bannerShadow: string
  previewGradient: string
  accentHex: string
}

export const COLOR_THEMES: ColorThemeDefinition[] = [
  {
    id: 'aurora',
    name: 'Aurora Indigo',
    subtitle: 'Royal Indigo, Electric Purple & Pink',
    bannerGradient: 'from-indigo-600 via-purple-600 to-pink-500',
    bannerGlow1: 'bg-white/25',
    bannerGlow2: 'bg-amber-400/25',
    bannerShadow: 'shadow-indigo-500/25',
    previewGradient: 'from-indigo-600 via-purple-600 to-pink-500',
    accentHex: '#6366f1',
  },
  {
    id: 'ocean',
    name: 'Ocean Sapphire',
    subtitle: 'Deep Ultramarine, Vivid Sky & Aqua Teal',
    bannerGradient: 'from-blue-600 via-sky-600 to-cyan-500',
    bannerGlow1: 'bg-cyan-300/30',
    bannerGlow2: 'bg-blue-400/25',
    bannerShadow: 'shadow-blue-500/25',
    previewGradient: 'from-blue-600 via-sky-600 to-cyan-500',
    accentHex: '#2563eb',
  },
  {
    id: 'emerald',
    name: 'Emerald Mint',
    subtitle: 'Rich Emerald Green, Teal & Luminous Jade',
    bannerGradient: 'from-emerald-600 via-teal-600 to-cyan-500',
    bannerGlow1: 'bg-emerald-300/30',
    bannerGlow2: 'bg-teal-400/25',
    bannerShadow: 'shadow-emerald-500/25',
    previewGradient: 'from-emerald-600 via-teal-600 to-cyan-500',
    accentHex: '#059669',
  },
  {
    id: 'sunset',
    name: 'Sunset Flame',
    subtitle: 'Warm Crimson, Radiant Orange & Golden Amber',
    bannerGradient: 'from-rose-600 via-orange-600 to-amber-500',
    bannerGlow1: 'bg-amber-300/30',
    bannerGlow2: 'bg-rose-400/25',
    bannerShadow: 'shadow-orange-500/25',
    previewGradient: 'from-rose-600 via-orange-600 to-amber-500',
    accentHex: '#ea580c',
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    subtitle: 'Deep Fuchsia, Hot Pink & Electric Violet',
    bannerGradient: 'from-fuchsia-600 via-pink-600 to-violet-600',
    bannerGlow1: 'bg-cyan-300/30',
    bannerGlow2: 'bg-pink-400/25',
    bannerShadow: 'shadow-fuchsia-500/25',
    previewGradient: 'from-fuchsia-600 via-pink-600 to-violet-600',
    accentHex: '#c026d3',
  },
  {
    id: 'midnight',
    name: 'Midnight Gold',
    subtitle: 'Luxury Noir, Obsidian & Warm Champagne Gold',
    bannerGradient: 'from-zinc-950 via-slate-900 to-amber-600',
    bannerGlow1: 'bg-amber-400/30',
    bannerGlow2: 'bg-yellow-500/20',
    bannerShadow: 'shadow-amber-500/20',
    previewGradient: 'from-zinc-900 via-slate-800 to-amber-600',
    accentHex: '#f59e0b',
  },
  {
    id: 'ruby',
    name: 'Crimson Ruby',
    subtitle: 'Royal Ruby, Scarlet Flame & Rose',
    bannerGradient: 'from-red-600 via-rose-600 to-pink-600',
    bannerGlow1: 'bg-rose-300/30',
    bannerGlow2: 'bg-red-400/25',
    bannerShadow: 'shadow-red-500/25',
    previewGradient: 'from-red-600 via-rose-600 to-pink-600',
    accentHex: '#e11d48',
  },
  {
    id: 'slate',
    name: 'Nordic Slate',
    subtitle: 'Minimalist Steel, Cool Slate & Deep Indigo',
    bannerGradient: 'from-slate-800 via-slate-900 to-indigo-950',
    bannerGlow1: 'bg-sky-400/25',
    bannerGlow2: 'bg-indigo-400/20',
    bannerShadow: 'shadow-slate-600/25',
    previewGradient: 'from-slate-700 via-slate-800 to-slate-950',
    accentHex: '#475569',
  },
]

interface ColorThemeContextType {
  colorTheme: ColorThemeId
  setColorTheme: (theme: ColorThemeId) => void
  currentTheme: ColorThemeDefinition
}

const ColorThemeContext = createContext<ColorThemeContextType | undefined>(undefined)

const STORAGE_KEY = 'taskflow_color_theme'

export function ColorThemeProvider({ children }: { children: React.ReactNode }) {
  const [colorTheme, setColorThemeState] = useState<ColorThemeId>('aurora')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as ColorThemeId | null
      if (saved && COLOR_THEMES.some(t => t.id === saved)) {
        setColorThemeState(saved)
        document.documentElement.setAttribute('data-color-theme', saved)
      } else {
        document.documentElement.setAttribute('data-color-theme', 'aurora')
      }
    } catch (e) {
      console.error('Error loading color theme:', e)
    }
    setMounted(true)
  }, [])

  const setColorTheme = (theme: ColorThemeId) => {
    setColorThemeState(theme)
    try {
      localStorage.setItem(STORAGE_KEY, theme)
      document.documentElement.setAttribute('data-color-theme', theme)
    } catch (e) {
      console.error('Error saving color theme:', e)
    }
  }

  const currentTheme = COLOR_THEMES.find(t => t.id === colorTheme) || COLOR_THEMES[0]

  return (
    <ColorThemeContext.Provider value={{ colorTheme, setColorTheme, currentTheme }}>
      {children}
    </ColorThemeContext.Provider>
  )
}

export function useColorTheme() {
  const context = useContext(ColorThemeContext)
  if (!context) {
    throw new Error('useColorTheme must be used within a ColorThemeProvider')
  }
  return context
}
