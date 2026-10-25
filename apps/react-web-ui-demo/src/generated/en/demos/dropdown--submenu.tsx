export default function Demo() {
  return (
    <web-ui-dropdown>
      <web-ui-button slot="trigger" variant="secondary">
        File
      </web-ui-button>
      <web-ui-dropdown-item submenu>
        New
        <web-ui-dropdown-item submenu>
          Office document
          <web-ui-dropdown-item value="word">Word document</web-ui-dropdown-item>
          <web-ui-dropdown-item value="excel">Excel spreadsheet</web-ui-dropdown-item>
        </web-ui-dropdown-item>
        <web-ui-dropdown-item submenu>
          Code file
          <web-ui-dropdown-item value="typescript">TypeScript</web-ui-dropdown-item>
          <web-ui-dropdown-item value="python">Python</web-ui-dropdown-item>
        </web-ui-dropdown-item>
      </web-ui-dropdown-item>
      <web-ui-dropdown-item value="export">Export</web-ui-dropdown-item>
    </web-ui-dropdown>
  )
}
