# Interweave 托盘图标

Interweave 桌面端系统托盘当前实际使用的设计资源。本目录与 `apps/interweave/build/tray/` 中的文件逐字节一致（见「同步」），是同一套资源的归档；应用运行时只读取 `build/tray/` 下的副本。

图形从 Interweave 原始 logo 提取，单色、透明背景、无外框，按较小的视觉尺寸适配系统菜单栏与任务栏，以便与系统图标自然混排。

## 文件

- `macos/`
  - `trayTemplate.tiff` — 应用实际嵌入的多表示 template 图：22×22 @ 72 DPI、44×44 @ 144 DPI、66×66 @ 216 DPI 三个表示，由 NSImage 按屏幕倍率自动选图。Wails v3 的托盘图标只接收一份字节，故用多表示 TIFF 兼顾 1x/2x/3x 屏幕。
  - `trayTemplate.png` (22×22)、`trayTemplate@2x.png` (44×44)、`trayTemplate@3x.png` (66×66) — 合成上述 TIFF 的三档单倍源图，颜色为纯黑 `#000000` + 透明，供重新生成 TIFF 或供其他框架使用。
- `windows/`
  - `tray-dark.ico` — 纯黑 `#000000` 多尺寸 ICO（16/20/24/32/48/64/256 px），用于**浅色任务栏**。
  - `tray-light.ico` — 纯白 `#FFFFFF` 多尺寸 ICO（同上尺寸），用于**深色任务栏**。

## 平台适配

### macOS（template 图）

图标以 template 模式加载，系统按菜单栏浅/深色自动反色，无需为深浅主题各备一份。`trayTemplate.tiff` 的多表示让 NSImage 在 Retina 屏选取匹配倍率的位图，避免缩放模糊。其他框架若只支持单图加载，可改用三档 PNG，并开启 template 模式（Electron `new Tray(path)`、Tauri `icon_as_template(true)`、AppKit `image.isTemplate = true`）；Wails v3 托盘请直接使用 TIFF。

### Windows（随任务栏主题切换）

按系统主题选择 ICO：深色任务栏用 `tray-light.ico`，浅色任务栏用 `tray-dark.ico`，主题变化（`WM_SETTINGCHANGE` / `nativeTheme` 更新）时刷新。判断依据为 `HKCU\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize\SystemUsesLightTheme`（`0` 深色，`1` 浅色）。

### Linux

Wails v3.1.0 的 Linux 托盘只解码 PNG（`iconToPX` → `pngToImage`），ICO 无法使用。应用复用 `apps/interweave/build/appicon.png` 作为托盘图标；本目录不单独提供 Linux 资源。

## 同步

- 应用运行时读取 `apps/interweave/build/tray/`，不读取本目录；两处资源必须保持一致。更新图标时同时替换两处，并用 `md5`（或 `shasum`）核对字节一致。
- 修改或重新生成资源后，运行 `go vet ./...` 与 `go test -race -count=1 ./...`（在 `apps/interweave/` 下）确认嵌入与托盘测试通过。
