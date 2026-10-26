<template>
  <div class="flex flex-col items-start gap-6">
    <web-ui-checkbox-group direction="horizontal" :value="['apple']">
      <web-ui-checkbox value="apple">Apple</web-ui-checkbox>
      <web-ui-checkbox value="banana">Banana</web-ui-checkbox>
      <web-ui-checkbox value="cherry">Cherry</web-ui-checkbox>
    </web-ui-checkbox-group>

    <web-ui-checkbox-group direction="horizontal" class="[--wui-checkbox-group-gap:16px]" :value="['apple']">
      <web-ui-checkbox value="apple">Apple</web-ui-checkbox>
      <web-ui-checkbox value="banana">Banana</web-ui-checkbox>
      <web-ui-checkbox value="cherry">Cherry</web-ui-checkbox>
    </web-ui-checkbox-group>
  </div>
</template>
