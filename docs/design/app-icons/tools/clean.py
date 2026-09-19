#!/usr/bin/env python3
"""Strip a baked white/gray drop shadow from a transparent app-icon PNG, and
prove the result is still the same artwork.

    python3 clean.py <source.png> [out.png] [--prev <older.png>]
                     [--set PARAM=VALUE ...] [--outdir DIR] [--no-write] [--force]

Run requirements (this repo has no Python manifest and nothing in CI runs these
scripts, so the environment has to be prepared by hand):

    python3 -m pip install numpy pillow scipy
    cd docs/design/app-icons/tools   # clean.py does `import icostrip`
    python3 clean.py <source.png> [out.png]

`out.png` defaults to `<stem>-clean.png` beside the source.  `--no-write` reports
without touching any file, and a failed invariant suppresses the write on its own
so a broken render can never overwrite a good deliverable; `--force` overrides
that.  `--set` replaces one of icostrip.strip()'s tuning parameters for a single
run and `--params` lists them with the value in force.  The pixel-scale ones need
to be scaled with the canvas if a source is ever much larger or smaller than the
1024px they were tuned at.

Nothing below is specific to an icon.  The crops handed to a reviewer are chosen
from whatever this run measured worst, every reported threshold is either a
physical constant in icostrip or a named parameter of the run that produced the
image, and the display sizes are derived from the source rather than assumed.

Why the report is part of the product: every failure mode of this method is
invisible at normal zoom and catastrophic close up -- a slit punched inside a
solid ribbon, glow painted back into a seam, the mark quietly shrunk by a pixel.
So the checks are invariants, not screenshots: a failing one suppresses the write
and sets a non-zero exit code, which makes `clean.py src.png && git add
src-clean.png` a gate rather than a suggestion.

The report separates two things that both look like "translucent deep inside the
shape".  A pixel whose own chroma is high cannot be a shadow blend, so a fade
there is the coverage window reaching across a chroma step: a defect.  A pixel
that is genuinely pale is the artwork's own gradient dissolving into the glow,
and fading it *is* the tool working.

--prev diffs the result against an earlier deliverable.  It is the only check
that catches "I closed a pit but recoloured something that was already fine", so
without it the report says the regression check was skipped rather than passing
silently.
"""

import argparse
import os
import sys
import tempfile

import icostrip as ic
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi

# --- thresholds that only *judge* the output, never produce it ---------------
# An interior pixel faded out beside a source pixel this pale was not invented:
# the artwork was already washed out there.
PALE_SAT = 70
PALE_RING = 2
# A body pixel still this pale and this bright, this close to a gap, is glow the
# run left behind.  Looser than the algorithm's own cut on purpose: the census
# reports what survived, it does not restate what was targeted.
GLOW_CHROMA = 62
GLOW_LUM = 140
GLOW_DEPTH = 5
GLOW_ALPHA = 0.5
# Beyond ring 1 of the silhouette only the anti-aliased fringe may hold alpha.
FRINGE_REACH = 1.01
FRINGE_ALPHA = 60
# Pit depth at which a fade can no longer be blamed on the rim ramp.
PIT_DEPTH = 3
# How opaque a pixel has to have been for a colour change on it to be a defect
# rather than a reshuffle among the near-transparent blend pixels.
VISIBLE_A = 128
CROP_HALF, ZOOM = 28, 7


def signature(fn):
    """{parameter name: default} for the parameters of `fn` that have one."""
    names = list(fn.__code__.co_varnames[: fn.__code__.co_argcount])
    return dict(zip(names[len(names) - len(fn.__defaults__) :], fn.__defaults__))


def bbox(mask):
    ys, xs = np.nonzero(mask.any(1))[0], np.nonzero(mask.any(0))[0]
    if len(xs) == 0:
        return None
    return (int(xs[0]), int(xs[-1])), (int(ys[0]), int(ys[-1]))


