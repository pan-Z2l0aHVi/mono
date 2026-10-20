import { lucideSearch } from '@greypan/web-ui/icons'

function EmptyDemo() {
  return (
    <div>
      <h1>empty state</h1>
      <h2>Basic</h2>
      <web-ui-empty
        className="mb-6"
        title="Nothing here yet"
        description="There is nothing to show in this area yet."
      ></web-ui-empty>

      <h2>Action</h2>
      <web-ui-empty
        className="mb-6"
        title="No search results"
        description="Try adjusting the filters or the search keyword."
      >
        <web-ui-button slot="action" variant="primary">
          Clear filters
        </web-ui-button>
      </web-ui-empty>

      <h2>Custom content</h2>
      <web-ui-empty className="mb-6">
        <web-ui-icon slot="icon" icon={lucideSearch} size={28}></web-ui-icon>
        <span>No matching items found</span>
        <span slot="description">Try a shorter or different keyword.</span>
        <web-ui-button slot="action" variant="secondary">
          Back to the list
        </web-ui-button>
      </web-ui-empty>

      <h2>Size</h2>
      <div className="grid gap-3">
        <web-ui-empty size={40} title="Small empty state"></web-ui-empty>
        <web-ui-empty size={56} title="Default empty state"></web-ui-empty>
        <web-ui-empty size={72} title="Large empty state"></web-ui-empty>
      </div>

      <h2>Title only</h2>
      <web-ui-empty className="mb-6" title="No permission"></web-ui-empty>

      <h2>Edge layout</h2>
      <div className="grid gap-3">
        <web-ui-empty>
          <strong>Uses the default slot title only</strong>
        </web-ui-empty>
        <web-ui-empty
          title="Long content"
          description="A neutral paragraph that verifies long-copy layout. It never overflows a constrained container; it wraps naturally and stays readable."
        ></web-ui-empty>
      </div>
    </div>
  )
}
export default EmptyDemo
