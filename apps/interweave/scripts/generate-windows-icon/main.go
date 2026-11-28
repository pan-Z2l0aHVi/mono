package main

import (
	"bytes"
	"encoding/binary"
	"flag"
	"fmt"
	"image"
	"image/color"
	"image/png"
	"math"
	"os"
	"path/filepath"
)

// Windows 桌面、任务栏与系统托盘（100%/125%/150%/200%/250% DPI）常用全档位。
var icoSizes = []int{16, 20, 24, 32, 40, 48, 64, 128, 256}

const (
	squircleExponent = 5.0
	supersampleGrid  = 8
	hairlineAlpha    = 0.11
)

func main() {
	inputPath := flag.String("input", "", "path to full-bleed square source PNG (e.g. appicon.png)")
	outputPath := flag.String("output", "", "path to output Windows .ico file")
	flag.Parse()

	if *inputPath == "" || *outputPath == "" {
		fmt.Fprintln(os.Stderr, "usage: generate-windows-icon -input <appicon.png> -output <windows/icon.ico>")
		os.Exit(1)
	}

	if err := generateWindowsICO(*inputPath, *outputPath); err != nil {
		fmt.Fprintf(os.Stderr, "generate-windows-icon: %v\n", err)
		os.Exit(1)
	}
}

func generateWindowsICO(inputPath, outputPath string) error {
	f, err := os.Open(inputPath)
	if err != nil {
		return fmt.Errorf("open input: %w", err)
	}
	defer f.Close()

	src, err := png.Decode(f)
	if err != nil {
		return fmt.Errorf("decode png: %w", err)
	}
	srcNRGBA := toNRGBA(src)

	frames := make([][]byte, 0, len(icoSizes))
	for _, size := range icoSizes {
		resized := resizeLanczos3(srcNRGBA, size, size)
		if size <= 48 {
			resized = unsharpMask(resized, 0.25)
		}
		masked := applyMacOSSquircleAndHairline(resized)

		var buf bytes.Buffer
		enc := png.Encoder{CompressionLevel: png.BestCompression}
		if err := enc.Encode(&buf, masked); err != nil {
			return fmt.Errorf("encode %dx%d png: %w", size, size, err)
		}
		frames = append(frames, buf.Bytes())
	}

	icoBytes, err := packPNGFramesToICO(icoSizes, frames)
	if err != nil {
		return err
	}

	if err := os.MkdirAll(filepath.Dir(outputPath), 0o755); err != nil {
		return fmt.Errorf("mkdir output dir: %w", err)
	}
	if err := os.WriteFile(outputPath, icoBytes, 0o644); err != nil {
		return fmt.Errorf("write ico: %w", err)
	}
	return nil
}

func toNRGBA(src image.Image) *image.NRGBA {
	if img, ok := src.(*image.NRGBA); ok && img.Bounds().Min == (image.Point{}) {
		return img
	}
	b := src.Bounds()
	dst := image.NewNRGBA(image.Rect(0, 0, b.Dx(), b.Dy()))
	for y := 0; y < b.Dy(); y++ {
		for x := 0; x < b.Dx(); x++ {
			dst.Set(x, y, color.NRGBAModel.Convert(src.At(b.Min.X+x, b.Min.Y+y)))
		}
	}
	return dst
}

func lanczos3(x float64) float64 {
	if x == 0 {
		return 1
	}
	ax := math.Abs(x)
	if ax >= 3 {
		return 0
	}
	px := math.Pi * x
	return (math.Sin(px) / px) * (math.Sin(px/3) / (px / 3))
}

