export default function Demo() {
  return (
    <web-ui-theme appearance="light">
      <div className="flex flex-wrap gap-4 rounded-2xl bg-(--wui-color-page) p-4 text-(--wui-color-text)">
        <div className="flex flex-col items-start gap-[var(--wui-space-4)]">
          <p className="m-0 text-sm text-(--wui-color-text-secondary)">Scope defaults</p>
          <web-ui-button variant="primary">Confirm</web-ui-button>
          <web-ui-input value="Width and height both use the default step"></web-ui-input>
        </div>

        <div className="flex flex-col items-start gap-[var(--wui-space-4)] [--wui-control-size:44px] [--wui-input-width:240px] [--wui-space-4:24px] [--wui-color-accent:#0f7b6c]">
          <p className="m-0 text-sm text-(--wui-color-text-secondary)">One step higher within the same scope</p>
          <web-ui-button variant="primary">Confirm</web-ui-button>
          <web-ui-input value="Control height and width raised"></web-ui-input>
        </div>
      </div>
    </web-ui-theme>
  )
}
