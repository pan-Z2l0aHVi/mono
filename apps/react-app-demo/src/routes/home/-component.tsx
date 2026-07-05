import { useCounterStore } from '@/stores/counter'

export default () => {
  const { count, increment, decrement, reset } = useCounterStore()

  return (
    <div className="p-12px">
      <title>Home</title>
      <h3>Welcome Home!</h3>

      <div className="mt-16px flex items-center gap-8px">
        <span className="text-14px text-gray-500">zustand counter:</span>
        <span className="min-w-32px text-center text-18px font-bold">{count}</span>
        <button className="rounded-4px border px-12px py-4px hover:bg-gray-100" onClick={decrement}>
          -1
        </button>
        <button className="rounded-4px border px-12px py-4px hover:bg-gray-100" onClick={increment}>
          +1
        </button>
        <button className="rounded-4px border px-12px py-4px text-gray-400 hover:bg-gray-100" onClick={reset}>
          reset
        </button>
      </div>
    </div>
  )
}
