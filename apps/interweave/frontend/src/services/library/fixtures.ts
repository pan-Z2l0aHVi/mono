import type {
  ResourceDTO,
  SourceDTO,
  TagDTO
} from '../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/service'
import { ResourceKind } from '../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'

import type { LibraryRuntime } from './types'

const BASE_TIME = Date.UTC(2026, 7, 18, 9, 30)
let fixtureId = 0

function nextId(prefix: string) {
  fixtureId += 1
  return `${prefix}-${fixtureId}`
}

function source(
  id: string,
  resourceId: string,
  type: SourceDTO['type'],
  location: string,
  available: boolean,
  orderIndex: number,
  updatedAt: number,
  metadata: SourceDTO['metadata'] = null
): SourceDTO {
  return {
    id,
    resource_id: resourceId,
    type,
    location,
    available,
    is_preferred: orderIndex === 0,
    order_index: orderIndex,
    metadata,
    created_at: updatedAt - 86_400_000,
    updated_at: updatedAt
  }
}

function resource(
  id: string,
  title: string,
  note: string,
  updatedAt: number,
  sources: SourceDTO[],
  tags: Array<[string, string]>,
  kind: ResourceDTO['kind'],
  sizeBytes: number | null
): ResourceDTO {
  return {
    id,
    title,
    note,
    kind,
    size_bytes: sizeBytes,
    created_at: updatedAt - 5 * 86_400_000,
    updated_at: updatedAt,
    sources,
    tags: tags.map(([tagId, name]) => ({ id: tagId, name, created_at: BASE_TIME })),
    preferred_source_id: sources.find(item => item.is_preferred)?.id ?? ''
  }
}

// Fixture adapter mirrors backend metadata updates without filesystem access.
function fixtureKindForPath(location: string): ResourceDTO['kind'] {
  const extension = location.split('.').at(-1)?.toLowerCase()
  if (extension === 'png' || extension === 'jpg' || extension === 'jpeg') return ResourceKind.ResourceKindImage
  if (extension === 'mp4' || extension === 'mov' || extension === 'webm') return ResourceKind.ResourceKindVideo
  if (extension === 'mp3' || extension === 'wav' || extension === 'm4a') return ResourceKind.ResourceKindAudio
  if (extension === 'json') return ResourceKind.ResourceKindJSON
  if (extension === 'pdf' || extension === 'md' || extension === 'csv' || extension === 'txt')
    return ResourceKind.ResourceKindDocument
  return ResourceKind.ResourceKindFile
}

function fixtureSizeForPath(location: string) {
  const extension = location.split('.').at(-1)?.toLowerCase()
  if (extension === 'mp4') return 156_000_000
  if (extension === 'mp3') return 8_200_000
  if (extension === 'png' || extension === 'jpg' || extension === 'jpeg') return 1_800_000
  if (extension === 'json') return 18_000
  if (extension === 'csv') return 64_000
  if (extension === 'md') return 22_000
  return 2_400_000
}

