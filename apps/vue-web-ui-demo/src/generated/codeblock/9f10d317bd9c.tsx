import { iconGallery } from '@greypan/web-ui/icons'

export default function Demo() {
  return (
    <div className="grid w-full grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-4">
      {Object.entries(iconGallery).map(([name, icon]) => (
        <span key={name} className="flex min-w-0 w-full flex-col items-center gap-2">
          <web-ui-icon icon={icon}></web-ui-icon>
          <span className="w-full break-words text-center text-xs leading-tight text-(--wui-color-text-secondary)">
            {name}
          </span>
        </span>
      ))}
    </div>
  )
}
