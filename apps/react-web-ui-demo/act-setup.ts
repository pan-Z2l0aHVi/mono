// RTL 只在它自己的 act 包装里读这个开关；spec 直接 import react 的 `act` 时，不置位就会让每次
// 状态回写都走「未配置 act 环境」的告警分支。jsdom 与真实浏览器两档都需要它，所以单独成一个
// setup 文件；滚动替身只该出现在 jsdom 那档，留在 test-helper.ts。
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
