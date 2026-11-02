export default function Demo() {
  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-editable-text value="Click to edit in place" aria-label="Title"></web-ui-editable-text>
      <web-ui-editable-text
        value="This block inherits its typography into the edit layer"
        className="text-lg font-medium"
      ></web-ui-editable-text>
    </div>
  )
}
