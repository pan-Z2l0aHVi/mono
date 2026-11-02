<template>
  <div class="flex flex-wrap items-center gap-8">
    <web-ui-badge :count="8" :offset-x="-4" :offset-y="4">
      <web-ui-button variant="secondary">Number pulled inward</web-ui-button>
    </web-ui-badge>

    <web-ui-badge dot :offset-x="-6" :offset-y="6">
      <web-ui-button variant="secondary">The dot takes the offset too</web-ui-button>
    </web-ui-badge>

    <web-ui-badge :count="8" :offset-x="10" :offset-y="-10">
      <web-ui-button variant="secondary">Pushed outward</web-ui-button>
    </web-ui-badge>
  </div>
</template>
