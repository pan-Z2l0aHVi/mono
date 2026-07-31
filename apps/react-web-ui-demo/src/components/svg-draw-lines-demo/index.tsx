import type { WebUiSvgDrawLines } from '@greypan/web-ui'
import {
  lucideSearch,
  lucideStar,
  lucideHeart,
  lucideBell,
  lucideMail,
  lucideUser,
  lucideDownload,
  lucideCheck,
  lucideSettings,
  lucideInbox
} from '@greypan/web-ui/icons'
import { useRef, useState } from 'react'

function SvgDrawLinesDemo() {
  const [duration, setDuration] = useState(1000)
  const [easing, setEasing] = useState('ease-in-out')

  const replays = useRef<Record<string, () => void>>({})

  const setReplay = (id: string, el: WebUiSvgDrawLines | null) => {
    if (el) replays.current[id] = () => el.replay()
    else delete replays.current[id]
  }

  const replayAll = () => {
    Object.values(replays.current).forEach(fn => fn())
  }

  return (
    <div>
      <h1>SVG 描边动画</h1>
      <p className="mb-4 text-[var(--wui-color-text-muted)]">
        将 SVG 图形的轮廓线以描边动画逐笔绘制。支持 path、rect、circle、line、polyline、polygon、ellipse
        等多种基本图形。
      </p>

      <h2>参数控制</h2>
      <div className="mb-6 flex flex-col gap-4">
        <label className="flex items-center gap-2 text-sm">
          <span className="whitespace-nowrap text-[var(--wui-color-text-muted)]">动画时长:</span>
          <web-ui-slider
            value={duration}
            min={200}
            max={5000}
            step={100}
            className="max-w-100"
            onInput={event => setDuration(event.currentTarget.value)}
          ></web-ui-slider>
          <code className="rounded bg-[var(--wui-color-surface-raised)] px-2 py-0.5 text-xs">{duration}ms</code>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-[var(--wui-color-text-muted)]">缓动函数:</span>
          <web-ui-select value={easing} className="w-36" onChange={event => setEasing(event.currentTarget.value)}>
            <web-ui-option value="linear">linear</web-ui-option>
            <web-ui-option value="ease">ease</web-ui-option>
            <web-ui-option value="ease-in">ease-in</web-ui-option>
            <web-ui-option value="ease-out">ease-out</web-ui-option>
            <web-ui-option value="ease-in-out">ease-in-out</web-ui-option>
            <web-ui-option value="cubic-bezier(0.68, -0.55, 0.27, 1.55)">bounce</web-ui-option>
          </web-ui-select>
        </label>
        <web-ui-button onClick={replayAll} variant="secondary">
          全部重播
        </web-ui-button>
      </div>

      <h2>基础形状（light DOM）</h2>
      <div className="mb-6 flex flex-wrap items-end gap-6">
        <div>
          <p className="mb-1 text-sm text-[var(--wui-color-text-muted)]">简单线条</p>
          <div className="flex items-center gap-2">
            <web-ui-svg-draw-lines ref={el => setReplay('svg1', el)} duration={duration} easing={easing}>
              <svg
                viewBox="0 0 100 40"
                width="100"
                height="40"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 20 L50 5 L95 20" />
                <path d="M50 5 L50 35" />
              </svg>
            </web-ui-svg-draw-lines>
            <web-ui-button onClick={() => replays.current.svg1?.()} variant="ghost">
              重播
            </web-ui-button>
          </div>
        </div>
        <div>
          <p className="mb-1 text-sm text-[var(--wui-color-text-muted)]">几何图形</p>
          <div className="flex items-center gap-2">
            <web-ui-svg-draw-lines ref={el => setReplay('svg2', el)} duration={duration} easing={easing}>
              <svg
                viewBox="0 0 100 80"
                width="100"
                height="80"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              >
                <rect x="20" y="40" width="40" height="35" />
                <polygon points="10,40 40,10 70,40" />
                <circle cx="75" cy="15" r="10" />
              </svg>
            </web-ui-svg-draw-lines>
            <web-ui-button onClick={() => replays.current.svg2?.()} variant="ghost">
              重播
            </web-ui-button>
          </div>
        </div>
        <div>
          <p className="mb-1 text-sm text-[var(--wui-color-text-muted)]">波浪曲线</p>
          <div className="flex items-center gap-2">
            <web-ui-svg-draw-lines ref={el => setReplay('svg3', el)} duration={duration} easing={easing}>
              <svg
                viewBox="0 0 200 60"
                width="200"
                height="60"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 30 Q25 0 50 30 T100 30 T150 30 T195 30" />
              </svg>
            </web-ui-svg-draw-lines>
            <web-ui-button onClick={() => replays.current.svg3?.()} variant="ghost">
              重播
            </web-ui-button>
          </div>
        </div>
      </div>

      <h2>复杂场景</h2>
      <div className="mb-6 flex flex-wrap items-end gap-8">
        <div>
          <p className="mb-1 text-sm text-[var(--wui-color-text-muted)]">多个同级 SVG</p>
          <div className="flex items-center gap-2">
            <web-ui-svg-draw-lines ref={el => setReplay('multiRef', el)} duration={duration} easing={easing}>
              <svg viewBox="0 0 50 50" width="50" height="50" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="25" cy="25" r="20" />
              </svg>
              <svg viewBox="0 0 50 50" width="50" height="50" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="10" y="10" width="30" height="30" />
              </svg>
            </web-ui-svg-draw-lines>
            <web-ui-button onClick={() => replays.current.multiRef?.()} variant="ghost">
              重播
            </web-ui-button>
          </div>
        </div>
        <div>
          <p className="mb-1 text-sm text-[var(--wui-color-text-muted)]">深层嵌套 &lt;g&gt;</p>
          <div className="flex items-center gap-2">
            <web-ui-svg-draw-lines ref={el => setReplay('nestedRef', el)} duration={duration} easing={easing}>
              <svg viewBox="0 0 100 100" width="100" height="100" fill="none" stroke="currentColor" strokeWidth="2">
                <g>
                  <g>
                    <path d="M10 10 L90 90" />
                    <circle cx="50" cy="50" r="30" />
                  </g>
                </g>
              </svg>
            </web-ui-svg-draw-lines>
            <web-ui-button onClick={() => replays.current.nestedRef?.()} variant="ghost">
              重播
            </web-ui-button>
          </div>
        </div>
        <div>
          <p className="mb-1 text-sm text-[var(--wui-color-text-muted)]">light DOM + Shadow DOM 混合</p>
          <div className="flex items-center gap-2">
            <web-ui-svg-draw-lines ref={el => setReplay('mixedRef', el)} duration={duration} easing={easing}>
              <svg
                viewBox="0 0 24 24"
                width="24"
                height="24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
              <web-ui-icon icon={lucideStar} size={24}></web-ui-icon>
            </web-ui-svg-draw-lines>
            <web-ui-button onClick={() => replays.current.mixedRef?.()} variant="ghost">
              重播
            </web-ui-button>
          </div>
        </div>
      </div>

      <h2>图标示例（Shadow DOM — web-ui-icon）</h2>
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {[
          { id: 'search', label: 'Search 搜索', icon: lucideSearch },
          { id: 'star', label: 'Star 星标', icon: lucideStar },
          { id: 'heart', label: 'Heart 收藏', icon: lucideHeart },
          { id: 'bell', label: 'Bell 通知', icon: lucideBell },
          { id: 'mail', label: 'Mail 邮件', icon: lucideMail },
          { id: 'user', label: 'User 用户', icon: lucideUser },
          { id: 'download', label: 'Download 下载', icon: lucideDownload },
          { id: 'check', label: 'Check 确认', icon: lucideCheck },
          { id: 'settings', label: 'Settings 设置', icon: lucideSettings },
          { id: 'inbox', label: 'Inbox 收件箱', icon: lucideInbox }
        ].map(item => (
          <div
            key={item.id}
            className="flex flex-col items-center gap-2 rounded-lg border border-[var(--wui-color-border)] bg-[var(--wui-color-surface)] p-4"
          >
            <div className="flex items-center gap-1.5 text-sm text-[var(--wui-color-text-muted)]">
              <web-ui-icon icon={item.icon} size={16}></web-ui-icon>
              <span>{item.label}</span>
            </div>
            <web-ui-svg-draw-lines ref={el => setReplay(item.id, el)} duration={duration} easing={easing}>
              <web-ui-icon icon={item.icon} size={32}></web-ui-icon>
            </web-ui-svg-draw-lines>
            <web-ui-button onClick={() => replays.current[item.id]?.()} full variant="ghost">
              重播
            </web-ui-button>
          </div>
        ))}
      </div>
    </div>
  )
}
export default SvgDrawLinesDemo
