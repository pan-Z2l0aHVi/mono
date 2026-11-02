export default function Demo() {
  return (
    <web-ui-dropdown>
      <web-ui-button slot="trigger" variant="secondary">
        Actions
      </web-ui-button>
      <web-ui-dropdown-item>Copy</web-ui-dropdown-item>
      <web-ui-dropdown-item>Paste</web-ui-dropdown-item>
      <web-ui-dropdown-divider></web-ui-dropdown-divider>
      <web-ui-dropdown-item disabled>Delete</web-ui-dropdown-item>
    </web-ui-dropdown>
  )
}
