---
component: editable-text
tag: web-ui-editable-text
---

行内纯文本编辑器：点击文字就地编辑，Enter 与 blur 提交，只有 Escape 取消；文本层与编辑层共用一个盒，进入编辑态不会移动像素。

## 示例

### 基础

点击文字进入编辑态，离开即按提交语义收尾。

```react
<web-ui-editable-text value="点击编辑这段文字" placeholder="未命名"></web-ui-editable-text>
```

```vue
<template>
  <web-ui-editable-text value="点击编辑这段文字" placeholder="未命名"></web-ui-editable-text>
</template>
```

### 提交与取消

Enter 与 blur 都提交草稿并派发一次 `change`；Escape 恢复进入编辑时的值，派发 `cancel` 而不派发 `change`。

```react
const [text, setText] = useState('项目名称')

return (
  <web-ui-editable-text
    value={text}
    onChange={event => setText(event.currentTarget.value)}
    placeholder="未命名项目"
  ></web-ui-editable-text>
)
```

```vue
<template>
  <web-ui-editable-text
    :value="text"
    placeholder="未命名项目"
    @change="text = $event.currentTarget.value"
  ></web-ui-editable-text>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const text = ref('项目名称')
</script>
```

### 监听取消

`cancel` 与原生 `<dialog>` 事件同名但不冒泡、不组合，React 没有对应的合成事件，需要挂原生监听。

```react
const ref = useRef(null)

useEffect(() => {
  const element = ref.current
  if (!element) return
  const onCancel = () => console.log('已取消编辑')
  element.addEventListener('cancel', onCancel)
  return () => element.removeEventListener('cancel', onCancel)
}, [])

return <web-ui-editable-text ref={ref} value="试试按 Escape"></web-ui-editable-text>
```

```vue
<template>
  <web-ui-editable-text value="试试按 Escape" @cancel="onCancel"></web-ui-editable-text>
</template>

<script setup lang="ts">
function onCancel() {
  console.log('已取消编辑')
}
</script>
```

## API

### Props

| 名称                | 说明                                                                 | 类型             | 默认值  |
| ------------------- | -------------------------------------------------------------------- | ---------------- | ------- |
| `name`              | 表单字段名。                                                         | `string`         | `''`    |
| `placeholder`       | 值为空时显示的占位文本。                                             | `string`         | `''`    |
| `disabled`          | 禁用状态，只影响行为不做视觉置灰。                                   | `boolean`        | `false` |
| `readonly`          | 只读状态：仍可聚焦全选，但不能编辑或提交。                           | `boolean`        | `false` |
| `commit-on-unmount` | 卸载时按提交语义结束编辑态；WebKit 下没有 blur，只有它才能保住草稿。 | `boolean`        | `false` |
| `aria-label`        | 无障碍名称。                                                         | `string \| null` | `null`  |
| `value`             | 当前值，也是表单提交值。                                             | `string`         | `''`    |

### Events

| 名称     | 说明                              |
| -------- | --------------------------------- |
| `input`  | 每次输入时触发。                  |
| `change` | 提交草稿时触发（Enter 或 blur）。 |
| `cancel` | Escape 取消时触发，不冒泡不组合。 |

### Methods

| 名称       | 说明                                                                                                                 |
| ---------- | -------------------------------------------------------------------------------------------------------------------- |
| `focus()`  | 聚焦宿主并进入编辑态，键盘聚焦把光标放在文本末尾；`disabled` 时宿主移出 tab 序列，不产生效果。                       |
| `blur()`   | 让宿主失焦；焦点离开编辑层时走 blur 提交语义——草稿成为新值并恰好派发一次 `change`，`readonly` 时只退出编辑、不派发。 |
| `select()` | 进入编辑态并全选内容；已在编辑态时只重新全选。`disabled` 时不进入编辑。                                              |

### 行为说明

点击时光标落在点击处；键盘聚焦时落在文本末尾。`Enter` 与 `blur` 均提交草稿并恰好派发一次 `change`：`Enter` 不插入换行，并把焦点交还宿主；`blur` 不干预焦点，焦点留在用户移往的位置。只有 `Escape` 取消：值回到进入编辑时的状态，派发 `cancel` 而不派发 `change`，焦点交还宿主，且按键由编辑层消费，外层浮层（抽屉、菜单）不会因同一次按键关闭。`cancel` 不冒泡也不组合，只在组件本身派发：组件被投映在浮层 shadow 内时（如 drawer 标题），它不会触达浮层的原生 `cancel` 关闭管线，监听一律挂在组件本身。值里已有的换行仍按多行渲染，只是不能再靠输入 `Enter` 增加换行。空值继续显示 placeholder；编辑层始终按自身内容撑高，因此空草稿或纯空格草稿在宿主自身塌缩的场合（flex 项 `min-width: 0`、表格单元格）也仍有承接光标的位置。

