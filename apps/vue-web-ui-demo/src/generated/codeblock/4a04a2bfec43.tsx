export default function Demo() {
  return (
    <div className="flex items-center gap-4">
      <web-ui-avatar size={56}>
        <span className="text-sm font-bold text-(--wui-color-accent)">VIP</span>
      </web-ui-avatar>

      <web-ui-avatar name="Grey Pan" size={56}>
        <span className="text-lg">客</span>
      </web-ui-avatar>
    </div>
  )
}