def clusters(mask):
    """(labels, count, sizes) with 8-connectivity and no empty-range trap."""
    lab, n = ndi.label(mask, structure=np.ones((3, 3), bool))
    if n == 0:
        return lab, 0, np.zeros(0, int)
    return lab, n, ndi.sum(np.ones_like(mask), lab, range(1, n + 1)).astype(int)


def peaks(mask, k, min_size=4):
    """'x=.. y=..' for up to k largest components of `mask`, largest first."""
    lab, _n, sz = clusters(mask)
    out = []
    for j in np.argsort(sz)[::-1][:k]:
        if sz[j] < min_size:
            break
        ys, xs = np.nonzero(lab == j + 1)
        out.append((int(sz[j]), int(xs.mean()), int(ys.mean())))
    return out


def nb8(m):
    """For each pixel, how many of its 8 neighbours satisfy `m`."""
    K = np.ones((3, 3), np.int16)
    K[1, 1] = 0
    return ndi.convolve(m.astype(np.int16), K, mode="constant")


def rgbkey(a):
    """Pack an (...,3) colour array into one integer per pixel, for set tests."""
    return (
        (a[..., 0].astype(np.int64) << 16)
        | (a[..., 1].astype(np.int64) << 8)
        | a[..., 2].astype(np.int64)
    )


def comp(arr, bg):
    """Composite an RGBA array onto `bg`, a scalar grey or an (r,g,b) triple."""
    a = (arr[..., 3:] / 255.0).astype(np.float32)
    base = np.asarray(bg, dtype=np.float32)
    return np.clip(arr[..., :3].astype(np.float32) * a + base * (1 - a), 0, 255).astype(
        np.uint8
    )


