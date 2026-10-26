import { lucideMinus, lucidePlus, lucideSearch } from '@greypan/web-ui/icons'

export default function Demo() {
  return (
    <web-ui-button-group direction="vertical">
      <web-ui-button icon variant="secondary" aria-label="放大">
        <web-ui-icon icon={lucidePlus} size={16}></web-ui-icon>
      </web-ui-button>
      <web-ui-button icon variant="secondary" aria-label="缩小">
        <web-ui-icon icon={lucideMinus} size={16}></web-ui-icon>
      </web-ui-button>
      <web-ui-button icon variant="secondary" aria-label="搜索">
        <web-ui-icon icon={lucideSearch} size={16}></web-ui-icon>
      </web-ui-button>
    </web-ui-button-group>
  )
}
