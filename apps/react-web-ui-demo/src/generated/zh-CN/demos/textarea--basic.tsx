export default function Demo() {
  return (
    <div className="flex flex-col gap-3">
      <web-ui-textarea placeholder="默认三行"></web-ui-textarea>
      <web-ui-textarea rows={6} placeholder="六行高"></web-ui-textarea>
      <web-ui-textarea rows={3} value="已经写好的内容"></web-ui-textarea>
    </div>
  )
}
