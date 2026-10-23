<template>
  <div class="flex flex-wrap items-center gap-8">
    <web-ui-badge :count="5">
      <web-ui-button variant="secondary">未读 5 条</web-ui-button>
    </web-ui-badge>

    <web-ui-badge :count="5" badge-hidden>
      <web-ui-button variant="secondary">同样 5 条，角标隐藏</web-ui-button>
    </web-ui-badge>

    <web-ui-badge dot badge-hidden>
      <web-ui-button variant="secondary">dot 也一起隐藏</web-ui-button>
    </web-ui-badge>
  </div>
</template>
