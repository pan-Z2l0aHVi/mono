# ADR-0009: Release Planes

Changesets generates the shared Version PR, but registry publication and desktop delivery are independent release planes. After that PR merges, npm packages publish through Trusted Publishing and Wails installers publish through a GitHub Release in parallel; each plane has its own workflow, permissions, toolchain, and retry path. The Version PR merge is the only formal release authorization, while manual runs can only validate artifacts.
