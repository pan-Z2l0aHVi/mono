<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-editable-text
      value="Disabled: cannot be clicked and is out of the tab order"
      disabled
      aria-label="Disabled"
    ></web-ui-editable-text>
    <web-ui-editable-text
      placeholder="Disabled and empty: still shows the placeholder"
      disabled
      aria-label="Disabled empty"
    ></web-ui-editable-text>
    <web-ui-editable-text
      value="Readonly: can select and copy, cannot edit"
      readonly
      aria-label="Readonly"
    ></web-ui-editable-text>
  </div>
</template>
