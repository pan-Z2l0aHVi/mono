import { useState } from 'react'

function CheckboxDemo() {
  const [fruits, setFruits] = useState<string[]>([])
  const [groupVals, setGroupVals] = useState<string[]>(['banana', 'cherry'])
  const [disabledGroupVals] = useState<string[]>(['apple', 'cherry'])

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
