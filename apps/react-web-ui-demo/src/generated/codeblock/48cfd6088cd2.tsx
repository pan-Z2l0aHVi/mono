export default function Demo() {
  return (
    <div className="flex flex-wrap items-center gap-6">
      <span className="flex flex-col items-center gap-2">
        <web-ui-spinner size={16}></web-ui-spinner>
        <span className="text-xs text-(--wui-color-text-secondary)">16</span>
      </span>
      <span className="flex flex-col items-center gap-2">
        <web-ui-spinner></web-ui-spinner>
        <span className="text-xs text-(--wui-color-text-secondary)">24 (default)</span>
      </span>
      <span className="flex flex-col items-center gap-2">
        <web-ui-spinner size={48} aria-label="Submitting"></web-ui-spinner>
        <span className="text-xs text-(--wui-color-text-secondary)">48, with a custom accessible name</span>
      </span>
    </div>
  )
}
