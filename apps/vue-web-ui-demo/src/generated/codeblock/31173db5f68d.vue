<template>
  <div class="grid w-full max-w-xl gap-5">
    <web-ui-progress aria-label="Selected items" :max="40" :value="12" show-value></web-ui-progress>
    <web-ui-progress aria-label="Storage used" :max="256" :value="192" show-value></web-ui-progress>
  </div>
</template>
