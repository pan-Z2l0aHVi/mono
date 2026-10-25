import { lucideFileText, lucideFilm, lucideImage } from '@greypan/web-ui/icons'

export default function Demo() {
  return (
    <web-ui-select placeholder="Choose an attachment type">
      <web-ui-option value="doc" label="Document">
        <web-ui-icon slot="prefix" icon={lucideFileText} size={14}></web-ui-icon>
        <span slot="suffix" className="text-xs text-(--wui-color-text-secondary)">
          PDF
        </span>
      </web-ui-option>
      <web-ui-option value="image" label="Image">
        <web-ui-icon slot="prefix" icon={lucideImage} size={14}></web-ui-icon>
        <span slot="suffix" className="text-xs text-(--wui-color-text-secondary)">
          PNG
        </span>
      </web-ui-option>
      <web-ui-option value="video" label="Video (unavailable)" disabled>
        <web-ui-icon slot="prefix" icon={lucideFilm} size={14}></web-ui-icon>
        <span slot="suffix" className="text-xs text-(--wui-color-text-secondary)">
          MP4
        </span>
      </web-ui-option>
    </web-ui-select>
  )
}
