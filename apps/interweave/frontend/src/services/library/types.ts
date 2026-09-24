import type {
  ResourceDTO,
  SourceDTO,
  TagDTO
} from '../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/service'

export type LibraryRuntimeKind = 'fixture' | 'wails'

export interface LibraryRuntime {
  readonly kind: LibraryRuntimeKind
  listResources(): Promise<ResourceDTO[]>
  getResource(resourceId: string): Promise<ResourceDTO>
  addFileResource(inputPath: string): Promise<ResourceDTO>
  addURLResource(inputURL: string): Promise<ResourceDTO>
  updateResourceTitle(resourceId: string, newTitle: string): Promise<ResourceDTO>
  deleteResource(resourceId: string): Promise<void>
  addTag(resourceId: string, tagName: string): Promise<TagDTO>
  removeTag(resourceId: string, tagId: string): Promise<void>
  refreshURLSource(sourceId: string): Promise<SourceDTO>
  refreshFileSource(sourceId: string): Promise<SourceDTO>
  replaceFileSource(sourceId: string, inputPath: string): Promise<SourceDTO>
  chooseFilePaths(): Promise<string[]>
  chooseFilePath(): Promise<string | null>
}

export interface LibraryQueueItem {
  id: string
  kind: 'file' | 'url'
  title: string
  location: string
}

export function requireResourceDTO(value: ResourceDTO | null, action: string): ResourceDTO {
  if (value) return value
  throw new Error(`${action}未返回 Resource`)
}

export function requireSourceDTO(value: SourceDTO | null, action: string): SourceDTO {
  if (value) return value
  throw new Error(`${action}未返回 Source`)
}

export function requireTagDTO(value: TagDTO | null, action: string): TagDTO {
  if (value) return value
  throw new Error(`${action}未返回 Tag`)
}
