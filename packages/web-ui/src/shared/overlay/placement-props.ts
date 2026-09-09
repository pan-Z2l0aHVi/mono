/**
 * Floating UI anchored overlay 组件共享的 placement 白名单。
 *
 * 12 个方向成员相同、声明顺序在各组件历史上有差异；normalizeLiteral 只做
 * 成员判定，顺序不参与语义，因此这里以稳定顺序单源化，组件不再各自声明。
 */
export const FLOATING_PLACEMENTS = [
  'top',
  'top-start',
  'top-end',
  'bottom',
  'bottom-start',
  'bottom-end',
  'left',
  'left-start',
  'left-end',
  'right',
  'right-start',
  'right-end'
] as const

export type FloatingPlacement = (typeof FLOATING_PLACEMENTS)[number]
