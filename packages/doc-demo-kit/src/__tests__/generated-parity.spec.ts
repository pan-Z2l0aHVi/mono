import path from 'node:path'

import { runGeneratedParityContractTests } from '../testing'

// 跨 app 的生成物与页面结构对齐判据由 demo 共享层持有；路径在这里注入，判据本身不读全局。
const root = path.resolve(import.meta.dirname, '../../../..')

runGeneratedParityContractTests({
  reactGeneratedDir: path.join(root, 'apps', 'react-web-ui-demo', 'src', 'generated'),
  vueGeneratedDir: path.join(root, 'apps', 'vue-web-ui-demo', 'src', 'generated'),
  reactRoutesDir: path.join(root, 'apps', 'react-web-ui-demo', 'src', 'routes', 'components'),
  vuePagesDir: path.join(root, 'apps', 'vue-web-ui-demo', 'src', 'pages', 'components')
})
