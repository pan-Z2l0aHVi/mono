import { shake } from '@greypan/web-ui'

export default function Demo() {
  return (
    <>
      <web-ui-button onClick={() => shake({ xDistance: 28, duration: 640 })}>摆得更大更慢</web-ui-button>
      <web-ui-button onClick={() => shake({ xDistance: 12, yDistance: 0 })}>仅横向振动</web-ui-button>
      <web-ui-button onClick={() => shake({ xDistance: 0, yDistance: 12 })}>仅纵向振动</web-ui-button>
      <web-ui-button onClick={() => shake({ xDistance: 0, yDistance: 0 })}>两轴都是 0：什么都不发生</web-ui-button>
    </>
  )
}
