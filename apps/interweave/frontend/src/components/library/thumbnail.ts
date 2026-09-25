export const videoFrameRatio = 0.25

export function videoFrameCandidates(duration: number) {
  if (!Number.isFinite(duration) || duration <= 0) return [0, 0.25, 0.5, 1, 2, 4, 8]

  const preferred = duration * videoFrameRatio
  const candidates = [preferred]
  const step = duration <= 8 ? 0.25 : 0.5
  for (let time = 0; time <= duration && candidates.length < 24; time += step) {
    candidates.push(time)
  }
  candidates.push(duration * 0.5, duration * 0.75, Math.max(0, duration - 0.1))
  return [...new Set(candidates.map(time => Number(time.toFixed(3))))]
}

export function isBlackFrame(pixels: Uint8ClampedArray, threshold = 2) {
  if (pixels.length < 4) return true

  const pixelCount = Math.floor(pixels.length / 4)
  const step = Math.max(1, Math.floor(pixelCount / 32))
  let samples = 0
  let luminance = 0
  for (let pixel = 0; pixel < pixelCount; pixel += step) {
    const offset = pixel * 4
    if (pixels[offset + 3] === 0) continue
    samples++
    luminance += pixels[offset] * 0.2126 + pixels[offset + 1] * 0.7152 + pixels[offset + 2] * 0.0722
  }
  return samples === 0 || luminance / samples <= threshold
}
