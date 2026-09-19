#!/usr/bin/env python3
"""Strip a baked white/gray drop shadow out of a transparent app-icon PNG.

What the source actually contains
---------------------------------
The artwork is only the saturated stroke body.  Every white/gray pixel is a
baked drop shadow: the soft halo is semi-transparent, and the band hugging
each stroke is an opaque shadow that palette quantisation flattened to ~30
chroma.  So the shadow cannot be lifted by a colour key alone -- the icon's
own gradient passes through orchid/pink at chroma 48..69, which overlaps the
dense shadow band.  Cutting on colour alone either leaves a grey outline or
bites holes in the pink ribbons.

Strategy
--------
1. shape      opaque AND chroma > sat_t -> the stroke body, silhouette kept
              intact; components below MIN_COMPONENT_FRAC of the canvas (shadow
              speckles) are dropped and 1-2px quantisation pinholes are reopened.
2. band       the chroma *ceiling* the artwork would have here is a 3px
              grey-dilation of the (1px-smoothed) chroma field.  Where the
              observed chroma falls well below that ceiling AND is absolutely
              pale, the pixel is a stroke+shadow blend.  Relative, not absolute,
              is what lets a shadow band on a saturated blue stroke be caught as
              readily as one on a pale pink stroke.  Width separates the rest:
              a seam band is thin but deep inside the shape, the icon's own
              orchid gradient is pale but forms fat blobs.
3. colour     contaminated pixels are repainted from the nearest clean stroke
              pixel, so no washed-out colour survives anywhere.
4. coverage   a blend pixel has lost chroma in proportion to how much shadow
              shows through it, so its true alpha is recovered as
                  a = (chroma - chroma_shadow) / (chroma_ceiling - chroma_shadow)
              pushed through a bias.  The edge therefore fades out through
              alpha, not through a pale colour -- which kills the grey rim
              without shrinking the mark.  Interior bands get a harder bias.
              Bands are faded, never deleted: cutting them out of the shape
              notches the silhouette and punches sealed holes in the ribbons.
5. AA         alpha is a window on the *coverage field* itself, not on the mask.
              A mask-derived ramp inherits the mask's sawtooth boundary, and any
              clamp written as a function of an *integer* distance bites on some
              pixels of a ring but not on their neighbours -- that reads as dark
              notches chewing into the silhouette on a black ground.  Coverage is
              already a sub-pixel estimate of how much of the pixel the stroke
              covers and it decays smoothly across the glow, so a 0.30..0.85
              window on it gives an edge that is anti-aliased *and* smooth, with
              a ~1.7px transition.  The geometric ceiling survives, but only
              inside enclosed background -- the one place a smooth field can leak
              across a 2px seam and paint the residual shadow back in.
6. no pits    three guards keep the fade from eating real ink.  `fade_sat` exempts
              any pixel whose own observed chroma is already saturated -- such a
              pixel cannot be mostly glow -- `floor_sat` makes that same argument
              about the coverage ramp (a pixel >=85% ink must be opaque), and
              `seal_interior` closes whatever dark islands still survive back up
              to the level of the surrounding ink, 3px inside the shape and
              deeper.  The rim is not touched by any of them.  A blanket "solid 3px
              inside" floor was tried instead of `floor_sat` and rejected: the
              outer gradient of a ribbon also sits at depth 3, at source chroma
              30..96, and re-solidifying it paints the removed glow back on.

RGB on the clean body is copied verbatim from the source; nothing is recoloured.

Precondition
------------
Everything here rests on the artwork and the shadow occupying different chroma
ranges, so the method only applies to a *chromatic* mark.  A grey, silver or
otherwise achromatic logo has no separable signature -- strip() raises rather
than emitting a shrunken silhouette.  Run clean.py for the full invariant
report; the parameters below are tuned for a 1024px canvas and the pixel-scale
ones (ceil_radius, thin_width, floor_depth, seal_radius, reach) should be scaled
with the source if that ever changes.
"""

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

