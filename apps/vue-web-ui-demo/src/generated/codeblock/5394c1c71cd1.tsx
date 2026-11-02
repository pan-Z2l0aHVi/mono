export default function Demo() {
  return (
    <div className="flex flex-col gap-3">
      <web-ui-empty
        className="[--wui-empty-icon-size:24px] [--wui-empty-title-font-size:14px] [--wui-empty-description-font-size:13px] [--wui-empty-min-height:120px] [--wui-empty-padding:20px_16px]"
        title="紧凑空态"
      ></web-ui-empty>
      <web-ui-empty title="默认空态"></web-ui-empty>
      <web-ui-empty
        className="[--wui-empty-icon-size:64px] [--wui-empty-title-font-size:20px] [--wui-empty-icon-color:var(--wui-color-accent)] [--wui-empty-icon-opacity:1]"
        title="醒目空态"
        description="颜色与深浅是两枚变量：换掉颜色，再让图形回到整颗原色。"
      ></web-ui-empty>
    </div>
  )
}