function createInitialResources(): ResourceDTO[] {
  return [
    resource(
      'fixture-design-system',
      'Interweave Design System',
      '颜色、排版、间距与交互状态的统一基线。',
      BASE_TIME,
      [
        source(
          'fixture-design-system-file',
          'fixture-design-system',
          'file' as SourceDTO['type'],
          '/Users/demo/Documents/interweave-design-system.pdf',
          true,
          0,
          BASE_TIME
        ),
        source(
          'fixture-design-system-url',
          'fixture-design-system',
          'url' as SourceDTO['type'],
          'https://example.com/design-system',
          true,
          1,
          BASE_TIME,
          {
            title: 'Interweave Design System',
            site_name: 'Example',
            description: '在线设计规范',
            favicon_url: ''
          }
        )
      ],
      [
        ['tag-design', '设计'],
        ['tag-reference', '参考']
      ],
      ResourceKind.ResourceKindDocument,
      2_400_000
    ),
    resource(
      'fixture-visual-reference',
      '视觉参考归档',
      '',
      BASE_TIME - 600_000,
      [
        source(
          'fixture-visual-reference-file',
          'fixture-visual-reference',
          'file' as SourceDTO['type'],
          '/Users/demo/Pictures/visual-reference.png',
          true,
          0,
          BASE_TIME - 600_000
        )
      ],
      [['tag-design', '设计']],
      ResourceKind.ResourceKindImage,
      2_500_000
    ),
    resource(
      'fixture-launch-video',
      '产品发布会演示视频',
      '',
      BASE_TIME - 1_200_000,
      [
        source(
          'fixture-launch-video-file',
          'fixture-launch-video',
          'file' as SourceDTO['type'],
          '/Users/demo/Movies/product-launch.mp4',
          true,
          0,
          BASE_TIME - 1_200_000
        )
      ],
      [['tag-archive', '归档']],
      ResourceKind.ResourceKindVideo,
      163_577_856
    ),
    resource(
      'fixture-interview-audio',
      '用户访谈录音',
      '',
      BASE_TIME - 1_800_000,
      [
        source(
          'fixture-interview-audio-file',
          'fixture-interview-audio',
          'file' as SourceDTO['type'],
          '/Users/demo/Audio/user-interview.mp3',
          true,
          0,
          BASE_TIME - 1_800_000
        )
      ],
      [['tag-research', '研究']],
      ResourceKind.ResourceKindAudio,
      8_600_000
    ),
    resource(
      'fixture-interview',
      '用户访谈记录：资源库首次使用体验',
      '重点关注筛选、批量整理和失效来源的处理方式。',
      BASE_TIME - 3_600_000,
      [
        source(
          'fixture-interview-url',
          'fixture-interview',
          'url' as SourceDTO['type'],
          'https://example.com/research/library-interviews',
          true,
          0,
          BASE_TIME - 3_600_000,
          {
            title: '用户访谈记录：资源库首次使用体验',
            site_name: 'Research Notes',
            description: '访谈纪要与观察摘要',
            favicon_url: ''
          }
        )
      ],
      [['tag-research', '研究']],
      ResourceKind.ResourceKindWeb,
      null
    ),
    resource(
      'fixture-metrics',
      'Library Metrics 2026-08',
      '',
      BASE_TIME - 86_400_000,
      [
        source(
          'fixture-metrics-file',
          'fixture-metrics',
          'file' as SourceDTO['type'],
          '/Users/demo/Projects/library-metrics.csv',
          true,
          0,
          BASE_TIME - 86_400_000
        )
      ],
      [
        ['tag-data', '数据'],
        ['tag-reference', '参考']
      ],
      ResourceKind.ResourceKindJSON,
      18_000
    ),
    resource(
      'fixture-api-notes',
      'Wails service API notes',
      '记录前端 runtime adapter 与生成 bindings 的边界。',
      BASE_TIME - 2 * 86_400_000,
      [
        source(
          'fixture-api-notes-file',
          'fixture-api-notes',
          'file' as SourceDTO['type'],
          '/Users/demo/Projects/wails-service-api.json',
          true,
          0,
          BASE_TIME - 2 * 86_400_000
        )
      ],
      [
        ['tag-development', '开发'],
        ['tag-reference', '参考']
      ],
      ResourceKind.ResourceKindJSON,
      64_000
    ),
    resource(
      'fixture-archive-deck',
      '2025 产品发布会归档',
      '',
      BASE_TIME - 8 * 86_400_000,
      [
        source(
          'fixture-archive-deck-file',
          'fixture-archive-deck',
          'file' as SourceDTO['type'],
          '/Volumes/Archive/product-launch-2025.pdf',
          false,
          0,
          BASE_TIME - 8 * 86_400_000
        )
      ],
      [['tag-archive', '归档']],
      ResourceKind.ResourceKindDocument,
      null
    ),
    resource(
      'fixture-unavailable-url',
      'Interweave v1 产品边界说明',
      '原始页面暂时无法访问，保留用户维护的标题和标签。',
      BASE_TIME - 12 * 86_400_000,
      [
        source(
          'fixture-unavailable-url-source',
          'fixture-unavailable-url',
          'url' as SourceDTO['type'],
          'https://example.invalid/interweave-v1-boundaries',
          false,
          0,
          BASE_TIME - 12 * 86_400_000
        )
      ],
      [
        ['tag-reference', '参考'],
        ['tag-archive', '归档']
      ],
      ResourceKind.ResourceKindWeb,
      null
    ),
    resource(
      'fixture-brand',
      '品牌素材与语气规范',
      '',
      BASE_TIME - 15 * 86_400_000,
      [
        source(
          'fixture-brand-file',
          'fixture-brand',
          'file' as SourceDTO['type'],
          '/Users/demo/Documents/brand-guidelines.pdf',
          true,
          0,
          BASE_TIME - 15 * 86_400_000
        )
      ],
      [
        ['tag-design', '设计'],
        ['tag-archive', '归档']
      ],
      ResourceKind.ResourceKindDocument,
      1_100_000
    ),
    resource(
      'fixture-long-title',
      '这是一个用于检查资源库长标题在桌面与移动视口换行、截断和多标签布局时表现的完整资源标题',
      '',
      BASE_TIME - 20 * 86_400_000,
      [
        source(
          'fixture-long-title-file',
          'fixture-long-title',
          'file' as SourceDTO['type'],
          '/Users/demo/Documents/layout-review.md',
          true,
          0,
          BASE_TIME - 20 * 86_400_000
        )
      ],
      [
        ['tag-design', '设计'],
        ['tag-development', '开发'],
        ['tag-reference', '参考'],
        ['tag-research', '研究']
      ],
      ResourceKind.ResourceKindDocument,
      22_000
    )
  ]
}

