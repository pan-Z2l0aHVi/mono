export default function Demo() {
  return (
    <web-ui-dropdown>
      <web-ui-button slot="trigger" variant="secondary">
        Actions
      </web-ui-button>
      <web-ui-dropdown-item value="edit">Edit</web-ui-dropdown-item>
      <web-ui-dropdown-item value="copy">Copy</web-ui-dropdown-item>
      <web-ui-dropdown-item value="paste">Paste</web-ui-dropdown-item>
      <web-ui-dropdown-divider></web-ui-dropdown-divider>
      <web-ui-dropdown-item value="delete" disabled>
        Delete
      </web-ui-dropdown-item>
    </web-ui-dropdown>
  )
}
