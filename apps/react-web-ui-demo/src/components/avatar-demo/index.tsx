function AvatarDemo() {
  return (
    <div>
      <h1>avatar</h1>
      <h2>Image avatar</h2>
      <div className="mb-3 flex items-center gap-3">
        <web-ui-avatar src="https://cravatar.cn/avatar/test?d=mp" alt="用户1" size={40} />
        <web-ui-avatar src="https://cravatar.cn/avatar/test?d=identicon" alt="用户2" size={56} />
        <web-ui-avatar src="https://cravatar.cn/avatar/test?d=monsterid" alt="用户3" size={80} />
      </div>
      <h2>Initials fallback</h2>
      <div className="mb-3 flex items-center gap-3">
        <web-ui-avatar name="John Doe" size={40} />
        <web-ui-avatar name="Alice" size={56} />
        <web-ui-avatar name="Jane Doe" size={80} />
        <web-ui-avatar name="John Michael Doe" size={40} />
      </div>
      <h2>Default icon fallback</h2>
      <div className="mb-3 flex items-center gap-3">
        <web-ui-avatar size={40} />
        <web-ui-avatar size={56} />
        <web-ui-avatar size={80} />
      </div>
      <h2>Different sizes</h2>
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <web-ui-avatar name="S" size={24} />
        <web-ui-avatar name="M" size={32} />
        <web-ui-avatar name="L" size={40} />
        <web-ui-avatar name="XL" size={56} />
        <web-ui-avatar name="XXL" size={80} />
        <web-ui-avatar name="Huge" size={120} />
      </div>
      <h2>Square</h2>
      <div className="mb-3 flex items-center gap-3">
        <web-ui-avatar src="https://cravatar.cn/avatar/test?d=retro" alt="方形图" size={56} shape="square" />
        <web-ui-avatar name="Square" size={56} shape="square" />
        <web-ui-avatar size={56} shape="square" />
      </div>
      <h2>Image failed to load</h2>
      <div className="mb-3 flex items-center gap-3">
        <web-ui-avatar src="https://broken.invalid/avatar.jpg" name="Fallback" size={56} />
        <web-ui-avatar src="https://broken.invalid/avatar.jpg" size={56} />
      </div>
      <h2>Custom slot fallback</h2>
      <div className="mb-3 flex items-center gap-3">
        <web-ui-avatar size={56}>
          <span className="text-sm font-bold text-blue-600">VIP</span>
        </web-ui-avatar>
        <web-ui-avatar size={56}>
          <span className="text-lg">⭐</span>
        </web-ui-avatar>
      </div>
    </div>
  )
}
export default AvatarDemo