function cloneResourceDTO(value: ResourceDTO): ResourceDTO {
  return {
    ...value,
    sources: value.sources.map(item => ({
      ...item,
      metadata: item.metadata ? { ...item.metadata } : null
    })),
    tags: value.tags.map(item => ({ ...item }))
  }
}

function titleFromPath(inputPath: string) {
  const parts = inputPath.split(/[\\/]/).filter(Boolean)
  const fileTitle = parts.at(-1) ?? inputPath
  return fileTitle.replace(/\.[^.]+$/, '') || fileTitle
}

function titleFromURL(inputURL: string) {
  const parsed = new URL(inputURL)
  const pathTitle = decodeURIComponent(parsed.pathname).replace(/\/$/, '').split('/').filter(Boolean).at(-1)
  return pathTitle ? `${parsed.hostname} · ${pathTitle}` : parsed.hostname
}

const fixtureMediaURLs: Record<string, string> = {
  'fixture-visual-reference-file': '/interweave-transparent.png',
  'fixture-launch-video-file': '/fixtures/resource-preview.webm'
}

function normalizeTag(tagName: string) {
  const normalized = tagName.trim().replace(/\s+/g, ' ')
  if (!normalized) throw new Error('标签名称不能为空')
  return normalized
}

class FixtureLibraryRuntime implements LibraryRuntime {
  readonly kind = 'fixture' as const
  private resources = createInitialResources()

  async listResources() {
    await Promise.resolve()
    return this.resources.map(cloneResourceDTO)
  }

  async getResource(resourceId: string) {
    const found = this.resources.find(item => item.id === resourceId)
    if (!found) throw new Error('Resource 不存在')
    return cloneResourceDTO(found)
  }

  async addFileResource(inputPath: string) {
    const path = inputPath.trim()
    if (!path) throw new Error('文件路径不能为空')
    const now = Date.now()
    const resourceId = nextId('fixture-file-resource')
    const created = resource(
      resourceId,
      titleFromPath(path),
      '',
      now,
      [source(nextId('fixture-file-source'), resourceId, 'file' as SourceDTO['type'], path, true, 0, now)],
      [],
      fixtureKindForPath(path),
      fixtureSizeForPath(path)
    )
    this.resources.unshift(created)
    return cloneResourceDTO(created)
  }

