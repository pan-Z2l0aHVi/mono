<template>
  <div class="flex flex-wrap items-center gap-8">
    <web-ui-badge :count="8" :offset-x="-4" :offset-y="4">
      <web-ui-button variant="secondary">数字往内收</web-ui-button>
    </web-ui-badge>

    <web-ui-badge dot :offset-x="-6" :offset-y="6">
      <web-ui-button variant="secondary">圆点同样吃偏移</web-ui-button>
    </web-ui-badge>

    <web-ui-badge :count="8" :offset-x="10" :offset-y="-10">
      <web-ui-button variant="secondary">向外推开</web-ui-button>
    </web-ui-badge>
  </div>
</template>
