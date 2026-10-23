export default function Demo() {
  return (
    <web-ui-theme appearance="light" motion="reduced">
      <div className="rounded-2xl bg-(--wui-color-page) p-4 text-(--wui-color-text)">
        <p className="m-0 mb-2 text-xs text-(--wui-color-text-secondary)">外层 light / reduced</p>
        <div className="flex flex-wrap items-center gap-2">
          <web-ui-button variant="primary">外层按钮</web-ui-button>
          <web-ui-switch checked></web-ui-switch>
        </div>

        <web-ui-theme appearance="dark">
          <div className="mt-3 rounded-2xl border border-(--wui-color-border) bg-(--wui-color-page) p-4 text-(--wui-color-text)">
            <p className="m-0 mb-2 text-xs text-(--wui-color-text-secondary)">内层 dark / motion 未写，取 system</p>
            <div className="flex flex-wrap items-center gap-2">
              <web-ui-button variant="primary">内层按钮</web-ui-button>
              <web-ui-input value="内层的输入框"></web-ui-input>
            </div>
          </div>
        </web-ui-theme>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <web-ui-button variant="primary">回到外层</web-ui-button>
          <web-ui-switch checked></web-ui-switch>
        </div>
      </div>
    </web-ui-theme>
  )
}
