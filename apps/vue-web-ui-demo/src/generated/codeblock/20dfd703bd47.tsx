// 示例图是一段内联 SVG：语料不带二进制素材，也不依赖网络。
const photo =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96'%3E%3Crect width='96' height='96' fill='%234f46e5'/%3E%3Ccircle cx='48' cy='56' r='22' fill='%23c7d2fe'/%3E%3Ccircle cx='48' cy='92' r='26' fill='%23a5b4fc'/%3E%3C/svg%3E"

export default function Demo() {
  return (
    <div className="flex items-center gap-4">
      <web-ui-avatar src={photo} alt="Grey" size={40}></web-ui-avatar>
      <web-ui-avatar src={photo} alt="Grey" size={56}></web-ui-avatar>
      <web-ui-avatar src={photo} alt="Grey" size={80}></web-ui-avatar>
    </div>
  )
}
