import { lucideChevronDown } from '@greypan/web-ui/icons'

export default function Demo() {
  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <web-ui-collapse>
        <button
          type="button"
          className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
        >
          Native button
        </button>
        <div slot="content">
          <div className="p-3 text-sm">Enter / Space and focus are provided by this native button itself.</div>
        </div>
      </web-ui-collapse>

      <web-ui-collapse>
        <web-ui-button variant="secondary" full>
          web-ui-button
        </web-ui-button>
        <div slot="content">
          <div className="p-3 text-sm">
            A custom element also works as a trigger; the expanded state is synced to its inner native button for
            assistive technology to read.
          </div>
        </div>
      </web-ui-collapse>

      <web-ui-collapse>
        <web-ui-button variant="secondary" full>
          <web-ui-icon slot="prefix" icon={lucideChevronDown} size={14}></web-ui-icon>Trigger with a prefix icon
        </web-ui-button>
        <div slot="content">
          <div className="p-3 text-sm">
            The first assigned thing is still that button; the expanded state is synced to its inner native button.
          </div>
        </div>
      </web-ui-collapse>

      <web-ui-collapse>
        Plain-text trigger
        <div slot="content">
          <div className="p-3 text-sm">
            The wrong way: clickable with a mouse, but not focusable and with no keyboard activation.
          </div>
        </div>
      </web-ui-collapse>
    </div>
  )
}
