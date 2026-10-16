export { DocError, fail } from './errors'
export { parseMarkdown, type ApiRow, type ParsedDoc, type SampleBlock } from './markdown'
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
