import { toast, type ToastPosition } from '@greypan/web-ui'
import { useRef, useEffect } from 'react'

function ToastDemo() {
  const idCounter = useRef(0)
  const countdownIdCounter = useRef(0)
  const countdownTimers = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map())

  useEffect(() => {
    const timers = countdownTimers.current
    return () => {
      for (const timer of timers.values()) clearInterval(timer)
      timers.clear()
    }
  }, [])

  const handleShowSuccess = () => toast.success('操作已保存到云端', { heading: '保存成功' })
  const handleShowInfo = () => toast.info('新版本 v2.1.0 已可用', { heading: '版本更新' })
  const handleShowWarning = () => toast.warning('磁盘空间不足 10%', { heading: '存储空间' })
  const handleError = () => toast.error('网络连接中断，将在恢复后自动重试', { heading: '连接失败', duration: 5000 })
  const handleWithoutHeading = () => toast.success('操作成功完成！')
  const handleCustomDuration = () => toast.info('这条消息会在 1 秒后消失', { heading: '快速通知', duration: 1000 })

  const handleWithId = () => {
    idCounter.current++
    toast.success(`已创建 toast #${idCounter.current}`, { heading: '任务完成', id: `demo-${idCounter.current}` })
  }

  const handleCloseById = () => {
    if (idCounter.current > 0) toast.close(`demo-${idCounter.current}`)
  }

  const handleCloseAll = () => {
    toast.clear()
    idCounter.current = 0
  }
  const handleNotClosable = () =>
    toast.info('此通知将在 5 秒后自动消失', { heading: '自动关闭', closable: false, duration: 5000 })

  const handleLongMessage = () =>
    toast.warning(
      '这是一条非常长的消息内容，用于测试换行和自动换行的效果。当消息内容超过最大宽度时，应该自动换行显示最多三行。',
      { heading: '长文本通知', closable: true }
    )

  const handlePositionWith = (pos: string) =>
    toast.success('来自不同位置的 toast', { heading: pos, position: pos as ToastPosition })

  const handleCountdownUpdate = () => {
    let remaining = 10
    const id = `countdown-${++countdownIdCounter.current}`
    toast.info(`将在 ${remaining} 秒后自动关闭`, {
      heading: '倒计时更新',
      id,
      closable: false,
      duration: remaining * 1000
    })
    const timer = setInterval(() => {
      remaining--
      if (remaining === 0) {
        clearInterval(timer)
        countdownTimers.current.delete(id)
        return
      }
      toast.updateMessage(id, { message: `将在 ${remaining} 秒后自动关闭` })
    }, 1000)
    countdownTimers.current.set(id, timer)
  }

  const handleMany = () => {
    for (let i = 0; i < 7; i++) toast.info(`队列中的第 ${i + 1} 条消息`, { heading: `队列 #${i + 1}`, id: `many-${i}` })
  }

  const positions = [
    { value: 'top-left', label: '左上' },
    { value: 'top-center', label: '上中' },
    { value: 'top-right', label: '右上' },
    { value: 'bottom-left', label: '左下' },
    { value: 'bottom-center', label: '下中' },
    { value: 'bottom-right', label: '右下' }
  ]

  return (
    <div>
      <h1>Toast 通知</h1>

      <h2>基础类型</h2>
      <p className="mb-3 text-sm text-gray-500">支持带标题和不带标题两种模式</p>
      <div className="mb-6 flex flex-wrap gap-2">
        <web-ui-button onClick={handleShowSuccess}>Success</web-ui-button>
        <web-ui-button onClick={handleShowInfo}>Info</web-ui-button>
        <web-ui-button onClick={handleShowWarning}>Warning</web-ui-button>
        <web-ui-button onClick={handleError}>Error</web-ui-button>
        <web-ui-button onClick={handleWithoutHeading}>无标题</web-ui-button>
      </div>

      <h2>自定义 duration</h2>
      <div className="mb-6 flex flex-wrap gap-2">
        <web-ui-button onClick={handleCustomDuration}>1 秒后关闭</web-ui-button>
        <web-ui-button variant="secondary" onClick={handleCountdownUpdate}>
          10 秒倒计时更新
        </web-ui-button>
      </div>

      <h2>不可手动关闭</h2>
      <div className="mb-6">
        <web-ui-button onClick={handleNotClosable}>不可关闭 (5s)</web-ui-button>
      </div>

      <h2>长文本</h2>
      <div className="mb-6">
        <web-ui-button onClick={handleLongMessage}>长文本 Toast</web-ui-button>
      </div>

      <h2>不同位置</h2>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {positions.map(p => (
          <web-ui-button key={p.value} variant="secondary" onClick={() => handlePositionWith(p.value)}>
            {p.label}
          </web-ui-button>
        ))}
      </div>

      <h2>ID 管理</h2>
      <div className="mb-6 flex flex-wrap gap-2">
        <web-ui-button onClick={handleWithId}>创建带 ID 的 Toast</web-ui-button>
        <web-ui-button variant="secondary" onClick={handleCloseById}>
          关闭最后一个
        </web-ui-button>
      </div>

      <h2>批量关闭</h2>
      <div className="mb-6 flex flex-wrap gap-2">
        <web-ui-button onClick={handleMany}>创建 7 个 Toast (队列测试)</web-ui-button>
        <web-ui-button variant="secondary" onClick={handleCloseAll}>
          全部关闭
        </web-ui-button>
      </div>
    </div>
  )
}
export default ToastDemo
