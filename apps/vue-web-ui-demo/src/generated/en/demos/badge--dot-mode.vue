<template>
  <div class="flex flex-wrap items-center gap-8">
    <web-ui-badge dot>
      <web-ui-button variant="secondary">New messages</web-ui-button>
    </web-ui-badge>

    <web-ui-badge :count="5" dot>
      <web-ui-button variant="secondary">dot takes precedence over the number</web-ui-button>
    </web-ui-badge>

    <web-ui-badge :count="0" dot>
      <web-ui-button variant="secondary">Still drawn when count is 0</web-ui-button>
    </web-ui-badge>
  </div>
</template>
