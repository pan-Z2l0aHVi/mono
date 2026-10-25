export default function Demo() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <web-ui-input
        clearable
        value="宽一档、清除色改 danger"
        className="[--wui-input-width:280px] [--wui-input-clear-color:var(--wui-color-danger)]"
      ></web-ui-input>
      <web-ui-input clearable value="窄一档" className="[--wui-input-width:120px]"></web-ui-input>
    </div>
  )
}
