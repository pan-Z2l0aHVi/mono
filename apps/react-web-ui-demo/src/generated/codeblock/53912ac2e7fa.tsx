export default function Demo() {
  return (
    <web-ui-editable-text
      className="w-80"
      value={
        'The first line breaks where the value has a newline\nThe second line of longer copy wraps at the box width; the text state and the edit state share the same box'
      }
      placeholder="Multiline placeholder"
      aria-label="Multiline"
    ></web-ui-editable-text>
  )
}
