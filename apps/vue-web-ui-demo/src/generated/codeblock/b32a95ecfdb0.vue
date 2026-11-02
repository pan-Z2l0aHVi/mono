<template>
  <div class="flex flex-col gap-3">
    <web-ui-textarea autosize full placeholder="输入多行内容，高度随内容增长"></web-ui-textarea>
    <web-ui-textarea autosize full :max-height="120" placeholder="超过 120px 之后在框内滚动"></web-ui-textarea>
  </div>
</template>
