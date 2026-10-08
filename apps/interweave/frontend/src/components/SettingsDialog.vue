<script setup lang="ts">
import type { WebUiDialog, WebUiEvent, WebUiRadio, WebUiSegmented } from '@greypan/web-ui'
import { storeToRefs } from 'pinia'
import { ref } from 'vue'

import { metadataLabelClass, metadataRowClass } from '@/components/library/presentation'
import { ACCENT_PRESETS, useSettingsStore, type ThemeAppearance } from '@/stores/settings'

defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const settings = useSettingsStore()
const { appearance, accent } = storeToRefs(settings)

type SettingsTab = 'general' | 'appearance' | 'library'

/** 面板选择在会话内保持，不入存储：重开设置回到「通用」才是预期的落点。 */
const activeTab = ref<SettingsTab>('general')

const THEME_APPEARANCES: readonly { value: ThemeAppearance; label: string }[] = [
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
  { value: 'system', label: '跟随系统' }
]

const TABS: readonly { value: SettingsTab; label: string }[] = [
  { value: 'general', label: '通用' },
  { value: 'appearance', label: '外观' },
  { value: 'library', label: '资源库' }
]

function isSettingsTab(value: string): value is SettingsTab {
  return TABS.some(tab => tab.value === value)
}

function isThemeAppearance(value: string): value is ThemeAppearance {
  return THEME_APPEARANCES.some(item => item.value === value)
}

function handleOpenChange(event: WebUiEvent<WebUiDialog, 'open-change'>) {
  if (event.target !== event.currentTarget) return
  emit('update:open', event.detail.open)
}

/*
 * web-ui-segmented 是纯受控组件：直接设 value 不派发事件，只有用户点中某个 trigger 才走
 * group controller 派一次 change。所以这两条路径都是「监听事件 → 读回新值 → 回写」，
 * 组件内部状态一概不碰。
 */
function handleTabChange(event: WebUiEvent<WebUiSegmented, 'change'>) {
  const next = event.currentTarget.value
  if (isSettingsTab(next)) activeTab.value = next
}

function handleAppearanceChange(event: WebUiEvent<WebUiSegmented, 'change'>) {
  const next = event.currentTarget.value
  if (isThemeAppearance(next)) settings.setAppearance(next)
}

/*
 * 色板的唯一写入路径。调用方是每个选项里的原生按钮——理由见模板里的注释：
 * web-ui-radio 的可点区域在 shadow 内的 <label> 上，:host 自身没有尺寸规则，把 host 放进
 * 布局容器并不会让点击区跟着长到内容上，group 的 change 根本不派发。
 *
 * 这里刻意直接写 store，而不是「合成一次点击转发进 web-ui-radio、再听它的 change 回写」：
 * 后者多绕一圈却换不到任何东西——radio 在这一格已是 pointer-events-none 的纯显示层，
 * 而它一旦被从显示层升回写入层，store 就会出现两个写入者。保持单一入口。
 */
function pickAccent(value: string) {
  settings.setAccent(value)
}
</script>

