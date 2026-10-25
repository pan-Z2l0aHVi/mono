export default function Demo() {
  return (
    <div className="flex flex-wrap items-center gap-8">
      <web-ui-svg-draw-lines duration={1200}>
        <svg
          viewBox="0 0 24 24"
          width="48"
          height="48"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 12 L10 18 L20 6"></path>
        </svg>
      </web-ui-svg-draw-lines>
      <span className="text-xs text-(--wui-color-text-secondary)">Draws in once automatically after mount</span>
    </div>
  )
}
