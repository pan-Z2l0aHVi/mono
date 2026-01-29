export type ValueOf<T> = T[keyof T]

export type ArrayItem<T extends unknown[]> = T extends (infer R)[] ? R : never

export type ArgumentType<T> = T extends (...args: (infer R)[]) => unknown ? R : never

export type DeepPartial<T> = Partial<{
  [K in keyof T]: DeepPartial<T[K]>
}>

export type DeepRequired<T> = Required<{
  [K in keyof T]: DeepRequired<T[K]>
}>

export type ClassPropertyTypes<T> = {
  [K in keyof T]: T[K]
}

export type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false
