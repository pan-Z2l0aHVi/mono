export default function Demo() {
  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-radio checked disabled>
        Enterprise (selected, disabled)
      </web-ui-radio>
      <web-ui-radio disabled>Ultimate (disabled)</web-ui-radio>
    </div>
  )
}
