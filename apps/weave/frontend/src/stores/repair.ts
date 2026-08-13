import type { Candidate, RepairItem } from '@bindings/github.com/pan-Z2l0aHVi/mono/apps/weave/models'
import {
  AutoRepair,
  Dismiss,
  GetCandidates,
  ListRepairs,
  Repair
} from '@bindings/github.com/pan-Z2l0aHVi/mono/apps/weave/repairservice'
import { Events } from '@wailsio/runtime'
import { defineStore } from 'pinia'

export const useRepairStore = defineStore('repair', {
  state: () => ({
    repairs: [] as RepairItem[],
    loading: false,
    error: ''
  }),
  getters: {
    openCount(state): number {
      return state.repairs.filter(r => r.state === 'open').length
    }
  },
  actions: {
    async load() {
      this.loading = true
      try {
        this.repairs = await ListRepairs('')
      } catch (err) {
        this.error = String(err)
      } finally {
        this.loading = false
      }
    },
    async candidates(repairId: string): Promise<Candidate[]> {
      return GetCandidates(repairId)
    },
    async autoRepair(repairId: string): Promise<boolean> {
      const ok = await AutoRepair(repairId)
      await this.load()
      return ok
    },
    async repair(repairId: string, targetPath: string): Promise<void> {
      await Repair(repairId, targetPath)
      await this.load()
    },
    async dismiss(repairId: string): Promise<void> {
      await Dismiss(repairId)
      await this.load()
    },
    onQueueChanged() {
      void this.load()
    }
  }
})

let subscribed = false
export function subscribeRepairEvents() {
  if (subscribed) return
  subscribed = true
  Events.On('weave:repair-queue-changed', () => {
    useRepairStore().onQueueChanged()
  })
}