class Run:
    """One strip() pass plus everything the checks and the sheets measure off it."""

    def __init__(self, path, kw):
        self.src_path = path
        self.P = dict(signature(ic.strip), **kw)
        self.out, self.M, self.A8, _rgb, self.sat = ic.strip(path, **kw)
        self.src = np.array(Image.open(path).convert("RGBA")).astype(np.int32)
        self.h, self.w = self.M.shape
        self.A = self.A8 / 255.0
        self.dep = ndi.distance_transform_edt(self.M)
        self.dout = ndi.distance_transform_edt(~self.M)
        rgb = self.out[..., :3]
        self.ch = rgb.max(2).astype(np.int32) - rgb.min(2).astype(np.int32)
        self.lum = rgb.astype(np.float32).mean(2)
        self.floor_sat = self.P["floor_sat"]
        # the opacity gate stroke_shape() used to decide "part of the mark"
        self.alpha_t = signature(ic.stroke_shape)["alpha_t"]
        # source ink: opaque *and* chromatic, i.e. artwork rather than baked glow
        self.ink = (self.src[..., 3] == 255) & (self.sat >= self.floor_sat)
        self.pit = self.M & (self.dep >= PIT_DEPTH)
        self.glow = (
            self.M
            & (self.dep <= GLOW_DEPTH)
            & (self.A > GLOW_ALPHA)
            & (self.ch < GLOW_CHROMA)
            & (self.lum > GLOW_LUM)
        )
        self.drift = np.abs(rgb.astype(np.int32) - self.src[..., :3]).max(2)

    def sites(self, n_each=4, cap=12):
        """The crops a reviewer should look at, worst class first, this run only."""
        groups = [
            ("ink pit", self.pit & (self.A8 < 250) & (self.sat >= self.floor_sat), 4),
            ("lost ink", self.ink & ~self.M, 4),
            (
                "gradient pit",
                self.pit & (self.A8 < 128) & (self.sat < self.floor_sat),
                4,
            ),
            ("residual glow", self.glow, 4),
            # not a defect -- the seam gaps are where residual shadow would show,
            # so they get crops on every run even when the census is clean.
            ("enclosed seam", ic.enclosed(self.M), 1),
        ]
        found = [
            ("%s %dpx at (%d,%d)" % (tag, size, x, y), x, y)
            for tag, mask, smallest in groups
            for size, x, y in peaks(mask, n_each, smallest)
        ]
        return found[:cap]

    def site_sheet(self, path, sites, z=ZOOM, half=CROP_HALF):
        """Source-vs-result crops on black, one row per site."""
        tiles = []
        for label, cx, cy in sites:
            x0, x1 = max(0, cx - half), min(self.w, cx + half)
            y0, y1 = max(0, cy - half), min(self.h, cy + half)
            pair = [
                Image.fromarray(comp(a[y0:y1, x0:x1], 0)).resize(
                    ((x1 - x0) * z, (y1 - y0) * z), Image.NEAREST
                )
                for a in (self.src, self.out)
            ]
            row = Image.new(
                "RGB",
                (pair[0].width + pair[1].width + 6, pair[0].height + 18),
                (0, 0, 0),
            )
            row.paste(pair[0], (0, 18))
            row.paste(pair[1], (pair[0].width + 6, 18))
            ImageDraw.Draw(row).text(
                (4, 4), "%s  |  SOURCE  ->  RESULT on black" % label, fill=(255, 255, 0)
            )
            tiles.append(row)
        if not tiles:
            return None
        canvas = Image.new(
            "RGB",
            (
                max(t.width for t in tiles),
                sum(t.height for t in tiles) + 10 * len(tiles),
            ),
            (40, 40, 40),
        )
        y = 0
        for t in tiles:
            canvas.paste(t, (0, y))
            y += t.height + 10
        canvas.save(path)
        return path

    def contact(self, path, cell=300):
        """The view that matches how an icon is actually seen: downscaled, on real grounds."""
        grounds = [
            ("black", (0, 0, 0)),
            ("white", (255, 255, 255)),
            ("dark navy", (20, 24, 40)),
        ]
        # the ladder a store actually ships at, clipped to what this canvas allows
        sizes = [s for s in (512, 256, 128, 64) if s <= min(self.h, self.w)] or [
            min(self.h, self.w)
        ]
        gap, head, gutter = 10, 22, 44
        canvas = Image.new(
            "RGB",
            (
                gutter + gap + (cell + gap) * len(grounds),
                head + gap + (cell + gap) * len(sizes),
            ),
            (48, 48, 48),
        )
        d = ImageDraw.Draw(canvas)
        for i, (tag, bg) in enumerate(grounds):
            d.text(
                (gutter + gap + i * (cell + gap) + 4, 6),
                "on %s" % tag,
                fill=(255, 255, 0),
            )
        for r, size in enumerate(sizes):
            d.text((2, head + r * (cell + gap) + 4), "%dpx" % size, fill=(255, 255, 0))
            for i, (tag, bg) in enumerate(grounds):
                s = Image.fromarray(comp(self.out, bg)).resize(
                    (size, size), Image.LANCZOS
                )
                # NEAREST for the small sizes so individual fringe pixels stay
                # inspectable instead of being resmoothed away by the upscale.
                canvas.paste(
                    s.resize(
                        (cell, cell), Image.NEAREST if size <= 128 else Image.LANCZOS
                    ),
                    (gutter + gap + i * (cell + gap), head + r * (cell + gap)),
                )
        canvas.save(path)
        return path


