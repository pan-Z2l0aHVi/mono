export default function Demo() {
  return (
    <web-ui-checkbox-group direction="horizontal" value={['apple']}>
      <web-ui-checkbox value="apple">Apple</web-ui-checkbox>
      <web-ui-checkbox value="banana">Banana</web-ui-checkbox>
      <web-ui-checkbox value="cherry">Cherry</web-ui-checkbox>
    </web-ui-checkbox-group>
  )
}
