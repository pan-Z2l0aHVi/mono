export default function Demo() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <web-ui-empty
        className="[--wui-empty-min-height:120px] [--wui-empty-padding:16px_12px]"
        title="压住高度与内边距"
        description="这两枚够把空态从占位块压成一条提示。"
      ></web-ui-empty>

      <web-ui-empty
        className="[--wui-empty-icon-size:80px] [--wui-empty-title-margin-top:4px]"
        size={40}
        title="图形盒撑到 80px"
        description="字形还是按 size 的 5/7 画，所以图形周围会多出空白。"
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
        className="[--wui-empty-title-font-size:20px] [--wui-empty-description-font-size:12px]"
        title="两个字号也能单独改"
        description="字号默认只有两档台阶，变量始终压在台阶之上。"
      ></web-ui-empty>
    </div>
  )
}
