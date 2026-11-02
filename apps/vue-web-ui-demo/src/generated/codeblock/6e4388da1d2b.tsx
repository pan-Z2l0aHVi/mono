import { lucideImage, lucideStar } from '@greypan/web-ui/icons'

export default function Demo() {
  return (
    <web-ui-select placeholder="Select an option">
      <web-ui-option value="photo">
        <web-ui-icon slot="prefix" size={14} icon={lucideImage}></web-ui-icon>
        Photos
      </web-ui-option>
      <web-ui-option value="starred">
        <web-ui-icon slot="prefix" size={14} icon={lucideStar}></web-ui-icon>
        Starred
      </web-ui-option>
    </web-ui-select>
  )
}
