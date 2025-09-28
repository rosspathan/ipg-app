import { useState, useEffect } from 'react'

export interface MotionSettings {
  reducedMotion: boolean
  soundEnabled: boolean
  hapticsEnabled: boolean
  particleQuality: 'low' | 'medium' | 'high'
  targetFPS: 30 | 60
  autoAdapt: boolean
}

const defaultSettings: MotionSettings = {
  reducedMotion: false,
  soundEnabled: true,
  hapticsEnabled: true,
  particleQuality: 'medium',
  targetFPS: 60,
  autoAdapt: true
}

export function useMotionSettings() {
  const [settings, setSettings] = useState<MotionSettings>(() => {
    // Check for saved preferences
    const saved = localStorage.getItem('premium-spin-settings')
    if (saved) {
      try {
        return { ...defaultSettings, ...JSON.parse(saved) }
      } catch {
        return defaultSettings
      }
    }

    // Auto-detect reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    return {
      ...defaultSettings,
      reducedMotion: prefersReducedMotion
    }
  })

  const [deviceCapabilities, setDeviceCapabilities] = useState({
    isLowEnd: false,
    supportsWebGL: false,
    supportsBatteryAPI: false,
    isMobile: false
  })

  useEffect(() => {
    // Detect device capabilities
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    const supportsWebGL = !!gl
    
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    const isLowEnd = navigator.hardwareConcurrency <= 2 || (navigator as any).deviceMemory <= 4
    const supportsBatteryAPI = 'getBattery' in navigator

    setDeviceCapabilities({
      isLowEnd,
      supportsWebGL,
      supportsBatteryAPI,
      isMobile
    })

    // Auto-adapt settings for low-end devices
    if (settings.autoAdapt && (isLowEnd || !supportsWebGL)) {
      setSettings(prev => ({
        ...prev,
        particleQuality: 'low',
        targetFPS: 30
      }))
    }

    // Listen for reduced motion changes
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handleChange = (e: MediaQueryListEvent) => {
      setSettings(prev => ({ ...prev, reducedMotion: e.matches }))
    }
    
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [settings.autoAdapt])

  const updateSettings = (updates: Partial<MotionSettings>) => {
    const newSettings = { ...settings, ...updates }
    setSettings(newSettings)
    localStorage.setItem('premium-spin-settings', JSON.stringify(newSettings))
  }

  const getParticleConfig = () => {
    if (settings.reducedMotion) {
      return { maxParticles: 0, duration: 0 }
    }

    const baseConfig = {
      low: { maxParticles: 50, duration: 800 },
      medium: { maxParticles: deviceCapabilities.isMobile ? 150 : 300, duration: 1200 },
      high: { maxParticles: deviceCapabilities.isMobile ? 200 : 500, duration: 1500 }
    }

    return baseConfig[settings.particleQuality]
  }

  const getAnimationConfig = () => ({
    duration: settings.reducedMotion ? 500 : { min: 4600, max: 6200 },
    fps: settings.targetFPS,
    easing: settings.reducedMotion ? 'linear' : 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    particles: getParticleConfig()
  })

  return {
    settings,
    deviceCapabilities,
    updateSettings,
    getAnimationConfig,
    getParticleConfig
  }
}