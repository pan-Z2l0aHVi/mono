import { useState } from 'react'

function SliderDemo() {
  const [standardValue, setStandardValue] = useState(36)
  const [markedValue, setMarkedValue] = useState(50)
  const [inputValue, setInputValue] = useState(40)
  const [changeValue, setChangeValue] = useState(40)
  const [verticalValue, setVerticalValue] = useState(60)
  const [verticalMarkedValue, setVerticalMarkedValue] = useState(50)

  return (
    <div className="slider-demo">
      <h1>滑块</h1>
      <section>
        <h2>基础样式</h2>
        <div className="examples">
          <div className="example">
            <web-ui-slider value={standardValue} onInput={event => setStandardValue(event.currentTarget.value)} />
          </div>
          <div className="example">
            <web-ui-slider value={42} />
          </div>
          <div className="example">
            <web-ui-slider value={42} disabled />
          </div>
        </div>
      </section>
      <section>
        <h2>刻度</h2>
        <div className="examples">
          <div className="example">
            <web-ui-slider
              value={markedValue}
              step={10}
              marks
              onInput={event => setMarkedValue(event.currentTarget.value)}
            />
          </div>
          <div className="example">
            <web-ui-slider value={70} step={10} marks />
          </div>
          <div className="example">
            <web-ui-slider value={50} step={10} marks disabled />
          </div>
        </div>
      </section>
      <section>
        <h2>范围与事件</h2>
        <div className="event-example">
          <web-ui-slider
            value={inputValue}
            min={10}
            max={90}
            step={5}
            marks
            onInput={event => setInputValue(event.currentTarget.value)}
            onChange={event => setChangeValue(event.currentTarget.value)}
          />
          <output>
            input: {inputValue} / change: {changeValue}
          </output>
        </div>
      </section>
      <section>
        <h2>垂直</h2>
        <div className="vertical-examples">
          <div className="example">
            <web-ui-slider
              vertical
              value={verticalValue}
              onInput={event => setVerticalValue(event.currentTarget.value)}
            />
            <span className="label">{verticalValue}</span>
          </div>
          <div className="example">
            <web-ui-slider
              vertical
              value={verticalMarkedValue}
              step={10}
              marks
              onInput={event => setVerticalMarkedValue(event.currentTarget.value)}
            />
            <span className="label">{verticalMarkedValue}</span>
          </div>
          <div className="example">
            <web-ui-slider vertical value={50} disabled />
            <span className="label">禁用</span>
          </div>
        </div>
      </section>
      <style>{`
        .slider-demo { max-width: 920px; }
        section { margin-top: 28px; }
        .examples { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px; padding: 20px 0; }
        .example { display: flex; gap: 12px; align-items: center; min-width: 0; }
        .vertical-examples { display: flex; gap: 32px; align-items: flex-start; padding: 20px 0; }
        .label { font-size: 14px; color: #5d6675; white-space: nowrap; }
        .event-example { display: flex; gap: 16px; align-items: center; padding: 20px 0; }
        output { font-size: 14px; color: #5d6675; }
        web-ui-slider:not([vertical]) { width: 100%; }
        web-ui-slider[vertical] { height: 200px; }
        @media (width <= 700px) { .examples { grid-template-columns: 1fr; } .event-example { flex-direction: column; align-items: flex-start; } }
      `}</style>
    </div>
  )
}
export default SliderDemo
