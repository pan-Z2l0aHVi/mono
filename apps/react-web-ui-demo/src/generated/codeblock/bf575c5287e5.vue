<template>
  <div class="grid gap-3 sm:grid-cols-2">
    <web-ui-empty></web-ui-empty>
    <web-ui-empty title="Only the title"></web-ui-empty>
    <web-ui-empty description="This section only has a description, so no title space is reserved."></web-ui-empty>
    <web-ui-empty>
      <web-ui-button slot="action" variant="primary">Reload</web-ui-button>
    </web-ui-empty>
    <web-ui-empty title="Title and description" description="The two copy segments, nothing else."></web-ui-empty>
    <web-ui-empty title="Title plus an action">
      <web-ui-button slot="action" variant="primary">Reload</web-ui-button>
    </web-ui-empty>
    <web-ui-empty description="Description plus an action, no title line.">
      <web-ui-button slot="action" variant="primary">Reload</web-ui-button>
    </web-ui-empty>
    <web-ui-empty title="The full set" description="All three segments take space.">
      <web-ui-button slot="action" variant="primary">Reload</web-ui-button>
    </web-ui-empty>
  </div>
</template>
