export default function Demo() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <web-ui-input-number value={12} className="[--wui-input-width:280px]"></web-ui-input-number>
      <web-ui-input-number value={12} className="[--wui-input-width:120px]"></web-ui-input-number>
    </div>
  )
}
