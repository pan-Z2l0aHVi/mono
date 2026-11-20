# @greypan/app-scrollbars

## 0.0.2

### Patch Changes

- ce42869: Use native scrollbars on phones and tablets whose primary pointer is coarse. Component scroll containers restore the platform's default scrollbar width and colors, while application-level OverlayScrollbars keeps native overlaid scrollbars visible instead of rendering custom ones.

## 0.0.1

### Patch Changes

- 9787a15: 移除各包 `exports` 里的 `"./package.json"`。仓库内没有任何消费方；这一项只为按包名读元数据重新放开入口，留着会让后来者把它当成必需项。唯一需要读 manifest 的 `check-md-to-comp-artifacts` 改为按仓库路径读取。已发布包按 minor 处理：升级后经包名解析元数据会报 `ERR_PACKAGE_PATH_NOT_EXPORTED`，目前没有已知的外部消费者。
