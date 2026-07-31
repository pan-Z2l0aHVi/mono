import { useState } from 'react'

function RadioDemo() {
  const [selected, setSelected] = useState('apple')
  const [groupVal, setGroupVal] = useState('banana')
  const [disabledGroupVal] = useState('apple')
  const [disabledSelected] = useState('cherry')

  return (
    <div>
      <h1>单选框</h1>
      <h2>基本用法</h2>
      <div className="mb-3 flex flex-col gap-3">
        <web-ui-radio checked={selected === 'apple'} value="apple" name="fruit" onChange={() => setSelected('apple')}>
          Apple
        </web-ui-radio>
        <web-ui-radio
          checked={selected === 'banana'}
          value="banana"
          name="fruit"
          onChange={() => setSelected('banana')}
        >
          Banana
        </web-ui-radio>
        <web-ui-radio
          checked={selected === 'cherry'}
          value="cherry"
          name="fruit"
          onChange={() => setSelected('cherry')}
        >
          Cherry
        </web-ui-radio>
      </div>
      <p className="text-sm text-gray-500">选中值：{selected}</p>

      <h2>Radio Group</h2>
      <div className="mb-3 flex flex-col gap-3">
        <web-ui-radio-group
          value={groupVal}
          name="group-demo"
          onChange={event => setGroupVal(event.currentTarget.value)}
        >
          <web-ui-radio value="apple">Apple</web-ui-radio>
          <web-ui-radio value="banana">Banana</web-ui-radio>
          <web-ui-radio value="cherry">Cherry</web-ui-radio>
        </web-ui-radio-group>
      </div>
      <p className="text-sm text-gray-500">选中值：{groupVal}</p>

      <h2>Radio Group 禁用</h2>
      <div className="mb-3 flex flex-col gap-3">
        <web-ui-radio-group disabled value={disabledGroupVal} name="group-disabled-demo">
          <web-ui-radio value="apple">Apple</web-ui-radio>
          <web-ui-radio value="banana">Banana</web-ui-radio>
          <web-ui-radio value="cherry">Cherry</web-ui-radio>
        </web-ui-radio-group>
      </div>

      <h2>禁用状态</h2>
      <div className="mb-3 flex flex-col gap-3">
        <web-ui-radio checked={disabledSelected === 'apple'} value="apple" name="disabled-fruit" disabled>
          Apple
        </web-ui-radio>
        <web-ui-radio checked={disabledSelected === 'banana'} value="banana" name="disabled-fruit" disabled>
          Banana
        </web-ui-radio>
        <web-ui-radio checked={disabledSelected === 'cherry'} value="cherry" name="disabled-fruit" disabled>
          Cherry
        </web-ui-radio>
      </div>
    </div>
  )
}
export default RadioDemo