CHROMA_SHADOW = 30  # measured chroma of the baked shadow right under the rim

# Connected components below this share of the canvas are dither noise, not a
# stroke.  Stated as a fraction so the same call behaves identically at 512^2
# and 4096^2; it works out to exactly 100px at 1024^2, the value tuned on.
MIN_COMPONENT_FRAC = 100.0 / 1024**2

# Floor on the artwork's plausible chroma range, used as the denominator of the
# coverage field.  Without it a pixel whose neighbourhood is uniformly pale
# divides a tiny difference by a tiny difference and reads as full coverage.
MIN_CHROMA_RANGE = 40.0


def disk(r):
    y, x = np.mgrid[-r : r + 1, -r : r + 1]
    return (x * x + y * y) <= r * r + 0.1


def load(path):
    src = np.array(Image.open(path).convert("RGBA")).astype(np.int32)
    rgb = src[..., :3]
    return rgb, src[..., 3], rgb.max(2) - rgb.min(2)


def stroke_shape(rgb, al, sat, sat_t=45, alpha_t=240, min_component=None):
    """Boolean stroke body: opaque pixels whose chroma is the artwork's own.

    `min_component` is a count; None derives it from MIN_COMPONENT_FRAC so the
    same call behaves identically at 512^2 and 4096^2.
    """
    M = (al >= alpha_t) & (sat > sat_t)
    if min_component is None:
        # The fraction alone rounds to 0 on a small canvas, where a couple of
        # dither pixels would then survive as a "stroke".
        min_component = max(40, int(round(M.size * MIN_COMPONENT_FRAC)))
    lab, n = ndi.label(M)
    sz = ndi.sum(np.ones_like(M), lab, range(1, n + 1))
    M = np.isin(lab, [i + 1 for i in range(n) if sz[i] >= min_component])
    return M


def fill_specks(M, size=2):
    """Reopen 1-2px quantisation pinholes, but never a real seam gap.

    A pinhole is a background component that is both tiny and fully ringed by
    stroke; the ring test is what distinguishes it from the end of a real seam,
    which is also small but has background along part of its boundary.
    """
    out = M.copy()
    lab, n = ndi.label(~M)
    border = set(lab[0]) | set(lab[-1]) | set(lab[:, 0]) | set(lab[:, -1])
    sz = ndi.sum(np.ones_like(M), lab, range(1, n + 1))
    for i in range(n):
        if i + 1 in border or sz[i] > size:
            continue
        pk = lab == i + 1
        ring = ndi.binary_dilation(pk, np.ones((5, 5), bool)) ^ pk
        if M[ring].all():
            out |= pk
    return out


def enclosed(M):
    """Background pixels fully surrounded by the shape -- the seam gaps."""
    lab, n = ndi.label(~M, structure=np.ones((3, 3), bool))
    border = set(lab[0]) | set(lab[-1]) | set(lab[:, 0]) | set(lab[:, -1])
    out = np.zeros(M.shape, bool)
    for i in range(1, n + 1):
        if i not in border:
            out |= lab == i
    return out


