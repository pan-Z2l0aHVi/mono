import { getFileExtension } from '@greypan/js-kit'

const ext1 = getFileExtension('archive.tar.gz') // 'gz'
const ext2 = getFileExtension('README') // ''

console.log(ext1, ext2)
