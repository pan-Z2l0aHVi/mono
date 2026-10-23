import { useState } from 'react'

export default function Demo() {
  const [log, setLog] = useState('还没有点击')

  return (
    <form
      className="flex flex-wrap items-center gap-4"
      onSubmit={event => {
        event.preventDefault()
        setLog('外层 form 收到了 submit')
      }}
    >
      <web-ui-input name="note" placeholder="备注"></web-ui-input>
      <web-ui-button-group
        onClick={event => {
          const id = (event.target as HTMLElement).dataset.id
          if (id) setLog(`点了 ${id}`)
        }}
      >
        <web-ui-button variant="secondary" type="submit" data-id="保存">
          保存
        </web-ui-button>
        <web-ui-button variant="secondary" data-id="复制">
          复制
        </web-ui-button>
        <web-ui-button variant="secondary" loading data-id="处理中">
          处理中
        </web-ui-button>
        <web-ui-button variant="danger" disabled data-id="删除">
          删除
        </web-ui-button>
      </web-ui-button-group>
      <output className="text-sm text-(--wui-color-text-secondary)">{log}</output>
    </form>
  )
}
