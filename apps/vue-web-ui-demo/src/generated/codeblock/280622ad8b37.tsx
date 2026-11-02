export default function Demo() {
  return (
    <div className="flex flex-col gap-3">
      <web-ui-textarea
        autosize
        full
        placeholder="Type multiple lines; the height grows with the content"
      ></web-ui-textarea>
      <web-ui-textarea
        autosize
        full
        max-height={120}
        placeholder="Scrolls inside the box beyond 120px"
      ></web-ui-textarea>
    </div>
  )
}
