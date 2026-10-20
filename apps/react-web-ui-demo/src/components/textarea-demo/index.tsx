import { lucideSearch } from '@greypan/web-ui/icons'
import { useState } from 'react'

function TextareaDemo() {
  const [basic, setBasic] = useState('')
  const [limitedVal, setLimitedVal] = useState('')

  return (
    <div>
      <h1>textarea</h1>
      <h2>Basic</h2>
      <div className="mb-3 flex flex-col gap-3">
        <web-ui-textarea placeholder="Enter a value" full />
        <web-ui-textarea
          value={basic}
          placeholder="Two-way binding"
          full
          onInput={e => setBasic(e.currentTarget.value)}
        />
        <div className="text-sm text-gray-500">输入值：{basic || '(empty)'}</div>
      </div>
      <h2>Prefix / suffix</h2>
      <div className="mb-3 flex flex-col gap-3">
        <web-ui-textarea placeholder="Search">
          <web-ui-icon slot="prefix" icon={lucideSearch}></web-ui-icon>
        </web-ui-textarea>
        <web-ui-textarea placeholder="With suffix">
          <span slot="suffix">/ 1000</span>
        </web-ui-textarea>
        <web-ui-textarea placeholder="Both sides" full>
          <span slot="prefix">Notes:</span>
          <span slot="suffix">Required</span>
        </web-ui-textarea>
      </div>
      <h2>Rows</h2>
      <div className="mb-3 flex flex-col gap-3">
        <web-ui-textarea rows={1} placeholder="1 line" full />
        <web-ui-textarea rows={2} placeholder="2 lines" full />
        <web-ui-textarea rows={5} placeholder="5 lines" full />
        <web-ui-textarea rows={8} placeholder="8 lines" full />
      </div>
      <h2>Auto height</h2>
      <div className="mb-3 flex flex-col gap-3">
        <web-ui-textarea autosize placeholder="Grows with the content" full />
        <web-ui-textarea autosize maxHeight={120} placeholder="Scrolls past 120px" full />
      </div>
      <h2>Disabled</h2>
      <div className="mb-3 flex flex-col gap-3">
        <web-ui-textarea value="This text is not editable" disabled full />
        <web-ui-textarea value="This text is read only" readonly full />
      </div>
      <h2>Clearable</h2>
      <div className="mb-3 flex flex-col gap-3">
        <web-ui-textarea value="Clearable when filled" clearable full />
        <web-ui-textarea placeholder="Search" clearable full>
          <web-ui-icon slot="prefix" icon={lucideSearch}></web-ui-icon>
        </web-ui-textarea>
      </div>
      <h2>Character limit</h2>
      <div className="mb-3 flex flex-col gap-3">
        <web-ui-textarea
          value={limitedVal}
          maxlength={20}
          placeholder="Up to 20 characters"
          full
          onInput={e => setLimitedVal(e.currentTarget.value)}
        />
        <div className="text-sm text-gray-500">{limitedVal.length} / 20</div>
      </div>
      <h2>Required</h2>
      <div className="mb-3 flex flex-col gap-3">
        <web-ui-textarea rows={4} required placeholder="Required" full />
      </div>
      <h2>Borderless</h2>
      <div className="mb-3 flex flex-col gap-3">
        <web-ui-textarea borderless placeholder="Borderless textarea" full />
        <web-ui-textarea
          borderless
          rows={4}
          value="Borderless with a value, for callers that style the container"
          full
        />
      </div>
    </div>
  )
}
export default TextareaDemo
