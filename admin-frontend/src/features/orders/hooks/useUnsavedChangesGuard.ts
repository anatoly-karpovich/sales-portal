import { useEffect, useRef } from 'react'
import { useBeforeUnload } from 'react-router-dom'

type Props = {
  when: boolean
  message: string
}

export function useUnsavedChangesGuard({ when, message }: Props) {
  const previousHashRef = useRef(window.location.hash)
  const isRevertingRef = useRef(false)

  useEffect(() => {
    if (!when) {
      previousHashRef.current = window.location.hash
      return
    }

    const handleHashChange = () => {
      if (isRevertingRef.current) {
        isRevertingRef.current = false
        return
      }

      const nextHash = window.location.hash
      if (nextHash === previousHashRef.current) {
        return
      }

      const shouldLeave = window.confirm(message)
      if (shouldLeave) {
        previousHashRef.current = nextHash
        return
      }

      isRevertingRef.current = true
      window.location.hash = previousHashRef.current
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => {
      window.removeEventListener('hashchange', handleHashChange)
    }
  }, [message, when])

  useBeforeUnload((event) => {
    if (!when) return
    event.preventDefault()
    event.returnValue = ''
  })
}
