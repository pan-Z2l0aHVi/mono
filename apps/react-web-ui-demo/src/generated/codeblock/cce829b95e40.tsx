export default function Demo() {
  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-radio checked disabled>
        企业版（已选中，禁用）
      </web-ui-radio>
      <web-ui-radio disabled>旗舰版（禁用）</web-ui-radio>
    </div>
  )
}
