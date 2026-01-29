import { describe, expect, it } from 'vitest'

import { urlParse, urlStringify } from '..'

describe('url 单元测试', () => {
  describe('urlParse 测试', () => {
    it('应当能够解析带 Hash 的 URL', () => {
      expect(urlParse('https://developer.mozilla.org/en-US/docs/Web/API/URL/URL#specifications')).toEqual({
        base: 'https://developer.mozilla.org/en-US/docs/Web/API/URL/URL',
        query: {},
        hash: '#specifications'
      })
      expect(urlParse('https://www.deepl.com/en/translator#en/zh/placeholder')).toEqual({
        base: 'https://www.deepl.com/en/translator',
        query: {},
        hash: '#en/zh/placeholder'
      })
    })

    it('应当能够解析带 Query 参数的 URL', () => {
      expect(urlParse('https://segmentfault.com/search?q=xyz&w=123&e=aaa')).toEqual({
        base: 'https://segmentfault.com/search',
        query: {
          q: 'xyz',
          w: '123',
          e: 'aaa'
        },
        hash: ''
      })
    })

    it('应当能够解析仅包含路径（相对路径）的 URL', () => {
      expect(urlParse('/search?q=xyz&w=123&e=aaa#heading-1')).toEqual({
        base: '/search',
        query: {
          q: 'xyz',
          w: '123',
          e: 'aaa'
        },
        hash: '#heading-1'
      })
    })

    it('应当能够对 Query 参数进行自动解码 (decode)', () => {
      expect(
        urlParse('https://developer.mozilla.org/en-US/docs/Web/API/URL/URL?%E9%94%AE1=%E5%80%BC1&%E9%94%AE2=%E5%80%BC2')
      ).toEqual({
        base: 'https://developer.mozilla.org/en-US/docs/Web/API/URL/URL',
        query: {
          键1: '值1',
          键2: '值2'
        },
        hash: ''
      })
    })
  })

  describe('urlStringify 测试', () => {
    it('应当能够处理可选的参数成员 (仅 base、base+query、base+hash)', () => {
      expect(
        urlStringify({
          base: 'https://developer.mozilla.org/en-US/docs/Web/API/URL/URL'
        })
      ).toBe('https://developer.mozilla.org/en-US/docs/Web/API/URL/URL')

      expect(
        urlStringify({
          base: 'https://developer.mozilla.org/en-US/docs/Web/API/URL/URL',
          query: {
            q: 'xyz',
            w: '123',
            e: 'aaa'
          }
        })
      ).toBe('https://developer.mozilla.org/en-US/docs/Web/API/URL/URL?q=xyz&w=123&e=aaa')

      expect(
        urlStringify({
          base: 'https://www.deepl.com/en/translator',
          hash: '#en/zh/placeholder'
        })
      ).toBe('https://www.deepl.com/en/translator#en/zh/placeholder')
    })

    it('应当能够完整序列化包含 base, query 和 hash 的对象', () => {
      expect(
        urlStringify({
          base: 'https://developer.mozilla.org/en-US/docs/Web/API/URL/URL',
          query: {
            q: 'xyz',
            w: '123',
            e: 'aaa'
          },
          hash: '#specifications'
        })
      ).toBe('https://developer.mozilla.org/en-US/docs/Web/API/URL/URL?q=xyz&w=123&e=aaa#specifications')
    })

    it('应当能够对 Query 参数进行自动编码 (encode)', () => {
      expect(
        urlStringify({
          base: 'https://developer.mozilla.org/en-US/docs/Web/API/URL/URL',
          query: {
            键1: '值1',
            键2: '值2'
          },
          hash: ''
        })
      ).toBe('https://developer.mozilla.org/en-US/docs/Web/API/URL/URL?%E9%94%AE1=%E5%80%BC1&%E9%94%AE2=%E5%80%BC2')
    })
  })

  describe('urlParse|urlStringify 边缘情况与容错测试', () => {
    it('urlParse: 应当按照 URL 标准处理纯净 URL (自动补全根路径斜杠)', () => {
      const res = urlParse('https://google.com')
      expect(res.base).toBe('https://google.com/')
    })

    it('urlParse: 应当处理 Query 只有键没有值的情况', () => {
      const res = urlParse('https://test.com?debug&source=web')
      expect(res.base).toBe('https://test.com/')
      expect(res.query).toEqual({
        debug: '',
        source: 'web'
      })
    })

    it('urlParse: 重复键应当采用“覆盖”策略（保留最后一个）', () => {
      const url = 'https://test.com?id=1&id=2&id=3'
      const res = urlParse(url)
      expect(res.query).toEqual({ id: '3' })
    })

    it('urlStringify: 应当处理 Hash 不带 # 前缀的情况 (自动补全)', () => {
      expect(
        urlStringify({
          base: 'https://test.com/',
          hash: 'section1'
        })
      ).toBe('https://test.com/#section1')
    })

    it('urlStringify: 应当能正确处理带斜杠的标准 base', () => {
      expect(
        urlStringify({
          base: 'https://test.com/',
          query: { a: 1 }
        })
      ).toBe('https://test.com/?a=1')
    })
  })
})
