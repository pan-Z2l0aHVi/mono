import { useState } from 'react'

function CheckboxDemo() {
  const [fruits, setFruits] = useState<string[]>([])
  const [groupVals, setGroupVals] = useState<string[]>(['banana', 'cherry'])
  const [disabledGroupVals] = useState<string[]>(['apple', 'cherry'])
  const [verticalVals, setVerticalVals] = useState<string[]>(['apple'])
  const [horizontalVals, setHorizontalVals] = useState<string[]>(['apple'])
  const [gapVals, setGapVals] = useState<string[]>(['apple'])

  const toggleFruit = (value: string) => {
    setFruits(prev => (prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]))
  }

  return (
    <div>
      <h1>复选框</h1>
      <h2>基本用法</h2>
      <div className="mb-3 flex flex-col gap-3">
        <web-ui-checkbox checked={fruits.includes('apple')} value="apple" onChange={() => toggleFruit('apple')}>
          Apple
        </web-ui-checkbox>
        <web-ui-checkbox checked={fruits.includes('banana')} value="banana" onChange={() => toggleFruit('banana')}>
          Banana
        </web-ui-checkbox>
        <web-ui-checkbox checked={fruits.includes('cherry')} value="cherry" onChange={() => toggleFruit('cherry')}>
          Cherry
        </web-ui-checkbox>
      </div>
      <p className="text-sm text-gray-500">选中值：{[...fruits].join(', ') || '[]'}</p>

      <h2>Checkbox Group</h2>
      <div className="mb-3 flex flex-col gap-3">
        <web-ui-checkbox-group value={groupVals} onChange={event => setGroupVals(event.currentTarget.value)}>
          <web-ui-checkbox value="apple">Apple</web-ui-checkbox>
          <web-ui-checkbox value="banana">Banana</web-ui-checkbox>
          <web-ui-checkbox value="cherry">Cherry</web-ui-checkbox>
        </web-ui-checkbox-group>
      </div>
      <p className="text-sm text-gray-500">选中值：{[...groupVals].join(', ') || '[]'}</p>

      <h2>Checkbox Group 布局方向</h2>
      <p className="mb-3 text-sm text-(--wui-color-text-secondary)">direction 控制组内排布，默认 vertical。</p>
      <div className="mb-3 flex flex-wrap gap-8">
        <div>
          <p className="mb-1 text-sm text-(--wui-color-text-secondary)">direction=&quot;vertical&quot;（默认）</p>
          <web-ui-checkbox-group
            direction="vertical"
            value={verticalVals}
            onChange={event => setVerticalVals(event.currentTarget.value)}
          >
            <web-ui-checkbox value="apple">Apple</web-ui-checkbox>
            <web-ui-checkbox value="banana">Banana</web-ui-checkbox>
            <web-ui-checkbox value="cherry">Cherry</web-ui-checkbox>
          </web-ui-checkbox-group>
        </div>
        <div>
          <p className="mb-1 text-sm text-(--wui-color-text-secondary)">direction=&quot;horizontal&quot;</p>
          <web-ui-checkbox-group
            direction="horizontal"
            value={horizontalVals}
            onChange={event => setHorizontalVals(event.currentTarget.value)}
          >
            <web-ui-checkbox value="apple">Apple</web-ui-checkbox>
            <web-ui-checkbox value="banana">Banana</web-ui-checkbox>
            <web-ui-checkbox value="cherry">Cherry</web-ui-checkbox>
          </web-ui-checkbox-group>
        </div>
      </div>
      <p className="text-sm text-gray-500">
        选中值：vertical {[...verticalVals].join(', ') || '[]'} / horizontal {[...horizontalVals].join(', ') || '[]'}
      </p>

      <h2>Checkbox Group 间距</h2>
      <p className="mb-3 text-sm text-(--wui-color-text-secondary)">--wui-checkbox-group-gap 覆盖默认间距 8px。</p>
      <div className="mb-3">
        <web-ui-checkbox-group
          className="[--wui-checkbox-group-gap:16px]"
          direction="horizontal"
          value={gapVals}
          onChange={event => setGapVals(event.currentTarget.value)}
        >
          <web-ui-checkbox value="apple">Apple</web-ui-checkbox>
          <web-ui-checkbox value="banana">Banana</web-ui-checkbox>
          <web-ui-checkbox value="cherry">Cherry</web-ui-checkbox>
        </web-ui-checkbox-group>
      </div>
      <p className="text-sm text-gray-500">选中值：{[...gapVals].join(', ') || '[]'}</p>

      <h2>Checkbox Group 禁用</h2>
      <div className="mb-3 flex flex-col gap-3">
        <web-ui-checkbox-group disabled value={disabledGroupVals}>
          <web-ui-checkbox value="apple">Apple</web-ui-checkbox>
          <web-ui-checkbox value="banana">Banana</web-ui-checkbox>
          <web-ui-checkbox value="cherry">Cherry</web-ui-checkbox>
        </web-ui-checkbox-group>
      </div>

      <h2>禁用状态</h2>
      <div className="mb-3 flex flex-col gap-3">
        <web-ui-checkbox checked value="apple" disabled>
          Apple
        </web-ui-checkbox>
        <web-ui-checkbox checked={false} value="banana" disabled>
          Banana
        </web-ui-checkbox>
        <web-ui-checkbox checked={false} value="cherry" disabled>
          Cherry
        </web-ui-checkbox>
      </div>
    </div>
  )
}
export default CheckboxDemo
