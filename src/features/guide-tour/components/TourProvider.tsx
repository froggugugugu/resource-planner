import Joyride, {
  ACTIONS,
  type CallBackProps,
  EVENTS,
  STATUS,
} from 'react-joyride'
import { useTourStore } from '@/stores/tour-store'
import { TourTooltip } from './TourTooltip'

export function TourProvider() {
  const isRunning = useTourStore((s) => s.isRunning)
  const steps = useTourStore((s) => s.steps)
  const stepIndex = useTourStore((s) => s.stepIndex)
  const setStepIndex = useTourStore((s) => s.setStepIndex)
  const stopTour = useTourStore((s) => s.stopTour)

  const handleCallback = (data: CallBackProps) => {
    const { action, index, type, status } = data

    if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      setStepIndex(index + (action === ACTIONS.PREV ? -1 : 1))
    } else if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      stopTour()
    } else if (action === ACTIONS.CLOSE) {
      stopTour()
    }
  }

  if (!isRunning || steps.length === 0) return null

  return (
    <Joyride
      callback={handleCallback}
      continuous
      run={isRunning}
      stepIndex={stepIndex}
      steps={steps}
      tooltipComponent={TourTooltip}
      disableCloseOnEsc={false}
      disableOverlayClose={false}
      showSkipButton={false}
      scrollToFirstStep
      scrollOffset={80}
      styles={{
        options: {
          zIndex: 10000,
          overlayColor: 'rgba(0, 0, 0, 0.4)',
        },
      }}
    />
  )
}
