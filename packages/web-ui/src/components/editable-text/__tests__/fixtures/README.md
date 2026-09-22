# 逐像素比对 fixture 字体

`inconsolata-parity-subset.ttf` 是 [Inconsolata](https://github.com/google/fonts/tree/main/ofl/inconsolata)（SIL OFL 1.1，见 `Inconsolata-OFL.txt`）的静态 Regular 子集，只保留 ASCII 可打印区（U+0020-007E），并改写内部字体名（OFL 保留字体名条款）。仅用于 `editable-text.browser.spec.ts` 的文字态/编辑态 overlay 逐像素比对。

## 为什么需要它

逐像素比对要求两层的字形渲染完全一致。系统字体栈随平台变化：CI 容器里的 monospace 与开发机不是同一个文件，分数 advance 会把逐字形 x 原点放到亚像素上，Linux 的取整/提示路径据此抖动，两层随之错位（CI 上曾表现为 5365 像素、最大通道差 102 的差异）。改用打包字体后：

- advance 在 16px 下恰为 8px（0.5em，整像素），逐字形 x 原点全部落在整数网格；
- ascent/descent 用 FontFace 的 ascentOverride/descentOverride 覆盖为 14px/4px（整像素），半行距与基线随之取整后仍是整数；
- 任何平台上的取整/提示都成为 no-op，0px 断言才跨平台成立。

spec 里的几何锁用例会断言上述整像素性质，换字体或改行高破坏整数性时先失败。

## 再生成

```sh
curl -sL -o Inconsolata.ttf https://raw.githubusercontent.com/google/fonts/main/ofl/inconsolata/static/Inconsolata-Regular.ttf
python3 -m fontTools.subset Inconsolata.ttf --unicodes="U+0020-007E" --layout-features='*' --output-file=inconsolata-parity-subset.ttf
# 再用 fontTools 把 name 表 ID 1/3/4/6/16/17 改写为 WuiEditableTextParitySubset
```
