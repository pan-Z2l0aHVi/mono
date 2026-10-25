export default function Demo() {
  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-editable-text value="禁用：点不动，也不在 tab 序列里" disabled aria-label="禁用"></web-ui-editable-text>
      <web-ui-editable-text placeholder="禁用且空值：仍显示占位" disabled aria-label="禁用空值"></web-ui-editable-text>
      <web-ui-editable-text value="只读：能选中复制，改不动" readonly aria-label="只读"></web-ui-editable-text>
    </div>
  )
}
