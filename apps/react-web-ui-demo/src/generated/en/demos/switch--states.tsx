export default function Demo() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <web-ui-switch checked disabled></web-ui-switch>
        <span className="text-sm text-(--wui-color-text-secondary)">disabled: on, but cannot be changed</span>
      </div>
      <div className="flex items-center gap-3">
        <web-ui-switch checked loading></web-ui-switch>
        <span className="text-sm text-(--wui-color-text-secondary)">
          loading: keeps the current value while waiting
        </span>
      </div>
    </div>
  )
}
