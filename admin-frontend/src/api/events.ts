type ApiErrorDetail = {
  message: string
}

type ApiEventsMap = {
  error: ApiErrorDetail
  unauthorized: undefined
}

type ApiEventType = keyof ApiEventsMap
type ApiEventListener<EventType extends ApiEventType> = (payload: ApiEventsMap[EventType]) => void

const apiEventListeners: {
  [EventType in ApiEventType]: Set<ApiEventListener<EventType>>
} = {
  error: new Set(),
  unauthorized: new Set(),
}

function emitApiEvent<EventType extends ApiEventType>(type: EventType, payload: ApiEventsMap[EventType]) {
  const listeners = Array.from(apiEventListeners[type])
  listeners.forEach((listener) => listener(payload))
}

function subscribeApiEvent<EventType extends ApiEventType>(type: EventType, listener: ApiEventListener<EventType>) {
  apiEventListeners[type].add(listener)
  return () => {
    apiEventListeners[type].delete(listener)
  }
}

export function emitApiError(message: string) {
  emitApiEvent('error', { message })
}

export function emitUnauthorized() {
  emitApiEvent('unauthorized', undefined)
}

export function subscribeToApiErrors(listener: ApiEventListener<'error'>) {
  return subscribeApiEvent('error', listener)
}

export function subscribeToUnauthorized(listener: ApiEventListener<'unauthorized'>) {
  return subscribeApiEvent('unauthorized', listener)
}
