import { lucideBell } from '@greypan/web-ui/icons'

export default function Demo() {
  return (
    <div className="flex flex-wrap items-center gap-8">
      <web-ui-badge count={5}>
        <web-ui-button variant="secondary">消息</web-ui-button>
      </web-ui-badge>

      <web-ui-badge count={7}>
        <web-ui-icon icon={lucideBell} size={22}></web-ui-icon>
      </web-ui-badge>

      <web-ui-badge count={0}>
        <web-ui-button variant="secondary">草稿（count 为 0）</web-ui-button>
      </web-ui-badge>

      <web-ui-badge count={0} show-zero>
        <web-ui-button variant="secondary">收件箱（show-zero）</web-ui-button>
      </web-ui-badge>
    </div>
  )
}
