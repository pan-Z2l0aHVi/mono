# utility-types

English | [简体中文](./utility-types.CN.md)

Compile-time TypeScript utility types with zero runtime overhead.

## Examples

### Common type transformations

```ts
import type {
  ArgumentType,
  ArrayItem,
  ClassPropertyTypes,
  DeepPartial,
  DeepRequired,
  Equal,
  ValueOf
} from '@greypan/js-kit'

type Config = { api: { url: string; retries?: number } }
type PartialConfig = DeepPartial<Config>
type RequiredConfig = DeepRequired<Config>
type Status = ValueOf<{ readonly ok: 200; readonly fail: 500 }>
type Elem = ArrayItem<string[]>
type FirstArg = ArgumentType<(id: number) => void>
type IsSame = Equal<Elem, string>

class Service {
  endpoint = '/api'
  timeout = 3000
}
type ServiceProps = ClassPropertyTypes<Service>

export type Preview = [PartialConfig, RequiredConfig, Status, Elem, FirstArg, IsSame, ServiceProps]
```

## Type Reference

| Type                    | Input Example                                  | Resolved Type                           |
| ----------------------- | ---------------------------------------------- | --------------------------------------- |
| `ValueOf<T>`            | `ValueOf<{ a: 1; b: 'x' }>`                    | `1 \| 'x'`                              |
| `ArrayItem<T>`          | `ArrayItem<string[]>`                          | `string`                                |
| `ArgumentType<T>`       | `ArgumentType<(a: number, b: string) => void>` | `[a: number, b: string]`                |
| `DeepPartial<T>`        | `DeepPartial<{ a: { b: number } }>`            | `{ a?: { b?: number } }`                |
| `DeepRequired<T>`       | `DeepRequired<{ a?: { b?: number } }>`         | `{ a: { b: number } }`                  |
| `ClassPropertyTypes<T>` | `ClassPropertyTypes<Service>`                  | `{ endpoint: string; timeout: number }` |
| `Equal<X, Y>`           | `Equal<string, string>`                        | `true`                                  |
