const NO_SPACE = 'a'.repeat(120)
const CLUSTERS = `${'\u{1F469}\u200D\u{1F4BB}'.repeat(16)}${'\u{26A0}\uFE0F}'.repeat(8)}`

export default function Demo() {
  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <div className="w-48">
        <div className="mb-1 text-xs text-(--wui-color-text-secondary)">Long string without spaces</div>
        <web-ui-middle-ellipsis text={NO_SPACE}></web-ui-middle-ellipsis>
      </div>
      <div className="w-48">
        <div className="mb-1 text-xs text-(--wui-color-text-secondary)">ZWJ and variation selectors</div>
        <web-ui-middle-ellipsis text={CLUSTERS}></web-ui-middle-ellipsis>
      </div>
    </div>
  )
}
