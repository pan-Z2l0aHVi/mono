<template>
  <div class="flex w-full flex-col gap-3">
    <web-ui-textarea
      full
      disabled
      aria-label="Disabled multiline text"
      value="Disabled: readable, not editable"
    ></web-ui-textarea>
    <web-ui-textarea
      full
      readonly
      clearable
      aria-label="Readonly multiline text"
      value="Readonly: the clear button is hidden"
    ></web-ui-textarea>
  </div>
</template>
