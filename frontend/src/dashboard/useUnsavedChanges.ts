import { useCallback, useEffect, useRef } from 'react'
import { useBeforeUnload, useBlocker } from 'react-router'
import { useFeedback } from '../components/feedback.ts'
import { useT } from '../i18n/useT.ts'

/**
 * Ask before leaving a form with unsaved changes: a confirm sheet for
 * in-app navigation (e.g. tapping back), the browser's prompt for reloads
 * and closing the tab. Call `allowLeave()` right before navigating away
 * after a successful save.
 */
export function useUnsavedChanges(dirty: boolean) {
  const { confirm } = useFeedback()
  const t = useT()
  const dirtyRef = useRef(dirty)
  const bypass = useRef(false)
  const asking = useRef(false)

  useEffect(() => {
    dirtyRef.current = dirty
  }, [dirty])

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirtyRef.current && !bypass.current && currentLocation.pathname !== nextLocation.pathname,
  )

  useEffect(() => {
    if (blocker.state !== 'blocked' || asking.current) return
    asking.current = true
    confirm({
      title: t.products.discardTitle,
      message: t.products.discardMessage,
      confirmLabel: t.products.discard,
      danger: true,
    }).then((ok) => {
      asking.current = false
      if (ok) blocker.proceed()
      else blocker.reset()
    })
  }, [blocker, confirm, t])

  useBeforeUnload(
    useCallback((event: BeforeUnloadEvent) => {
      if (dirtyRef.current && !bypass.current) event.preventDefault()
    }, []),
  )

  return {
    allowLeave: () => {
      bypass.current = true
    },
  }
}
