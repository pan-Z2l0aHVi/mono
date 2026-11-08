import { afterEach, describe, expect, it } from 'vite-plus/test'

import { navigatePopoverLinks } from '../link-navigation'

describe('navigatePopoverLinks', () => {
  afterEach(() => document.body.replaceChildren())

  it('moves between the input and links without cycling', () => {
    const input = document.createElement('input')
    const links = [document.createElement('a'), document.createElement('a')]
    for (const link of links) link.href = '/example'
    document.body.append(input, ...links)
    for (const element of [input, ...links])
      element.addEventListener('keydown', event => navigatePopoverLinks(event as KeyboardEvent, input, links))

    const press = (element: HTMLElement, key: string) => element.dispatchEvent(new KeyboardEvent('keydown', { key }))
    input.focus()
    press(input, 'ArrowDown')
    expect(document.activeElement).toBe(links[0])
    press(links[0]!, 'ArrowDown')
    expect(document.activeElement).toBe(links[1])
    press(links[1]!, 'ArrowDown')
    expect(document.activeElement).toBe(links[1])
    press(links[1]!, 'ArrowUp')
    press(links[0]!, 'ArrowUp')
    expect(document.activeElement).toBe(input)
  })
})