def verify(R, prev):
    """Print the invariant report; return the names of the checks that failed."""
    fails = []

    def check(name, ok, detail=""):
        print("%-50s %s  %s" % (name, "PASS" if ok else "FAIL", detail))
        if not ok:
            fails.append(name)

    print("=== %s  (%dx%d)" % (os.path.basename(R.src_path), R.w, R.h))
    print("    params: %s" % " ".join("%s=%g" % kv for kv in sorted(R.P.items())))

    print("\n--- geometry -----------------------------------------------------")
    print(
        "mask %d px   source ink %d px   alpha sum %.0f (%.1f%% of mask area)"
        % (int(R.M.sum()), int(R.ink.sum()), R.A.sum(), 100 * R.A.sum() / R.M.sum())
    )
    print(
        "  mask px that were not opaque in the source: %d"
        % int((R.M & (R.src[..., 3] < R.alpha_t)).sum())
    )
    # One row per pixel ring outside the silhouette, as far as the run's own
    # `reach` allows alpha to survive, plus everything past that.
    top = int(np.ceil(R.P["reach"]))
    for r0, r1 in [(r, r + 1) for r in range(top + 1)] + [(top + 1, np.inf)]:
        ring = (R.dout > r0) & (R.dout <= r1)
        if ring.any():
            print(
                "  beyond the shape, %-11s n=%-7d max alpha %3d"
                % (
                    "ring %d" % r0 if np.isfinite(r1) else "further out",
                    int(ring.sum()),
                    R.A8[ring].max(),
                )
            )
    bridged = int(((~R.M) & (R.dout > FRINGE_REACH) & (R.A8 > FRINGE_ALPHA)).sum())
    check(
        "no glow painted across a seam", bridged == 0, "%d px beyond ring 1" % bridged
    )

    print("\n--- silhouette ---------------------------------------------------")
    bm, bi = bbox(R.M), bbox(R.ink)
    print("mask bbox %s x %s   source-ink bbox %s x %s" % (bm[0], bm[1], bi[0], bi[1]))
    lost = R.ink & ~R.M
    check(
        "saturated source ink stays inside the mask",
        not lost.any(),
        "%d of %d px fall outside" % (int(lost.sum()), int(R.ink.sum())),
    )
    check(
        "mask spans the ink bbox, so nothing was cropped",
        bm[0][0] <= bi[0][0]
        and bm[0][1] >= bi[0][1]
        and bm[1][0] <= bi[1][0]
        and bm[1][1] >= bi[1][1],
        "compare the two bboxes above",
    )

    print("\n--- colour fidelity ----------------------------------------------")
    exact = R.M & (R.drift == 0)
    print(
        "body px with RGB verbatim from its own source px: %d / %d (%.1f%%)"
        % (int(exact.sum()), int(R.M.sum()), 100 * exact.sum() / R.M.sum())
    )
    repaint = R.M & (R.drift > 0)
    print(
        "repainted from a neighbour: %d px, mean drift %s"
        % (
            int(repaint.sum()),
            np.round(R.drift[repaint].mean(), 1) if repaint.any() else "-",
        )
    )
    print(
        "of those, %d px ended up fully opaque (seal_interior raises a blend back"
        " to solid, so its RGB is a neighbour's)" % int((repaint & (R.A8 == 255)).sum())
    )
    stray = int(
        (~np.isin(rgbkey(R.out), np.unique(rgbkey(R.src))))[R.out[..., 3] > 0].sum()
    )
    check(
        "every output colour already exists in the source",
        stray == 0,
        "%d stray px" % stray,
    )
    # The failure this catches: a blend pixel that seal_interior() raises back to
    # solid would keep the pale colour it borrowed, and read as a grey blob on a
    # dark ground.  Anything this pale and this opaque has to be the artwork's own
    # highlight, which means its own source pixel, verbatim.
    pale = R.M & (R.ch < GLOW_CHROMA) & (R.A8 >= 200)
    borrowed = pale & (R.drift > 0)
    check(
        "no pale px is opaque on a borrowed colour",
        not borrowed.any(),
        "%d pale opaque px, %d of them repainted"
        % (int(pale.sum()), int(borrowed.sum())),
    )

    print("\n--- edge ---------------------------------------------------------")
    hi, lo = ndi.maximum_filter(R.A8, 3), ndi.minimum_filter(R.A8, 3)
    notch = (R.A8 < 32) & (hi > 160) & (nb8(R.A8 > 160) >= 3)
    spur = (R.A8 > 200) & (lo < 40) & (nb8(R.A8 < 40) >= 3)
    print(
        "notch %d px   spur %d px   (%dx%d canvas -- a handful is normal,"
        " judge them in the contact sheet)"
        % (int(notch.sum()), int(spur.sum()), R.w, R.h)
    )
    sealed = ic.enclosed(R.M)
    if sealed.any():
        left = int((R.A8[sealed] > FRINGE_ALPHA).sum())
        check(
            "no shadow left in an enclosed seam",
            left == 0,
            "max alpha %d/255, %d px over %d"
            % (R.A8[sealed].max(), left, FRINGE_ALPHA),
        )
    else:
        print("this artwork encloses no background, so there is no seam to check")

    print("\n--- interior holes -----------------------------------------------")
    pale = ndi.binary_dilation(R.sat <= PALE_SAT, ic.disk(PALE_RING))
    punched = R.pit & (R.A8 == 0)
    invented = punched & ~pale
    check(
        "no slit invented inside solid ink",
        not invented.any(),
        "%d px punched, %d of them with no pale source neighbour"
        % (int(punched.sum()), int(invented.sum())),
    )
    for size, x, y in peaks(invented, 4):
        print("     %2dpx at (%d,%d)" % (size, x, y))

    print("\n--- pit census ---------------------------------------------------")
    print(
        "  an ink-class pit is a defect; a pale one is the artwork's own gradient fading"
    )
    for amax in (64, 128, 250):  # quarter-, half- and near-opaque
        n = int((R.pit & (R.sat >= R.floor_sat) & (R.A8 < amax)).sum())
        check(
            "no pit in ink-class px (depth>=%d, chroma>=%d, alpha<%d)"
            % (PIT_DEPTH, R.floor_sat, amax),
            n == 0,
            "%d px" % n,
        )
    for dmin, amax in (
        (PIT_DEPTH, 64),
        (PIT_DEPTH, 128),
        (PIT_DEPTH, 250),
        (GLOW_DEPTH, 250),
        (8, 254),
    ):
        pit = R.M & (R.dep >= dmin) & (R.A8 < amax) & (R.sat < R.floor_sat)
        _lab, n, sz = clusters(pit)
        print(
            "  gradient-class depth>=%-2d alpha<%-3d : %5d px / %3d clusters (largest %d)"
            % (dmin, amax, int(pit.sum()), n, int(sz.max()) if n else 0)
        )
    deep = int((R.M & (R.dep >= GLOW_DEPTH) & (R.A8 < 250)).sum())
    check(
        "the fade stops at the outer gradient",
        deep == 0,
        "%d px deeper than %d" % (deep, GLOW_DEPTH),
    )
    _lab, n, sz = clusters(R.glow)
    print(
        "residual glow px within %dpx of a gap: %d in %d clusters (largest %d)"
        % (GLOW_DEPTH, int(R.glow.sum()), n, int(sz.max()) if n else 0)
    )
    print(
        "source-opaque ink px left below full alpha: %d"
        % int((R.ink & R.M & R.pit & (R.A8 < 255)).sum())
    )

    print("\n--- previous deliverable -----------------------------------------")
    if prev is None:
        print(
            "  SKIPPED -- pass --prev <earlier.png> to catch a recolouring regression"
        )
        return fails
    if prev.shape != R.out.shape:
        check(
            "previous deliverable is comparable",
            False,
            "previous is %dx%d, this run is %dx%d"
            % (prev.shape[0], prev.shape[1], R.h, R.w),
        )
        return fails
    o = R.out.astype(np.int32)
    drgb = np.abs(o[..., :3] - prev[..., :3]).max(2)
    da = o[..., 3] - prev[..., 3]
    print(
        "  RGB identical on %d / %d px, alpha identical on %d px"
        % (int((drgb == 0).sum()), drgb.size, int((da == 0).sum()))
    )
    # A colour change on a pixel that is nearly transparent is not a change
    # anyone can see, and the repaint step legitimately shuffles colours among
    # the blend pixels it classifies.  Keying the check to how visible the pixel
    # *was* is what makes it about the artwork rather than about the bytes.
    recol = (drgb > 0) & (prev[..., 3] >= VISIBLE_A)
    check(
        "nothing that was visibly present got recoloured",
        not recol.any(),
        "%d of %d changed-RGB px were visible before"
        % (int(recol.sum()), int((drgb > 0).sum())),
    )
    print(
        "  worst recolour as displayed over the previous alpha: %.1f / 255"
        % float(((prev[..., 3] / 255.0) * drgb.astype(np.float64)).max())
    )
    check(
        "alpha was only ever raised, never newly faded",
        not (da < 0).any(),
        "%d px changed, range %+d..%+d, total ink %+0.2f%%"
        % (
            int((da != 0).sum()),
            int(da.min()),
            int(da.max()),
            100 * (R.A8.sum() / max(prev[..., 3].sum(), 1) - 1),
        ),
    )
    return fails


