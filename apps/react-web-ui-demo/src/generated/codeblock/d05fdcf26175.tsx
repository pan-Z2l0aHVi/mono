const CARD = '6222021234567890'

export default function Demo() {
  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <div>
        <div className="mb-1 text-xs text-(--wui-color-text-secondary)">不分组</div>
        <div className="font-mono">{CARD}</div>
      </div>
      <div>
        <div className="mb-1 text-xs text-(--wui-color-text-secondary)">groups="card"</div>
        <web-ui-grouped-text className="font-mono" value={CARD} groups="card"></web-ui-grouped-text>
      </div>
    </div>
  )
}
