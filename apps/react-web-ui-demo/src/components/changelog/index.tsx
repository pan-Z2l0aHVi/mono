import changelogMeta from '@/generated/CHANGELOG.meta'

import { MetaComp } from '../meta'

export function Changelog() {
  return (
    <section className="mdm-markdown mx-auto flex max-w-4xl flex-col gap-4 [&>*]:my-0">
      <MetaComp nodes={changelogMeta} preview={false} />
    </section>
  )
}
