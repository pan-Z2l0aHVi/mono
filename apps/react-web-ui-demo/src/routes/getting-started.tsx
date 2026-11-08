import { resolveReadmeLinks } from '@greypan/doc-demo-kit'
import { createFileRoute } from '@tanstack/react-router'

import { MetaComp } from '@/components/meta'
import readmeZh from '@/generated/readme/README.CN.meta'
import readmeEn from '@/generated/readme/README.meta'
import { useLocale } from '@/i18n/locale'

const base = 'https://github.com/pan-Z2l0aHVi/mono/blob/main/packages/web-ui'
const zh = resolveReadmeLinks(readmeZh, base)
const en = resolveReadmeLinks(readmeEn, base)

function GettingStarted() {
  const { locale } = useLocale()
  return (
    <section className="mdm-markdown mx-auto flex max-w-4xl flex-col gap-4 [&>*]:my-0">
      <MetaComp nodes={locale === 'zh-CN' ? zh : en} preview={false} variantLabel="包管理器" />
    </section>
  )
}

export const Route = createFileRoute('/getting-started')({
  staticData: { title: 'Getting Started' },
  component: GettingStarted
})
