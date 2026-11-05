# 逐像素比对 fixture 字体

`inconsolata-parity-subset.ttf` 是 [Inconsolata](https://github.com/google/fonts/tree/main/ofl/inconsolata)（SIL OFL 1.1，见 `Inconsolata-OFL.txt`）的静态 Regular 子集，只保留 ASCII 可打印区（U+0020-007E），并改写内部字体名。仅用于 `editable-text.browser.spec.ts` 的文字态和编辑态 overlay 逐像素比对。

## 用途

逐像素比对要求两层字形渲染完全一致。系统字体随平台变化，可能导致字形错位。使用这个打包字体后，16px 下的 advance 为 8px，ascent/descent 为 14px/4px，几何都落在整数像素上，因此 0px 断言可以跨平台成立。

spec 中的几何锁用例会断言这些整像素性质。换字体或改行高破坏整数性时，这些用例会先失败。

## 再生成

```sh
curl -sL -o Inconsolata.ttf https://raw.githubusercontent.com/google/fonts/main/ofl/inconsolata/static/Inconsolata-Regular.ttf
python3 -m fontTools.subset Inconsolata.ttf --unicodes="U+0020-007E" --layout-features='*' --output-file=inconsolata-parity-subset.ttf
# 再用 fontTools 把 name 表 ID 1/3/4/6/16/17 改写为 WuiEditableTextParitySubset
```
