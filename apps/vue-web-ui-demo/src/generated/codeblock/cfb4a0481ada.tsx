export default function Demo() {
  return (
    <div className="flex items-center gap-4">
      <web-ui-badge count={3}></web-ui-badge>
      <web-ui-badge count={128}></web-ui-badge>
      <web-ui-badge dot></web-ui-badge>
      <web-ui-badge count={0} show-zero></web-ui-badge>
    </div>
  )
}
