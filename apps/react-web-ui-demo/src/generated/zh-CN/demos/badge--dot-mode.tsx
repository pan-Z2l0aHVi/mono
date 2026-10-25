export default function Demo() {
  return (
    <div className="flex flex-wrap items-center gap-8">
      <web-ui-badge dot>
        <web-ui-button variant="secondary">新消息</web-ui-button>
      </web-ui-badge>

      <web-ui-badge count={5} dot>
        <web-ui-button variant="secondary">dot 优先于数字</web-ui-button>
      </web-ui-badge>

      <web-ui-badge count={0} dot>
        <web-ui-button variant="secondary">count 为 0 也照画</web-ui-button>
      </web-ui-badge>
    </div>
  )
}
