export default function Demo() {
  return (
    <web-ui-editable-text
      className="w-80"
      value={'第一行按值里的换行成行\n第二行的长文案会在盒宽处折行，文字态与编辑态共用同一个盒'}
      placeholder="多行占位"
      aria-label="多行"
    ></web-ui-editable-text>
  )
}
