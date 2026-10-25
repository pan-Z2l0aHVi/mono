export default function Demo() {
  return (
    <div className="flex flex-wrap items-start gap-3">
      <web-ui-textarea
        clearable
        value="宽一档、清除色改 danger"
        className="[--wui-textarea-width:280px] [--wui-textarea-clear-color:var(--wui-color-danger)]"
      ></web-ui-textarea>
      <web-ui-textarea clearable value="窄一档" className="[--wui-textarea-width:120px]"></web-ui-textarea>
    </div>
  )
}
