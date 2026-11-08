import { describe, expect, it, vi } from 'vite-plus/test'

import type { WebUiOption } from '@/components/option'
import { createComboboxNavigation } from '@/shared/option-portal/combobox-navigation'

/*
 * 游标 / typeahead / 锚点语义断言自 select.spec 与 autocomplete.spec 迁移而来
 * （迁移不复制）：组件 spec 只留键位路由 smoke 与 ARIA 输出断言，
 * 状态机语义用 fake option 对象在这里直接断言。
 */

interface FakeOption {
  value: string
  label: string
  disabled?: boolean
  /** autocomplete 语义：被过滤隐藏的候选。 */
  filtered?: boolean
  /** select 语义：portal 感知的 live 判据（已从 DOM 移除即失效）。 */
  connected?: boolean
}

function fakeOption(spec: FakeOption): FakeOption {
  return { connected: true, ...spec }
}

/** fake option 按 WebUiOption 的结构子集使用；hooks 拿到的引用再还原回 fake 形状。 */
const asFake = (option: WebUiOption): FakeOption => option as unknown as FakeOption

/** 构造 select 风格 hooks：live 感知 + 选中项优先锚点 + 立即指针接管。 */
function createSelectStyleNavigation(options: FakeOption[], value = '') {
  const onActiveChange = vi.fn<() => void>()
  const nav = createComboboxNavigation({
    getOptions: () => options as unknown as WebUiOption[],
    isEnabled: option => {
      const o = asFake(option)
      return !o.disabled && o.connected !== false
    },
    isOpen: () => true,
    onActiveChange,
    getInitialAnchor: enabled => {
      const selectedIndex = enabled.findIndex(option => option.value === value)
      return selectedIndex >= 0 ? selectedIndex : enabled.length ? 0 : -1
    },
    getFallbackAnchor: enabled => {
      const selected = options.find(option => option.value === value && !option.disabled && option.connected !== false)
      return selected ? (enabled as unknown as FakeOption[]).indexOf(selected) : -1
    },
    canPointerTakeOver: () => nav.activeIndex >= 0
  })
  return { nav, onActiveChange }
}

/** 构造 autocomplete 风格 hooks：过滤感知 + 首个 enabled 锚点 + 旗标式指针接管。 */
function createAutocompleteStyleNavigation(options: FakeOption[]) {
  const onActiveChange = vi.fn<() => void>()
  const nav = createComboboxNavigation({
    getOptions: () => options as unknown as WebUiOption[],
    isEnabled: option => {
      const o = asFake(option)
      return !o.disabled && !o.filtered
    },
    isOpen: () => true,
    onActiveChange,
    getInitialAnchor: enabled => (enabled.length ? 0 : -1),
    canPointerTakeOver: () => !nav.isKeyboardNavigationActive()
  })
  return { nav, onActiveChange }
}

function pointerOver(pointerType: 'mouse' | 'touch' = 'mouse'): PointerEvent {
  const event = new Event('pointerover', { bubbles: true }) as PointerEvent
  Object.defineProperty(event, 'pointerType', { value: pointerType })
  return event
}

