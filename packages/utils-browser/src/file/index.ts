import { clamp } from '@mono/utils-core'

/**
 * 获取文件名的后缀名，例如 'file.txt' 的后缀名为 'txt'。
 * @param filename 文件名
 * @returns 文件名的后缀名
 */
export function getFileExtension(filename: string): string {
  if (!filename || typeof filename !== 'string') throw new Error('Filename is invalid.')

  const lastDotIndex = filename.lastIndexOf('.')
  // 边缘情况处理：
  // - 没有点 (lastDotIndex = -1)
  // - 点在开头 (lastDotIndex = 0)，例如 .gitignore，不视作后缀
  if (lastDotIndex <= 0) throw new Error('Filename has no extension.')

  return filename.slice(lastDotIndex + 1).toLowerCase()
}

/**
 * 将 bytes 转换为可读的字符串，例如 '1.23 KB'。
 * @param bytes 字节数
 * @param decimals 小数点位数，默认为 2
 * @returns 字节数字符串
 */
export function formatFileSize(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const result = parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
  return result
}

/**
 * 下载文件
 * @param arg 文件对象、Blob 对象或字符串（支持远程 URL 链接）
 * @param filename 文件名，为空时自动获取文件名
 * @returns
 */
export async function downloadFile(
  arg: File | Blob | string,
  filename?: string,
  onProgress?: (percent: number) => void
) {
  const DEFAULT_FILENAME = 'download'
  let obj: Blob
  let name: string
  if (arg instanceof File || arg instanceof Blob) {
    obj = arg
    name = filename ?? (arg instanceof File ? arg.name : DEFAULT_FILENAME)
  } else {
    const urlPath = new URL(arg).pathname
    name = filename ?? (urlPath.substring(urlPath.lastIndexOf('/') + 1) || DEFAULT_FILENAME)

    const res = await fetch(arg)
    // 为了支持进度条，改用 ReadableStream 读取数据。而不是 obj = await res.blob()
    const contentLen = res.headers.get('content-length')
    const contentType = res.headers.get('content-type') || 'application/octet-stream'
    const total = contentLen ? parseInt(contentLen, 10) : 0
    const reader = res.body?.getReader()
    if (!reader) throw new Error('Failed to get reader.')

    let loaded = 0
    const chunks: BlobPart[] = []
    let lastPercent = -1

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      chunks.push(value)
      loaded += value.length

      if (total > 0 && onProgress) {
        const percent = clamp(Math.round((loaded / total) * 100), 0, 100)
        if (lastPercent !== percent) {
          lastPercent = percent
          onProgress(percent)
        }
      }
    }

    obj = new Blob(chunks, { type: contentType })
  }

  const url = window.URL.createObjectURL(obj)
  const a = document.createElement('a')
  a.style.display = 'none'
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()

  // 延迟释放，确保浏览器已触发下载
  setTimeout(() => {
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }, 100)
}

/**
 * 获取图片信息
 * @param source 图片对象、Blob 对象或字符串（可以是远程 URL 链接）
 * @returns 图片的宽高信息
 */
export function getImageInfo(source: File | Blob | string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    let url: string

    const cleanup = () => {
      if (source instanceof File || source instanceof Blob) URL.revokeObjectURL(url)
    }

    img.onload = () => {
      resolve({ width: img.width, height: img.height })
      cleanup()
    }

    img.onerror = () => {
      reject(new Error(`Image load failed: ${url}.`))
      cleanup()
    }

    if (source instanceof File || source instanceof Blob) {
      url = URL.createObjectURL(source)
    } else {
      url = source
    }
    img.src = url
  })
}

/**
 * 检查给定的字符串是否是一个合法的 base64 编码
 * @param str 需要被校验的字符串
 * @returns
 */
export function isValidBase64(str: string): boolean {
  if (typeof str !== 'string' || str.trim() === '') return false

  const base64Data = str.includes(',') ? (str.split(',')[1] ?? '') : str
  if (!base64Data || base64Data.length % 4 !== 0) return false

  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/
  if (!base64Regex.test(base64Data)) return false

  return !!window.atob(base64Data)
}

export function base64ToFile(base64: string, filename = 'file'): File {
  const isValid = isValidBase64(base64)
  if (!isValid) throw new Error('Invalid base64 string.')

  const arr = base64.split(',')
  const mime = (arr[0] as string).match(/:(.*?);/)?.[1] || 'image/png'

  const bstr = atob(arr[1] as string)
  let n = bstr.length
  const u8arr = new Uint8Array(n)

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }

  const extension = mime.split('/')[1] || 'png'
  const fullFilename = filename.includes('.') ? filename : `${filename}.${extension}`

  const file = new File([u8arr], fullFilename, { type: mime })
  return file
}

/**
 * 将 File 或 Blob 对象转换为 base64 编码字符串
 * @param file 需要被转换的 File 或 Blob 对象
 * @returns
 */
export function file2Base64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error ?? new Error('Unknown FileReader error.'))
  })
}

/**
 * 获取文件头部的 Magic Number（8 字节），并将其转换为十六进制字符串
 * @param file 需要被转换的 File 对象
 * @returns 文件头部的 Magic Number，例如 "89504e47" (PNG)
 */
async function getFileHeader(file: File): Promise<string> {
  const blob = file.slice(0, 8)

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as ArrayBuffer
      if (!result || result.byteLength === 0) {
        reject(new Error('File is empty or invalid.'))
        return
      }
      const uint8 = new Uint8Array(result)
      const hex = Array.from(uint8)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
      resolve(hex)
    }

    reader.onerror = () => reject(reader.error ?? new Error('Unknown FileReader error.'))
    reader.readAsArrayBuffer(blob)
  })
}

/**
 * 判断一组文件的真实类型是否一致 (基于文件头部的 Magic Number)
 * @param files 需要被转换的 Files
 */
export async function isSameFileType(...files: File[]): Promise<boolean> {
  if (files.length <= 1) return true

  const headers = await Promise.all(files.map(getFileHeader))
  const isAllSame = headers.every(v => v === headers[0])
  return isAllSame
}

// TODO:
// 大文件的 hash 计算
// 降级处理：js 主线程 -> web worker -> wasm
// export function computeFileHash(file: File): string {}
