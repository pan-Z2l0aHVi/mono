const PHONE = '13800138000'

export default function Demo() {
  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <div>
        <div className="mb-1 text-xs text-(--wui-color-text-secondary)">11 位：3-4-4</div>
        <web-ui-grouped-text value={PHONE} groups="phone"></web-ui-grouped-text>
      </div>
      <div>
        <div className="mb-1 text-xs text-(--wui-color-text-secondary)">带国家码：最后一档继续切</div>
        <web-ui-grouped-text value={`+86${PHONE}`} groups="phone"></web-ui-grouped-text>
      </div>
    </div>
  )
}