`select()` 进入编辑态并全选内容；已在编辑态时只重新全选。`disabled` 时与 `focus()` 一样不产生效果。`readonly` 时仍可聚焦和全选，但输入被拒绝，退出编辑态也不派发 `change`。

共用盒子带来两个约束：`line-height` 需不小于 `1`，更紧凑时原生编辑层内容会高出自身盒子，文字被顶偏 1px；`nowrap` 加固定宽度时，超出盒宽的文案在文字态溢出显示、在编辑态于盒内滚动。

### 编辑到一半被卸载

正在编辑的元素被从 DOM 移除时会发生什么，取决于引擎，这个差异正是本属性存在的理由：

- **Chromium** 会在编辑层上派发 `blur`，因此纯粹的 `value` 提交今天就已经发生，默认 `false` 不改变这一点。`blur` 与它触发的 `change` 都在卸载回调跑完**之后**同步派发，也就是说提交落在「消费方针对这次移除已经更新完状态」之后。
- **WebKit（Safari、iOS）** 完全不派发 `blur`。默认 `false` 下什么都不提交，草稿随元素一起丢弃。
- **Gecko（Firefox）未验证**：实测所用机器上没有任何 Firefox 能启动，因此这里不做任何断言。把 Gecko 当作未知，而不是默认它与上面两列之一相同；需要靠卸载提交来保住草稿时，请开启本属性。

如果你的代码依赖「行被回收时草稿不丢」，请**开启 `commit-on-unmount`**：在 Safari 与 iOS 上它是唯一能保住草稿的手段，在 Chromium 上它把提交提前到移除自带的 `blur` 之前。两个引擎下，卸载都按提交语义收尾一段开着的编辑会话——草稿成为新值、退出编辑、恰好派发一次 `change`，走的是与 `Enter`、`blur` 同一份实现。结论在 Chromium 与 WebKit 上实测过；浏览器测试套件只跑 Chromium，WebKit 的结果来自一次一次性跨引擎取证、不在 CI 里，Gecko 则完全没有测。

`Enter` 与 `blur` 由用户动作触发，一律算提交意图；卸载没有这种意图。因此只有草稿与进入编辑时的值确实不同时才提交——什么都没改的会话不会产生空提交。不在编辑态时没有可提交的内容；`disabled` 或 `readonly` 时与 `blur` 路径一致，都不派发提交事件。但两者对「已经有草稿」的处置不同：`disabled` 下草稿留在组件上，`readonly` 下草稿是真的丢掉。`readonly` 阻止不了先前输入的字，而卸载时已没有 blur 可以兜底提交——WebKit 上连 blur 都没有。可达路径是：可编辑态进入 → 起草稿 → 期间翻 readonly → 卸载。这里不按取消处理——取消的契约是恢复进入编辑时的值，而卸载既没有焦点要交也没有宿主接收结果；用户看到的是「我打的字没了」，既没有 `change` 也没有 `cancel`。

提交发生在卸载回调里，`change` 仍沿组合路径向上派发，因此挂在组件自身或任一祖先上的监听都会执行，**包括自身也正在被卸载的祖先**：派发不要求祖先此刻还在文档里。因此监听器不能假定组件仍在文档中；结果需要活过这次移除时，用 `queueMicrotask` 之类的方式显式转交给宿主树之外的状态。注意这条可达性对「由 React 自身 render 驱动的卸载」并不成立：那种移除走不到 React 的事件委托根，`onChange` 不会触发，只能改为从元素上读值——与上文 `cancel` 的告示同源。在祖先上设 `display: none` 不算移除——两个引擎下组件都仍在文档中、不派发任何事件，那种场合需要消费方主动结束编辑。

宿主是行内级盒子：未设宽度时随内容伸缩，折行后高度按行数增长。字体、颜色、文本对齐与空白处理全部继承外部上下文，因此编辑前它就是一段普通文字。

光标颜色默认跟随共享语义 token `--wui-color-accent`；在宿主或任意祖先上设置该 token 即可整体改色。两层对长无空格串（连续字母数字）按同一组断行点折行：超出盒宽的长串在盒内断开，文字态不再溢出宿主盒。

### CSS Custom Properties

| 名称                                | 说明                                                             | 默认值     |
| ----------------------------------- | ---------------------------------------------------------------- | ---------- |
| `--wui-editable-text-white-space`   | 两层的空白处理方式                                               | `pre-wrap` |
| `--wui-editable-text-overflow-wrap` | 两层的断词处理方式；默认让长无空格串在盒内断开，与原生编辑层一致 | `anywhere` |

### 交互变更

`blur` 恢复提交：`Enter` 与 `blur` 均提交草稿，只有 `Escape` 取消，值回到进入编辑时的状态。`Enter` 仍不插入换行。`cancel` 事件不再冒泡：此前冒泡的自定义 `cancel` 会经 slot 进入外层浮层 shadow 内的 `<dialog>`（`composed` 与否都会），被当成关闭请求一并关掉（issue #159）；监听请挂在组件本身。
