// 缩略图的最长边与 JPEG 质量。与 Go 侧 media 包的 thumbnailMaxEdge / thumbnailJPEGQuality
// 保持同一档：前端回填的捕获图和后端生成的缩略图在视觉上应当一致。
export const THUMBNAIL_MAX_EDGE = 320
export const THUMBNAIL_JPEG_QUALITY = 0.82

/** 黑帧采样画布边长：32×32 足以判定平均亮度，避免在原尺寸画布上频繁 getImageData。 */
export const SAMPLE_CANVAS_EDGE = 32

export const videoFrameRatio = 0.25

/**
 * 为视频封面捕获生成精简候选时间点（最多 5 个），优先 25% 处，再按 50% / 10% / 75% / 0s
 * 回退。duration 不可用或 ≤ 0 时只返回 [0]，避免对未知时长视频盲目 seek。
 */
export function videoFrameCandidates(duration: number) {
  if (!Number.isFinite(duration) || duration <= 0) return [0]

  const candidates = [duration * videoFrameRatio, duration * 0.5, duration * 0.1, duration * 0.75, 0]
  return [...new Set(candidates.map(time => Number(Math.max(0, time).toFixed(3))))]
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

/**
 * 判断媒体 URL 是否跨源（例如 Windows 本地媒体服务 http://127.0.0.1:<port>/s/...）。
 * 同源相对路径、data: 和 blob: 不需要设置 crossOrigin="anonymous"。
 */
export function isCrossOriginMediaUrl(url: string | null | undefined): boolean {
  if (!url) return false
  if (url.startsWith('/') || url.startsWith('blob:') || url.startsWith('data:')) return false
  if (typeof window === 'undefined' || !window.location?.origin) return false
  try {
    const parsed = new URL(url, window.location.origin)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false
    return parsed.origin !== window.location.origin
  } catch {
    return false
  }
}

/** 脱敏本地媒体服务 URL 中的会话令牌，避免写入日志或报错信息。 */
export function redactSessionMediaUrl(url: string | null | undefined): string {
  if (!url) return ''
  return url.replace(/\/s\/[^/]+\//, '/s/[REDACTED]/')
}
