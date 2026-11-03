import { useState } from 'react'

export default function Demo() {
  const [openLayers, setOpenLayers] = useState([false, false, false, false])
  const setLayer = (index: number, open: boolean) =>
    setOpenLayers(previous => previous.map((value, i) => (i === index ? open : value)))

  return (
    <>
      <web-ui-button onClick={() => setLayer(0, true)}>Open layer 1</web-ui-button>

      <web-ui-drawer
        open={openLayers[0]}
        pageShift
        heading="Layer 1"
        onopen-change={event => {
          if (event.target === event.currentTarget) setLayer(0, event.detail.open)
        }}
      >
        <p>Layer 1 steps aside the most; every layer after it less.</p>
        <web-ui-button slot="footer" variant="secondary" full onClick={() => setLayer(1, true)}>
          Open layer 2
        </web-ui-button>

        <web-ui-drawer
          open={openLayers[1]}
          pageShift
          heading="Layer 2"
          onopen-change={event => {
            if (event.target === event.currentTarget) setLayer(1, event.detail.open)
          }}
        >
          <p>Each layer contributes its own share; closing a middle layer re-ranks the layers behind it.</p>
          <web-ui-button slot="footer" variant="secondary" full onClick={() => setLayer(2, true)}>
            Open layer 3
          </web-ui-button>

          <web-ui-drawer
            open={openLayers[2]}
            pageShift
            heading="Layer 3"
            onopen-change={event => {
              if (event.target === event.currentTarget) setLayer(2, event.detail.open)
            }}
          >
            <p>Layer 3 steps aside less; more layers converge quickly to a stable total.</p>
            <web-ui-button slot="footer" variant="secondary" full onClick={() => setLayer(3, true)}>
              Open layer 4
            </web-ui-button>

            <web-ui-drawer
              open={openLayers[3]}
              pageShift
              heading="Layer 4"
              onopen-change={event => {
                if (event.target === event.currentTarget) setLayer(3, event.detail.open)
              }}
            >
              <p>Layer 4 steps aside the least.</p>
            </web-ui-drawer>
          </web-ui-drawer>
        </web-ui-drawer>
      </web-ui-drawer>
    </>
  )
}
