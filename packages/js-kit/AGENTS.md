# js-kit Package Instructions

- Prefer small, composable functions and the plugin system over inheritance.
- Plugin options must have runtime defaults. Use `DEFAULT_OPTIONS` plus `Required<Options>` for the internal configuration when every option is required after normalization.
- Preserve generic inference at public boundaries. Add focused tests for public behavior and documented fallback paths.
