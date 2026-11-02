export default function Demo() {
  return (
    <div className="flex flex-wrap items-center gap-6">
      <span className="flex flex-col items-center gap-2">
        <web-ui-spinner size={32}></web-ui-spinner>
        <span className="text-xs text-(--wui-color-text-secondary)">800ms (default)</span>
      </span>
      <span className="flex flex-col items-center gap-2">
        <web-ui-spinner size={32} className="[--wui-duration-spinner:400ms]"></web-ui-spinner>
        <span className="text-xs text-(--wui-color-text-secondary)">400ms</span>
      </span>
      <span className="flex flex-col items-center gap-2">
        <web-ui-spinner size={32} className="[--wui-duration-spinner:1600ms]"></web-ui-spinner>
        <span className="text-xs text-(--wui-color-text-secondary)">1600ms</span>
      </span>
    </div>
  )
}
