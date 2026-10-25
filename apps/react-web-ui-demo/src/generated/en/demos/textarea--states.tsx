export default function Demo() {
  return (
    <div className="flex w-full flex-col gap-3">
      <web-ui-textarea full disabled value="Disabled: readable, not editable"></web-ui-textarea>
      <web-ui-textarea full readonly clearable value="Readonly: the clear button is hidden"></web-ui-textarea>
    </div>
  )
}
