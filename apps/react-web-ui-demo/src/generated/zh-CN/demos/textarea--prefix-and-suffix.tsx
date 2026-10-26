import { lucideFileText } from '@greypan/web-ui/icons'

export default function Demo() {
  return (
    <div className="flex flex-col gap-3">
      <web-ui-textarea aria-label="备注" clearable placeholder="带前缀 icon">
        <web-ui-icon slot="prefix" icon={lucideFileText} size={16}></web-ui-icon>
      </web-ui-textarea>
      <web-ui-textarea aria-label="反馈" clearable placeholder="前后缀都是文字">
        <span slot="prefix">备注：</span>
        <span slot="suffix">最多 200 字</span>
      </web-ui-textarea>
    </div>
  )
}
