export default function Demo() {
  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-checkbox checked disabled>
        Email notifications (checked, disabled)
      </web-ui-checkbox>
      <web-ui-checkbox disabled>SMS notifications (disabled)</web-ui-checkbox>
    </div>
  )
}
