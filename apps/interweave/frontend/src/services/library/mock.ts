import type {
  ResourceDTO,
  ResourceLocationMatchDTO,
  SourceDTO,
  SourceMetadataDTO,
  TagDTO
} from '../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/service/models'
import {
  ResourceKind,
  SourceType
} from '../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage/models'

import type { LibraryRuntime } from './types'

/*
 * 浏览器预览专用的假数据 runtime。
 *
 * 桌面服务缺席时列表、详情、筛选与批量操作全都没有内容，样式无从调试。这里在
 * 「没有 Wails runtime 且处于 dev 构建」时接管，让 http://localhost:9245 能渲染出
 * 图片、视频、Markdown 文档、网页链接齐备且可用性混合的列表。
 *
 * 边界：桌面运行时优先（hasWailsRuntime 为真时根本不走这里），生产构建也不打包
 * 这些 fixture，假数据不会被当成真实数据带进发布产物。
 */

const HOUR = 3600_000
const DAY = 24 * HOUR
// 固定基准时刻：fixture 之间的先后关系要稳定，否则「最近修改/较早修改」排序无法复现。
const BASE = Date.UTC(2026, 8, 24, 9, 0, 0)

function svgPlaceholder(label: string, from: string, to: string): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>` +
    `</linearGradient></defs>` +
    `<rect width="320" height="200" fill="url(#g)"/>` +
    `<text x="160" y="112" font-family="system-ui,sans-serif" font-size="44" font-weight="600" ` +
    `fill="rgba(255,255,255,.92)" text-anchor="middle">${label}</text>` +
    `</svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

interface MockSourceSpec {
  id: string
  type: SourceType
  location: string
  available: boolean
  isPreferred?: boolean
  metadata?: SourceMetadataDTO
}

interface MockResourceSpec {
  id: string
  title: string
  note: string
  kind: ResourceKind
  sizeBytes: number | null
  createdAgo: number
  updatedAgo: number
  tagNames: string[]
  sources: MockSourceSpec[]
  media?: { label: string; from: string; to: string }
}

