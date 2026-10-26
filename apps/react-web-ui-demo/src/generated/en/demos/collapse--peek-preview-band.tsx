export default function Demo() {
  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      <web-ui-collapse peek="80px">
        <button
          type="button"
          className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
        >
          peek 80px (content is longer)
        </button>
        <div slot="content">
          <div className="p-3 text-sm">
            {Array.from({ length: 8 }, (_, index) => (
              <p key={index} className="m-0">
                Paragraph {index + 1}: when closed only the first 80px shows, and that strip is not clickable either.
              </p>
            ))}
          </div>
        </div>
      </web-ui-collapse>

      <web-ui-collapse peek="200px">
        <button
          type="button"
          className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
        >
          peek 200px (content is shorter)
        </button>
        <div slot="content">
          <div className="p-3 text-sm">
            Content is under 200px: the collapsed height takes the actual height of the content and is not stretched to
            200px.
          </div>
        </div>
      </web-ui-collapse>
    </div>
  )
}
