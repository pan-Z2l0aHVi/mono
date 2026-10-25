import { lucideSearch } from '@greypan/web-ui/icons'

export default function Demo() {
  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-input aria-label="搜索" clearable placeholder="搜索组件">
        <web-ui-icon slot="prefix" icon={lucideSearch} size={16}></web-ui-icon>
      </web-ui-input>
      <web-ui-input aria-label="官网" value="web-ui">
        <span slot="prefix">www.</span>
        <span slot="suffix">.com</span>
      </web-ui-input>
    </div>
  )
}
