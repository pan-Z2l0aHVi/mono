import { WebUiSpinner } from '@greypan/web-ui'

function SpinnerDemo() {
  return (
    <div>
      <h1>Spinner 加载指示器</h1>
      <h2>声明式用法</h2>
      <div className="mb-3 flex items-center gap-4">
        <web-ui-spinner size={16}></web-ui-spinner>
        <web-ui-spinner size={24}></web-ui-spinner>
        <web-ui-spinner size={32}></web-ui-spinner>
      </div>
      <h2>声明式描述 slot</h2>
      <div className="mb-6">
        <web-ui-spinner size={32}>
          <span slot="description">加载中...</span>
        </web-ui-spinner>
      </div>
      <h2>命令式用法</h2>
      <div className="mb-3 flex gap-2">
        <web-ui-button onClick={() => WebUiSpinner.show()}>show</web-ui-button>
        <web-ui-button onClick={() => WebUiSpinner.hide()}>hide</web-ui-button>
        <web-ui-button onClick={() => WebUiSpinner.show({ duration: 2000 })}>show (2s 后自动关闭)</web-ui-button>
      </div>
      <h2>命令式自定义尺寸</h2>
      <div className="mb-3 flex gap-2">
        <web-ui-button onClick={() => WebUiSpinner.show({ size: 16 })}>小尺寸 (16)</web-ui-button>
        <web-ui-button onClick={() => WebUiSpinner.show({ size: 64 })}>大尺寸 (64)</web-ui-button>
      </div>
      <h2>命令式描述文字</h2>
      <div className="mb-6 flex gap-2">
        <web-ui-button onClick={() => WebUiSpinner.show({ description: '正在加载数据，请稍候...' })}>
          带描述
        </web-ui-button>
        <web-ui-button
          onClick={() => WebUiSpinner.show({ description: '正在同步云端文件，预计需要 10 秒', duration: 10000 })}
        >
          长描述 (10s)
        </web-ui-button>
      </div>
    </div>
  )
}
export default SpinnerDemo
