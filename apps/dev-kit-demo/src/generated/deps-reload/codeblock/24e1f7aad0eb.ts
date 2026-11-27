export interface Dep {
  /** npm package name, used to resolve packages without a local path */
  name: string
  /** Local package root directory, for monorepos or npm links */
  path?: string
  /** Build output directory relative to the package root */
  outputDir?: string
  /** File extensions in the build output that should trigger a reload */
  extensions?: string[]
}
