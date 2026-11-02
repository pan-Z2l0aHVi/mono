export default function Demo() {
  return (
    <div className="grid w-full max-w-xl gap-5">
      <web-ui-progress aria-label="Connecting to server" indeterminate></web-ui-progress>
      <web-ui-progress aria-label="Preparing data" indeterminate showValue></web-ui-progress>
    </div>
  )
}
