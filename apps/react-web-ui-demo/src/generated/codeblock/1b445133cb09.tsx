import { shake } from '@greypan/web-ui'

export default function Demo() {
  return (
    <>
      <web-ui-button onClick={() => shake({ xDistance: 28, duration: 640 })}>Bigger and slower</web-ui-button>
      <web-ui-button onClick={() => shake({ xDistance: 12, yDistance: 0 })}>Horizontal only</web-ui-button>
      <web-ui-button onClick={() => shake({ xDistance: 0, yDistance: 12 })}>Vertical only</web-ui-button>
      <web-ui-button onClick={() => shake({ xDistance: 0, yDistance: 0 })}>
        Both amplitudes 0: nothing happens
      </web-ui-button>
    </>
  )
}
