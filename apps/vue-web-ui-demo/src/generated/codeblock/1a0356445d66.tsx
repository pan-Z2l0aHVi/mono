export default function Demo() {
  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-input placeholder="请输入昵称"></web-ui-input>
      <web-ui-input aria-label="已有昵称" value="web-ui"></web-ui-input>
    </div>
  )
}
