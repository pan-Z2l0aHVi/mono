const FILENAME = 'very-long-file-name-abcdefghij.txt'
const POSITIONS = [0, 50, 80, 100]

export default function Demo() {
  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      {POSITIONS.map(position => (
        <div key={position} className="w-48">
          <div className="mb-1 text-xs text-(--wui-color-text-secondary)">marker-position: {position}</div>
          <web-ui-middle-ellipsis text={FILENAME} marker-position={position}></web-ui-middle-ellipsis>
        </div>
      ))}
    </div>
  )
}
