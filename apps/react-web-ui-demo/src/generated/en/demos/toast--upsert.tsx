import { toast } from '@greypan/web-ui'
import { useEffect, useState } from 'react'

const UPLOAD_ID = 'demo-upload'

export default function Demo() {
  const [step, setStep] = useState('Not started yet')

  useEffect(() => () => toast.clear(), [])

  function start() {
    setStep('0%')
    toast.info('Uploading 0%', { id: UPLOAD_ID, duration: 0 })
  }

  function progress() {
    setStep('60%')
    toast.info('Uploading 60%', { id: UPLOAD_ID })
  }

  function finish() {
    setStep('Done')
    toast.success('Upload complete', { id: UPLOAD_ID, duration: 3000 })
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <div className="flex flex-wrap gap-2">
        <web-ui-button onClick={start}>Start upload</web-ui-button>
        <web-ui-button onClick={progress}>Progress 60%</web-ui-button>
        <web-ui-button onClick={finish}>Done</web-ui-button>
      </div>
      <output className="text-sm text-(--wui-color-text-secondary)">
        id: {UPLOAD_ID} · current: {step}
      </output>
    </div>
  )
}
