<template>
  <div class="flex flex-wrap items-center gap-8">
    <web-ui-badge :count="1" placement="top-right">
      <web-ui-button variant="secondary">top-right（默认）</web-ui-button>
    </web-ui-badge>

    <web-ui-badge :count="2" placement="top-left">
      <web-ui-button variant="secondary">top-left</web-ui-button>
    </web-ui-badge>

    <web-ui-badge :count="3" placement="bottom-right">
      <web-ui-button variant="secondary">bottom-right</web-ui-button>
    </web-ui-badge>

    <web-ui-badge :count="4" placement="bottom-left">
      <web-ui-button variant="secondary">bottom-left</web-ui-button>
    </web-ui-badge>
  </div>
</template>
