import { useState } from 'react'

function SegmentedDemo() {
  const [basicVal, setBasicVal] = useState('mon')
  const [groupVal, setGroupVal] = useState('banana')
  const [disabledVal, setDisabledVal] = useState('apple')
  const [insetVal, setInsetVal] = useState('banana')
  const [raisedVal, setRaisedVal] = useState('banana')

  return (
    <div>
      <h1>segmented</h1>
      <h2>Basic usage</h2>
      <div className="mb-3">
        <web-ui-segmented value={basicVal} onInput={event => setBasicVal(event.currentTarget.value)}>
          <web-ui-segmented-trigger value="mon">Monday</web-ui-segmented-trigger>
          <web-ui-segmented-trigger value="tue">Tuesday</web-ui-segmented-trigger>
          <web-ui-segmented-trigger value="wed">Wednesday</web-ui-segmented-trigger>
          <web-ui-segmented-trigger value="thu">Thursday</web-ui-segmented-trigger>
          <web-ui-segmented-trigger value="fri">Friday</web-ui-segmented-trigger>
        </web-ui-segmented>
      </div>
      <p className="text-sm text-gray-500">选中值：{basicVal}</p>
      <p className="text-xs text-gray-400">
        💡 Drag the current selection to track it smoothly, release to snap to the nearest option, or flick to throw
      </p>

      <h2>Disabled</h2>
      <div className="mb-3">
        <web-ui-segmented disabled value={disabledVal} onInput={event => setDisabledVal(event.currentTarget.value)}>
          <web-ui-segmented-trigger value="apple">Apple</web-ui-segmented-trigger>
          <web-ui-segmented-trigger value="banana">Banana</web-ui-segmented-trigger>
          <web-ui-segmented-trigger value="cherry">Cherry</web-ui-segmented-trigger>
        </web-ui-segmented>
      </div>
      <p className="text-sm text-gray-500">选中值：{disabledVal}</p>

      <h2>Segmented Group</h2>
      <div className="mb-3">
        <web-ui-segmented value={groupVal} onInput={event => setGroupVal(event.currentTarget.value)}>
          <web-ui-segmented-trigger value="apple">Apple</web-ui-segmented-trigger>
          <web-ui-segmented-trigger value="banana">Banana</web-ui-segmented-trigger>
          <web-ui-segmented-trigger value="cherry">Cherry</web-ui-segmented-trigger>
        </web-ui-segmented>
      </div>
      <p className="text-sm text-gray-500">选中值：{groupVal}</p>

      <h2>Variants</h2>
      <p className="mb-3 text-sm text-gray-500">
        variant controls the track and the resting indicator material, inset by default.
      </p>
      <div className="mb-3 flex flex-wrap gap-8">
        <div>
          <p className="mb-1 text-sm text-gray-500">variant=&quot;inset&quot; (default)</p>
          <web-ui-segmented value={insetVal} onInput={event => setInsetVal(event.currentTarget.value)}>
            <web-ui-segmented-trigger value="apple">Apple</web-ui-segmented-trigger>
            <web-ui-segmented-trigger value="banana">Banana</web-ui-segmented-trigger>
            <web-ui-segmented-trigger value="cherry">Cherry</web-ui-segmented-trigger>
          </web-ui-segmented>
          <p className="mt-1 text-sm text-gray-500">选中值：{insetVal}</p>
        </div>
        <div>
          <p className="mb-1 text-sm text-gray-500">variant=&quot;raised&quot;</p>
          <web-ui-segmented
            variant="raised"
            value={raisedVal}
            onInput={event => setRaisedVal(event.currentTarget.value)}
          >
            <web-ui-segmented-trigger value="apple">Apple</web-ui-segmented-trigger>
            <web-ui-segmented-trigger value="banana">Banana</web-ui-segmented-trigger>
            <web-ui-segmented-trigger value="cherry">Cherry</web-ui-segmented-trigger>
          </web-ui-segmented>
          <p className="mt-1 text-sm text-gray-500">选中值：{raisedVal}</p>
        </div>
      </div>
      <p className="text-xs text-gray-400">
        💡 In both variants the pressed/dragging indicator is transparent glass (backdrop blur, 1.5x scale)
      </p>
    </div>
  )
}
export default SegmentedDemo
