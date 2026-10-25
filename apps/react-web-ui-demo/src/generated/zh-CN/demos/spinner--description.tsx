export default function Demo() {
  return (
    <div className="flex flex-col items-start gap-6">
      <web-ui-spinner size={32} description="正在加载数据"></web-ui-spinner>
      <web-ui-spinner size={32}>
        <span slot="description" className="text-sm text-(--wui-color-text-secondary)">
          正在加载数据 · 第 2 / 5 步
        </span>
      </web-ui-spinner>
    </div>
  )
}
