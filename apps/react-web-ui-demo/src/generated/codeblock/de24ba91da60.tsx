export default function Demo() {
  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-editable-text
        value="AAAABBBBCCCCDDDDEEEE"
        className="w-32"
        aria-label="Long word breaking"
      ></web-ui-editable-text>
      <web-ui-editable-text
        value={'Whitespace is preserved as-is\npre-wrap by default'}
        className="w-40 [--wui-editable-text-white-space:pre]"
        aria-label="Preserve whitespace"
      ></web-ui-editable-text>
      <web-ui-editable-text
        value="Caret color changed to this accent"
        className="[--wui-color-accent:#7c3aed]"
      ></web-ui-editable-text>
    </div>
  )
}
