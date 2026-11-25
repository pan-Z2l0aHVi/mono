import { andThen, err, ok, to } from '@greypan/js-kit/rust'

const parsed = to(() => JSON.parse('{"port": 8080}') as { port?: number })
const port = andThen(parsed, data => (typeof data.port === 'number' ? ok(data.port) : err(new Error('Missing port'))))

if (port.ok) {
  console.log('Listening on', port.value)
} else {
  console.error(port.error.message)
}
