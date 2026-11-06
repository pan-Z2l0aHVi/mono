// `context-invariants.ts` 的纯函数是语料判定的内部件，只经文件路径被 `context-corpus.ts` 与它的
// spec 使用，不进这个入口：入口列出的就是这个包对外承诺的面。
export { defineCommandConventions, type CommandConventionsOptions } from './command-conventions'
export { defineContextCorpus, type ContextCorpusOptions, type SkillsSurface } from './context-corpus'
export { defineNoMutualLinks, type NoMutualLinksOptions } from './no-mutual-links'
export { definePackageContract } from './package-contract'
export { defineReadmeLocales, type ReadmeLocalesOptions } from './readme-locales'
export {
  defineWorkspace,
  listPnpmWorkspaceManifests,
  readPnpmWorkspaceDirectories,
  readPnpmWorkspacePatterns,
  type WorkspaceApi
} from './workspace'
