common="$(git -C "$MISE_CONFIG_ROOT" rev-parse --path-format=absolute --git-common-dir 2>/dev/null)"
[ -n "$common" ] && export TURBO_CACHE_DIR="$common/turbo-cache"
