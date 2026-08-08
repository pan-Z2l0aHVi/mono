/**
 * Tracks whether the next reactive state update was caused by user interaction.
 *
 * Lit updates are asynchronous, so a boolean that is reset immediately after
 * assigning a property would be lost before `updated()` runs. Components use
 * this small controller to keep `*-change` events user-originated only.
 */
export class UserChangeController {
  private pending = false

  mark() {
    this.pending = true
  }

  consume(): boolean {
    const pending = this.pending
    this.pending = false
    return pending
  }
}
