import { WebUiSpinner } from '@greypan/web-ui'

function SpinnerDemo() {
  return (
    <div>
      <h1>Spinner spinner</h1>
      <h2>Declarative usage</h2>
      <div className="mb-3 flex items-center gap-4">
        <web-ui-spinner size={16}></web-ui-spinner>
        <web-ui-spinner size={24}></web-ui-spinner>
        <web-ui-spinner size={32}></web-ui-spinner>
      </div>
      <h2>Declarative description slot</h2>
      <div className="mb-6">
        <web-ui-spinner size={32}>
          <span slot="description">Loading...</span>
        </web-ui-spinner>
      </div>
      <h2>Imperative usage</h2>
      <div className="mb-3 flex gap-2">
        <web-ui-button onClick={() => WebUiSpinner.show()}>show</web-ui-button>
        <web-ui-button onClick={() => WebUiSpinner.hide()}>hide</web-ui-button>
        <web-ui-button onClick={() => WebUiSpinner.show({ duration: 2000 })}>
          show (closes automatically after 2s)
        </web-ui-button>
      </div>
      <h2>Imperative custom size</h2>
      <div className="mb-3 flex gap-2">
        <web-ui-button onClick={() => WebUiSpinner.show({ size: 16 })}>Small (16)</web-ui-button>
        <web-ui-button onClick={() => WebUiSpinner.show({ size: 64 })}>Large (64)</web-ui-button>
      </div>
      <h2>Imperative description text</h2>
      <div className="mb-6 flex gap-2">
        <web-ui-button onClick={() => WebUiSpinner.show({ description: 'Loading data, please wait...' })}>
          With description
        </web-ui-button>
        <web-ui-button
          onClick={() => WebUiSpinner.show({ description: 'Syncing cloud files, about 10 seconds', duration: 10000 })}
        >
          Long description (10s)
        </web-ui-button>
      </div>
    </div>
  )
}
export default SpinnerDemo
