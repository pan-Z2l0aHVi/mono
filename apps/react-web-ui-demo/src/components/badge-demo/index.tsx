function BadgeDemo() {
  return (
    <div>
      <h1>徽标</h1>
      <h2>基础</h2>
      <div className="mb-3 flex items-center gap-6">
        <web-ui-badge count={5}>
          <web-ui-button>消息</web-ui-button>
        </web-ui-badge>
        <web-ui-badge count={0}>
          <web-ui-button>无通知</web-ui-button>
        </web-ui-badge>
        <web-ui-badge count={0} showZero>
          <web-ui-button>显示零</web-ui-button>
        </web-ui-badge>
      </div>
      <h2>超过 max</h2>
      <div className="mb-3 flex items-center gap-6">
        <web-ui-badge count={100}>
          <web-ui-button>通知</web-ui-button>
        </web-ui-badge>
        <web-ui-badge count={99999} max={999}>
          <web-ui-button>大数字</web-ui-button>
        </web-ui-badge>
        <web-ui-badge count={10} max={9}>
          <web-ui-button>max=9</web-ui-button>
        </web-ui-badge>
      </div>
      <h2>圆点模式</h2>
      <div className="mb-3 flex items-center gap-6">
        <web-ui-badge dot>
          <web-ui-button>有新消息</web-ui-button>
        </web-ui-badge>
        <web-ui-badge count={5} dot>
          <web-ui-button>dot 优先</web-ui-button>
        </web-ui-badge>
      </div>
      <h2>独立使用（无包裹内容）</h2>
      <div className="mb-3 flex items-center gap-4">
        <web-ui-badge count={3} />
        <web-ui-badge count={128} />
        <web-ui-badge dot />
        <web-ui-badge count={0} showZero />
      </div>
      <h2>位置</h2>
      <div className="mb-3 flex items-center gap-6">
        <web-ui-badge count={1} placement="top-right">
          <web-ui-button>右上</web-ui-button>
        </web-ui-badge>
        <web-ui-badge count={2} placement="top-left">
          <web-ui-button>左上</web-ui-button>
        </web-ui-badge>
        <web-ui-badge count={3} placement="bottom-right">
          <web-ui-button>右下</web-ui-button>
        </web-ui-badge>
        <web-ui-badge count={4} placement="bottom-left">
          <web-ui-button>左下</web-ui-button>
        </web-ui-badge>
      </div>
      <h2>偏移</h2>
      <div className="mb-3 flex items-center gap-6">
        <web-ui-badge count={8} offsetX={-4} offsetY={4}>
          <web-ui-button>圆角按钮</web-ui-button>
        </web-ui-badge>
        <web-ui-badge dot offsetX={-4} offsetY={4}>
          <web-ui-button>圆点徽标</web-ui-button>
        </web-ui-badge>
      </div>
      <h2>隐藏</h2>
      <div className="mb-3 flex items-center gap-6">
        <web-ui-badge count={5} badgeHidden>
          <web-ui-button>隐藏徽标</web-ui-button>
        </web-ui-badge>
      </div>
    </div>
  )
}
export default BadgeDemo
