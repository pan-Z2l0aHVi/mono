export default function Demo() {
  return (
    <web-ui-dropdown>
      <web-ui-button slot="trigger" variant="secondary">
        操作
      </web-ui-button>
      <web-ui-dropdown-item>复制</web-ui-dropdown-item>
      <web-ui-dropdown-item>粘贴</web-ui-dropdown-item>
      <web-ui-dropdown-divider></web-ui-dropdown-divider>
      <web-ui-dropdown-item disabled>删除</web-ui-dropdown-item>
    </web-ui-dropdown>
  )
}
