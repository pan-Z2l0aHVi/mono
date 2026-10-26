export default function Demo() {
  return (
    <div className="flex w-full flex-col gap-5">
      <web-ui-button full variant="primary">
        full：占满整行
      </web-ui-button>

      <div className="grid w-full grid-cols-2 gap-2">
        <web-ui-button full variant="primary">
          full：占满这一列
        </web-ui-button>
        <web-ui-button full>full：glass 档</web-ui-button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <web-ui-button variant="secondary" className="[--wui-button-width:160px]">
          160px 宽
        </web-ui-button>
        <web-ui-button variant="secondary" size="40" className="[--wui-button-width:220px]">
          40×220
        </web-ui-button>
      </div>
    </div>
  )
}
