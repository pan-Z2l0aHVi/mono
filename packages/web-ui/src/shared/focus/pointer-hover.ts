/** WebKit 在按住指针移出后可能仍匹配 :hover 和 :active。 */
export function markPressedPointerOutside(event: PointerEvent) {
  if (event.buttons !== 0) (event.currentTarget as HTMLElement).dataset.pointerOutside = ''
}

export function clearPressedPointerOutside(event: Event) {
  delete (event.currentTarget as HTMLElement).dataset.pointerOutside
}
