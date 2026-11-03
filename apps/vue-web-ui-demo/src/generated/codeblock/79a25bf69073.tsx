const CARD = '6222021234567890'
const GAPS = ['0px', '2px', '6px', '12px']

export default function Demo() {
  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      {GAPS.map(gap => (
        <div key={gap}>
          <div className="mb-1 text-xs text-(--wui-color-text-secondary)">--wui-grouped-text-gap: {gap}</div>
          <web-ui-grouped-text
            className="font-mono"
            style={{ '--wui-grouped-text-gap': gap }}
            value={CARD}
            groups="card"
          ></web-ui-grouped-text>
        </div>
      ))}
    </div>
  )
}
