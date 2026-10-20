<template>
  <div>
    <h1>badge</h1>

    <h2>Basic</h2>
    <div class="mb-3 flex items-center gap-6">
      <web-ui-badge :count="5">
        <web-ui-button>Messages</web-ui-button>
      </web-ui-badge>
      <web-ui-badge :count="0">
        <web-ui-button>No notifications</web-ui-button>
      </web-ui-badge>
      <web-ui-badge :count="0" show-zero>
        <web-ui-button>Show zero</web-ui-button>
      </web-ui-badge>
    </div>

    <h2>Above max</h2>
    <div class="mb-3 flex items-center gap-6">
      <web-ui-badge :count="100">
        <web-ui-button>Notifications</web-ui-button>
      </web-ui-badge>
      <web-ui-badge :count="99999" :max="999">
        <web-ui-button>Large number</web-ui-button>
      </web-ui-badge>
      <web-ui-badge :count="10" :max="9">
        <web-ui-button>max=9</web-ui-button>
      </web-ui-badge>
    </div>

    <h2>Dot mode</h2>
    <div class="mb-3 flex items-center gap-6">
      <web-ui-badge dot>
        <web-ui-button>New message</web-ui-button>
      </web-ui-badge>
      <web-ui-badge :count="5" dot>
        <web-ui-button>Dot first</web-ui-button>
      </web-ui-badge>
    </div>

    <h2>Standalone (no wrapped content)</h2>
    <div class="mb-3 flex items-center gap-4">
      <web-ui-badge :count="3" />
      <web-ui-badge :count="128" />
      <web-ui-badge dot />
      <web-ui-badge :count="0" show-zero />
    </div>

    <h2>Position</h2>
    <div class="mb-3 flex items-center gap-6">
      <web-ui-badge :count="1" placement="top-right">
        <web-ui-button>Top right</web-ui-button>
      </web-ui-badge>
      <web-ui-badge :count="2" placement="top-left">
        <web-ui-button>Top left</web-ui-button>
      </web-ui-badge>
      <web-ui-badge :count="3" placement="bottom-right">
        <web-ui-button>Bottom right</web-ui-button>
      </web-ui-badge>
      <web-ui-badge :count="4" placement="bottom-left">
        <web-ui-button>Bottom left</web-ui-button>
      </web-ui-badge>
    </div>

    <h2>Offset</h2>
    <div class="mb-3 flex items-center gap-6">
      <web-ui-badge :count="8" :offset-x="-4" :offset-y="4">
        <web-ui-button>Rounded button</web-ui-button>
      </web-ui-badge>
      <web-ui-badge dot :offset-x="-4" :offset-y="4">
        <web-ui-button>Dot badge</web-ui-button>
      </web-ui-badge>
    </div>

    <h2>Hidden</h2>
    <div class="mb-3 flex items-center gap-6">
      <web-ui-badge :count="5" badge-hidden>
        <web-ui-button>Hidden badge</web-ui-button>
      </web-ui-badge>
    </div>
  </div>
</template>