const SPECS: MockResourceSpec[] = [
  {
    id: 'mock-image-1',
    title: '晨雾中的山谷',
    note: '清晨第一缕光穿过云层，山谷轮廓逐渐清晰。',
    kind: ResourceKind.ResourceKindImage,
    sizeBytes: 2_411_724,
    createdAgo: 12 * DAY,
    updatedAgo: 2 * DAY,
    tagNames: ['风景', '摄影', '待精修'],
    media: { label: 'IMG', from: '#4f7cff', to: '#9b5cff' },
    sources: [
      {
        id: 'mock-image-1-file',
        type: SourceType.SourceTypeFile,
        location: '/Users/demo/Pictures/valley-mist.jpg',
        available: true,
        isPreferred: true
      }
    ]
  },
  {
    id: 'mock-video-1',
    title: '产品评审会议录屏',
    note: '第 3 段起是导航改版的讨论。',
    kind: ResourceKind.ResourceKindVideo,
    sizeBytes: 184_320_000,
    createdAgo: 6 * DAY,
    updatedAgo: 6 * HOUR,
    tagNames: ['会议', '录屏'],
    sources: [
      {
        id: 'mock-video-1-file',
        type: SourceType.SourceTypeFile,
        location: '/Users/demo/Movies/review-2026-09-18.mp4',
        available: true,
        isPreferred: true
      }
    ]
  },
  {
    id: 'mock-doc-1',
    title: 'Interweave 设计规范',
    note: '包含颜色、间距、字号与动效时长。',
    kind: ResourceKind.ResourceKindDocument,
    sizeBytes: 48_112,
    createdAgo: 30 * DAY,
    updatedAgo: 30 * HOUR,
    tagNames: ['规范', '设计', '长期'],
    sources: [
      {
        id: 'mock-doc-1-file',
        type: SourceType.SourceTypeFile,
        location: '/Users/demo/Docs/interweave-design.md',
        available: true,
        isPreferred: true
      }
    ]
  },
  {
    id: 'mock-web-1',
    title: 'Lit 官方文档：Reactive properties',
    note: '自定义元素响应式属性的权威说明。',
    kind: ResourceKind.ResourceKindWeb,
    sizeBytes: null,
    createdAgo: 20 * DAY,
    updatedAgo: 5 * DAY,
    tagNames: ['前端', '参考', 'Lit'],
    sources: [
      {
        id: 'mock-web-1-url',
        type: SourceType.SourceTypeURL,
        location: 'https://lit.dev/docs/components/decorators/#reactive-properties',
        available: true,
        isPreferred: true,
        metadata: {
          title: 'Reactive properties | Lit',
          site_name: 'lit.dev',
          description: 'Declarative reactive properties for custom elements.',
          favicon_url: 'https://lit.dev/favicon.ico'
        }
      }
    ]
  },
  {
    id: 'mock-audio-1',
    title: '播客单集：前端工程化的边界',
    note: '第 12 分钟起聊 monorepo 的包图。',
    kind: ResourceKind.ResourceKindAudio,
    sizeBytes: 41_205_760,
    createdAgo: 9 * DAY,
    updatedAgo: 9 * DAY,
    tagNames: ['播客', '工程化'],
    sources: [
      {
        id: 'mock-audio-1-file',
        type: SourceType.SourceTypeFile,
        location: '/Users/demo/Podcasts/fe-boundaries.mp3',
        available: true,
        isPreferred: true
      }
    ]
  },
  {
    id: 'mock-image-2-missing',
    title: '外接硬盘已拔出的照片集',
    note: '归档盘离线后只剩这一条入口。',
    kind: ResourceKind.ResourceKindImage,
    sizeBytes: 5_812_224,
    createdAgo: 90 * DAY,
    updatedAgo: 45 * DAY,
    tagNames: ['归档', '待恢复'],
    media: { label: 'IMG', from: '#8a8a94', to: '#5b5b66' },
    sources: [
      {
        id: 'mock-image-2-file',
        type: SourceType.SourceTypeFile,
        location: '/Volumes/Archive/2024/photos',
        available: false,
        isPreferred: true
      }
    ]
  },
  {
    id: 'mock-web-2-dead',
    title: '已经改版的博客文章',
    note: '原文迁移后旧链接 404。',
    kind: ResourceKind.ResourceKindWeb,
    sizeBytes: null,
    createdAgo: 120 * DAY,
    updatedAgo: 60 * DAY,
    tagNames: ['博客', '待恢复'],
    sources: [
      {
        id: 'mock-web-2-url',
        type: SourceType.SourceTypeURL,
        location: 'https://example.com/legacy-post-about-build-tools',
        available: false,
        isPreferred: true,
        metadata: {
          title: 'A post about build tools',
          site_name: 'example.com',
          description: 'The original location of this article.',
          favicon_url: ''
        }
      }
    ]
  },
  {
    id: 'mock-doc-2-missing',
    title: '一份很长很长的资源名称用来检查列表里的截断行为是否正确',
    note: '名称超长时标题应该省略而不是换行撑高行高。',
    kind: ResourceKind.ResourceKindDocument,
    sizeBytes: 12_884,
    createdAgo: 200 * DAY,
    updatedAgo: 150 * DAY,
    tagNames: ['归档', '排版检查', '待恢复', '长名称'],
    sources: [
      {
        id: 'mock-doc-2-file',
        type: SourceType.SourceTypeFile,
        location: '/Users/demo/Docs/moved-away.md',
        available: false,
        isPreferred: true
      }
    ]
  }
]

let tagCounter = 0

function toTagDTO(name: string, resourceId: string): TagDTO {
  tagCounter += 1
  return { id: `mock-tag-${resourceId}-${name}`, name, created_at: BASE - 365 * DAY }
}

function toSourceDTO(spec: MockSourceSpec, resource: MockResourceSpec, createdAt: number): SourceDTO {
  return {
    id: spec.id,
    resource_id: resource.id,
    type: spec.type,
    location: spec.location,
    available: spec.available,
    is_preferred: spec.isPreferred ?? false,
    order_index: 0,
    metadata: spec.metadata ?? null,
    created_at: createdAt,
    updated_at: createdAt
  }
}

