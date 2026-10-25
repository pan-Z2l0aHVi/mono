import { lucideMinus, lucidePlus } from '@greypan/web-ui/icons'

export default function Demo() {
  return (
    <div className="flex flex-col items-start gap-5">
      <div className="flex flex-col items-start gap-2">
        <span className="text-xs text-(--wui-color-text-secondary)">Horizontal: 12px divider</span>
        <web-ui-button-group className="[--wui-button-group-divider-length:12px]">
          <web-ui-button variant="secondary">Left</web-ui-button>
          <web-ui-button variant="secondary">Middle</web-ui-button>
          <web-ui-button variant="secondary">Right</web-ui-button>
        </web-ui-button-group>
      </div>

      <div className="flex flex-col items-start gap-2">
        <span className="text-xs text-(--wui-color-text-secondary)">Vertical: the same variable sets the width</span>
        <web-ui-button-group className="[--wui-button-group-divider-length:32px]" direction="vertical">
          <web-ui-button icon variant="secondary" aria-label="Zoom in">
            <web-ui-icon icon={lucidePlus} size={16}></web-ui-icon>
          </web-ui-button>
          <web-ui-button icon variant="secondary" aria-label="Zoom out">
            <web-ui-icon icon={lucideMinus} size={16}></web-ui-icon>
          </web-ui-button>
        </web-ui-button-group>
      </div>
    </div>
  )
}
