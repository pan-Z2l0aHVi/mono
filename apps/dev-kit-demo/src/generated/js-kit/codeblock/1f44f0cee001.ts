import { getFileExtension } from '@greypan/js-kit'

const ext1: string = getFileExtension('archive.tar.gz') // 'gz'
const ext2: string = getFileExtension('README') // ''

console.log(ext1, ext2)
