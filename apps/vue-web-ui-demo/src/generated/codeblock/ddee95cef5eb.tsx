export default function Demo() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <web-ui-empty></web-ui-empty>
      <web-ui-empty title="只有标题"></web-ui-empty>
      <web-ui-empty description="这一段只有描述，标题位不会占位。"></web-ui-empty>
      <web-ui-empty>
        <web-ui-button slot="action" variant="primary">
          重新加载
        </web-ui-button>
      </web-ui-empty>
      <web-ui-empty title="标题加描述" description="两段文案位，没有别的。"></web-ui-empty>
      <web-ui-empty title="标题加操作">
        <web-ui-button slot="action" variant="primary">
          重新加载
        </web-ui-button>
      </web-ui-empty>
      <web-ui-empty description="描述加操作，没有标题行。">
        <web-ui-button slot="action" variant="primary">
          重新加载
        </web-ui-button>
      </web-ui-empty>
      <web-ui-empty title="三段齐全" description="标题、描述与操作区都占位。">
        <web-ui-button slot="action" variant="primary">
          重新加载
        </web-ui-button>
      </web-ui-empty>
    </div>
  )
}
