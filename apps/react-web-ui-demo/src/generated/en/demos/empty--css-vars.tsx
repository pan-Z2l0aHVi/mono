export default function Demo() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <web-ui-empty
        className="[--wui-empty-min-height:120px] [--wui-empty-padding:16px_12px]"
        title="Overriding height and padding"
        description="These two are enough to squeeze the empty state into a single hint."
      ></web-ui-empty>

      <web-ui-empty
        className="[--wui-empty-icon-size:80px] [--wui-empty-title-margin-top:4px]"
        size={40}
        title="Graphic box stretched to 80px"
        description="The glyph is still drawn at 3/7 of size, so extra space appears around it."
      ></web-ui-empty>

      <web-ui-empty
        className="[--wui-empty-content-width:300px] [--wui-empty-action-margin-top:4px]"
        title="Content width constrained to 300px"
        description="Title, description, and action area share this one width."
      >
        <web-ui-button slot="action" variant="secondary">
          Check the gaps
        </web-ui-button>
      </web-ui-empty>

      <web-ui-empty
        className="[--wui-empty-title-font-size:20px] [--wui-empty-description-font-size:12px]"
        title="Both font sizes can be changed separately"
        description="Font sizes only have two steps by default, and the variables always override the steps."
      ></web-ui-empty>
    </div>
  )
}
