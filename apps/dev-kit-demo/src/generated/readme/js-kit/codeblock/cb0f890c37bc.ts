import { andThen, err, ok, to } from '@greypan/js-kit/rust'

const fetched = await to(Promise.resolve('{"port": 8080}'))
const port = await andThen(fetched, raw => {
  const data = JSON.parse(raw) as { port?: number }
  return typeof data.port === 'number' ? ok(data.port) : err(new Error('Missing port'))
})

if (port.ok) {
  console.log('Listening on', port.value) // Listening on 8080
} else {
  console.error(port.error)
}
