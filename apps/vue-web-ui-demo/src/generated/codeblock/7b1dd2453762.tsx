import { useState } from 'react'

const sections = [
  { title: '发货', body: '工作日 18:00 前下单当天发出。' },
  { title: '退换', body: '签收后 7 天内可申请退换。' },
  { title: '发票', body: '下单时勾选发票，电子票 3 个工作日内开出。' }
]

export default function Demo() {
  const [open, setOpen] = useState(['发货'])
  const [exclusive, setExclusive] = useState(true)

  function setAt(title: string, value: boolean) {
    setOpen(current => {
      if (!value) return current.filter(item => item !== title)
      return exclusive ? [title] : [...current, title]
    })
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <web-ui-checkbox checked={exclusive} onChange={event => setExclusive(event.currentTarget.checked)}>
        同时只留一条
      </web-ui-checkbox>

      {sections.map(item => (
        <web-ui-collapse
          key={item.title}
          open={open.includes(item.title)}
          onopen-change={event => setAt(item.title, event.detail.open)}
        >
          <button
            type="button"
            className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
          >
            {item.title}
          </button>
          <div slot="content">
            <div className="p-3 text-sm">{item.body}</div>
          </div>
        </web-ui-collapse>
      ))}

      <output className="text-sm text-(--wui-color-text-secondary)">展开中：{open.join('、') || '一条都没有'}</output>
    </div>
  )
}
