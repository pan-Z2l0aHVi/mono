export default function Demo() {
  return (
    <div className="flex flex-wrap items-center gap-8">
      <web-ui-badge count={128}>
        <web-ui-button variant="secondary">默认上限 99</web-ui-button>
      </web-ui-badge>

      <web-ui-badge count={10} max={9}>
        <web-ui-button variant="secondary">max 为 9</web-ui-button>
      </web-ui-badge>

      <web-ui-badge count={99999} max={9999}>
        <web-ui-button variant="secondary">max 为 9999</web-ui-button>
      </web-ui-badge>
    </div>
  )
}