def main():
    ap = argparse.ArgumentParser(
        description="Strip a baked drop shadow from a transparent icon and audit the result.",
        epilog=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    ap.add_argument("src", nargs="?", help="transparent-background PNG to clean")
    ap.add_argument(
        "out",
        nargs="?",
        default=None,
        help="destination (default: <stem>-clean.png beside the source)",
    )
    ap.add_argument(
        "--prev",
        metavar="PNG",
        default=None,
        help="earlier deliverable to diff against",
    )
    ap.add_argument(
        "--set",
        metavar="PARAM=VALUE",
        action="append",
        dest="kw",
        default=[],
        help="override one strip() tuning parameter, repeatable",
    )
    ap.add_argument(
        "--params", action="store_true", help="list the tuning parameters and exit"
    )
    ap.add_argument(
        "--outdir",
        default=os.environ.get("TMPDIR", tempfile.gettempdir()),
        help="where to write the review sheets (default: $TMPDIR)",
    )
    ap.add_argument(
        "--no-write", action="store_true", help="report only, leave files alone"
    )
    ap.add_argument(
        "--force",
        action="store_true",
        help="write even when an invariant failed (the default is not to)",
    )
    a = ap.parse_args()

    if a.params:
        for k, v in sorted(signature(ic.strip).items()):
            print("%-14s %s" % (k, v))
        return 0
    if not a.src:
        ap.error("src is required unless --params is given")
    if not os.path.exists(a.src):
        ap.error("no such file: %s" % a.src)
    if a.prev and not os.path.exists(a.prev):
        ap.error("--prev: no such file: %s" % a.prev)

    P = signature(ic.strip)
    kw = {}
    for item in a.kw:
        name, sep, raw = item.partition("=")
        if not sep or name not in P:
            ap.error(
                "--set %r: expected PARAM=VALUE, one of %s"
                % (item, " ".join(sorted(P)))
            )
        kw[name] = type(P[name])(raw)

    dest = a.out or os.path.join(
        os.path.dirname(os.path.abspath(a.src)),
        os.path.splitext(os.path.basename(a.src))[0] + "-clean.png",
    )
    R = Run(a.src, kw)
    prev = (
        np.array(Image.open(a.prev).convert("RGBA")).astype(np.int32)
        if a.prev
        else None
    )
    fails = verify(R, prev)

    stem = os.path.splitext(os.path.basename(a.src))[0]
    os.makedirs(a.outdir, exist_ok=True)
    sites = R.sites()
    sheets = [R.contact(os.path.join(a.outdir, "review_%s_contact.png" % stem))]
    if sites:
        sheets.append(
            R.site_sheet(os.path.join(a.outdir, "review_%s_sites.png" % stem), sites)
        )
    print(
        "\nreview sheets: %d worst sites, %dpx crops at %dx"
        % (len(sites), 2 * CROP_HALF, ZOOM)
    )
    for s in sheets:
        print("  %s" % s)
    if not sites:
        print("  (no defect site found -- source-vs-result sheet skipped)")
    if a.no_write:
        print("\n--no-write: %s left untouched" % dest)
    elif fails and not a.force:
        print(
            "\nNOT WRITTEN: %s.  Fix the cause, or pass --force to ship it anyway."
            % ", ".join(fails)
        )
    else:
        Image.fromarray(R.out).save(dest)
        im = Image.open(dest)
        print("\nwrote %s  %s %s" % (dest, im.size, im.mode))

    print(
        "\n%s" % ("ALL INVARIANTS HOLD" if not fails else "FAILED: " + "; ".join(fails))
    )
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
