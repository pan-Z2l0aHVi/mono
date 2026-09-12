import { imagePreview, type ImagePreviewHandle, type ImagePreviewItem, type ImagePreviewOptions } from '@greypan/web-ui'
import { useEffect, useRef, useState } from 'react'

/*
 * 内联 SVG 生成示例图：不引入二进制素材，同时能精确控制宽高比，
 * 便于验证缩放与平移的边界。
 */
function createImage(label: string, width: number, height: number, from: string, to: string): string {
  const fontSize = Math.round(Math.min(width, height) / 10)
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    '<defs><linearGradient id="gradient" x1="0" y1="0" x2="1" y2="1">' +
    `<stop offset="0" stop-color="${from}" /><stop offset="1" stop-color="${to}" />` +
    '</linearGradient></defs>' +
    `<rect width="${width}" height="${height}" fill="url(#gradient)" />` +
    `<text x="50%" y="50%" fill="#ffffff" font-family="system-ui, sans-serif" font-size="${fontSize}" font-weight="600" text-anchor="middle" dominant-baseline="middle">${label}</text>` +
    '</svg>'
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

const IMAGES: ImagePreviewItem[] = [
  { src: createImage('图 A · 1200 × 800', 1200, 800, '#0a84ff', '#5e5ce6'), alt: '图 A：蓝色渐变横版示例图' },
  { src: createImage('图 B · 900 × 1200', 900, 1200, '#ff375f', '#ff9f0a'), alt: '图 B：橙红渐变竖版示例图' },
  { src: createImage('图 C · 1600 × 600', 1600, 600, '#30d158', '#0a84ff'), alt: '图 C：绿蓝渐变宽幅示例图' }
]

const SINGLE_IMAGE: ImagePreviewItem[] = [
  { src: createImage('单图预览', 1200, 900, '#5e5ce6', '#ff375f'), alt: '单图预览示例' }
]

const LARGE_IMAGE: ImagePreviewItem[] = [
  { src: createImage('滚轮缩放 · 拖拽平移', 2400, 1600, '#1d1d1f', '#0a84ff'), alt: '用于验证缩放与平移的大尺寸示例图' }
]

// 展示类选项默认全关，多数示例用这份「全部开启」预设把控件带出来。
const FULL_UI = { nav: true, toolbar: true, closable: true, indicator: true }

const HANDLE_COMMANDS: { label: string; run: (handle: ImagePreviewHandle) => void }[] = [
  { label: '上一张', run: handle => handle.prev() },
  { label: '下一张', run: handle => handle.next() },
  { label: '跳到第 3 张', run: handle => handle.goTo(2) },
  { label: '放大', run: handle => handle.zoomIn() },
  { label: '缩小', run: handle => handle.zoomOut() },
  { label: '重置缩放', run: handle => handle.resetZoom() },
  { label: '关闭', run: handle => handle.close() }
]

// 单项预设：每次只开启一个选项，用来确认每个选项负责哪块 UI。
const PART_PRESETS: { label: string; options: Partial<ImagePreviewOptions> }[] = [
  { label: '仅 nav', options: { nav: true } },
  { label: '仅 toolbar', options: { toolbar: true } },
  { label: '仅 closable', options: { closable: true } },
  { label: '仅 indicator', options: { indicator: true } }
]

function ImagePreviewDemo() {
  // 句柄是唯一的控制入口；保持引用后既可以驱动它，也能读取 index / scale。
  const [activeHandle, setActiveHandle] = useState<ImagePreviewHandle>()
  const [statusText, setStatusText] = useState('未打开')
  const statusTimer = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  const styledContainer = useRef<HTMLDivElement>(null)

  const stopTracking = () => {
    if (statusTimer.current === undefined) return
    clearInterval(statusTimer.current)
    statusTimer.current = undefined
  }

  const syncStatus = (handle: ImagePreviewHandle) => {
    const position = `${handle.index + 1} / ${handle.images.length}`
    setStatusText(`已打开 · 当前 ${position} · 缩放 ${Math.round(handle.scale * 100)}%`)
  }

  // 预览内部的滚轮 / 双击缩放不会回调外部，因此轮询句柄让面板保持同步。
  const trackHandle = (handle: ImagePreviewHandle) => {
    stopTracking()
    setActiveHandle(handle)
    syncStatus(handle)
    statusTimer.current = setInterval(() => syncStatus(handle), 150)
    void handle.closed.then(() => {
      stopTracking()
      setActiveHandle(current => (current === handle ? undefined : current))
      setStatusText('未打开')
    })
  }

  const runHandleCommand = (run: (handle: ImagePreviewHandle) => void) => {
    if (!activeHandle) return
    run(activeHandle)
    syncStatus(activeHandle)
  }

  const openFull = (index = 0) => imagePreview({ images: IMAGES, index, ...FULL_UI })

  // 不传任何展示类选项：只有图片本身，空白点击与 Escape 仍可关闭。
  const openMinimal = () => imagePreview({ images: IMAGES })

  const openSingle = () => imagePreview({ images: SINGLE_IMAGE, ...FULL_UI })
  const openWithoutLoop = () => imagePreview({ images: IMAGES, loop: false, ...FULL_UI })
  const openLarge = () => imagePreview({ images: LARGE_IMAGE, ...FULL_UI })
  const openSwipe = () => imagePreview({ images: IMAGES, swipe: true, ...FULL_UI })
  const openSwipeBounded = () => imagePreview({ images: IMAGES, swipe: true, loop: false, ...FULL_UI })
  const openNoBackdropClose = () => imagePreview({ images: IMAGES, noBackdropClose: true, ...FULL_UI })
  const openNoScrollLock = () => imagePreview({ images: IMAGES, noScrollLock: true, ...FULL_UI })
  const openHandleDemo = () => trackHandle(imagePreview({ images: IMAGES, index: 1, ...FULL_UI }))

  // container 优先级高于主题作用域，用来演示自定义挂载点与 CSS 变量覆盖。
  const openWithContainer = () => {
    const container = styledContainer.current
    if (!container) return
    imagePreview({ images: IMAGES, container, ...FULL_UI })
  }

  // 四个展示类选项彼此独立、默认全关；拆开控制，便于逐个对照哪块 UI 由哪个选项负责。
  const [partNav, setPartNav] = useState(false)
  const [partToolbar, setPartToolbar] = useState(false)
  const [partClosable, setPartClosable] = useState(false)
  const [partIndicator, setPartIndicator] = useState(false)

  // 实时回显当前组合，让读者看到勾选与 options 字段的对应关系。
  const partsCode =
    `imagePreview({ images, nav: ${partNav}, toolbar: ${partToolbar}, ` +
    `closable: ${partClosable}, indicator: ${partIndicator} })`

  const openParts = () =>
    imagePreview({
      images: IMAGES,
      nav: partNav,
      toolbar: partToolbar,
      closable: partClosable,
      indicator: partIndicator
    })

  // 单项预设：每次只开启一个选项，用来确认每个选项负责哪块 UI。
  const openPartPreset = (options: Partial<ImagePreviewOptions>) => imagePreview({ images: IMAGES, ...options })

  // 关闭预览或离开页面时释放浮层；close() 对已关闭的预览是空操作。
  useEffect(() => {
    if (!activeHandle) return
    return () => activeHandle.close()
  }, [activeHandle])

  // 卸载时兜底清理轮询；正常关闭路径由 handle.closed 负责。
  useEffect(() => {
    return () => {
      if (statusTimer.current !== undefined) clearInterval(statusTimer.current)
      statusTimer.current = undefined
    }
  }, [])

  return (
    <div>
      <h1>ImagePreview 图片预览</h1>
      <p className="mb-6 text-sm text-gray-500">
        命令式浮层组件，没有声明式标签契约：只能通过 <code>imagePreview()</code>{' '}
        打开，并用返回的句柄控制。默认挂载到最近
        <code>web-ui-theme</code> 的 overlay 容器。
      </p>

      <h2>基础用法</h2>
      <p className="mb-3 text-sm text-gray-500">
        展示类选项默认全关，只渲染图片本身；下面第一个按钮显式开启导航、工具条、关闭按钮与指示器。方向键始终可切图，
        滚轮与 <code>+</code> / <code>-</code> 缩放，<code>0</code> 重置，双击图片在 1x 与 2x 之间切换，Escape
        或点击图片外空白处关闭。各选项各自的效果见下方「各部分显隐」。
      </p>
      <div className="mb-6 flex flex-wrap gap-2">
        <web-ui-button onClick={() => openFull()}>打开预览（全部开启）</web-ui-button>
        <web-ui-button variant="secondary" onClick={openMinimal}>
          默认选项
        </web-ui-button>
        <web-ui-button variant="secondary" onClick={() => openFull(2)}>
          从第 3 张打开
        </web-ui-button>
      </div>

      <h2>各部分显隐</h2>
      <p className="mb-3 text-sm text-gray-500">
        四个展示类选项彼此独立、默认全关。勾选后打开预览即可看到对应控件出现；下方四项预设每次只开启一个选项，
        便于对照每个选项负责哪块 UI。除「仅 closable」外，其余预设都没有可见的关闭按钮，此时点击图片外空白处或按{' '}
        <code>Escape</code> 仍可关闭。
      </p>
      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <web-ui-checkbox checked={partNav} onChange={event => setPartNav(event.currentTarget.checked)}>
          <code>nav</code>（上/下一张）
        </web-ui-checkbox>
        <web-ui-checkbox checked={partToolbar} onChange={event => setPartToolbar(event.currentTarget.checked)}>
          <code>toolbar</code>（缩放工具条）
        </web-ui-checkbox>
        <web-ui-checkbox checked={partClosable} onChange={event => setPartClosable(event.currentTarget.checked)}>
          <code>closable</code>（关闭按钮）
        </web-ui-checkbox>
        <web-ui-checkbox checked={partIndicator} onChange={event => setPartIndicator(event.currentTarget.checked)}>
          <code>indicator</code>（指示器）
        </web-ui-checkbox>
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        <web-ui-button onClick={openParts}>按当前勾选打开</web-ui-button>
      </div>
      <div className="mb-3 rounded-lg bg-[var(--wui-color-surface-raised)] px-3 py-2 text-sm">
        <code>{partsCode}</code>
      </div>
      <div className="mb-6 flex flex-wrap gap-2">
        {PART_PRESETS.map(preset => (
          <web-ui-button key={preset.label} variant="secondary" onClick={() => openPartPreset(preset.options)}>
            {preset.label}
          </web-ui-button>
        ))}
      </div>

      <h2>单图预览</h2>
      <p className="mb-3 text-sm text-gray-500">
        即使开启 <code>nav</code>，只有一张图时也不渲染上/下一张按钮，指示器为 <code>1 / 1</code>。
      </p>
      <div className="mb-6 flex flex-wrap gap-2">
        <web-ui-button onClick={openSingle}>打开单图预览</web-ui-button>
      </div>

      <h2>关闭循环</h2>
      <p className="mb-3 text-sm text-gray-500">
        <code>loop: false</code> 时索引在首尾钳制，越界方向的按钮禁用。
      </p>
      <div className="mb-6 flex flex-wrap gap-2">
        <web-ui-button onClick={openWithoutLoop}>loop = false</web-ui-button>
      </div>

      <h2>缩放与平移</h2>
      <p className="mb-3 text-sm text-gray-500">
        大尺寸图片放大后可拖拽平移，倍率限制在 1x–4x；1x 时图片收缩到视口内，不被裁切。
      </p>
      <div className="mb-6 flex flex-wrap gap-2">
        <web-ui-button onClick={openLarge}>打开大图</web-ui-button>
      </div>

      <h2>左右滑动切换</h2>
      <p className="mb-3 text-sm text-gray-500">
        <code>swipe: true</code> 时横向拖拽越过阈值即切换图片，跟手位移松手后回弹；
        <code>loop: false</code> 时在边界回弹。该手势复用 shared 的 <code>attachDragGesture</code>。
      </p>
      <div className="mb-6 flex flex-wrap gap-2">
        <web-ui-button onClick={openSwipe}>swipe = true</web-ui-button>
        <web-ui-button variant="secondary" onClick={openSwipeBounded}>
          swipe = true + loop = false
        </web-ui-button>
      </div>

      <h2>遮罩与滚动</h2>
      <p className="mb-3 text-sm text-gray-500">
        <code>noBackdropClose</code> 与 <code>noScrollLock</code> 的语义对齐 <code>web-ui-dialog</code>{' '}
        的同名属性：前者让空白点击不再关闭（下方示例仍保留关闭按钮），后者跳过打开期间的页面滚动锁定。
      </p>
      <div className="mb-6 flex flex-wrap gap-2">
        <web-ui-button onClick={openNoBackdropClose}>noBackdropClose = true</web-ui-button>
        <web-ui-button variant="secondary" onClick={openNoScrollLock}>
          noScrollLock = true
        </web-ui-button>
      </div>

      <h2>句柄控制</h2>
      <p className="mb-3 text-sm text-gray-500">
        句柄暴露 <code>index</code> / <code>scale</code> / <code>images</code> / <code>closed</code>{' '}
        与全部控制方法，可以据此实现自己的触发器和状态面板。
      </p>
      <div className="mb-3 flex flex-wrap gap-2">
        <web-ui-button onClick={openHandleDemo}>打开</web-ui-button>
      </div>
      {activeHandle ? (
        <div className="mb-3 flex flex-wrap gap-2">
          {HANDLE_COMMANDS.map(command => (
            <web-ui-button key={command.label} variant="secondary" onClick={() => runHandleCommand(command.run)}>
              {command.label}
            </web-ui-button>
          ))}
        </div>
      ) : null}
      <div className="mb-6 rounded-lg bg-[var(--wui-color-surface-raised)] px-3 py-2 text-sm">{statusText}</div>

      <h2>自定义容器与样式</h2>
      <p className="mb-3 text-sm text-gray-500">
        传 <code>container</code> 可把预览挂到自己的容器上（优先级高于主题作用域）。CSS 自定义属性沿 DOM
        继承，所以在容器上就能覆盖
        <code>--wui-image-preview-overlay-bg</code> 与 <code>--wui-image-preview-edge-gap</code>。
      </p>
      <div
        ref={styledContainer}
        className="mb-3 rounded-lg border border-dashed border-[var(--wui-color-border)] p-3 [--wui-image-preview-edge-gap:48px] [--wui-image-preview-overlay-bg:#0a2850e0]"
      >
        <span className="text-sm text-[var(--wui-color-text-secondary)]">预览宿主挂载在这里</span>
      </div>
      <div className="mb-6 flex flex-wrap gap-2">
        <web-ui-button onClick={openWithContainer}>用自定义容器打开</web-ui-button>
      </div>
    </div>
  )
}

export default ImagePreviewDemo
