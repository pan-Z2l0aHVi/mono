export default function Demo() {
  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-editable-text placeholder="未命名项目" aria-label="空值"></web-ui-editable-text>
      <web-ui-editable-text value="有值时不显示占位" placeholder="未命名项目" aria-label="有值"></web-ui-editable-text>
      <web-ui-editable-text aria-label="清空之后"></web-ui-editable-text>
    </div>
  )
}
