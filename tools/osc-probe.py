#!/usr/bin/env python3
"""Run a command in a PTY, answer its terminal queries, and report what leaked.

A terminal emulator replies to OSC 11 ("what is your background colour?") and DSR
cursor-position queries by writing back into the same stream the command is talking to.
This script plays that role, so a reproduction does not need a human looking at a real
terminal: if the command's response bytes show up again later in the output stream, the
response was not consumed and would surface as terminal noise.

Usage:
  python3 tools/osc-probe.py -- pnpm run build
  python3 tools/osc-probe.py --no-respond -- pnpm exec vp build
  python3 tools/osc-probe.py -- node tools/osc-query-control.mjs

The command is exec'd directly, not through a shell, so quoting survives. For pipes or
redirection wrap it yourself: -- bash -c 'some-tool; read -t 3 x; echo "leftover=[$x]"'.

--no-echo turns off tty echo, which is how you tell "the tool consumed the reply" apart from
"the reply is still sitting in the input queue": with echo off nothing is printed, so pipe the
tool into a reader (see the bash example) and see whether the reader picks the reply up.

--delay <ms> waits before answering, which is how you check whether a tool stops listening and
then leaves a late reply behind (a nested PTY usually adds exactly this kind of latency).

--analyze <file> scores a byte transcript instead of running anything. Point it at a recording
of a real terminal session, made with `script -q capture.raw <command>`, to find out after the
fact which run wrote a query and whether the answer resurfaced as visible noise.

Exit code is 1 when leaked response bytes were observed, 0 otherwise, so it can be used
in a shell pipeline.
"""
import fcntl
import os
import pty
import re
import select
import signal
import struct
import sys
import termios
import time

OSC11_QUERY = re.compile(rb"\x1b\]11;\?[^\x07\x1b]*(?:\x07|\x1b\\)")
DSR_QUERY = re.compile(rb"\x1b\[6n")
OSC11_REPLY = re.compile(rb"11;rgb:[0-9a-fA-F]{1,4}/[0-9a-fA-F]{1,4}/[0-9a-fA-F]{1,4}")
DSR_REPLY = re.compile(rb"\x1b\[\d+;\d+R")

OSC11_RESPONSE = b"\x1b]11;rgb:ffff/ffff/ffff\x07"
DSR_RESPONSE = b"\x1b[1;37R"

ROWS, COLS = 40, 120


def spawn(argv):
    pid, master = pty.fork()
    if pid == 0:
        env = dict(os.environ)
        # Without a real terminal type, and with NO_COLOR set, detecting libraries skip the
        # query entirely, which would make the probe report a false negative.
        env["TERM"] = "xterm-256color"
        env["COLORTERM"] = "truecolor"
        for ignored in ("NO_COLOR", "CI"):
            env.pop(ignored, None)
        os.execvpe(argv[0], argv, env)
        os._exit(127)
    # Turbo's TUI only allocates a PTY per task when it believes it drives a sized terminal.
    fcntl.ioctl(master, termios.TIOCSWINSZ, struct.pack("HHHH", ROWS, COLS, 0, 0))
    return pid, master


