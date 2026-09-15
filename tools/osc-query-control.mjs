// Control case for tools/osc-probe.py.
//
// Emits the same pair of queries a terminal background-colour detector emits (OSC 11 plus a
// DSR cursor-position probe) and then never reads the replies, which is the behaviour that
// shows up as terminal noise. Run it to confirm the probe itself can see a leak:
//
//   python3 tools/osc-probe.py -- node tools/osc-query-control.mjs
if (!process.stdout.isTTY) {
  console.log('control: stdout is not a tty, so a real detector would stay silent')
  process.exit(0)
}

process.stdout.write('\u001b]11;?\u0007\u001b[6n')
console.log('control: queries written, replies left unread for 300ms')

setTimeout(() => console.log('control: done'), 300)
