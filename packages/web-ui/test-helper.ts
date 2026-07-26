import { vi } from 'vite-plus/test'

// jsdom does not implement scrolling; tests assert the surrounding lock state.
vi.stubGlobal('scrollTo', vi.fn())
