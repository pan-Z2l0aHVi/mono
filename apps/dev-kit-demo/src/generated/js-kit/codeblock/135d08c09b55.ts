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
