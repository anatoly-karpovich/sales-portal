import type { AxiosResponse } from 'axios'

export function downloadBlobResponse(response: AxiosResponse<Blob>, fallbackFilename: string) {
  const disposition = response.headers['content-disposition'] as string | undefined
  const match = disposition?.match(/filename="(.+?)"/i)
  const filename = match?.[1] ?? fallbackFilename

  const blob = response.data
  const url = window.URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.URL.revokeObjectURL(url)
}
