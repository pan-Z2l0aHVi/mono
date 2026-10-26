export default function Demo() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <web-ui-empty
        className="[--wui-empty-min-height:120px] [--wui-empty-padding:16px_12px]"
        title="压住高度与内边距"
        description="这两枚够把空态从占位块压成一条提示。"
      ></web-ui-empty>

      <web-ui-empty
        className="[--wui-empty-icon-size:56px] [--wui-empty-icon-color:var(--wui-color-accent)]"
        title="图形放大并换色"
        description="只换颜色不碰 opacity，图形仍是默认的淡一档。"
      ></web-ui-empty>

      <web-ui-empty
        className="[--wui-empty-content-width:300px] [--wui-empty-action-margin-top:4px]"
        title="内容宽度收到 300px"
        description="标题、描述与操作区共用这一个宽度。"
      >
        <web-ui-button slot="action" variant="secondary">
          看看间距
        </web-ui-button>
      </web-ui-empty>

      <web-ui-empty
        className="[--wui-empty-title-color:var(--wui-color-accent)] [--wui-empty-description-color:var(--wui-color-text-tertiary)] [--wui-empty-title-font-size:20px]"
        title="标题与描述各自换色"
        description="颜色与字号是四条互不相干的通道。"
      ></web-ui-empty>
    </div>
  )
}