def coverage_alpha(M, cov, clo=0.30, chi=0.85, reach=3.0, solid_depth=3, seal_cap=1.6):
    """Place the AA edge by the coverage field instead of by the mask boundary.

    A ramp built off the mask inherits its two quantisations: the boundary is a
    sawtooth because the mask is a threshold on a 254-colour field, and a ceiling
    written as a function of an *integer* distance bites on some pixels of a ring
    and not on their neighbours.  Together those read as burrs -- dark notches
    chewing into the silhouette on a black ground.

    `cov` is already a sub-pixel estimate of how much of a pixel the stroke
    covers, and it decays smoothly to 0 over the glow, so a window on it gives an
    edge that is both anti-aliased and genuinely smooth.  Three geometric terms
    are kept as guards on top of it: `reach`, how far alpha may survive at all
    outside the shape; `solid_depth`, which stops a pale reading from fading a
    pixel that is well inside the shape; and `seal_cap`, but only inside enclosed
    background -- the one place a smooth field can leak across a 2px seam and
    paint the residual shadow back in.
    """
    depth = ndi.distance_transform_edt(M)
    dout = ndi.distance_transform_edt(~M)
    a = np.clip((cov - clo) / (chi - clo), 0.0, 1.0)
    # A starting value, not a floor: strip() still multiplies this down wherever
    # the pixel was classified as a blend, which is why the outer gradient of a
    # ribbon fades even where it is deep enough to have started at 1.0.
    a[depth > solid_depth] = 1.0
    a[dout > reach] = 0.0
    m = enclosed(M) & ~M
    a[m] = np.minimum(a[m], np.clip(seal_cap - dout[m], 0.0, 1.0))
    return a


def neighbours8(M):
    K = np.ones((3, 3), np.int16)
    K[1, 1] = 0
    return ndi.convolve(M.astype(np.int16), K, mode="constant")


def smooth_silhouette(M, s=1.4, pit_min=5):
    """Mean-curvature flow of the silhouette, with a hard no-gap-closing guard.

    The mask is a threshold on a 254-colour quantised field, so its boundary is
    a sawtooth with 1px bumps and pits -- the burrs.  Blurring the *signed
    distance field* and re-thresholding at 0 is discrete mean-curvature flow:
    it rounds protrusions and closes shallow notches while leaving straight runs
    alone, and it converges after a single pass.

    Flow alone is not safe here: two facing ribbons separated by a 2px seam get
    merged once s reaches ~1.  So any pixel the flow tries to claim must be both
    within 1px of the old boundary and genuinely concave (>= `pit_min` of its 8
    neighbours already shape).  Parallel seam walls have 3-4 neighbours and are
    therefore never filled, and the narrowest real seam in this mark is 2.83px.
    """
    phi = ndi.distance_transform_edt(M) - ndi.distance_transform_edt(~M)
    Mf = ndi.gaussian_filter(phi, s) > 0
    advance = Mf & ~M
    keep = (ndi.distance_transform_edt(M) <= 1.01) & (neighbours8(M) >= pit_min)
    return Mf & (M | keep)


def seal_interior(M, alpha, min_depth=3, radius=2):
    """Fill transparent pits punched inside the artwork; leave the rim alone.

    `cov` is a ratio against `ac`, a 3px *max* of the chroma field, so a thin
    saturated line that is flanked by paler pixels reads as if half of it were
    shadow, and the interior bias then drives it to alpha 0.  Physically that is
    backwards -- a pixel that is itself saturated cannot be mostly shadow -- but
    rather than trust one more threshold, the invariant is enforced directly:
    a grayscale closing (dilate then erode) over a 2px disk raises any dark
    island back to the level of the ink around it.

    Restricted to `min_depth` px inside the shape, so the anti-aliased rim is
    bit-for-bit untouched, and to `M`, so a real seam gap can never be painted
    back in.
    """
    se = disk(radius)
    closed = ndi.grey_erosion(ndi.grey_dilation(alpha, footprint=se), footprint=se)
    inter = M & (ndi.distance_transform_edt(M) >= min_depth)
    out = alpha.copy()
    out[inter] = np.maximum(out[inter], closed[inter])
    return out


