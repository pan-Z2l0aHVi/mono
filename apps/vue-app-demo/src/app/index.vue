<script setup lang="ts"></script>

<template>
  <web-ui-layout>
    <h1>Vite + Lit</h1>
    <div class="mb-[8px]">
      <web-ui-button>按钮</web-ui-button>
      <web-ui-button primary>Primary</web-ui-button>
      <web-ui-button text>Text</web-ui-button>
    </div>
    <div class="mb-[8px]">
      <web-ui-button full>Full</web-ui-button>
    </div>
    <web-ui-button> <span slot="prefix">prefix</span>按钮2<span slot="suffix">suffix</span> </web-ui-button>
    <web-ui-button is-icon> <span slot="prefix">prefix</span>icon </web-ui-button>
    <RouterView />
  </web-ui-layout>
  <web-ui-back-top></web-ui-back-top>
</template>
