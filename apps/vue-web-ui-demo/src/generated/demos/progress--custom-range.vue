<template>
  <div class="grid w-full max-w-xl gap-5">
    <web-ui-progress aria-label="已选条目" :max="40" :value="12" show-value></web-ui-progress>
    <web-ui-progress aria-label="已用存储空间" :max="256" :value="192" show-value></web-ui-progress>
  </div>
</template>