<template>
  <!--
    controlled：open 的唯一真相在宿主。Escape 与遮罩点击因此只派发关闭请求，由宿主回写 open
    才走退出动画——否则组件自行改 open，而 Vue 侧的 vdom 仍认为它是 true，两边就此分叉。

    挂载点是 AppLayout 里 web-ui-layout 的同级节点，不进它的 light DOM：未分配到任何 slot
    的 light 子节点在 shadow DOM 宿主下没有盒子，放进去反而不会渲染。侧边栏（含 ≤640px
    的抽屉）是 web-ui-layout 内部的子树，原生 dialog 提升进 top layer 后不受其 overflow、
    transform 与 aside 的 display:none 影响。

    closable：关闭按钮由组件渲染（绝对定位到卡片右上角的 26px icon 按钮，偏移 20/20）。此前这里是
    宿主自绘的一枚 ghost 按钮加一条 footer「关闭」按钮，两条关闭入口各画一遍——自绘那枚还
    得自己跟窄屏挤不挤、图标尺寸对齐，现在整套几何归组件，宿主只留标题文字。
  -->
  <web-ui-dialog
    :open="open"
    controlled
    closable
    class="[--wui-dialog-width:min(90vw,480px)] [--wui-dialog-max-height:calc(min(90vh,328px)_-_158px)]"
    @open-change="handleOpenChange"
  >
    <!--
      「设置分区」是卡片的固定 chrome，和标题同一段，落在滚动区之外。

      它不能待在内容区：segmented 按住时胶囊按 scale(1.5) 放大，横向越出轨道
      `0.25×胶囊宽 − 4`（最左那颗 52 宽 → 9px），而任何 overflow 非 visible 的祖先都在自己的
      padding box 上裁剪——组件的 `.desc` 只留 6px，应用此前又套了一层侧向 padding 为 0 的
      滚动宿主，这 9px 就被切平（t-0081 实测左沿被切 9px，t-0084 复测 9.9px）。
      卡片 chrome 的侧向 padding 是 24px，容得下这 9px，搬进来就没有裁剪边了。
    -->
    <div slot="header" class="flex flex-col gap-4 font-normal">
      <span>设置</span>
      <web-ui-segmented class="w-full" :value="activeTab" aria-label="设置分区" @change="handleTabChange">
        <web-ui-segmented-trigger v-for="tab in TABS" :key="tab.value" :value="tab.value">
          {{ tab.label }}
        </web-ui-segmented-trigger>
      </web-ui-segmented>
    </div>

    <!--
      固定高度：切 tab 不再让 dialog 长高矮。三个 tab 的面板高度本来差很多（实测
      通用 66 / 外观 156 / 资源库 92.4），此前由内容撑高，切一次跳一次。

      `--wui-dialog-max-height` 的语义是「内容区高度」（见 @greypan/web-ui 的 dialog），
      上限由组件的 `.desc` 承担；这里给面板一个 min-height 顶住 token，`.desc` 就不会在
      内容不足时收缩到内容高——不是 height，也不是把上限交回内容，「切 tab 不跳」才成立。
      token 声明在外层 web-ui-dialog 上，内层作为后代继承得到，两个数不会走散。
      token 里减掉的 158 是本 dialog 的 chrome 实测值（默认 header 模式 + closable），
      量自 web-ui-dialog shadow 内各段：

        卡片上 padding        20（上）+ 24（下）
        .header 带外高         89.59（标题 21.59 + 标题下 gap 16 + segmented 36 + 带下 margin 16）
        .desc margin-top       −6（focus-ring 上余量的成对负 margin，扣回 title 下方间距）
        .desc padding-block   12（focus-ring 余量）
        .desc margin-bottom   18
        .wui-dialog-footer    0（closable 的关闭按钮已绝对定位、不占行，footer slot 已空）
        ------------------------------------------
        chrome                157.59 → 158（向上取整，留亚像素余量）

      面板侧实测最高的一档是「外观」156（主题行 + accent 色板）。
      328 = 158 (chrome) + 156 (最高内容) + 12 (focus ring 余量，见 .desc) + 2 (亚像素余量)。
      余下 2px 落在色板下方的空处，看不出来，却能挡住「别的平台行差半像素就让最高的一档
      凭空长出滚动条」。

      max-height 写 min(90vh, ...) 再减 chrome，是为了让矮视口下整张卡片跟着缩，
      而不是内容被裁在 328px 里。

      面板不再自己套滚动宿主：常规尺寸下 156 装得进 token，`overflow: auto` 不滚动也照样
      按 padding box 裁剪。溢出这件事交给组件 `.desc` 处理——它有 6px 焦点余量，只在内容
      真的超出时才滚（实测 320px 宽那档外观面板 186 才触发）。
    -->
    <div class="flex min-h-(--wui-dialog-max-height) flex-col">
      <!--
        通用：MCP 开关是纯静态占位。disabled 而非隐藏，是为了让「这一栏存在但还没做」在
        界面上可见；文案承担解释，控件本身不假装可用。
      -->
      <div v-if="activeTab === 'general'" :class="metadataRowClass">
        <div class="flex min-w-0 flex-col gap-0.5">
          <span class="text-sm text-(--wui-color-text)">MCP server</span>
          <span :class="metadataLabelClass">即将推出</span>
        </div>
        <web-ui-switch disabled aria-label="MCP server（即将推出）" />
      </div>

      <div v-else-if="activeTab === 'appearance'" class="flex flex-col">
        <!--
          主题三态切到 system 时 web-ui-theme 走自己的圆形揭示过渡：那个动画跟着
          resolved appearance 的变化跑，宿主只改 appearance attribute，不绕过它。
        -->
        <div :class="metadataRowClass">
          <span class="text-sm text-(--wui-color-text)">主题</span>
          <web-ui-segmented :value="appearance" aria-label="主题模式" variant="raised" @change="handleAppearanceChange">
            <web-ui-segmented-trigger v-for="item in THEME_APPEARANCES" :key="item.value" :value="item.value">
              {{ item.label }}
            </web-ui-segmented-trigger>
          </web-ui-segmented>
        </div>

        <!--
          accent 预设平铺。选中态由 accent 派生，圆点之外再给一枚实心色块，让「当前 accent」
          在选项列表里直接看得见——切完之后整窗的强调色都会跟着变。

          这一格用原生 button，而不是让 web-ui-radio 承担点击——这不是「这里排版特殊」，
          是组件的通用形状：**web-ui-radio 的可点区域是 shadow 里那个 <label>，而它的 :host
          没有任何尺寸规则**（radio/style.css 全文只有 .wui-radio-circle 与 .wui-radio-dot）。
          host 因此是个 0×0 的盒子：把它放进任何布局容器，容器给它的盒子再大，点击区也只覆盖
          那个 0×0 的 host，不会跟着长到内容上。浏览器实测点 host 中心时 group.value 纹丝不动、
          localStorage 为空，而直接点 shadow 里的 label 才切成功——事件根本没派发出来。
          所以凡是把 web-ui-radio 摆进 flex/grid 布局当可点控件的地方，都要同样处理。
          本格的做法：button 承担点击，web-ui-radio 只负责显示选中态（pointer-events-none），
          aria-checked 与 checked 同源于 accent，两个入口共用 pickAccent 这一条写入路径。
        -->
        <div class="flex flex-col gap-2 px-4 py-3">
          <span class="text-xs leading-5 text-[#8a8a94] dark:text-(--wui-color-text-secondary)">强调色</span>
          <div role="radiogroup" aria-label="强调色" class="flex flex-wrap gap-x-4 gap-y-2">
            <div v-for="preset in ACCENT_PRESETS" :key="preset.value" class="flex items-center gap-1.5">
              <button
                type="button"
                role="radio"
                :aria-checked="accent === preset.value"
                :aria-label="`强调色 ${preset.label}`"
                class="grid size-4 cursor-pointer place-items-center rounded-full border border-black/25 bg-transparent p-0 dark:border-white/35"
                @click="pickAccent(preset.value)"
              >
                <span
                  class="rounded-full transition-transform"
                  :class="accent === preset.value ? 'scale-100' : 'scale-0'"
                  :style="{ width: '10px', height: '10px', background: preset.value }"
                  aria-hidden="true"
                />
              </button>
              <web-ui-radio
                :value="preset.value"
                :checked="accent === preset.value"
                :aria-label="preset.label"
                class="pointer-events-none"
              >
                {{ preset.label }}
              </web-ui-radio>
            </div>
          </div>
        </div>
      </div>

      <!-- 资源库设置尚未实现，与 pages/SettingsPage.vue 一样先占位。 -->
      <web-ui-empty
        v-else
        description="资源库设置尚未实现"
        :size="64"
        class="[--wui-empty-min-height:0] [--wui-empty-padding:0]"
      />
    </div>
  </web-ui-dialog>
</template>
