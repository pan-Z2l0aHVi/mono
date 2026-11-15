<template>
  <div class="grid w-full max-w-xl gap-5">
    <web-ui-progress aria-label="文件校验中" :value="35" sport></web-ui-progress>
    <web-ui-progress aria-label="索引构建中" :max="200" :value="130" sport show-value></web-ui-progress>
  </div>
</template>
