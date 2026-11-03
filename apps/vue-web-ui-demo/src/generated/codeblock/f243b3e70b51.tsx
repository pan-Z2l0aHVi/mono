const ID = '110101199003078888'

export default function Demo() {
  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <div>
        <div className="mb-1 text-xs text-(--wui-color-text-secondary)">groups="6,8,8"</div>
        <web-ui-grouped-text value={ID} groups="6,8,8"></web-ui-grouped-text>
      </div>
      <div>
        <div className="mb-1 text-xs text-(--wui-color-text-secondary)">groups="4,4,4,4,4,4"</div>
        <web-ui-grouped-text value={ID} groups="4,4,4,4,4,4"></web-ui-grouped-text>
      </div>
      <div>
        <div className="mb-1 text-xs text-(--wui-color-text-secondary)">Emoji kept whole: groups="2,2"</div>
        <web-ui-grouped-text value={'\u{1F469}\u200D\u{1F4BB}'.repeat(4)} groups="2,2"></web-ui-grouped-text>
      </div>
    </div>
  )
}
