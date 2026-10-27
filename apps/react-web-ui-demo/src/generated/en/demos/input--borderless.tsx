import { lucideSearch } from '@greypan/web-ui/icons'

export default function Demo() {
  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-input borderless placeholder="Borderless input"></web-ui-input>
      <web-ui-input
        borderless
        aria-label="Borderless input with a value"
        value="Borderless with a value"
      ></web-ui-input>
      <web-ui-input borderless aria-label="Search" placeholder="Borderless with an icon">
        <web-ui-icon slot="prefix" icon={lucideSearch} size={16}></web-ui-icon>
      </web-ui-input>
    </div>
  )
}