def valley(sm, r=3):
    """How far a pixel sits below BOTH sides of it, along the best of 4 axes.

    A shadow band lying in a seam is a *valley*: the saturated strokes on either
    side flank it, so `sm` dips below the sample at +r and at -r.  A chroma
    *step* where two strokes abut is only low on one side.  That distinction is
    what `dip` alone cannot make: `ac` is a grey-dilation, i.e. a MAX filter, so
    it reaches across a step and borrows the neighbour's higher chroma, which
    fabricates a dip of 36..39 on the pale side of a perfectly clean edge.  Those
    false dips land on solid artwork, and the interior bias then drives them to
    alpha 0 -- a black slit inside a ribbon.
    """
    out = None
    for dy, dx in ((0, 1), (1, 0), (1, 1), (1, -1)):
        plus = ndi.shift(sm, (-dy * r, -dx * r), order=0, mode="nearest")
        minus = ndi.shift(sm, (dy * r, dx * r), order=0, mode="nearest")
        v = np.minimum(plus, minus) - sm
        out = v if out is None else np.maximum(out, v)
    return out


def thin_bands(band, max_half_width=3):
    """Boolean map of `band` regions that are only a thin strip.

    A white-shadow band sitting in a seam between two ribbons is pale AND
    narrow, but it is *deep* inside the shape (the ribbons on either side keep
    it away from the background), so a depth rule cannot catch it.  The icon's
    own orchid/pink gradient is pale too, yet it forms fat blobs.  Width, not
    depth, is what separates them.

    Deleting these bands from the shape does clean the seams but also notches
    the silhouette and punches sealed pinholes inside the ribbons, so they are
    instead pushed through the same colour-decontamination + coverage fade as
    the outer skin.  Geometry is never touched.
    """
    if not band.any():
        return np.zeros(band.shape, bool)
    lab, n = ndi.label(band, structure=np.ones((3, 3), bool))
    d = ndi.distance_transform_edt(band)  # half-width of the band
    mx = np.nan_to_num(ndi.maximum(d, lab, index=np.arange(1, n + 1)), nan=1e9)
    return np.isin(lab, np.nonzero(mx <= max_half_width)[0] + 1)


