const CJK_TITLE = '海外增长与留存复盘报告-2026年第二季度终稿-v3-final.docx'

export default function Demo() {
  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <div className="w-48">
        <div className="mb-1 text-xs text-(--wui-color-text-secondary)">marker-position 默认 50</div>
        <web-ui-middle-ellipsis text={CJK_TITLE}></web-ui-middle-ellipsis>
      </div>
      <div className="w-48">
        <div className="mb-1 text-xs text-(--wui-color-text-secondary)">marker-position: 80</div>
        <web-ui-middle-ellipsis text={CJK_TITLE} marker-position={80}></web-ui-middle-ellipsis>
      </div>
    </div>
  )
}
