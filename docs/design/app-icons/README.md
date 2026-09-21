# App icons

Canonical sources for the product mark. `apps/react-web-ui-demo` and
`apps/vue-web-ui-demo` copy the transparent variants into their `public/`
folders and reference them as the favicon and the home-page hero image, so a
change here has to be mirrored there.

| File                         | What it is                                                    |
| ---------------------------- | ------------------------------------------------------------- |
| `interweave.png`             | App icon source, 1024px, copied to `apps/interweave/build/appicon.png` |
| `bo.png`                     | App icon source for bo, 1024px                                |
| `interweave-transparent.png` | The interweave mark alone, shadow stripped                   |
| `bo-transparent.png`         | The bo mark alone, shadow stripped                             |
| `interweave-dmg-icon.png`    | Pre-shaped source for the DMG volume icon (`build/darwin/dmg-icon.icns`) |

`*-transparent.png` are artwork: mark only, no background. `apps/react-web-ui-demo`
and `apps/vue-web-ui-demo` copy `bo-transparent.png` into their `public/` folders
and reference it as the favicon, apple-touch-icon and home-page hero image; the
interweave favicon lives in `apps/interweave/frontend/public/interweave.png`. A
change here has to be mirrored there.

The two `*.png` icon sources are the marks over a light grey gradient
(`#FAFAFC -> #EEEEF3`) with the mark at 824px wide, centred on a 1024px canvas.
The older artwork had the drop shadow baked into the pixels and the mark sitting
in a field of empty canvas; both made it unusable as an icon source, so the
icon-grade files replaced them. The old versions are in git history
(`684e9d17`).

## Two icon sources, because macOS renders them differently

The app icon and the DMG volume icon go through different rendering paths, so
one source cannot serve both:

- **App icon** (`interweave.png` -> `appicon.png` -> `icons.icns`):
  macOS 26+ masks the icon into the squircle itself and composites its own
  background under any transparent pixels. So the source must be a 1024x1024
  square, opaque to all four edges — bake nothing. A pre-shaped source gets
  double-composited: the system draws a white card behind it and the shaped
  plate reads as a small inset tile (this was tried and reverted).
- **DMG volume icon** (`interweave-dmg-icon.png` -> `dmg-icon.icns`): the volume
  icon is rendered as-is, with no system mask. It needs the shape baked in:
  1024x1024 canvas, transparent 100px margin, opaque 824x824 rounded plate
  (corner radius 185) with the mark inside.

The 100px inset on the DMG source is safe in both worlds: even where a platform
mask applies, the baked plate sits strictly inside it, so no crescent gaps
appear at the corners. Never bake a drop shadow.

## How the transparent variants were made

The original artwork shipped the drop shadow _baked into the RGBA pixels_ rather
separate layer, so it cannot be turned off. Stripping it needs a chroma-domain
separation: the artwork is chromatic, the shadow is achromatic at chroma ~30,
but the icon's own orchid/pink gradient passes through chroma 48..69 and
overlaps the dense shadow band — so a plain colour key either leaves a grey rim
or bites holes in the ribbons.

What worked instead:

1. Take the stroke body as _opaque and chromatic_; drop connected components
   below ~100px and reopen 1-2px quantisation pinholes.
2. The chroma the artwork _would_ have at a pixel is a 3px grey-dilation of the
   smoothed chroma field. Where the observed chroma falls well below that
   ceiling **and** is absolutely pale **and** sits in a valley (below both
   sides along one of four axes), the pixel is a stroke+shadow blend.
3. Recover its true alpha from the chroma it retained,
   `a = (chroma - 30) / (ceiling - 30)`, so the edge fades out _through alpha_
   rather than through a pale colour. Geometry is never cut.
4. Place the anti-aliased edge on that coverage field, not on the mask
   boundary — a mask-derived ramp inherits the mask's sawtooth and reads as
   dark notches chewing into the silhouette on a black ground.

Every failure mode of this method is invisible at normal zoom and catastrophic
close up: a slit punched inside a solid ribbon, glow painted back across a
seam, the mark quietly shrunk by a pixel. So the run was gated on invariants
(no alpha bridging a seam, saturated source ink fully inside the silhouette, no
pits deeper than 3px, no pale/bright residue near a gap, no colour drift
against the previous deliverable) and reviewed on 7x crops and contact sheets
at 512/256/128/64px over black, white and dark navy.

## Recovering the tool

The tooling was two Python scripts — one for the algorithm, one for the
invariant gate and the review sheets. Python, because the method leans entirely
on SciPy's image-processing module: exact Euclidean distance transforms,
connected-component labelling and grayscale morphology. Nothing in the JS or Go
ecosystems ships an equivalent, which is why it was never ported.

It is not in the tree any more: it was one-shot tooling, nothing in CI ran it,
and its deliverable is checked in here. To bring it back:

    git show d9077d05 -- docs/design/app-icons/tools/

Dependencies were NumPy, Pillow and SciPy, pinned in that commit's
`requirements.txt`. The tuning parameters are per-canvas: the pixel-scale ones
(`ceil_radius`, `thin_width`, `floor_depth`, `seal_radius`, `reach`) are tuned
for 1024px and must be scaled if the source size ever changes.
