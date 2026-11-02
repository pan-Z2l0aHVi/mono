export default function Demo() {
  return (
    <div className="flex w-full flex-col gap-5">
      <web-ui-button full variant="primary">
        full: fills the row
      </web-ui-button>

      <div className="grid w-full grid-cols-2 gap-2">
        <web-ui-button full variant="primary">
          full: fills this column
        </web-ui-button>
        <web-ui-button full>full: glass</web-ui-button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <web-ui-button variant="secondary" className="[--wui-button-width:160px]">
          160px wide
        </web-ui-button>
        <web-ui-button variant="secondary" size="40" className="[--wui-button-width:220px]">
          40×220
        </web-ui-button>
      </div>
    </div>
  )
}
