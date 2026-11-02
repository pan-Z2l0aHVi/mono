export default function Demo() {
  return (
    <div className="flex flex-wrap items-start gap-4">
      <div className="flex h-24 flex-col items-start gap-2 overflow-hidden rounded-lg border border-(--wui-color-border) p-3">
        <span className="text-xs text-(--wui-color-text-secondary)">默认：panel 被容器裁掉</span>
        <web-ui-select placeholder="默认">
          <web-ui-option value="a" label="选项 A"></web-ui-option>
          <web-ui-option value="b" label="选项 B"></web-ui-option>
        </web-ui-select>
      </div>
      <div className="flex h-24 flex-col items-start gap-2 overflow-hidden rounded-lg border border-(--wui-color-border) p-3">
        <span className="text-xs text-(--wui-color-text-secondary)">portal：panel 完整显示</span>
        <web-ui-select portal placeholder="portal">
          <web-ui-option value="a" label="选项 A"></web-ui-option>
          <web-ui-option value="b" label="选项 B"></web-ui-option>
        </web-ui-select>
      </div>
    </div>
  )
}
