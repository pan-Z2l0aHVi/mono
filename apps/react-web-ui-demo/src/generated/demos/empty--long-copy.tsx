export default function Demo() {
  return (
    <web-ui-empty
      title="这一段标题写得很长，用来确认它在内容宽度里换行而不是把盒子顶宽"
      description="描述同样是一段长文案，里面放一个不会自然断开的长标识符 https://example.com/a-very-long-shared-resource-path-that-does-not-fit，用来看 overflow-wrap 的行为。"
    ></web-ui-empty>
  )
}
