export default function Demo() {
  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-editable-text placeholder="Untitled project" aria-label="Empty"></web-ui-editable-text>
      <web-ui-editable-text
        value="No placeholder when there is a value"
        placeholder="Untitled project"
        aria-label="Has value"
      ></web-ui-editable-text>
      <web-ui-editable-text aria-label="After clearing"></web-ui-editable-text>
    </div>
  )
}
