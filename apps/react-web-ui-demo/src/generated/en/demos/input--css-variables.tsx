export default function Demo() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <web-ui-input
        clearable
        value="One step wider, clear color set to danger"
        className="[--wui-input-width:280px] [--wui-input-clear-color:var(--wui-color-danger)]"
      ></web-ui-input>
      <web-ui-input clearable value="One step narrower" className="[--wui-input-width:120px]"></web-ui-input>
    </div>
  )
}