def main():
    argv = sys.argv[1:]
    if "--analyze" in argv:
        return analyze(argv[argv.index("--analyze") + 1])
    respond = "--no-respond" not in argv
    no_echo = "--no-echo" in argv
    delay_ms = 0
    if "--delay" in argv:
        delay_ms = int(argv[argv.index("--delay") + 1])
        del argv[argv.index("--delay") + 1]
        argv.remove("--delay")
    argv = [a for a in argv if a not in ("--no-respond", "--no-echo", "--")]
    if not argv:
        print(__doc__)
        return 2

    timeout = int(os.environ.get("OSC_PROBE_TIMEOUT", "300"))
    pid, master = spawn(argv)
    if no_echo:
        attrs = termios.tcgetattr(master)
        attrs[3] = attrs[3] & ~termios.ECHO
        termios.tcsetattr(master, termios.TCSANOW, attrs)
    transcript = bytearray()
    tail = bytearray()
    injected = 0
    started = time.time()
    finished = False

    while time.time() - started < timeout:
        try:
            readable, _, _ = select.select([master], [], [], 0.5)
        except OSError:
            break
        if readable:
            try:
                chunk = os.read(master, 65536)
            except OSError:
                finished = True
                break
            if not chunk:
                finished = True
                break
            transcript.extend(chunk)
            tail.extend(chunk)
            # Answer any query as soon as it shows up. Counts come from the finished
            # transcript, so bytes that arrive alongside process exit are not lost.
            if respond:
                for pattern, payload in ((OSC11_QUERY, OSC11_RESPONSE), (DSR_QUERY, DSR_RESPONSE)):
                    match = pattern.search(bytes(tail))
                    while match:
                        if delay_ms:
                            time.sleep(delay_ms / 1000.0)
                        os.write(master, payload)
                        injected += 1
                        del tail[: match.end()]
                        match = pattern.search(bytes(tail))
            del tail[:-4096]
        done, _ = os.waitpid(pid, os.WNOHANG)
        if done == pid:
            pid = None
            finished = True
            break

    if not finished and pid is not None:
        os.kill(pid, signal.SIGKILL)
        print("probe: command timed out after %ss" % timeout, file=sys.stderr)
    # Give the pty a moment to flush whatever the process left behind.
    deadline = time.time() + 0.5
    while time.time() < deadline:
        readable, _, _ = select.select([master], [], [], 0.1)
        if not readable:
            continue
        try:
            transcript.extend(os.read(master, 65536))
        except OSError:
            break
    os.close(master)

    stream = bytes(transcript)
    dump_path = os.environ.get("OSC_PROBE_DUMP")
    if dump_path:
        with open(dump_path, "wb") as handle:
            handle.write(stream)
        print("raw transcript: %s" % dump_path)
    return score(
        stream,
        label=" ".join(argv),
        elapsed=time.time() - started,
        injected=injected,
        responded=respond,
    )


def score(stream, label, elapsed=None, injected=None, responded=None):
    """Report the queries and replies in a byte stream; nonzero when a reply leaked back."""
    queries = len(OSC11_QUERY.findall(stream))
    dsr_queries = len(DSR_QUERY.findall(stream))
    leaked_osc11 = OSC11_REPLY.findall(stream)
    leaked_dsr = DSR_REPLY.findall(stream)
    leaked = len(leaked_osc11) + len(leaked_dsr)

    print("subject        : %s" % label)
    if elapsed is not None:
        print("elapsed        : %.1fs" % elapsed)
    if responded is not None:
        print("answered       : %s" % ("yes" if responded else "no"))
    print("osc11 queries  : %d" % queries)
    print("dsr queries    : %d" % dsr_queries)
    if injected is not None:
        print("responses sent : %d" % injected)
    print("LEAKED BACK    : %d  (%d colour, %d cursor-position)" % (leaked, len(leaked_osc11), len(leaked_dsr)))
    if leaked:
        first = (leaked_osc11 or leaked_dsr)[0]
        offset = stream.find(first)
        line_start = stream.rfind(b"\n", 0, offset) + 1
        line_end = stream.find(b"\n", offset)
        print("first leak     : %r" % bytes(stream[line_start : (line_end if line_end > 0 else offset + 60)])[:200])
        for match in list(OSC11_QUERY.finditer(stream))[:3]:
            query_start = stream.rfind(b"\n", 0, match.start()) + 1
            print("near query     : %r" % bytes(stream[query_start : match.end()])[:200])
        print("verdict        : the response was NOT consumed; it reappears in the output stream")
    elif queries:
        if responded is None and not OSC11_REPLY.search(stream) and not DSR_REPLY.search(stream):
            print("verdict        : queries emitted, but the capture holds no reply bytes; nothing")
            print("                 answered them (or the recorder sat on the wrong side of the tty)")
        else:
            print("verdict        : queries emitted, every response consumed")
    else:
        print("verdict        : no terminal query emitted in this stream")
    return 1 if leaked else 0


def analyze(path):
    with open(path, "rb") as handle:
        stream = handle.read()
    return score(stream, label=path)


if __name__ == "__main__":
    sys.exit(main())
