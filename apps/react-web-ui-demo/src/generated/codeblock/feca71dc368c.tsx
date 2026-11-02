export default function Demo() {
  return (
    <div className="flex flex-wrap gap-8">
      <div className="flex flex-col gap-2">
        <span className="text-xs text-(--wui-color-text-secondary)">direction: vertical (default)</span>
        <web-ui-checkbox-group value={['apple']}>
          <web-ui-checkbox value="apple">Apple</web-ui-checkbox>
          <web-ui-checkbox value="banana">Banana</web-ui-checkbox>
        </web-ui-checkbox-group>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs text-(--wui-color-text-secondary)">direction: horizontal</span>
        <web-ui-checkbox-group direction="horizontal" value={['apple']}>
          <web-ui-checkbox value="apple">Apple</web-ui-checkbox>
          <web-ui-checkbox value="banana">Banana</web-ui-checkbox>
        </web-ui-checkbox-group>
      </div>
    </div>
  )
}
