export default function Demo() {
  return (
    <div className="flex flex-wrap gap-8">
      <div className="flex flex-col gap-2">
        <span className="text-xs text-(--wui-color-text-secondary)">direction: vertical (default)</span>
        <web-ui-radio-group value="s">
          <web-ui-radio value="s">Small</web-ui-radio>
          <web-ui-radio value="m">Medium</web-ui-radio>
        </web-ui-radio-group>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs text-(--wui-color-text-secondary)">direction: horizontal</span>
        <web-ui-radio-group direction="horizontal" value="s">
          <web-ui-radio value="s">Small</web-ui-radio>
          <web-ui-radio value="m">Medium</web-ui-radio>
        </web-ui-radio-group>
      </div>
    </div>
  )
}
