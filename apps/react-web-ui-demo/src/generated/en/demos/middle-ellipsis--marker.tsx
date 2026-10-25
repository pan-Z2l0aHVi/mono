const FILENAME = 'very-long-file-name-abcdefghij.txt'

export default function Demo() {
  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <div className="w-48">
        <div className="mb-1 text-xs text-(--wui-color-text-secondary)">Default …</div>
        <web-ui-middle-ellipsis text={FILENAME}></web-ui-middle-ellipsis>
      </div>
      <div className="w-48">
        <div className="mb-1 text-xs text-(--wui-color-text-secondary)">marker is [..]</div>
        <web-ui-middle-ellipsis text={FILENAME} marker="[..]"></web-ui-middle-ellipsis>
      </div>
      <div className="w-48">
        <div className="mb-1 text-xs text-(--wui-color-text-secondary)">marker is an empty string</div>
        <web-ui-middle-ellipsis text={FILENAME} marker=""></web-ui-middle-ellipsis>
      </div>
    </div>
  )
}
