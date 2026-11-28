import path from 'node:path'

import { definePlugin, rust } from '@greypan/js-kit'

import { type Chain, type KitCtx, type Run, defineRunner } from '../runner/runner'
import { readJsonFile } from '../shared/config'
import { byCodeUnit } from '../shared/order'
import { defineWorkspace, type WorkspaceApi } from '../workspace/workspace'

const { andThen, err, ok } = rust

interface PackageManifest {
  readonly name?: string
  readonly private?: boolean
}

export interface ChangesetIgnoreCoverageOptions {
  /** 显式允许参与 Changesets 版本管理的私有包（如桌面端宿主应用） */
  readonly allowedPrivateVersioned?: readonly string[]
  /** changeset 目录，默认 `.changeset` */
  readonly directory?: string
  /** changeset 配置文件名，默认 `config.json` */
  readonly configFile?: string
}

/**
 * 校验 `.changeset/config.json` 的 `ignore` 覆盖不变量：
 * - 所有公开包（`private !== true`）均不得出现在 `ignore` 中；
 * - 所有私有包（`private === true`）均须出现在 `ignore` 中，除非位于 `allowedPrivateVersioned`；
 * - `allowedPrivateVersioned` 只能引用存在的私有包且不得出现在 `ignore` 中；
 * - `ignore` 中不得残留不存在于 workspace 的过时包名。
 */
export const defineChangesetIgnoreCoverage = ({
  allowedPrivateVersioned = [],
  directory = '.changeset',
  configFile = 'config.json'
}: ChangesetIgnoreCoverageOptions = {}): Chain =>
  defineRunner()
    .use(defineWorkspace())
    .use(
      definePlugin<{ run: Run }, KitCtx & { run: Run } & WorkspaceApi>(ctx => ({
        run: () =>
          andThen(ctx.run(), () => {
            const configPath = path.join(ctx.root, directory, configFile)
            const config = readJsonFile<{ ignore?: unknown }>(configPath)
            if (!Array.isArray(config.ignore) || config.ignore.some(item => typeof item !== 'string'))
              return err(`changeset: ${directory}/${configFile} must contain an ignore array of package names`)

            const ignoredSet = new Set(config.ignore as string[])
            const allowedSet = new Set(allowedPrivateVersioned)
            const packages = ctx
              .manifests()
              .map(file => ctx.readManifest<PackageManifest>(file))
              .filter((manifest): manifest is { readonly name: string; readonly private?: boolean } =>
                Boolean(manifest.name)
              )
            const byName = new Map(packages.map(pkg => [pkg.name, pkg]))
            const violations: string[] = []

            for (const pkg of packages) {
              const isPrivate = pkg.private === true
              const isIgnored = ignoredSet.has(pkg.name)
              if (!isPrivate && isIgnored) {
                violations.push(`public package ${pkg.name} must not be listed in ${directory}/${configFile} ignore`)
              } else if (isPrivate && !allowedSet.has(pkg.name) && !isIgnored) {
                violations.push(
                  `private package ${pkg.name} must be listed in ${directory}/${configFile} ignore (or allowedPrivateVersioned)`
                )
              } else if (isPrivate && allowedSet.has(pkg.name) && isIgnored) {
                violations.push(
                  `allowed private deliverable ${pkg.name} must not be listed in ${directory}/${configFile} ignore`
                )
              }
            }

            for (const name of [...allowedSet].sort(byCodeUnit)) {
              const pkg = byName.get(name)
              if (!pkg) {
                violations.push(`allowedPrivateVersioned entry ${name} does not exist in workspace`)
              } else if (pkg.private !== true) {
                violations.push(`allowedPrivateVersioned entry ${name} is public and does not need allowlisting`)
              }
            }

            for (const name of [...ignoredSet].sort(byCodeUnit)) {
              if (!byName.has(name)) {
                violations.push(
                  `stale ignore entry ${name} in ${directory}/${configFile} does not match any workspace package`
                )
              }
            }

            return violations.length > 0 ? err(`changeset: ${violations.join('\nchangeset: ')}`) : ok(undefined)
          })
      }))
    )
