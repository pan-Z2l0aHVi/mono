<template>
  <web-ui-dropdown>
    <web-ui-button slot="trigger" variant="secondary">文件</web-ui-button>
    <web-ui-dropdown-item submenu>
      新建
      <web-ui-dropdown-item submenu>
        办公文档
        <web-ui-dropdown-item value="word">Word 文档</web-ui-dropdown-item>
        <web-ui-dropdown-item value="excel">Excel 表格</web-ui-dropdown-item>
      </web-ui-dropdown-item>
      <web-ui-dropdown-item submenu>
        代码文件
        <web-ui-dropdown-item value="typescript">TypeScript</web-ui-dropdown-item>
        <web-ui-dropdown-item value="python">Python</web-ui-dropdown-item>
      </web-ui-dropdown-item>
    </web-ui-dropdown-item>
    <web-ui-dropdown-item value="export">导出</web-ui-dropdown-item>
  </web-ui-dropdown>
</template>
