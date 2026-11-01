// 面向浏览器宿主的 Markdown 渲染入口：只带 remark 管线，不引入生成器依赖的 node:fs / node:path。
export { markdownToHtml } from './markdown'
