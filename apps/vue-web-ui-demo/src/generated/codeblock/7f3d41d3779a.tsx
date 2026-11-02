export default function Demo() {
  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-input placeholder="Enter a nickname"></web-ui-input>
      <web-ui-input aria-label="Filled nickname" value="web-ui"></web-ui-input>
    </div>
  )
}
