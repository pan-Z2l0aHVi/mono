<template>
  <div class="grid w-full max-w-xl gap-5">
    <web-ui-progress aria-label="Verifying files" :value="35" sport></web-ui-progress>
    <web-ui-progress aria-label="Building index" :max="200" :value="130" sport show-value></web-ui-progress>
  </div>
</template>
