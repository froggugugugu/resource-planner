import type { Step } from 'react-joyride'
import { create } from 'zustand'

interface TourState {
  isRunning: boolean
  currentTourId: string | null
  steps: Step[]
  stepIndex: number
  startTour: (tourId: string, steps: Step[]) => void
  stopTour: () => void
  setStepIndex: (index: number) => void
}

export const useTourStore = create<TourState>((set) => ({
  isRunning: false,
  currentTourId: null,
  steps: [],
  stepIndex: 0,
  startTour: (tourId, steps) =>
    set({ isRunning: true, currentTourId: tourId, steps, stepIndex: 0 }),
  stopTour: () =>
    set({ isRunning: false, currentTourId: null, steps: [], stepIndex: 0 }),
  setStepIndex: (index) => set({ stepIndex: index }),
}))