  async addURLResource(inputURL: string) {
    const value = inputURL.trim()
    const parsed = new URL(value)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('仅支持 http 或 https 链接')
    }
    const now = Date.now()
    const resourceId = nextId('fixture-url-resource')
    const created = resource(
      resourceId,
      titleFromURL(value),
      '',
      now,
      [
        source(nextId('fixture-url-source'), resourceId, 'url' as SourceDTO['type'], parsed.toString(), true, 0, now, {
          title: titleFromURL(value),
          site_name: parsed.hostname,
          description: '',
          favicon_url: ''
        })
      ],
      [],
      ResourceKind.ResourceKindWeb,
      null
    )
    this.resources.unshift(created)
    return cloneResourceDTO(created)
  }

  async updateResourceTitle(resourceId: string, newTitle: string) {
    const found = this.requireMutableResource(resourceId)
    const title = newTitle.trim()
    if (!title) throw new Error('标题不能为空')
    found.title = title
    found.updated_at = Date.now()
    return cloneResourceDTO(found)
  }

  async deleteResource(resourceId: string) {
    this.requireMutableResource(resourceId)
    this.resources = this.resources.filter(item => item.id !== resourceId)
  }

  async addTag(resourceId: string, tagName: string): Promise<TagDTO> {
    const found = this.requireMutableResource(resourceId)
    const name = normalizeTag(tagName)
    const existing = found.tags.find(item => item.name.toLowerCase() === name.toLowerCase())
    if (existing) return { ...existing }
    const created: TagDTO = { id: nextId('fixture-tag'), name, created_at: Date.now() }
    found.tags.push(created)
    found.updated_at = Date.now()
    return { ...created }
  }

  async removeTag(resourceId: string, tagId: string) {
    const found = this.requireMutableResource(resourceId)
    const index = found.tags.findIndex(item => item.id === tagId)
    if (index === -1) throw new Error('Resource 上不存在该标签')
    found.tags.splice(index, 1)
    found.updated_at = Date.now()
  }

  async refreshURLSource(sourceId: string) {
    const found = this.resources.flatMap(item => item.sources).find(item => item.id === sourceId)
    if (!found) throw new Error('Source 不存在')
    if ((found.type as string) !== 'url') throw new Error('仅 URL Source 可以刷新')
    found.available = true
    found.updated_at = Date.now()
    found.metadata = {
      title: found.metadata?.title || titleFromURL(found.location),
      site_name: found.metadata?.site_name || new URL(found.location).hostname,
      description: found.metadata?.description || '最近一次刷新可用',
      favicon_url: found.metadata?.favicon_url || ''
    }
    const parent = this.requireMutableResource(found.resource_id)
    parent.updated_at = Date.now()
    return { ...found, metadata: found.metadata ? { ...found.metadata } : null }
  }

  async refreshFileSource(sourceId: string) {
    const found = this.resources.flatMap(item => item.sources).find(item => item.id === sourceId)
    if (!found) throw new Error('Source 不存在')
    if ((found.type as string) !== 'file') throw new Error('仅文件 Source 可以刷新')
    found.available = true
    found.updated_at = Date.now()
    const parent = this.requireMutableResource(found.resource_id)
    if (found.is_preferred) parent.size_bytes = fixtureSizeForPath(found.location)
    parent.updated_at = Date.now()
    return { ...found, metadata: found.metadata ? { ...found.metadata } : null }
  }

  async replaceFileSource(sourceId: string, inputPath: string) {
    const path = inputPath.trim()
    if (!path) throw new Error('文件路径不能为空')
    const found = this.resources.flatMap(item => item.sources).find(item => item.id === sourceId)
    if (!found) throw new Error('Source 不存在')
    if ((found.type as string) !== 'file') throw new Error('仅文件 Source 可以替换路径')
    found.location = path
    found.available = true
    found.updated_at = Date.now()
    const parent = this.requireMutableResource(found.resource_id)
    if (found.is_preferred) {
      parent.kind = fixtureKindForPath(path)
      parent.size_bytes = fixtureSizeForPath(path)
    }
    parent.updated_at = Date.now()
    return { ...found, metadata: found.metadata ? { ...found.metadata } : null }
  }

  async replaceURLSource(sourceId: string, inputURL: string) {
    const value = inputURL.trim()
    let parsed: URL
    try {
      parsed = new URL(value)
    } catch {
      throw new Error('仅支持 http 或 https 链接')
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('仅支持 http 或 https 链接')
    }
    const found = this.resources.flatMap(item => item.sources).find(item => item.id === sourceId)
    if (!found) throw new Error('Source 不存在')
    if ((found.type as string) !== 'url') throw new Error('仅 URL Source 可以替换链接')
    found.location = parsed.toString()
    found.available = true
    found.updated_at = Date.now()
    found.metadata = {
      title: titleFromURL(found.location),
      site_name: parsed.hostname,
      description: found.metadata?.description || '最近一次找回可用',
      favicon_url: found.metadata?.favicon_url || ''
    }
    const parent = this.requireMutableResource(found.resource_id)
    parent.updated_at = Date.now()
    return { ...found, metadata: found.metadata ? { ...found.metadata } : null }
  }

  async chooseFilePaths() {
    return this.chooseFixtureFiles(true)
  }

  async chooseFilePath() {
    return (await this.chooseFixtureFiles(false))[0] ?? null
  }

  async getClipboardFilePaths() {
    return []
  }

  resourceMediaURL(sourceId: string) {
    return fixtureMediaURLs[sourceId] ?? null
  }

  subscribeToDroppedFiles(_listener: (paths: string[]) => void) {
    return () => {}
  }

  subscribeToPasteFileRequest(_listener: () => void) {
    return () => {}
  }

  private chooseFixtureFiles(multiple: boolean) {
    return new Promise<string[]>((resolve, reject) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.multiple = multiple
      input.accept = '*/*'
      input.addEventListener('change', () => {
        resolve([...(input.files ?? [])].map(file => file.name))
        input.remove()
      })
      input.addEventListener('cancel', () => {
        resolve([])
        input.remove()
      })
      input.click()
    }).catch(() => [] as string[])
  }

  private requireMutableResource(resourceId: string) {
    const found = this.resources.find(item => item.id === resourceId)
    if (!found) throw new Error('Resource 不存在')
    return found
  }
}

export function createFixtureLibraryRuntime(): LibraryRuntime {
  return new FixtureLibraryRuntime()
}
