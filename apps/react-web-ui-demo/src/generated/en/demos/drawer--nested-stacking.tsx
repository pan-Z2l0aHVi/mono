import type { CSSProperties } from 'react'
import { useState } from 'react'

const titles = ['Overview', 'Details', 'Settings', 'Confirm']
const widths = ['300px', '280px', '240px', '320px']

export default function Demo() {
  const [levels, setLevels] = useState([false, false, false, false])

  function openLevel(index: number) {
    setLevels(current => current.map((value, i) => (i < index ? value : i === index)))
  }

  function closeLevel(index: number) {
    setLevels(current => current.map((value, i) => (i < index ? value : false)))
  }

  return (
    <>
      <web-ui-button onClick={() => openLevel(0)}>Open four nested layers</web-ui-button>

      <web-ui-drawer
        open={levels[0]}
        heading={`${titles[0]} (300px)`}
        closable
        style={{ '--wui-drawer-width': widths[0] } as CSSProperties}
        onopen-change={event => {
          if (event.target === event.currentTarget && !event.detail.open) closeLevel(0)
        }}
      >
        <p>Layer 1. After the next layer opens, this layer scales down and exposes its left edge.</p>
        <web-ui-button slot="footer" variant="secondary" full onClick={() => openLevel(1)}>
          Open layer 2
        </web-ui-button>

        <web-ui-drawer
          open={levels[1]}
          heading={`${titles[1]} (280px)`}
          closable
          style={{ '--wui-drawer-width': widths[1] } as CSSProperties}
          onopen-change={event => {
            if (event.target === event.currentTarget && !event.detail.open) closeLevel(1)
          }}
        >
          <p>Layer 2. This layer is wider than the one above, so the stacking position compensates automatically.</p>
          <web-ui-button slot="footer" variant="secondary" full onClick={() => openLevel(2)}>
            Open layer 3
          </web-ui-button>

          <web-ui-drawer
            open={levels[2]}
            heading={`${titles[2]} (240px)`}
            closable
            style={{ '--wui-drawer-width': widths[2] } as CSSProperties}
            onopen-change={event => {
              if (event.target === event.currentTarget && !event.detail.open) closeLevel(2)
            }}
          >
            <p>Layer 3. When a wider layer stacks on a narrower one, the left edge stays visible.</p>
            <web-ui-button slot="footer" variant="secondary" full onClick={() => openLevel(3)}>
              Open layer 4
            </web-ui-button>

            <web-ui-drawer
              open={levels[3]}
              heading={`${titles[3]} (320px, top layer)`}
              closable
              style={{ '--wui-drawer-width': widths[3] } as CSSProperties}
              onopen-change={event => {
                if (event.target === event.currentTarget && !event.detail.open) closeLevel(3)
              }}
            >
              <p>Layer 4, the topmost. Closing it restores each layer to its original size.</p>
            </web-ui-drawer>
          </web-ui-drawer>
        </web-ui-drawer>
      </web-ui-drawer>
    </>
  )
}
