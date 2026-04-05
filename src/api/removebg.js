/**
 * Removes the background from an image file using the Remove.bg API.
 * Returns a Blob of the result PNG with transparent background.
 *
 * In development, requests go through the Vite proxy at /api/removebg
 * to avoid CORS issues. In production, route through your own backend.
 */
export async function removeBackground(file, apiKey) {
  const formData = new FormData()
  formData.append('image_file', file)
  formData.append('size', 'auto')

  // Use proxy path in dev (/api/removebg → https://api.remove.bg/v1.0/removebg)
  // In production, call your own backend endpoint that forwards to Remove.bg
  const url = import.meta.env.DEV
    ? '/api/removebg'
    : 'https://api.remove.bg/v1.0/removebg'

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'X-Api-Key': apiKey },
    body: formData
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.errors?.[0]?.title || `Remove.bg error ${response.status}`)
  }

  return await response.blob()
}

/**
 * Fallback: composites the original image onto a white canvas using the Canvas API.
 * Used in demo mode when no Remove.bg key is provided.
 * Does NOT actually cut out the subject — just adds a white background.
 */
export function addWhiteBackground(dataUrl) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)
      resolve(canvas.toDataURL('image/png'))
    }

    img.src = dataUrl
  })
}

/**
 * Simulates the Remove.bg pipeline with progress callbacks.
 * Used in demo mode when no API key is provided.
 */
export async function simulateRemoval(onProgress) {
  const steps = [
    { progress: 20, label: 'Uploading…' },
    { progress: 45, label: 'Detecting subject…' },
    { progress: 70, label: 'Removing background…' },
    { progress: 90, label: 'Adding white canvas…' },
    { progress: 100, label: 'Done' }
  ]

  for (const step of steps) {
    onProgress(step.progress, step.label)
    await new Promise(r => setTimeout(r, 400))
  }
}
