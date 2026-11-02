export default function Demo() {
  return (
    <div className="flex w-full flex-col gap-3">
      <web-ui-textarea
        full
        clearable
        aria-label="Clearable multiline text"
        value="This block can be cleared in one go"
      ></web-ui-textarea>
      <web-ui-textarea full clearable placeholder="No clear button when the value is empty"></web-ui-textarea>
    </div>
  )
}
