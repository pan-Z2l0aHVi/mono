import type { PropertyDeclaration } from 'lit'

/** 默认 true 的布尔属性需要保留 false 字面量，供模板框架声明式传值。 */
export const booleanWithFalseString: PropertyDeclaration<unknown>['converter'] = {
  fromAttribute: value => value !== 'false',
  toAttribute: value => (value ? '' : 'false')
}
