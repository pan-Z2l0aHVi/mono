export default function Demo() {
  return (
    <div className="flex flex-col items-start gap-6">
      <web-ui-spinner size={32} description="Loading data"></web-ui-spinner>
      <web-ui-spinner size={32}>
        <span slot="description" className="text-sm text-(--wui-color-text-secondary)">
          Loading data · step 2 of 5
        </span>
      </web-ui-spinner>
    </div>
  )
}
