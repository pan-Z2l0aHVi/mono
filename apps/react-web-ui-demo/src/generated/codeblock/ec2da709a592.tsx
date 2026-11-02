export default function Demo() {
  return (
    <div className="grid w-full max-w-xl gap-5">
      <web-ui-progress aria-label="正在连接服务器" indeterminate></web-ui-progress>
      <web-ui-progress aria-label="正在准备数据" indeterminate showValue></web-ui-progress>
    </div>
  )
}
