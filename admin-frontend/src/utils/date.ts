function toValidDate(value: string | Date | null | undefined) {
  if (!value) return null
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return null
  return date
}

export function formatDate(value: string | Date | null | undefined) {
  if (typeof value === 'string') {
    const normalizedValue = value.trim()
    const dateOnlyMatch = normalizedValue.match(/^(\d{4}-\d{2}-\d{2})/)
    if (dateOnlyMatch) {
      return dateOnlyMatch[1]
    }
  }

  const date = toValidDate(value)
  if (!date) return '-'
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatDateTime(value: string | Date | null | undefined) {
  const date = toValidDate(value)
  if (!date) return '-'
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}