function toResourceDTO(resource: MockResourceSpec): ResourceDTO {
  const createdAt = BASE - resource.createdAgo
  const sources = resource.sources.map(source => toSourceDTO(source, resource, createdAt))
  const preferred = sources.find(source => source.is_preferred) ?? sources[0]

  return {
    id: resource.id,
    title: resource.title,
    kind: resource.kind,
    size_bytes: resource.sizeBytes,
    note: resource.note,
    created_at: createdAt,
    updated_at: BASE - resource.updatedAgo,
    sources,
    tags: resource.tagNames.map(name => toTagDTO(name, resource.id)),
    preferred_source_id: preferred.id
  }
}

function unsupported(operation: string): never {
  throw new Error(`浏览器预览的假数据不支持「${operation}」`)
}

export function createMockLibraryRuntime(): LibraryRuntime {
  let resources = SPECS.map(toResourceDTO)
  const mediaBySourceId = new Map<string, string>()
  for (const resource of SPECS) {
    if (!resource.media) continue
    for (const source of resource.sources) {
      const { label, from, to } = resource.media
      mediaBySourceId.set(source.id, svgPlaceholder(label, from, to))
    }
  }

  /*
   * fixture 是这里自己造出来的普通对象，不是 DTO class 实例，所以直接原地改字段：
   * 既避开对 class 实例展开（会丢原型）的误用，也让「改完返回同一份」这件事直白。
   */
  function require(resourceId: string): ResourceDTO {
    const found = resources.find(resource => resource.id === resourceId)
    if (!found) throw new Error(`假数据里没有资源 ${resourceId}`)
    return found
  }

  return {
    isAvailable: true,

    listResources: () => Promise.resolve(resources),

    getResource: resourceId => {
      try {
        return Promise.resolve(require(resourceId))
      } catch (error) {
        return Promise.reject(error)
      }
    },

    updateResourceTitle: (resourceId, newTitle) => {
      try {
        const found = require(resourceId)
        found.title = newTitle
        found.updated_at = Date.now()
        return Promise.resolve(found)
      } catch (error) {
        return Promise.reject(error)
      }
    },

    deleteResource: resourceId => {
      resources = resources.filter(resource => resource.id !== resourceId)
      return Promise.resolve()
    },

    addTag: (resourceId, tagName) => {
      try {
        const found = require(resourceId)
        if (found.tags.some(tag => tag.name === tagName)) {
          return Promise.reject(new Error(`标签「${tagName}」已经存在`))
        }
        const tag = toTagDTO(tagName, resourceId)
        found.tags.push(tag)
        found.updated_at = Date.now()
        return Promise.resolve(tag)
      } catch (error) {
        return Promise.reject(error)
      }
    },

    removeTag: (resourceId, tagId) => {
      try {
        const found = require(resourceId)
        found.tags = found.tags.filter(tag => tag.id !== tagId)
        found.updated_at = Date.now()
        return Promise.resolve()
      } catch (error) {
        return Promise.reject(error)
      }
    },

    resourceMediaURL: sourceId => mediaBySourceId.get(sourceId) ?? null,
    pendingFilePreviewURL: () => null,

    // 浏览器里唯一能真实生效的动作就是开新标签；file 入口没有对应的系统打开方式。
    openExternal: target => {
      if (/^https?:\/\//.test(target)) window.open(target, '_blank', 'noopener,noreferrer')
      return Promise.resolve()
    },

    // 下面这些都依赖桌面服务或真实文件系统，浏览器预览里给出明确失败而不是假装成功。
    addFileResource: () => unsupported('添加本地文件'),
    addURLResource: () => unsupported('添加网页链接'),
    refreshURLSource: () => unsupported('刷新网页入口'),
    refreshFileSource: () => unsupported('刷新文件入口'),
    replaceFileSource: () => unsupported('替换文件入口'),
    replaceURLSource: () => unsupported('替换网页入口'),
    prepareFilePreview: () => unsupported('预览文件'),
    releaseFilePreview: () => Promise.resolve(),
    probeURLSourceOnOpen: () => unsupported('探测网页入口'),
    findResourceLocationMatches: (): Promise<ResourceLocationMatchDTO[]> => Promise.resolve([]),
    chooseFilePaths: () => Promise.resolve([]),
    chooseFilePath: () => Promise.resolve(null),
    getClipboardFilePaths: () => Promise.resolve([]),

    subscribeToDroppedFiles: () => () => {},
    subscribeToPasteFileRequest: () => () => {},
    subscribeToSourceAvailability: () => () => {}
  }
}
