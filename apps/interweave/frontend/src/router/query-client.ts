import { QueryClient } from '@tanstack/vue-query'

/** 路由数据层的唯一 QueryClient：守卫预取与页面内 useQuery 共用同一份缓存。 */
export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } }
})
