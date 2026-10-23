export default function Demo() {
  return (
    <div className="flex flex-col items-start gap-6">
      <web-ui-slider aria-label="音量"></web-ui-slider>
      <web-ui-slider aria-label="亮度" min={0} max={100} step={5} value={40}></web-ui-slider>
      <web-ui-slider aria-label="禁用的音量" min={0} max={100} step={5} value={65} disabled></web-ui-slider>
    </div>
  )
}
