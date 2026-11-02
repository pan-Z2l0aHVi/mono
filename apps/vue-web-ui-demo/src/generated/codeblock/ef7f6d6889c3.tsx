export default function Demo() {
  return (
    <div className="flex flex-col gap-3">
      <web-ui-textarea placeholder="Three rows by default"></web-ui-textarea>
      <web-ui-textarea rows={6} placeholder="Six rows tall"></web-ui-textarea>
      <web-ui-textarea aria-label="Filled multiline text" rows={3} value="Content already written"></web-ui-textarea>
    </div>
  )
}
