import { useState, useRef, useCallback, useEffect } from 'react'
import { useMotionSettings } from './useMotionSettings'

interface AudioClip {
  src: string
  volume?: number
  loop?: boolean
}

interface AudioAssets {
  spinLoop: AudioClip
  tick: AudioClip
  winStinger: AudioClip
  loseThud: AudioClip
}

// Generate simple audio clips programmatically for better UX
const createAudioContext = () => {
  if (typeof window === 'undefined') return null
  return new (window.AudioContext || (window as any).webkitAudioContext)()
}

const generateTickSound = (audioContext: AudioContext) => {
  const oscillator = audioContext.createOscillator()
  const gainNode = audioContext.createGain()
  
  oscillator.connect(gainNode)
  gainNode.connect(audioContext.destination)
  
  oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
  oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.1)
  
  gainNode.gain.setValueAtTime(0, audioContext.currentTime)
  gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01)
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)
  
  oscillator.start(audioContext.currentTime)
  oscillator.stop(audioContext.currentTime + 0.1)
}

const generateWinSound = (audioContext: AudioContext) => {
  // Create a chord progression for win sound
  const frequencies = [523.25, 659.25, 783.99] // C5, E5, G5
  
  frequencies.forEach((freq, index) => {
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    oscillator.frequency.setValueAtTime(freq, audioContext.currentTime + index * 0.1)
    oscillator.type = 'triangle'
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime + index * 0.1)
    gainNode.gain.linearRampToValueAtTime(0.4, audioContext.currentTime + index * 0.1 + 0.05)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + index * 0.1 + 0.8)
    
    oscillator.start(audioContext.currentTime + index * 0.1)
    oscillator.stop(audioContext.currentTime + index * 0.1 + 0.8)
  })
}

const generateLoseSound = (audioContext: AudioContext) => {
  const oscillator = audioContext.createOscillator()
  const gainNode = audioContext.createGain()
  
  oscillator.connect(gainNode)
  gainNode.connect(audioContext.destination)
  
  oscillator.frequency.setValueAtTime(200, audioContext.currentTime)
  oscillator.frequency.exponentialRampToValueAtTime(80, audioContext.currentTime + 0.5)
  oscillator.type = 'sawtooth'
  
  gainNode.gain.setValueAtTime(0, audioContext.currentTime)
  gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.05)
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)
  
  oscillator.start(audioContext.currentTime)
  oscillator.stop(audioContext.currentTime + 0.5)
}

export function useAudioManager() {
  const { settings } = useMotionSettings()
  const audioContextRef = useRef<AudioContext | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const lastTickTimeRef = useRef(0)
  
  const initializeAudio = useCallback(async () => {
    if (audioContextRef.current || !settings.soundEnabled) return
    
    try {
      audioContextRef.current = createAudioContext()
      if (audioContextRef.current?.state === 'suspended') {
        await audioContextRef.current.resume()
      }
      setIsInitialized(true)
    } catch (error) {
      console.warn('Audio initialization failed:', error)
    }
  }, [settings.soundEnabled])

  const playTick = useCallback((velocity: number = 1) => {
    if (!settings.soundEnabled || !audioContextRef.current || settings.reducedMotion) return
    
    const now = Date.now()
    if (now - lastTickTimeRef.current < 50) return // Throttle ticks
    lastTickTimeRef.current = now
    
    try {
      const volume = Math.min(0.3 * velocity, 0.6)
      if (volume > 0.05) {
        generateTickSound(audioContextRef.current)
      }
    } catch (error) {
      console.warn('Tick sound failed:', error)
    }
  }, [settings.soundEnabled, settings.reducedMotion])

  const playWin = useCallback(() => {
    if (!settings.soundEnabled || !audioContextRef.current) return
    
    try {
      generateWinSound(audioContextRef.current)
    } catch (error) {
      console.warn('Win sound failed:', error)
    }
  }, [settings.soundEnabled])

  const playLose = useCallback(() => {
    if (!settings.soundEnabled || !audioContextRef.current) return
    
    try {
      generateLoseSound(audioContextRef.current)
    } catch (error) {
      console.warn('Lose sound failed:', error)
    }
  }, [settings.soundEnabled])

  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!settings.hapticsEnabled || settings.reducedMotion) return
    
    if ('vibrate' in navigator) {
      const patterns = {
        light: 50,
        medium: 100,
        heavy: [100, 50, 100]
      }
      navigator.vibrate(patterns[type])
    }
  }, [settings.hapticsEnabled, settings.reducedMotion])

  // Initialize audio on first user interaction
  useEffect(() => {
    const handleUserInteraction = () => {
      initializeAudio()
      document.removeEventListener('click', handleUserInteraction)
      document.removeEventListener('touchstart', handleUserInteraction)
    }
    
    document.addEventListener('click', handleUserInteraction)
    document.addEventListener('touchstart', handleUserInteraction)
    
    return () => {
      document.removeEventListener('click', handleUserInteraction)
      document.removeEventListener('touchstart', handleUserInteraction)
    }
  }, [initializeAudio])

  return {
    isInitialized,
    playTick,
    playWin,
    playLose,
    triggerHaptic,
    initializeAudio
  }
}