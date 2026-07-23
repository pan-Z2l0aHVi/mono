<script setup lang="ts">
import {
  lucideFile,
  lucideCopy,
  lucideClipboardPaste,
  lucideTrash2,
  lucidePrinter,
  lucideSettings,
  lucideDownload,
  lucideUndo2,
  lucideRedo2,
  lucideSearch
} from '@greypan/web-ui/icons'
</script>

<template>
  <div>
    <h1>下拉菜单</h1>
    <h2>基础</h2>
    <div class="mb-6">
      <web-ui-dropdown-menu>
        <web-ui-button slot="trigger">操作</web-ui-button>
        <web-ui-dropdown-item>编辑</web-ui-dropdown-item>
        <web-ui-dropdown-item>复制</web-ui-dropdown-item>
        <web-ui-dropdown-item>粘贴</web-ui-dropdown-item>
        <web-ui-dropdown-divider></web-ui-dropdown-divider>
        <web-ui-dropdown-item disabled>删除</web-ui-dropdown-item>
      </web-ui-dropdown-menu>
    </div>

    <h2>带图标和快捷键</h2>
    <div class="mb-6">
      <web-ui-dropdown-menu>
        <web-ui-button slot="trigger">文件</web-ui-button>
        <web-ui-dropdown-item>
          <web-ui-icon slot="prefix" :size="14" :icon="lucideFile"></web-ui-icon>
          新建
          <span class="opacity-40" slot="suffix">⌘N</span>
        </web-ui-dropdown-item>
        <web-ui-dropdown-item>
          <web-ui-icon slot="prefix" :size="14" :icon="lucideCopy"></web-ui-icon>
          复制
          <span class="opacity-40" slot="suffix">⌘C</span>
        </web-ui-dropdown-item>
        <web-ui-dropdown-item>
          <web-ui-icon slot="prefix" :size="14" :icon="lucideClipboardPaste"></web-ui-icon>
          粘贴
          <span class="opacity-40" slot="suffix">⌘V</span>
        </web-ui-dropdown-item>
        <web-ui-dropdown-divider></web-ui-dropdown-divider>
        <web-ui-dropdown-item disabled>
          <web-ui-icon slot="prefix" :size="14" :icon="lucideTrash2"></web-ui-icon>
          删除
          <span class="opacity-40" slot="suffix">⌘⌫</span>
        </web-ui-dropdown-item>
      </web-ui-dropdown-menu>
    </div>

    <h2>嵌套菜单</h2>
    <div class="mb-6">
      <web-ui-dropdown-menu>
        <web-ui-button slot="trigger">更多</web-ui-button>
        <web-ui-dropdown-item>
          <web-ui-icon slot="prefix" :size="14" :icon="lucideUndo2"></web-ui-icon>
          撤销
          <span class="opacity-40" slot="suffix">⌘Z</span>
        </web-ui-dropdown-item>
        <web-ui-dropdown-item>
          <web-ui-icon slot="prefix" :size="14" :icon="lucideRedo2"></web-ui-icon>
          重做
          <span class="opacity-40" slot="suffix">⇧⌘Z</span>
        </web-ui-dropdown-item>
        <web-ui-dropdown-divider></web-ui-dropdown-divider>
        <web-ui-dropdown-item submenu>
          <web-ui-icon slot="prefix" :size="14" :icon="lucidePrinter"></web-ui-icon>
          导出为
          <web-ui-dropdown-item>导出为 PDF</web-ui-dropdown-item>
          <web-ui-dropdown-item>导出为 PNG</web-ui-dropdown-item>
          <web-ui-dropdown-item>导出为 SVG</web-ui-dropdown-item>
        </web-ui-dropdown-item>
        <web-ui-dropdown-item submenu>
          <web-ui-icon slot="prefix" :size="14" :icon="lucideDownload"></web-ui-icon>
          导入
          <web-ui-dropdown-item>从文件导入</web-ui-dropdown-item>
          <web-ui-dropdown-item>从剪贴板导入</web-ui-dropdown-item>
        </web-ui-dropdown-item>
        <web-ui-dropdown-divider></web-ui-dropdown-divider>
        <web-ui-dropdown-item>
          <web-ui-icon slot="prefix" :size="14" :icon="lucideSettings"></web-ui-icon>
          偏好设置
          <span class="opacity-40" slot="suffix">⌘,</span>
        </web-ui-dropdown-item>
      </web-ui-dropdown-menu>
    </div>

    <h2>深层嵌套（4 层）</h2>
    <div class="mb-6">
      <web-ui-dropdown-menu>
        <web-ui-button slot="trigger">深层导航</web-ui-button>

        <web-ui-dropdown-item submenu>
          <web-ui-icon slot="prefix" :size="14" :icon="lucideFile"></web-ui-icon>
          文件
          <web-ui-dropdown-item submenu>
            <web-ui-icon slot="prefix" :size="14" :icon="lucideFile"></web-ui-icon>
            新建
            <web-ui-dropdown-item submenu>
              办公文档
              <web-ui-dropdown-item>Word 文档</web-ui-dropdown-item>
              <web-ui-dropdown-item>Excel 表格</web-ui-dropdown-item>
            </web-ui-dropdown-item>
            <web-ui-dropdown-item submenu>
              代码文件
              <web-ui-dropdown-item>TypeScript</web-ui-dropdown-item>
              <web-ui-dropdown-item>Python</web-ui-dropdown-item>
            </web-ui-dropdown-item>
          </web-ui-dropdown-item>
          <web-ui-dropdown-item>
            <web-ui-icon slot="prefix" :size="14" :icon="lucideDownload"></web-ui-icon>
            导出
          </web-ui-dropdown-item>
        </web-ui-dropdown-item>

        <web-ui-dropdown-item submenu>
          <web-ui-icon slot="prefix" :size="14" :icon="lucideSettings"></web-ui-icon>
          编辑
          <web-ui-dropdown-item>
            <web-ui-icon slot="prefix" :size="14" :icon="lucideUndo2"></web-ui-icon>
            撤销
            <span class="opacity-40" slot="suffix">⌘Z</span>
          </web-ui-dropdown-item>
          <web-ui-dropdown-item>
            <web-ui-icon slot="prefix" :size="14" :icon="lucideRedo2"></web-ui-icon>
            重做
            <span class="opacity-40" slot="suffix">⇧⌘Z</span>
          </web-ui-dropdown-item>
        </web-ui-dropdown-item>
      </web-ui-dropdown-menu>
    </div>

    <h2>pl 对齐（macOS 风格）</h2>
    <div class="mb-6">
      <web-ui-dropdown-menu>
        <web-ui-button slot="trigger">Menu</web-ui-button>
        <web-ui-dropdown-item>
          <web-ui-icon slot="prefix" :size="14" :icon="lucideUndo2"></web-ui-icon>
          撤销
          <span slot="suffix" class="opacity-40">⌘Z</span>
        </web-ui-dropdown-item>
        <web-ui-dropdown-item>
          <web-ui-icon slot="prefix" :size="14" :icon="lucideRedo2"></web-ui-icon>
          重做
          <span slot="suffix" class="opacity-40">⇧⌘Z</span>
        </web-ui-dropdown-item>
        <web-ui-dropdown-divider></web-ui-dropdown-divider>
        <web-ui-dropdown-item>
          <web-ui-icon slot="prefix" :size="14" :icon="lucideClipboardPaste"></web-ui-icon>
          粘贴
          <span slot="suffix" class="opacity-40">⌘V</span>
        </web-ui-dropdown-item>
        <web-ui-dropdown-item>
          <web-ui-icon slot="prefix" :size="14" :icon="lucideClipboardPaste"></web-ui-icon>
          粘贴并匹配样式
          <span slot="suffix" class="opacity-40">⌥⇧⌘V</span>
        </web-ui-dropdown-item>
        <web-ui-dropdown-item>
          <web-ui-icon slot="prefix" :size="14" :icon="lucideTrash2"></web-ui-icon>
          删除
          <span slot="suffix" class="opacity-40">⌫</span>
        </web-ui-dropdown-item>
        <web-ui-dropdown-item pl="34px">全选<span slot="suffix" class="opacity-40">⌘A</span></web-ui-dropdown-item>
        <web-ui-dropdown-item pl="34px"
          >粘贴为引用<span slot="suffix" class="opacity-40">⇧⌘V</span></web-ui-dropdown-item
        >
        <web-ui-dropdown-item pl="34px" disabled
          >添加链接<span slot="suffix" class="opacity-40">⌘K</span></web-ui-dropdown-item
        >
        <web-ui-dropdown-divider></web-ui-dropdown-divider>
        <web-ui-dropdown-item submenu>
          <web-ui-icon slot="prefix" :size="14" :icon="lucideSearch"></web-ui-icon>
          查找
          <web-ui-dropdown-item>查找下一个</web-ui-dropdown-item>
          <web-ui-dropdown-item>查找上一个</web-ui-dropdown-item>
        </web-ui-dropdown-item>
        <web-ui-dropdown-divider></web-ui-dropdown-divider>
        <web-ui-dropdown-header>更多选项</web-ui-dropdown-header>
        <web-ui-dropdown-item pl="34px">听写<span slot="suffix" class="opacity-40">D</span></web-ui-dropdown-item>
        <web-ui-dropdown-item>
          <web-ui-icon slot="prefix" :size="14" :icon="lucideSettings"></web-ui-icon>
          表情
          <span slot="suffix" class="opacity-40">E</span>
        </web-ui-dropdown-item>
      </web-ui-dropdown-menu>
    </div>

    <h2>不同位置</h2>
    <div class="mb-6 flex gap-2">
      <web-ui-dropdown-menu placement="bottom-end">
        <web-ui-button slot="trigger">右下</web-ui-button>
        <web-ui-dropdown-item>Item 1</web-ui-dropdown-item>
        <web-ui-dropdown-item>Item 2</web-ui-dropdown-item>
      </web-ui-dropdown-menu>
      <web-ui-dropdown-menu placement="top-start">
        <web-ui-button slot="trigger">上方</web-ui-button>
        <web-ui-dropdown-item>Item 1</web-ui-dropdown-item>
        <web-ui-dropdown-item>Item 2</web-ui-dropdown-item>
      </web-ui-dropdown-menu>
      <web-ui-dropdown-menu placement="top-end">
        <web-ui-button slot="trigger">右上</web-ui-button>
        <web-ui-dropdown-item>Item 1</web-ui-dropdown-item>
        <web-ui-dropdown-item>Item 2</web-ui-dropdown-item>
      </web-ui-dropdown-menu>
    </div>

    <h2>禁用</h2>
    <div class="mb-6">
      <web-ui-dropdown-menu disabled>
        <web-ui-button slot="trigger">禁用菜单</web-ui-button>
        <web-ui-dropdown-item>Item 1</web-ui-dropdown-item>
        <web-ui-dropdown-item>Item 2</web-ui-dropdown-item>
      </web-ui-dropdown-menu>
    </div>
  </div>
</template>
