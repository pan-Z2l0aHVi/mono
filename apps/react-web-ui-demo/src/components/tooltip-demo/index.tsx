function TooltipDemo() {
  return (
    <div>
      <h1>tooltip</h1>
      <h2>Top</h2>
      <div className="mb-6 flex gap-2">
        <web-ui-tooltip content="This is the tooltip text">
          <web-ui-button>Top</web-ui-button>
        </web-ui-tooltip>
      </div>
      <h2>Bottom</h2>
      <div className="mb-6 flex gap-2">
        <web-ui-tooltip placement="bottom" content="Bottom tooltip">
          <web-ui-button>Bottom</web-ui-button>
        </web-ui-tooltip>
      </div>
      <h2>Left</h2>
      <div className="mb-6 flex gap-2">
        <web-ui-tooltip placement="left" content="Left tooltip">
          <web-ui-button>Left</web-ui-button>
        </web-ui-tooltip>
      </div>
      <h2>Right</h2>
      <div className="mb-6 flex gap-2">
        <web-ui-tooltip placement="right" content="Right tooltip">
          <web-ui-button>Right</web-ui-button>
        </web-ui-tooltip>
      </div>
      <h2>Rich content slot</h2>
      <div className="mb-6 flex gap-2">
        <web-ui-tooltip placement="bottom">
          <web-ui-button>Custom content</web-ui-button>
          <div slot="content">
            <span className="font-semibold">Rich text</span>Tooltip content
          </div>
        </web-ui-tooltip>
      </div>
      <h2>Portal</h2>
      <div className="mb-6 flex gap-2">
        <web-ui-tooltip portal placement="bottom" content="Portal Tooltip">
          <web-ui-button>Portal</web-ui-button>
        </web-ui-tooltip>
      </div>
      <h2>Delay</h2>
      <div className="mb-6 flex gap-2">
        <web-ui-tooltip content="Shows after a 500ms delay" showDelay={500}>
          <web-ui-button>Long delay</web-ui-button>
        </web-ui-tooltip>
      </div>
      <h2>Disabled</h2>
      <div className="mb-6 flex gap-2">
        <web-ui-tooltip content="Hidden while disabled" disabled>
          <web-ui-button>Disabled</web-ui-button>
        </web-ui-tooltip>
      </div>
    </div>
  )
}
export default TooltipDemo
