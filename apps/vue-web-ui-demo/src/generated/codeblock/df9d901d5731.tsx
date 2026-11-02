export default function Demo() {
  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-input type="text" placeholder="Text"></web-ui-input>
      <web-ui-input type="password" placeholder="Password"></web-ui-input>
      <web-ui-input type="email" placeholder="Email"></web-ui-input>
    </div>
  )
}
