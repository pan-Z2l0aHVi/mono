export default function Demo() {
  return (
    <div className="flex flex-col items-start gap-5">
      <div className="flex flex-col items-start gap-2">
        <span className="text-xs text-(--wui-color-text-secondary)">--wui-space-1：4px（默认）</span>
        <web-ui-button-group>
          <web-ui-button variant="secondary">左</web-ui-button>
          <web-ui-button variant="secondary">中</web-ui-button>
          <web-ui-button variant="secondary">右</web-ui-button>
        </web-ui-button-group>
      </div>

      <div className="flex flex-col items-start gap-2">
        <span className="text-xs text-(--wui-color-text-secondary)">--wui-space-1：12px，分割线不跟着走</span>
        <web-ui-button-group className="[--wui-space-1:12px]">
          <web-ui-button variant="secondary">左</web-ui-button>
          <web-ui-button variant="secondary">中</web-ui-button>
          <web-ui-button variant="secondary">右</web-ui-button>
        </web-ui-button-group>
      </div>
    </div>
  )
}
