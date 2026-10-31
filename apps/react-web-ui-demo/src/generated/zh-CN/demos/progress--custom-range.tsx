export default function Demo() {
  return (
    <div className="grid w-full max-w-xl gap-5">
      <web-ui-progress aria-label="已选条目" max={40} value={12} showValue></web-ui-progress>
      <web-ui-progress aria-label="存储空间" max={256} value={192} showValue></web-ui-progress>
    </div>
  )
}
