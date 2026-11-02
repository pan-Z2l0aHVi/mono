export default function Demo() {
  return (
    <web-ui-theme appearance="light">
      <div className="flex flex-wrap gap-4 rounded-2xl bg-(--wui-color-page) p-4 text-(--wui-color-text)">
        <div className="flex flex-col items-start gap-[var(--wui-space-4)]">
          <p className="m-0 text-sm text-(--wui-color-text-secondary)">作用域默认值</p>
          <web-ui-button variant="primary">确定</web-ui-button>
          <web-ui-input value="宽度与高度都取默认档"></web-ui-input>
        </div>

        <div className="flex flex-col items-start gap-[var(--wui-space-4)] [--wui-control-size:44px] [--wui-input-width:240px] [--wui-space-4:24px] [--wui-color-accent:#0f7b6c]">
          <p className="m-0 text-sm text-(--wui-color-text-secondary)">同一作用域内抬高一档</p>
          <web-ui-button variant="primary">确定</web-ui-button>
          <web-ui-input value="抬高了控件高度与宽度"></web-ui-input>
        </div>
      </div>
    </web-ui-theme>
  )
}
