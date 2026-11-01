export default function Demo() {
  return (
    <div className="flex flex-wrap items-center gap-8">
      <web-ui-badge count={5}>
        <web-ui-button variant="secondary">5 unread</web-ui-button>
      </web-ui-badge>

      <web-ui-badge count={5} badge-hidden>
        <web-ui-button variant="secondary">Same 5, badge hidden</web-ui-button>
      </web-ui-badge>

      <web-ui-badge dot badge-hidden>
        <web-ui-button variant="secondary">dot is hidden too</web-ui-button>
      </web-ui-badge>
    </div>
  )
}
