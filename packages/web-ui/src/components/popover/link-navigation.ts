/** Move focus between an input and a list of links using the vertical arrow keys.
 * Returns whether the event was handled. The caller owns panel visibility and Escape behavior.
 */
export function navigatePopoverLinks(
  event: KeyboardEvent,
  input: HTMLElement,
  links: readonly HTMLAnchorElement[]
): boolean {
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return false
  const index = links.findIndex(link => link === event.target)
  if (event.target !== input && index < 0) return false
  const next = event.key === 'ArrowDown' ? links[index + 1] : index === 0 ? input : links[index - 1]
  if (!next) return false
  event.preventDefault()
  next.focus()
  return true
}
