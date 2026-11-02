<template>
  <div class="grid gap-3 sm:grid-cols-2">
    <web-ui-empty
      class="[--wui-empty-min-height:120px] [--wui-empty-padding:16px_12px]"
      title="Height and padding squeezed"
      description="These two are enough to squeeze the empty state from a placeholder block into a single hint."
    ></web-ui-empty>

    <web-ui-empty
      class="[--wui-empty-icon-size:56px] [--wui-empty-icon-color:var(--wui-color-accent)]"
      title="Graphic enlarged and recolored"
      description="Changing only the color leaves opacity alone, so the graphic keeps the default lighter step."
    ></web-ui-empty>

    <web-ui-empty
      class="[--wui-empty-content-width:300px] [--wui-empty-action-margin-top:4px]"
      title="Content width constrained to 300px"
      description="Title, description, and action area share this one width."
    >
      <web-ui-button slot="action" variant="secondary">Check the gaps</web-ui-button>
    </web-ui-empty>

    <web-ui-empty
      class="[--wui-empty-title-color:var(--wui-color-accent)] [--wui-empty-description-color:var(--wui-color-text-tertiary)] [--wui-empty-title-font-size:20px]"
      title="Title and description recolored separately"
      description="Color and font size are four unrelated channels."
    ></web-ui-empty>
  </div>
</template>
