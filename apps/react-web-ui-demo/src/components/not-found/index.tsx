// HTTP 状态名是协议术语，中英两版都保留英文。
const NOT_FOUND_TITLE = '404 Not Found'

export function NotFound() {
  return (
    <div className="text-center">
      <h1>{NOT_FOUND_TITLE}</h1>
      <p>你要找的页面不存在</p>
    </div>
  )
}
