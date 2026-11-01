export default function Demo() {
  return (
    <div className="grid w-full max-w-xl gap-5">
      <web-ui-progress
        aria-label="成功色进度"
        className="[--wui-progress-height:12px] [--wui-progress-fill-color:var(--wui-color-success)]"
        value={72}
        showValue
      ></web-ui-progress>
      <web-ui-progress
        aria-label="细轨道进度"
        className="[--wui-progress-height:4px] [--wui-progress-radius:2px]"
        value={38}
      ></web-ui-progress>
    </div>
  )
}
