export default function Demo() {
  return (
    <div className="grid w-full max-w-xl gap-5">
      <web-ui-progress aria-label="Selected items" max={40} value={12} showValue></web-ui-progress>
      <web-ui-progress aria-label="Storage used" max={256} value={192} showValue></web-ui-progress>
    </div>
  )
}
