export default function Demo() {
  return (
    <div className="flex flex-wrap items-start gap-3">
      <web-ui-dropdown placement="bottom-start">
        <web-ui-button slot="trigger" variant="secondary">
          bottom-start (default)
        </web-ui-button>
        <web-ui-dropdown-item>New</web-ui-dropdown-item>
        <web-ui-dropdown-item>Open</web-ui-dropdown-item>
      </web-ui-dropdown>

      <web-ui-dropdown placement="bottom-end">
        <web-ui-button slot="trigger" variant="secondary">
          bottom-end
        </web-ui-button>
        <web-ui-dropdown-item>New</web-ui-dropdown-item>
        <web-ui-dropdown-item>Open</web-ui-dropdown-item>
      </web-ui-dropdown>

      <web-ui-dropdown placement="top-start">
        <web-ui-button slot="trigger" variant="secondary">
          top-start
        </web-ui-button>
        <web-ui-dropdown-item>New</web-ui-dropdown-item>
        <web-ui-dropdown-item>Open</web-ui-dropdown-item>
      </web-ui-dropdown>

      <web-ui-dropdown placement="top-end">
        <web-ui-button slot="trigger" variant="secondary">
          top-end
        </web-ui-button>
        <web-ui-dropdown-item>New</web-ui-dropdown-item>
        <web-ui-dropdown-item>Open</web-ui-dropdown-item>
      </web-ui-dropdown>
    </div>
  )
}
