import { useState } from 'react'

const sections = [
  { title: 'Shipping', body: 'Orders placed before 18:00 on a business day ship the same day.' },
  { title: 'Returns', body: 'Returns and exchanges can be requested within 7 days of delivery.' },
  { title: 'Invoices', body: 'Select an invoice at checkout; the e-invoice is issued within 3 business days.' }
]

export default function Demo() {
  const [open, setOpen] = useState(['Shipping'])
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
        Only one at a time
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

      <output className="text-sm text-(--wui-color-text-secondary)">expanded: {open.join(', ') || 'none'}</output>
    </div>
  )
}
