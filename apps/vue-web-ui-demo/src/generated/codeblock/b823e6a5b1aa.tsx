export default function Demo() {
  return (
    <div className="flex flex-col items-start gap-5">
      <div className="flex flex-col items-start gap-2">
        <span className="text-xs text-(--wui-color-text-secondary)">--wui-space-1: 4px (default)</span>
        <web-ui-button-group>
          <web-ui-button variant="secondary">Left</web-ui-button>
          <web-ui-button variant="secondary">Middle</web-ui-button>
          <web-ui-button variant="secondary">Right</web-ui-button>
        </web-ui-button-group>
      </div>

      <div className="flex flex-col items-start gap-2">
        <span className="text-xs text-(--wui-color-text-secondary)">
          --wui-space-1: 12px, the divider does not follow
        </span>
        <web-ui-button-group className="[--wui-space-1:12px]">
          <web-ui-button variant="secondary">Left</web-ui-button>
          <web-ui-button variant="secondary">Middle</web-ui-button>
          <web-ui-button variant="secondary">Right</web-ui-button>
        </web-ui-button-group>
      </div>
    </div>
  )
}
