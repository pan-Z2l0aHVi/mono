import { lucideStar } from '@greypan/web-ui/icons'

const sizes = [14, 18, 24, 32]

export default function Demo() {
  return (
    <div className="flex flex-wrap items-end gap-6">
      {sizes.map(size => (
        <span key={size} className="flex flex-col items-center gap-2">
          <web-ui-icon icon={lucideStar} size={size}></web-ui-icon>
          <span className="text-xs text-(--wui-color-text-secondary)">{size}</span>
        </span>
      ))}
    </div>
  )
}
