<template>
  <web-ui-dropdown>
    <web-ui-button slot="trigger" variant="secondary">More</web-ui-button>
    <web-ui-dropdown-item value="undo">Undo</web-ui-dropdown-item>
    <web-ui-dropdown-item submenu>
      Export as
      <web-ui-dropdown-item value="pdf">PDF</web-ui-dropdown-item>
      <web-ui-dropdown-item value="png">PNG</web-ui-dropdown-item>
    </web-ui-dropdown-item>
  </web-ui-dropdown>
</template>
