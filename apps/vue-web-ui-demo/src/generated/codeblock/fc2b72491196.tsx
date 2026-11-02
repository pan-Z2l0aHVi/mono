import { radixIconsPanelLeftMinimized } from '@greypan/web-ui/icons'

export default function Demo() {
  return (
    <div className="flex w-full max-w-md flex-col items-start gap-4">
      <web-ui-collapse horizontal className="flex items-center gap-2">
        <button
          type="button"
          className="flex-none cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2"
        >
          <web-ui-icon className="align-[-2px]" icon={radixIconsPanelLeftMinimized} size={14}></web-ui-icon>
          展开侧栏
        </button>
        <div slot="content">
          <div className="w-64 whitespace-nowrap p-3 text-sm">内容区沿宽度展开，trigger 留在同一行。</div>
        </div>
      </web-ui-collapse>

      <web-ui-collapse horizontal peek="120px" className="flex items-center gap-2">
        <button
          type="button"
          className="flex-none cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2"
        >
          水平 peek
        </button>
        <div slot="content">
          <div className="w-64 whitespace-nowrap p-3 text-sm">关闭时沿宽度露出 120px，渐隐带在右边缘。</div>
        </div>
      </web-ui-collapse>
    </div>
  )
}
