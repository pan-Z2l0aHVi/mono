import { lucideSearch } from '@greypan/web-ui/icons'

export default function Demo() {
  return (
    <web-ui-empty size={72}>
      <web-ui-icon slot="icon" icon={lucideSearch} size={31}></web-ui-icon>
      <strong>没有匹配的条目</strong>
      <span slot="description">试试更短的关键词，或者换一个筛选条件。</span>
      <div slot="action" className="flex items-center justify-center gap-3">
        <web-ui-button variant="secondary">清空筛选</web-ui-button>
        <web-ui-button variant="primary">返回列表</web-ui-button>
      </div>
    </web-ui-empty>
  )
}
