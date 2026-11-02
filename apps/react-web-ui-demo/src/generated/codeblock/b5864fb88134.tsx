import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-button onClick={() => setOpen(true)}>打开图片详情</web-ui-button>
      <output className="text-sm text-(--wui-color-text-secondary)">
        headless dialog：{open ? '已打开' : '已关闭'}
      </output>
      <web-ui-dialog
        open={open}
        headless
        aria-dialog-label="图片详情"
        onopen-change={event => setOpen(event.detail.open)}
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h2 className="m-0 text-base font-semibold">山间清晨</h2>
              <span className="text-xs text-(--wui-color-text-secondary)">3840 × 2160 · JPEG</span>
            </div>
            <web-ui-button variant="secondary" onClick={() => setOpen(false)}>
              关闭
            </web-ui-button>
          </div>
          <div className="flex h-32 items-center justify-center rounded-lg bg-(--wui-color-surface-glass) text-sm text-(--wui-color-text-secondary)">
            预览区域由页面自绘
          </div>
          <web-ui-button variant="primary" onClick={() => setOpen(false)}>
            完成
          </web-ui-button>
        </div>
      </web-ui-dialog>
    </div>
  )
}