func resizeLanczos3(src *image.NRGBA, dstW, dstH int) *image.NRGBA {
	srcW := src.Bounds().Dx()
	srcH := src.Bounds().Dy()

	// Horizontal pass -> float64 RGBA buffer (premultiplied alpha).
	tmp := make([]float64, dstW*srcH*4)
	scaleX := float64(srcW) / float64(dstW)
	supportX := 3.0 * math.Max(1.0, scaleX)
	invScaleX := math.Min(1.0, 1.0/scaleX)

	for x := 0; x < dstW; x++ {
		center := (float64(x)+0.5)*scaleX - 0.5
		left := max(0, int(math.Floor(center-supportX)))
		right := min(srcW-1, int(math.Ceil(center+supportX)))

		weights := make([]float64, right-left+1)
		wSum := 0.0
		for sx := left; sx <= right; sx++ {
			w := lanczos3((float64(sx) - center) * invScaleX)
			weights[sx-left] = w
			wSum += w
		}
		if wSum == 0 {
			wSum = 1
		}
		for i := range weights {
			weights[i] /= wSum
		}

		for y := 0; y < srcH; y++ {
			var r, g, b, a float64
			for sx := left; sx <= right; sx++ {
				w := weights[sx-left]
				off := src.PixOffset(sx, y)
				sa := float64(src.Pix[off+3]) / 255.0
				r += float64(src.Pix[off+0]) * sa * w
				g += float64(src.Pix[off+1]) * sa * w
				b += float64(src.Pix[off+2]) * sa * w
				a += sa * w
			}
			tOff := (y*dstW + x) * 4
			tmp[tOff+0] = r
			tmp[tOff+1] = g
			tmp[tOff+2] = b
			tmp[tOff+3] = a
		}
	}

	// Vertical pass -> NRGBA output.
	dst := image.NewNRGBA(image.Rect(0, 0, dstW, dstH))
	scaleY := float64(srcH) / float64(dstH)
	supportY := 3.0 * math.Max(1.0, scaleY)
	invScaleY := math.Min(1.0, 1.0/scaleY)

	for y := 0; y < dstH; y++ {
		center := (float64(y)+0.5)*scaleY - 0.5
		top := max(0, int(math.Floor(center-supportY)))
		bottom := min(srcH-1, int(math.Ceil(center+supportY)))

		weights := make([]float64, bottom-top+1)
		wSum := 0.0
		for sy := top; sy <= bottom; sy++ {
			w := lanczos3((float64(sy) - center) * invScaleY)
			weights[sy-top] = w
			wSum += w
		}
		if wSum == 0 {
			wSum = 1
		}
		for i := range weights {
			weights[i] /= wSum
		}

		for x := 0; x < dstW; x++ {
			var r, g, b, a float64
			for sy := top; sy <= bottom; sy++ {
				w := weights[sy-top]
				tOff := (sy*dstW + x) * 4
				r += tmp[tOff+0] * w
				g += tmp[tOff+1] * w
				b += tmp[tOff+2] * w
				a += tmp[tOff+3] * w
			}
			a = clamp01(a)
			dOff := dst.PixOffset(x, y)
			if a > 1e-6 {
				dst.Pix[dOff+0] = clampByte(r / a)
				dst.Pix[dOff+1] = clampByte(g / a)
				dst.Pix[dOff+2] = clampByte(b / a)
				dst.Pix[dOff+3] = clampByte(a * 255.0)
			}
		}
	}

	return dst
}

// unsharpMask 对小尺寸图标做轻微锐化，避免 16–48px 下的细线条发虚。
func unsharpMask(src *image.NRGBA, amount float64) *image.NRGBA {
	w := src.Bounds().Dx()
	h := src.Bounds().Dy()
	dst := image.NewNRGBA(image.Rect(0, 0, w, h))
	kernel := [3][3]float64{
		{1, 2, 1},
		{2, 4, 2},
		{1, 2, 1},
	}

	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			var br, bg, bb float64
			for ky := -1; ky <= 1; ky++ {
				sy := min(h-1, max(0, y+ky))
				for kx := -1; kx <= 1; kx++ {
					sx := min(w-1, max(0, x+kx))
					kw := kernel[ky+1][kx+1] / 16.0
					off := src.PixOffset(sx, sy)
					br += float64(src.Pix[off+0]) * kw
					bg += float64(src.Pix[off+1]) * kw
					bb += float64(src.Pix[off+2]) * kw
				}
			}
			off := src.PixOffset(x, y)
			dOff := dst.PixOffset(x, y)
			dst.Pix[dOff+0] = clampByte(float64(src.Pix[off+0]) + amount*(float64(src.Pix[off+0])-br))
			dst.Pix[dOff+1] = clampByte(float64(src.Pix[off+1]) + amount*(float64(src.Pix[off+1])-bg))
			dst.Pix[dOff+2] = clampByte(float64(src.Pix[off+2]) + amount*(float64(src.Pix[off+2])-bb))
			dst.Pix[dOff+3] = src.Pix[off+3]
		}
	}
	return dst
}

