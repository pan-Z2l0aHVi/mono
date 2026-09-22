---
'@greypan/web-ui': patch
---

Segmented controls now keep the resting indicator as a pure solid gray pill: the backdrop blur, glass ring, and inset highlight that `.wui-glass` provides are switched off until a press or drag starts. While a press or drag is active, the indicator becomes fully transparent glass instead of a translucent gray tint, so only the blur, ring, and highlight show through. The track keeps the shared `.wui-glass` background, and option text stays above the indicator in every state.
