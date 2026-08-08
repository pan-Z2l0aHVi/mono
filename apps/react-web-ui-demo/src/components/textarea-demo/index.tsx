import { lucideSearch } from '@greypan/web-ui/icons'
import { useState } from 'react'

function TextareaDemo() {
  const [basic, setBasic] = useState('')
  const [limitedVal, setLimitedVal] = useState('')

  return (
    <div>
      <h1>文本域</h1>
      <h2>基础</h2>
      <div className="mb-3 flex flex-col gap-3">
        <web-ui-textarea placeholder="请输入内容" full />
        <web-ui-textarea
          value={basic}
          placeholder="双向绑定"
          full
          onInput={e => setBasic((e.target as HTMLTextAreaElement).value)}
        />
        <div className="text-sm text-gray-500">输入值：{basic || '(空)'}</div>
      </div>
      <h2>前缀 / 后缀</h2>
      <div className="mb-3 flex flex-col gap-3">
        <web-ui-textarea placeholder="搜索">
          <web-ui-icon slot="prefix" icon={lucideSearch}></web-ui-icon>
        </web-ui-textarea>
        <web-ui-textarea placeholder="带后缀">
          <span slot="suffix">/ 1000</span>
        </web-ui-textarea>
        <web-ui-textarea placeholder="前后都有" full>
          <span slot="prefix">备注：</span>
          <span slot="suffix">必填</span>
        </web-ui-textarea>
      </div>
      <h2>行数</h2>
      <div className="mb-3 flex flex-col gap-3">
        <web-ui-textarea rows={1} placeholder="1 行" full />
        <web-ui-textarea rows={2} placeholder="2 行" full />
        <web-ui-textarea rows={5} placeholder="5 行" full />
        <web-ui-textarea rows={8} placeholder="8 行" full />
      </div>
      <h2>自动高度</h2>
      <div className="mb-3 flex flex-col gap-3">
        <web-ui-textarea autosize placeholder="内容多了自动变高" full />
        <web-ui-textarea autosize max-height={120} placeholder="内容超过 120px 后滚动" full />
      </div>
      <h2>禁用</h2>
      <div className="mb-3 flex flex-col gap-3">
        <web-ui-textarea value="这段文字不可编辑" disabled full />
        <web-ui-textarea value="这段文字只读" readonly full />
      </div>
      <h2>可清除</h2>
      <div className="mb-3 flex flex-col gap-3">
        <web-ui-textarea value="有值可清除" clearable full />
        <web-ui-textarea placeholder="搜索" clearable full>
          <web-ui-icon slot="prefix" icon={lucideSearch}></web-ui-icon>
        </web-ui-textarea>
      </div>
      <h2>字符限制</h2>
      <div className="mb-3 flex flex-col gap-3">
        <web-ui-textarea
          value={limitedVal}
          maxlength={20}
          placeholder="最多 20 字"
          full
          onInput={e => setLimitedVal((e.target as HTMLTextAreaElement).value)}
        />
        <div className="text-sm text-gray-500">{limitedVal.length} / 20</div>
      </div>
      <h2>必填</h2>
      <div className="mb-3 flex flex-col gap-3">
        <web-ui-textarea rows={4} required placeholder="必填项" full />
      </div>
      <h2>无边框</h2>
      <div className="mb-3 flex flex-col gap-3">
        <web-ui-textarea borderless placeholder="无边框文本域" full />
        <web-ui-textarea borderless rows={4} value="无边框有值，适合调用方自定义容器样式" full />
      </div>
    </div>
  )
}
export default TextareaDemo
