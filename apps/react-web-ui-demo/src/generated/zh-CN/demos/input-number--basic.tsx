export default function Demo() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <web-ui-input-number></web-ui-input-number>
      <web-ui-input-number value={12}></web-ui-input-number>
      <web-ui-input-number placeholder="件" value={0}></web-ui-input-number>
    </div>
  )
}
