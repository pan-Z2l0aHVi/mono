// Stand-in for any CLI that asks the terminal for its background colour: lipgloss/termenv,
// prompt libraries, colour-depth probes. Same byte sequence, same read attempt, no Go needed.
//
// Run as a Turborepo task in stream mode and the reply never reaches this process, so the
// terminal shows the answer as garbage. Run it straight in a terminal and the reply arrives.
import { setTimeout as sleep } from 'node:timers/promises'

const QUERY = '\u001b]11;?\u001b\\\u001b[6n'

if (!process.stdout.isTTY) {
  console.log('stdout is not a tty, so a background-colour detector would stay silent')
  process.exit(0)
}

const wasRaw = process.stdin.isRaw ?? false
process.stdin.setRawMode?.(true)
process.stdin.resume()

let reply = ''
const onData = chunk => {
  reply += chunk.toString('utf8')
}
process.stdin.on('data', onData)

process.stdout.write(QUERY)
await sleep(250)

process.stdin.off('data', onData)
process.stdin.pause()
process.stdin.setRawMode?.(wasRaw)

console.log(reply ? `reply reached this task (${reply.length} bytes, consumed)` : 'no reply reached this task')
