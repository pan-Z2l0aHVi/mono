export { DocError, fail } from './errors'
export { readComponentSource, resolveComponentFile, type ComponentContract } from './component-source'
export { parseMarkdown, type ApiTable, type ParsedDoc, type SampleBlock } from './markdown'
export { joinApi, type ApiKind, type ApiRow } from './join'
export { highlight, type SampleFlavor } from './highlight'
export { assertSelfContained, demoFileName, isLiveSample } from './live'
export {
  renderCss,
  renderModule,
  type ExampleApiSection,
  type ExampleDocPayload,
  type ExampleSamplePayload
} from './render'
export { demoFileContent, generate, type GeneratedFile, type GenerateOptions, type OutputTarget } from './generate'