// applyMacOSSquircleAndHairline 按 macOS 连续曲率圆角（n=5 超椭圆）裁切透明四角，
// 并沿圆角内缘叠加极细半透明描边，确保浅色底图标在浅色 Windows 任务栏/桌面下轮廓清晰。
func applyMacOSSquircleAndHairline(src *image.NRGBA) *image.NRGBA {
	size := src.Bounds().Dx()
	dst := image.NewNRGBA(image.Rect(0, 0, size, size))
	half := float64(size) / 2.0
	borderPx := math.Max(1.0, float64(size)*0.012)
	samples := float64(supersampleGrid * supersampleGrid)

	for y := 0; y < size; y++ {
		for x := 0; x < size; x++ {
			insideCount := 0.0
			borderCount := 0.0

			for sy := 0; sy < supersampleGrid; sy++ {
				py := float64(y) + (float64(sy)+0.5)/float64(supersampleGrid)
				ny := math.Abs(py-half) / half
				nyPow := math.Pow(ny, squircleExponent)
				for sx := 0; sx < supersampleGrid; sx++ {
					px := float64(x) + (float64(sx)+0.5)/float64(supersampleGrid)
					nx := math.Abs(px-half) / half
					f := math.Pow(nx, squircleExponent) + nyPow
					if f <= 1.0 {
						insideCount++
						// 近似像素内距：distPx = (1 - f) * half / |∇f|
						gx := squircleExponent * math.Pow(nx, squircleExponent-1)
						gy := squircleExponent * math.Pow(ny, squircleExponent-1)
						grad := math.Hypot(gx, gy)
						if grad > 0 {
							distPx := (1.0 - f) * half / grad
							if distPx <= borderPx {
								borderCount++
							}
						}
					}
				}
			}

			coverage := insideCount / samples
			if coverage <= 0 {
				continue
			}

			sOff := src.PixOffset(x, y)
			r := float64(src.Pix[sOff+0])
			g := float64(src.Pix[sOff+1])
			b := float64(src.Pix[sOff+2])
			a := (float64(src.Pix[sOff+3]) / 255.0) * coverage

			if borderCount > 0 {
				// 仅在圆角内部占比上叠加极细半透明暗色描边。
				stroke := hairlineAlpha * (borderCount / insideCount)
				r *= (1.0 - stroke)
				g *= (1.0 - stroke)
				b *= (1.0 - stroke)
			}

			dOff := dst.PixOffset(x, y)
			dst.Pix[dOff+0] = clampByte(r)
			dst.Pix[dOff+1] = clampByte(g)
			dst.Pix[dOff+2] = clampByte(b)
			dst.Pix[dOff+3] = clampByte(a * 255.0)
		}
	}
	return dst
}

func packPNGFramesToICO(sizes []int, frames [][]byte) ([]byte, error) {
	if len(sizes) != len(frames) || len(sizes) == 0 {
		return nil, fmt.Errorf("invalid frame list")
	}

	var out bytes.Buffer
	// ICONDIR: reserved(2) + type=1(2) + count(2)
	_ = binary.Write(&out, binary.LittleEndian, uint16(0))
	_ = binary.Write(&out, binary.LittleEndian, uint16(1))
	_ = binary.Write(&out, binary.LittleEndian, uint16(len(sizes)))

	offset := uint32(6 + 16*len(sizes))
	for i, size := range sizes {
		var dim byte
		if size < 256 {
			dim = byte(size)
		}
		entry := [16]byte{
			dim, // bWidth (0 means 256)
			dim, // bHeight (0 means 256)
			0,   // bColorCount
			0,   // bReserved
		}
		binary.LittleEndian.PutUint16(entry[4:6], 1)                       // wPlanes
		binary.LittleEndian.PutUint16(entry[6:8], 32)                      // wBitCount
		binary.LittleEndian.PutUint32(entry[8:12], uint32(len(frames[i]))) // dwBytesInRes
		binary.LittleEndian.PutUint32(entry[12:16], offset)                // dwImageOffset
		out.Write(entry[:])
		offset += uint32(len(frames[i]))
	}

	for _, frame := range frames {
		out.Write(frame)
	}
	return out.Bytes(), nil
}

func clamp01(v float64) float64 {
	if v < 0 {
		return 0
	}
	if v > 1 {
		return 1
	}
	return v
}

func clampByte(v float64) uint8 {
	if v <= 0 {
		return 0
	}
	if v >= 255 {
		return 255
	}
	return uint8(math.Round(v))
}
