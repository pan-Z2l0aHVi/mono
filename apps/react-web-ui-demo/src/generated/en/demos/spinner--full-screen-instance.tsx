import { WebUiSpinner } from '@greypan/web-ui'

export default function Demo() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <web-ui-button onClick={() => WebUiSpinner.show()}>show()</web-ui-button>
      <web-ui-button onClick={() => WebUiSpinner.hide()}>hide()</web-ui-button>
      <web-ui-button onClick={() => WebUiSpinner.show({ size: 16 })}>Small (16px)</web-ui-button>
      <web-ui-button onClick={() => WebUiSpinner.show({ size: 64, duration: 2000 })}>
        Large (64px), closes itself after 2 seconds
      </web-ui-button>
      <web-ui-button
        onClick={() => WebUiSpinner.show({ description: 'Syncing cloud files, about 10 seconds', duration: 10000 })}
      >
        With description, 10 seconds
      </web-ui-button>
    </div>
  )
}
