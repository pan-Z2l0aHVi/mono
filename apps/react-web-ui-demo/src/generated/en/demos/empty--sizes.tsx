export default function Demo() {
  return (
    <div className="flex flex-col gap-3">
      <web-ui-empty size={40} title="Empty state at 40"></web-ui-empty>
      <web-ui-empty size={56} title="Empty state at 56 (default)"></web-ui-empty>
      <web-ui-empty size={72} title="Empty state at 72"></web-ui-empty>
    </div>
  )
}