def strip(
    path,
    sat_t=45,
    color_depth=2,
    chroma_sigma=1.0,
    reach=3.0,
    dip_t=35,
    pale_cap=115,
    thin_width=3,
    ceil_radius=3,
    bias_rim=0.45,
    bias_band=0.70,
    dip_speck=24,
    smooth=1.4,
    clo=0.30,
    chi=0.85,
    valley_t=2.0,
    valley_r=3,
    fade_sat=60,
    floor_sat=129,
    floor_depth=3,
    seal_depth=3,
    seal_radius=2,
):
    rgb, al, sat = load(path)
    Ms = stroke_shape(rgb, al, sat, sat_t)
    if not Ms.any():
        raise ValueError(
            "no stroke found: nothing in %s is an opaque pixel with chroma>%d, so "
            "this tool has nothing to separate the shadow from.  It only works on "
            "chromatic artwork -- a grey or silver mark sits at the same chroma as "
            "its own drop shadow." % (path, sat_t)
        )
    M = fill_specks(Ms)
    if smooth:
        M = smooth_silhouette(M, smooth)
    depth = ndi.distance_transform_edt(M)

    # The source is a 254-colour PNG, so per-pixel chroma carries quantisation
    # noise; average it over ~1px first.  A 3px grey-dilation gives the chroma
    # the artwork would have here, so their difference is the chroma the baked
    # glow stole -- a relative measure, which catches a shadow band sitting on
    # a saturated blue stroke just as well as one sitting on a pale pink.
    sm = ndi.gaussian_filter(sat.astype(np.float64), chroma_sigma)
    ac = ndi.grey_dilation(sm, footprint=disk(ceil_radius))
    dip = ac - sm

    # everything that is a stroke+shadow blend: the outer skin rows plus any
    # thin contaminated band sitting deeper in the shape (seam / cusp shadow).
    # A band has to be washed out both in relative terms (big chroma dip) and
    # in absolute terms (actually pale); the second test is what stops a stroke
    # edge that merely gradients into a neighbour from being eaten away.  The
    # third test is the valley/step split: `dip` on its own also fires where a
    # pale stroke simply abuts a saturated one, and eating those bites slits out
    # of solid ribbon.  Only the interior band term is gated -- the outer skin
    # is a genuine rim and must stay unconditional.
    vl = valley(sm, valley_r)
    band = M & (dip > dip_t) & (sm < pale_cap) & (vl > valley_t)
    faded = (depth <= color_depth) | thin_bands(band, thin_width)
    if dip_speck:
        # The last pale pixels clinging to a seam tip are the ones the source
        # itself left at alpha 247..254: everywhere else the artwork is fully
        # opaque.  They sit deep inside the shape, so `depth` cannot reach them,
        # and their chroma dip runs a little under `dip_t`, so `band` misses
        # them too.  Requiring both signals -- partial source alpha AND a dip
        # over 24 -- keeps the ~140 isolated dither pixels inside the pale pink
        # gradient untouched; those have a dip of <=17, because there the whole
        # neighbourhood is equally pale.
        faded |= (
            M
            & (al < 255)
            & (depth > color_depth)
            & (dip > dip_speck)
            & (sm < pale_cap)
            & (vl > valley_t)
        )
    faded &= M  # never touch the AA bleed outside
    # A pixel that is itself saturated cannot be mostly shadow: obs_chroma is a
    # blend of ink (>=~90 here) and glow (~30), so a high observed chroma means
    # the ink wins.  Without this the thin light-blue wisps inside the blue
    # ribbons read as contaminated and get slit out of solid ink.
    faded &= (depth <= color_depth) | (sat < fade_sat)
    ref = M & ~faded  # clean interior: colour reference
    if not ref.any():
        # distance_transform_edt on an all-True array returns index -1, and
        # rgb[-1, -1] would quietly paint the last row over the entire mark.
        raise ValueError(
            "every stroke pixel in %s was classified as a shadow blend, so there "
            "is no clean interior left to sample colours from.  The chroma "
            "thresholds are separating nothing on this input." % path
        )
    yi, xi = ndi.distance_transform_edt(
        ~ref, return_distances=False, return_indices=True
    )
    out_rgb = rgb.copy()
    rest = ~ref
    out_rgb[rest] = rgb[yi[rest], xi[rest]]

    # obs_chroma = art_chroma * (1 - glow) + shadow_chroma * glow, so the share
    # of the pixel the stroke actually covers is the chroma gap it retains.
    # This holds everywhere, not just on the faded band, which is what makes it
    # usable as the sub-pixel edge position as well as the blend alpha.
    cov = np.clip(
        (sm - CHROMA_SHADOW) / np.maximum(ac - CHROMA_SHADOW, MIN_CHROMA_RANGE),
        0.0,
        1.0,
    )
    alpha = coverage_alpha(M, cov, clo, chi, reach=reach)
    cover = cov[faded]
    b = np.where(depth[faded] > color_depth, bias_band, bias_rim)
    cover = np.clip((cover - b) / np.maximum(1.0 - b, 1e-3), 0.0, 1.0)
    alpha[faded] = np.minimum(alpha[faded], cover)
    if floor_sat:
        # The coverage window is a 3px MAX filter, so it reaches across a chroma
        # step: a saturated ribbon that abuts a pale one reads as cov 0.45 and
        # fades its own interior even though nothing pale covers it.  Floor the
        # alpha back to opaque -- but only for pixels whose OWN chroma is too
        # high to be a shadow blend.  A blanket "everything 3px inside is solid"
        # floor was tried and is wrong: the outer gradient of a ribbon sits at
        # depth 3 with source chroma 30..96, and re-solidifying it puts the
        # removed glow back.
        solid = M & (depth >= floor_depth) & (sat >= floor_sat) & ~faded
        alpha[solid] = 1.0
    if seal_depth:
        alpha = seal_interior(M, alpha, seal_depth, seal_radius)

    A8 = np.rint(alpha * 255).astype(np.uint8)
    out = np.dstack([out_rgb.astype(np.uint8), A8])
    out[A8 == 0] = 0
    return out, M, A8, rgb, sat
