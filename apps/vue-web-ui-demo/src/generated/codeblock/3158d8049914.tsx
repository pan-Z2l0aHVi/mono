export default function Demo() {
  return (
    <div className="flex w-full flex-col gap-3">
      <web-ui-input full clearable aria-label="可清除的内容" value="web-ui"></web-ui-input>
      <web-ui-input full clearable placeholder="还没有内容，所以没有清除 button"></web-ui-input>
    </div>
  )
}
