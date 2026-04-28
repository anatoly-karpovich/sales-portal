export function applyZipCodeMask(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 9)
  if (digits.length <= 5) {
    return digits
  }
  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}