describe('shared/option-portal/combobox-navigation', () => {
  describe('环绕导航', () => {
    it('无激活起点向下取首项、向上取末项', () => {
      const options = ['a', 'b', 'c'].map(value => fakeOption({ value, label: value }))
      const { nav } = createSelectStyleNavigation(options)

      nav.navigate(1)
      expect(nav.activeIndex).toBe(0)

      nav.clearActive()
      nav.navigate(-1)
      expect(nav.activeIndex).toBe(2)
    })

    it('从首项向上环绕到末项（迁自 select「ArrowUp 打开后再次按下循环到末尾」）', () => {
      const options = ['apple', 'banana', 'cherry'].map(value => fakeOption({ value, label: value }))
      const { nav } = createSelectStyleNavigation(options)

      nav.activateInitialAnchor()
      expect(nav.activeIndex).toBe(0)

      nav.navigate(-1)
      expect(nav.activeIndex).toBe(2)
    })

    it('disabled 项被导航跳过（迁自 autocomplete「禁用 option 被键盘导航跳过」）', () => {
      const options = [
        fakeOption({ value: 'a', label: 'a' }),
        fakeOption({ value: 'b', label: 'b', disabled: true }),
        fakeOption({ value: 'c', label: 'c' })
      ]
      const { nav } = createAutocompleteStyleNavigation(options)

      nav.activateInitialAnchor()
      nav.navigate(1)
      expect(nav.activeIndex).toBe(2)
    })

    it('过滤项被导航跳过（迁自 autocomplete「过滤后 ArrowDown 跳过非匹配候选」）', () => {
      const options = [
        fakeOption({ value: 'a', label: 'a' }),
        fakeOption({ value: 'b', label: 'b', filtered: true }),
        fakeOption({ value: 'c', label: 'c' })
      ]
      const { nav } = createAutocompleteStyleNavigation(options)

      nav.activateInitialAnchor()
      nav.navigate(1)
      expect(nav.activeIndex).toBe(2)
    })

    it('enabled 为空时导航与边界都是空转', () => {
      const { nav, onActiveChange } = createSelectStyleNavigation([
        fakeOption({ value: 'a', label: 'a', disabled: true })
      ])

      nav.navigate(1)
      nav.moveToBoundary(true)
      nav.moveToBoundary(false)
      expect(nav.activeIndex).toBe(-1)
      expect(onActiveChange).not.toHaveBeenCalled()
    })
  })

  describe('锚点策略', () => {
    it('select：键盘打开时选中项优先，无选中取首个 enabled 项', () => {
      const options = [
        fakeOption({ value: 'apple', label: 'Apple' }),
        fakeOption({ value: 'banana', label: 'Banana' }),
        fakeOption({ value: 'cherry', label: 'Cherry' })
      ]
      const { nav } = createSelectStyleNavigation(options, 'banana')

      nav.activateInitialAnchor()
      expect(nav.activeIndex).toBe(1)

      const { nav: withoutSelection } = createSelectStyleNavigation(options)
      withoutSelection.activateInitialAnchor()
      expect(withoutSelection.activeIndex).toBe(0)
    })

    it('select：导航起点失效时折入选中项而不是方向默认', () => {
      const options = [
        fakeOption({ value: 'apple', label: 'Apple' }),
        fakeOption({ value: 'banana', label: 'Banana' }),
        fakeOption({ value: 'cherry', label: 'Cherry' })
      ]
      const { nav } = createSelectStyleNavigation(options, 'banana')

      // 选中项 banana 是起点：向上到 apple、向下到 cherry，而不是从 -1 取首/末项
      nav.navigate(-1)
      expect(nav.activeIndex).toBe(0)

      nav.clearActive()
      nav.navigate(1)
      expect(nav.activeIndex).toBe(2)
    })

    it('autocomplete：键盘打开锚定首个 enabled 项，全部过滤时保持无激活', () => {
      const options = [fakeOption({ value: 'a', label: 'a', filtered: true }), fakeOption({ value: 'b', label: 'b' })]
      const { nav } = createAutocompleteStyleNavigation(options)

      nav.activateInitialAnchor()
      expect(nav.activeIndex).toBe(1)

      const allFiltered = createAutocompleteStyleNavigation([fakeOption({ value: 'a', label: 'a', filtered: true })])
      allFiltered.nav.activateInitialAnchor()
      expect(allFiltered.nav.activeIndex).toBe(-1)
    })
  })

  describe('Home / End 边界', () => {
    it('Home 到首个 enabled 项、End 到末个 enabled 项，首尾禁用项被跳过（迁自 select「展开态 Home、End」）', () => {
      const options = [
        fakeOption({ value: 'disabled-start', label: 'Disabled start', disabled: true }),
        fakeOption({ value: 'apple', label: 'Apple' }),
        fakeOption({ value: 'elm', label: 'Elm' }),
        fakeOption({ value: 'cherry', label: 'Cherry' }),
        fakeOption({ value: 'disabled-end', label: 'Disabled end', disabled: true })
      ]
      const { nav } = createSelectStyleNavigation(options)

      nav.moveToBoundary(true)
      expect(nav.activeIndex).toBe(1)

      nav.moveToBoundary(false)
      expect(nav.activeIndex).toBe(3)
    })
  })

  describe('typeahead（仅 select 接线）', () => {
    it('单字符前缀匹配并把激活项移到匹配项，不提交 value', () => {
      const options = [
        fakeOption({ value: 'apple', label: 'Apple' }),
        fakeOption({ value: 'elm', label: 'Elm' }),
        fakeOption({ value: 'react', label: 'React' }),
        fakeOption({ value: 'raspberry', label: 'Raspberry' }),
        fakeOption({ value: 'cherry', label: 'Cherry' })
      ]
      const { nav } = createSelectStyleNavigation(options)

      nav.typeahead('r')
      expect(nav.activeIndex).toBe(2)

      // 500ms 窗口内续键成多字符查询：react 仍匹配 "re"，保持不动
      nav.typeahead('e')
      expect(nav.activeIndex).toBe(2)
    })

    it('重复键在 enabled 内循环到下一匹配项', () => {
      const options = [
        fakeOption({ value: 'react', label: 'React' }),
        fakeOption({ value: 'raspberry', label: 'Raspberry' })
      ]
      const { nav } = createSelectStyleNavigation(options)

      nav.typeahead('r')
      expect(nav.activeIndex).toBe(0)
      nav.typeahead('r')
      expect(nav.activeIndex).toBe(1)
    })

    it('带点大写 İ 与 i 经 NFD 归一匹配（迁自 select「typeahead 将带点大写 I 与 i 匹配」）', () => {
      const dottedI = String.fromCharCode(0x130)
      const options = [
        fakeOption({ value: 'alpha', label: 'Alpha' }),
        fakeOption({ value: 'dotted-i', label: `${dottedI}tem` })
      ]
      const { nav } = createSelectStyleNavigation(options)

      nav.typeahead('i')
      expect(nav.activeIndex).toBe(1)
    })

    it.each([
      { name: 'disabled', invalidate: (option: FakeOption) => (option.disabled = true) },
      { name: 'removed', invalidate: (option: FakeOption) => (option.connected = false) }
    ])('多字符 typeahead 不延续到已 $name 的激活项', ({ invalidate }) => {
      const react = fakeOption({ value: 'react', label: 'React' })
      const options = [
        fakeOption({ value: 'apple', label: 'Apple' }),
        fakeOption({ value: 'elm', label: 'Elm' }),
        react,
        fakeOption({ value: 'raspberry', label: 'Raspberry' })
      ]
      const { nav } = createSelectStyleNavigation(options)

      nav.typeahead('r')
      expect(nav.activeIndex).toBe(2)

      invalidate(react)
      nav.typeahead('e')
      // "re" 的唯一匹配项已失效：回退到单字符 "e" 的下一个匹配 elm
      expect(nav.activeIndex).toBe(1)
    })
  })

  describe('指针接管', () => {
    it('select：有键盘激活时 option pointerover 立即清除激活并复位 typeahead', () => {
      const options = ['a', 'b'].map(value => fakeOption({ value, label: value }))
      const { nav, onActiveChange } = createSelectStyleNavigation(options)

      nav.activateInitialAnchor()
      expect(nav.activeIndex).toBe(0)

      nav.handleOptionPointerOver(pointerOver())
      expect(nav.activeIndex).toBe(-1)
      expect(onActiveChange).toHaveBeenCalled()

      // 清除后再次悬停不再触发（门槛：有激活项才接管）
      onActiveChange.mockClear()
      nav.handleOptionPointerOver(pointerOver())
      expect(onActiveChange).not.toHaveBeenCalled()
    })

    it('触摸 pointerover 不改写键盘激活（迁自 select「触摸指针进入 option 时保留键盘激活状态」）', () => {
      const options = ['a', 'b'].map(value => fakeOption({ value, label: value }))
      const { nav } = createSelectStyleNavigation(options)

      nav.activateInitialAnchor()
      nav.navigate(1)
      expect(nav.activeIndex).toBe(1)

      nav.handleOptionPointerOver(pointerOver('touch'))
      expect(nav.activeIndex).toBe(1)
    })

    it('autocomplete：键盘导航旗标置位时悬停不清除，列表 pointermove / wheel 语义清除', () => {
      const options = ['a', 'b'].map(value => fakeOption({ value, label: value }))
      const { nav } = createAutocompleteStyleNavigation(options)

      nav.activateInitialAnchor()
      expect(nav.isKeyboardNavigationActive()).toBe(true)
      expect(nav.activeIndex).toBe(0)

      nav.handleOptionPointerOver(pointerOver())
      expect(nav.activeIndex).toBe(0)

      nav.clearKeyboardNavigation()
      expect(nav.activeIndex).toBe(-1)
      expect(nav.isKeyboardNavigationActive()).toBe(false)
    })

    it('autocomplete：指针打开（旗标未置位）时悬停清除激活', () => {
      const options = ['a', 'b'].map(value => fakeOption({ value, label: value }))
      const { nav } = createAutocompleteStyleNavigation(options)

      nav.setActiveIndex(0)
      nav.handleOptionPointerOver(pointerOver())
      expect(nav.activeIndex).toBe(-1)
    })
  })

  describe('通道语义', () => {
    it('clearActive 通知渲染，成员轴回写与关闭清理静默', () => {
      const options = ['a'].map(value => fakeOption({ value, label: value }))
      const { nav, onActiveChange } = createSelectStyleNavigation(options)

      nav.setActiveIndex(0)
      expect(nav.activeIndex).toBe(0)
      expect(onActiveChange).not.toHaveBeenCalled()

      nav.resetForClose()
      expect(nav.activeIndex).toBe(-1)
      expect(onActiveChange).not.toHaveBeenCalled()
      expect(nav.isKeyboardNavigationActive()).toBe(false)

      nav.clearActive()
      expect(onActiveChange).toHaveBeenCalledTimes(1)
    })

    it('打开钩子的旗标由 markKeyboardNavigation 显式注入（指针打开为 false）', () => {
      const options = ['a'].map(value => fakeOption({ value, label: value }))
      const { nav } = createAutocompleteStyleNavigation(options)

      nav.markKeyboardNavigation(false)
      expect(nav.isKeyboardNavigationActive()).toBe(false)

      nav.navigate(1)
      expect(nav.isKeyboardNavigationActive()).toBe(true)
    })
  })
})
