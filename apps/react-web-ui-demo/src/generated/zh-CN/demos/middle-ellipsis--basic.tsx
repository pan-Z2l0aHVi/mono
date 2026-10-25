const FILENAME = 'very-long-file-name-abcdefghij.txt'

export default function Demo() {
  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      <div className="w-48">
        <div className="mb-1 text-xs text-(--wui-color-text-secondary)">text-overflow: ellipsis</div>
        <div className="truncate">{FILENAME}</div>
      </div>
      <div className="w-48">
        <div className="mb-1 text-xs text-(--wui-color-text-secondary)">web-ui-middle-ellipsis</div>
        <web-ui-middle-ellipsis text={FILENAME}></web-ui-middle-ellipsis>
      </div>
    </div>
  )
}
