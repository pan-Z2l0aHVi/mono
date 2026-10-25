export default function Demo() {
  return (
    <div className="flex w-full flex-col gap-3">
      <web-ui-textarea full borderless placeholder="Borderless input"></web-ui-textarea>
      <web-ui-textarea
        full
        borderless
        rows={4}
        value="Borderless with a value; the outer layer owns the container"
      ></web-ui-textarea>
    </div>
  )
}
