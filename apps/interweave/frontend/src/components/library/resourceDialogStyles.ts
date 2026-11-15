/** 两栏资源对话框共用的表面与队列几何。滚动区域的内边距给焦点环留出空间。 */
export const resourceDialogColumnClass = 'grid min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)] gap-2.5'
export const resourceDialogQueueClass =
  'h-full min-h-0 overflow-y-auto rounded-[18px] bg-white dark:bg-(--wui-color-surface-raised)'
export const resourceDialogEmptyClass =
  'grid h-full min-h-0 place-items-center rounded-[18px] bg-white dark:bg-(--wui-color-surface-raised)'
export const resourceDialogRowClass =
  "relative flex min-w-0 items-start justify-between gap-4 px-2.5 py-2 after:absolute after:inset-x-2.5 after:bottom-0 after:h-px after:bg-[#1b1b20]/6 after:content-[''] last:after:hidden dark:after:bg-white/8"
