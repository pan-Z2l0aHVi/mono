import { lucideSearch } from '@greypan/web-ui/icons'

export default function Demo() {
  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-input disabled placeholder="禁用"></web-ui-input>
      <web-ui-input disabled aria-label="禁用且有值的输入框" value="禁用且有值"></web-ui-input>
      <web-ui-input readonly clearable aria-label="只读输入框" value="只读：可选中复制，不能改">
        <web-ui-icon slot="prefix" icon={lucideSearch} size={16}></web-ui-icon>
      </web-ui-input>
    </div>
  )
}
