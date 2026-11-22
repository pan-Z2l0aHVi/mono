import { QueryClient } from '@tanstack/react-query'

/** 路由数据层的唯一 QueryClient：loader 预取与页面内 query 共用同一份缓存。 */
export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } }
})
