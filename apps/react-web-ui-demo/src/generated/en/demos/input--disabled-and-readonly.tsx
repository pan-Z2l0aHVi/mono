import { lucideSearch } from '@greypan/web-ui/icons'

export default function Demo() {
  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-input disabled placeholder="Disabled"></web-ui-input>
      <web-ui-input disabled value="Disabled with a value"></web-ui-input>
      <web-ui-input readonly clearable value="Readonly: can select and copy, cannot edit">
        <web-ui-icon slot="prefix" icon={lucideSearch} size={16}></web-ui-icon>
      </web-ui-input>
    </div>
  )
}
