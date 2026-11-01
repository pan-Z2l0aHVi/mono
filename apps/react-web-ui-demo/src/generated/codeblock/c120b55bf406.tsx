export default function Demo() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <web-ui-input-number value={5} min={0} max={10}></web-ui-input-number>
      <web-ui-input-number value={20} min={0} max={100} step={5}></web-ui-input-number>
      <web-ui-input-number value={999} min={0} max={100}></web-ui-input-number>
    </div>
  )
}
