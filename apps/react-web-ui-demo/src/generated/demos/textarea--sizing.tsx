export default function Demo() {
  return (
    <div className="flex flex-wrap items-start gap-3">
      <web-ui-textarea
        clearable
        aria-label="较宽的多行文本"
        value="宽一档、清除色改 danger"
        className="[--wui-textarea-width:280px] [--wui-textarea-clear-color:var(--wui-color-danger)]"
      ></web-ui-textarea>
      <web-ui-textarea
        clearable
        aria-label="较窄的多行文本"
        value="窄一档"
        className="[--wui-textarea-width:120px]"
      ></web-ui-textarea>
    </div>
  )
}
