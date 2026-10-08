<script setup lang="ts">
/*
 * 中间省略的观感只有放进**有确定宽度**的盒子里才看得出来：宿主没有宽度约束时整串本来就放得下，
 * 组件不会截断。所以下面每个例子都套了定宽容器；「容器宽度」一节用百分比宽度（各自带上限），
 * 窗口收窄时能看到它跟着重算。
 */
const FILENAME = 'very-long-file-name-abcdefghij.txt'
const MIXED = '项目报告-final-终稿-abcdefghij.docx'
const NO_SPACE = 'a'.repeat(120)
// 字素簇样本：ZWJ 序列（👩‍💻 = U+1F469 U+200D U+1F4BB）与「基字符 + 变体选择符」
// （⚠️ = U+26A0 U+FE0F）各重复若干次，全部写成转义——U+200D 与 U+FE0F 零宽，字面量丢了读不出来。
const CLUSTER_MIX = `${'\u{1F469}\u200D\u{1F4BB}'.repeat(16)}${'\u{26A0}\uFE0F'.repeat(8)}`
// 百分比宽度那一组用长一点的路径：窄窗口到宽窗口都还能确定溢出，缩放的差别才看得出来
const LONG_PATH = 'assets/images/screenshots/2026/06/very-long-file-name-abcdefghij.png'

const POSITIONS = [0, 50, 80, 100] as const
</script>

<template>
  <div>
    <h1>中间省略</h1>

    <h2>基础</h2>
    <p class="mb-2 text-sm text-(--wui-color-text-secondary)">
      单行文本保留首尾、丢掉中间。<code>text-overflow: ellipsis</code> 只能保住头部，长文件名因此会丢掉真正
      区分它们的扩展名。
    </p>
    <web-ui-middle-ellipsis class="mb-6 w-48" :text="FILENAME"></web-ui-middle-ellipsis>

    <h2>中英混排</h2>
    <web-ui-middle-ellipsis class="mb-6 w-48" :text="MIXED"></web-ui-middle-ellipsis>

    <h2>超长文本与字素簇</h2>
    <p class="mb-2 text-sm text-(--wui-color-text-secondary)">
      不换行，切点只落在字素簇边界上。第二行整行都是 ZWJ 序列与「基字符 + 变体选择符」，
      无论切在哪里都应当整簇保留，不会出现半个 emoji 或落单的连接符。
    </p>
    <div class="mb-6 grid gap-3">
      <web-ui-middle-ellipsis class="w-48" :text="NO_SPACE"></web-ui-middle-ellipsis>
      <web-ui-middle-ellipsis class="w-48" :text="CLUSTER_MIX"></web-ui-middle-ellipsis>
    </div>

    <h2>标记</h2>
    <p class="mb-2 text-sm text-(--wui-color-text-secondary)">
      <code>marker</code> 换掉中间那个省略号；空串表示「只截断、不给可见信号」。
    </p>
    <div class="grid gap-3">
      <web-ui-middle-ellipsis class="w-48" :text="FILENAME" marker="[..]"></web-ui-middle-ellipsis>
      <web-ui-middle-ellipsis class="w-48" :text="FILENAME" marker=""></web-ui-middle-ellipsis>
    </div>
    <p class="mt-2 mb-6 text-sm text-(--wui-color-text-secondary)">
      第二行确实被截断了，只是看不出来——把鼠标移上去，<code>title</code> 里是完整的原文。
    </p>

    <h2>标记位置</h2>
    <p class="mb-2 text-sm text-(--wui-color-text-secondary)">
      <code>marker-position</code> 是标记所在的横向比例，0–100，默认 <code>50</code>。<code>0</code> 贴行末
      （等价于末尾省略），<code>100</code> 贴行首。文件名希望尾部多留一些就取大于 50 的值。
    </p>
    <div class="mb-6 grid gap-3">
      <div v-for="position in POSITIONS" :key="position">
        <div class="mb-1 text-xs text-(--wui-color-text-secondary)">marker-position: {{ position }}</div>
        <web-ui-middle-ellipsis class="w-48" :text="FILENAME" :marker-position="position"></web-ui-middle-ellipsis>
      </div>
    </div>

    <h2>容器宽度</h2>
    <p class="mb-2 text-sm text-(--wui-color-text-secondary)">
      宽度由容器给出，容器变化后重算：缩窄截得更狠，放宽则收回截断。下面两个盒子是百分比宽度，
      各自带一个上限——上限保证在宽屏上也仍然溢出，否则窗口够宽时整串放得下，盒子里就什么都看不到了。
    </p>
    <div class="mb-6 grid gap-3">
      <div>
        <div class="mb-1 text-xs text-(--wui-color-text-secondary)">宽度 1/3（上限 192px）</div>
        <web-ui-middle-ellipsis class="w-1/3 max-w-48" :text="LONG_PATH"></web-ui-middle-ellipsis>
      </div>
      <div>
        <div class="mb-1 text-xs text-(--wui-color-text-secondary)">宽度 1/6（上限 128px）</div>
        <web-ui-middle-ellipsis class="w-1/6 max-w-32" :text="LONG_PATH"></web-ui-middle-ellipsis>
      </div>
    </div>

    <h2>已知限制</h2>
    <p class="text-sm text-(--wui-color-text-secondary)">
      元素里装的就是屏幕上那一串，因此<strong>选中复制、页内查找、读屏</strong>拿到的都是截断后的文本； 完整原文只挂在
      <code>title</code> 上（悬停可见）。CSS 的 <code>text-overflow</code> 没有这个问题—— 它从不改动文本节点——这是用
      JavaScript 算切点绕不开的代价。
    </p>
  </div>
</template>
