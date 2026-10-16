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

| 名称       | 说明                                                                    |
| ---------- | ----------------------------------------------------------------------- |
| `focus()`  | 聚焦宿主；启用时宿主带 `tabindex="0"`，可直接接受键盘输入。             |
| `blur()`   | 让宿主失焦。                                                            |
| `select()` | 进入编辑态并全选内容；已在编辑态时只重新全选。`disabled` 时不进入编辑。 |
