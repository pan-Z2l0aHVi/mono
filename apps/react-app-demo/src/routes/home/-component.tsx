import { useCounterStore } from '@/stores/counter'

import ButtonDemo from '../../components/button-demo'
import IconDemo from '../../components/icon-demo'

function Home() {
  const { count, increment, decrement, reset } = useCounterStore()

  return (
    <div className="p-3">
      <title>Home</title>
      <h3>Welcome Home!</h3>

      <div className="mt-4 flex items-center gap-2">
        <span className="text-sm text-gray-500">zustand counter:</span>
        <span className="min-w-8 text-center text-lg font-bold">{count}</span>
        <web-ui-button onClick={decrement}>-1</web-ui-button>
        <web-ui-button onClick={increment}>+1</web-ui-button>
        <web-ui-button onClick={reset}>reset</web-ui-button>
      </div>

      <ButtonDemo />
      <IconDemo />
    </div>
  )
}

export default Home
