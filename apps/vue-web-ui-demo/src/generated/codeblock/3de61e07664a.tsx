const CARD = '6222021234567890'

export default function Demo() {
  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <div>
        <div className="mb-1 text-xs text-(--wui-color-text-secondary)">separator="-"</div>
        <web-ui-grouped-text value={CARD} groups="card" separator="-"></web-ui-grouped-text>
      </div>
      <div>
        <div className="mb-1 text-xs text-(--wui-color-text-secondary)">separator="·"</div>
        <web-ui-grouped-text value={CARD} groups="card" separator="·"></web-ui-grouped-text>
      </div>
    </div>
  )
}
