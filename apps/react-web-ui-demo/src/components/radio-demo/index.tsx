import { useState } from 'react'

function RadioDemo() {
  const [selected, setSelected] = useState('apple')
  const [groupVal, setGroupVal] = useState('banana')
  const [disabledGroupVal] = useState('apple')
  const [disabledSelected] = useState('cherry')
  const [verticalVal, setVerticalVal] = useState('apple')
  const [horizontalVal, setHorizontalVal] = useState('apple')
  const [gapVal, setGapVal] = useState('apple')

  return (
    <div>
      <h1>radio</h1>
      <h2>Basic usage</h2>
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

      <h2>Radio group layout direction</h2>
      <p className="mb-3 text-sm text-(--wui-color-text-secondary)">
        direction controls the group layout, vertical by default.
      </p>
      <div className="mb-3 flex flex-wrap gap-8">
        <div>
          <p className="mb-1 text-sm text-(--wui-color-text-secondary)">direction=&quot;vertical&quot; (default)</p>
          <web-ui-radio-group
            direction="vertical"
            value={verticalVal}
            name="group-vertical-demo"
            onChange={event => setVerticalVal(event.currentTarget.value)}
          >
            <web-ui-radio value="apple">Apple</web-ui-radio>
            <web-ui-radio value="banana">Banana</web-ui-radio>
            <web-ui-radio value="cherry">Cherry</web-ui-radio>
          </web-ui-radio-group>
        </div>
        <div>
          <p className="mb-1 text-sm text-(--wui-color-text-secondary)">direction=&quot;horizontal&quot;</p>
          <web-ui-radio-group
            direction="horizontal"
            value={horizontalVal}
            name="group-horizontal-demo"
            onChange={event => setHorizontalVal(event.currentTarget.value)}
          >
            <web-ui-radio value="apple">Apple</web-ui-radio>
            <web-ui-radio value="banana">Banana</web-ui-radio>
            <web-ui-radio value="cherry">Cherry</web-ui-radio>
          </web-ui-radio-group>
        </div>
      </div>
      <p className="text-sm text-gray-500">
        选中值：vertical {verticalVal} / horizontal {horizontalVal}
      </p>

      <h2>Radio group spacing</h2>
      <p className="mb-3 text-sm text-(--wui-color-text-secondary)">
        --wui-radio-group-gap overrides the default 8px spacing.
      </p>
      <div className="mb-3">
        <web-ui-radio-group
          direction="horizontal"
          className="[--wui-radio-group-gap:16px]"
          value={gapVal}
          name="group-gap-demo"
          onChange={event => setGapVal(event.currentTarget.value)}
        >
          <web-ui-radio value="apple">Apple</web-ui-radio>
          <web-ui-radio value="banana">Banana</web-ui-radio>
          <web-ui-radio value="cherry">Cherry</web-ui-radio>
        </web-ui-radio-group>
      </div>
      <p className="text-sm text-gray-500">选中值：{gapVal}</p>

      <h2>Radio group disabled</h2>
      <div className="mb-3 flex flex-col gap-3">
        <web-ui-radio-group disabled value={disabledGroupVal} name="group-disabled-demo">
          <web-ui-radio value="apple">Apple</web-ui-radio>
          <web-ui-radio value="banana">Banana</web-ui-radio>
          <web-ui-radio value="cherry">Cherry</web-ui-radio>
        </web-ui-radio-group>
      </div>

      <h2>Disabled</h2>
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
