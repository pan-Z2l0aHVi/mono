let nextFieldId = 0

/**
 * 为 shadow 内原生表单控件生成实例级稳定 id。
 *
 * Chrome 的表单 a11y 审计要求 input / textarea 至少有 id 或 name；
 * 生成 id 让消费者无需显式传 host 属性也始终满足该契约。
 * id 在组件构造时生成一次，后续重渲染复用，避免 aria 引用与焦点时序抖动。
 */
export function createFieldId(prefix: string): string {
  nextFieldId += 1
  return `${prefix}-${nextFieldId}`
}
