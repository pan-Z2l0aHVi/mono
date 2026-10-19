#!/bin/sh
set -eu

fail() {
  printf 'turbo-cache-dir: %s\n' "$1" >&2
  exit 1
}

case $# in
  0)
    script_dir=$(CDPATH= cd -P "$(dirname "$0")" 2>/dev/null && pwd -P) || fail "cannot resolve script directory"
    root_candidate="$script_dir/.."
    ;;
  2)
    [ "$1" = "--root" ] || fail "usage: sh scripts/lib/turbo-cache-dir.sh [--root <repository-root>]"
    [ -n "$2" ] || fail "--root requires a repository directory"
    root_candidate=$2
    ;;
  *)
    fail "usage: sh scripts/lib/turbo-cache-dir.sh [--root <repository-root>]"
    ;;
esac

case $root_candidate in
  /*) ;;
  *) root_candidate="$PWD/$root_candidate" ;;
esac
repo_root=$(CDPATH= cd -P "$root_candidate" 2>/dev/null && pwd -P) || fail "repository root is missing or inaccessible: $root_candidate"

if ! common_dir_output=$(git -C "$repo_root" rev-parse --path-format=absolute --git-common-dir); then
  fail "cannot resolve the Git common directory for $repo_root; see git diagnostics above"
fi
common_dir=$(CDPATH= cd -P "$common_dir_output" 2>/dev/null && pwd -P) || fail "Git common directory is missing or inaccessible: $common_dir_output"

if [ "${TMPDIR+x}" = x ] && [ -n "$TMPDIR" ]; then
  temp_candidate=$TMPDIR
  temp_name=TMPDIR
elif [ "${TMP+x}" = x ] && [ -n "$TMP" ]; then
  temp_candidate=$TMP
  temp_name=TMP
elif [ "${TEMP+x}" = x ] && [ -n "$TEMP" ]; then
  temp_candidate=$TEMP
  temp_name=TEMP
else
  temp_candidate=/tmp
  temp_name=/tmp
fi

case $temp_candidate in
  /*) ;;
  *) fail "$temp_name must be an absolute existing directory: $temp_candidate" ;;
esac
canonical_temp=$(CDPATH= cd -P "$temp_candidate" 2>/dev/null && pwd -P) || fail "$temp_name is not an existing directory: $temp_candidate"

if ! repo_id=$(printf '%s' "$common_dir" | git -C "$repo_root" hash-object --stdin); then
  fail "cannot derive a stable repository id from the Git common directory; see git diagnostics above"
fi
case $repo_id in
  ''|*[!0-9a-f]*) fail "Git returned an invalid repository id: $repo_id" ;;
esac

case $canonical_temp in
  /) printf '/greypan/turbo-cache/%s\n' "$repo_id" ;;
  *) printf '%s/greypan/turbo-cache/%s\n' "${canonical_temp%/}" "$repo_id" ;;
esac
