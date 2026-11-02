import { lucideFolderOpen, lucideSearch, lucideSettings } from '@greypan/web-ui/icons'

export default function Demo() {
  return (
    <div className="flex flex-wrap items-center gap-6">
      <span className="flex items-center gap-2">
        <web-ui-icon icon={lucideSearch}></web-ui-icon>
        Search
      </span>
      <span className="flex items-center gap-2">
        <web-ui-icon icon={lucideFolderOpen}></web-ui-icon>
        Open project
      </span>
      <span className="flex items-center gap-2">
        <web-ui-icon icon={lucideSettings}></web-ui-icon>
        Settings
      </span>
    </div>
  )
}
