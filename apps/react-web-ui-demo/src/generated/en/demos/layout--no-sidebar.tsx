export default function Demo() {
  return (
    <div className="h-[420px] overflow-auto rounded-lg border border-(--wui-color-border)">
      <web-ui-layout no-sidebar header-glow>
        <div slot="header" className="flex items-center px-4 py-2 text-sm font-medium">
          Header
        </div>
        <div className="p-4">
          <p className="m-0 text-sm">
            With no-sidebar there is no aside, Toggle, or Drawer, so the content column fills the row.
          </p>
          <div className="mt-3 h-[420px] rounded-md bg-(--wui-color-surface-control)" />
        </div>
        <div slot="tabbar" className="flex items-center justify-center px-4 py-2 text-xs">
          Tabbar
        </div>
      </web-ui-layout>
    </div>
  )
}
