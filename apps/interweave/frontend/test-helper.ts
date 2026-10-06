/*
 * 测试全局补丁（vite.config.ts 的 test.setupFiles 挂载）。
 *
 * Node ≥22 在 globalThis 上放了实验性 localStorage（未配 --localstorage-file 时读值恒为
 * undefined），而 vitest 的 jsdom 环境按「key 已存在于 global 则不拷贝」的规则跳过同名
 * 全局（getWindowKeys 的白名单里没有 localStorage），于是 spec 里裸写的 localStorage 拿到
 * 的是 Node 的空实现，jsdom 的 Storage 永远进不来。CI 的 Node 版本没有这个 getter，所以
 * 该问题只在本地复现。这里把它重新指回 jsdom window 的 Storage，恢复浏览器语义。
 */
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  get() {
    const win = (globalThis as { jsdom?: { window?: { localStorage?: Storage } } }).jsdom?.window
    return win?.localStorage
  }
})
