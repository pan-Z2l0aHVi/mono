import { toast } from '@greypan/web-ui'

// Create
toast.success('Operation succeeded')
toast.error('Something went wrong', { duration: 5000 })
toast.info('Informational message')
toast.warning('Please note')

// With options
const id = toast({ message: 'Custom', type: 'info', position: 'bottom-right', duration: 4000, closable: true })

// Close
toast.close(id)
toast.clear()

// upsert: another call with the same id updates that toast instead of creating another
toast.error('Network connection lost, retrying…', { id: 'network' })
toast.error('Network connection lost (retry 2)', { id: 'network' })

// One toast through its whole lifecycle
toast.info('Uploading 0%', { id: 'upload', duration: 0 })
toast.info('Uploading 60%', { id: 'upload' }) // duration omitted, the timer stays put
toast.success('Upload complete', { id: 'upload', duration: 3000 }) // type changed, countdown restarts
