import { useCounterStore } from '@/stores/counter'

import ButtonDemo from '../../components/button-demo'

function Home() {
  const { count, increment, decrement, reset } = useCounterStore()

  return (
    <div className="p-12px">
      <title>Home</title>
      <h3>Welcome Home!</h3>

      <div className="mt-16px flex items-center gap-8px">
        <span className="text-14px text-gray-500">zustand counter:</span>
        <span className="min-w-32px text-center text-18px font-bold">{count}</span>
        <web-ui-button onClick={decrement}>-1</web-ui-button>
        <web-ui-button onClick={increment}>+1</web-ui-button>
        <web-ui-button onClick={reset}>reset</web-ui-button>
      </div>

      <ButtonDemo />
    </div>
  )
}

export default Home
