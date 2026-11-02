export default function Demo() {
  return (
    <web-ui-checkbox-group name="toppings" value={['cheese']} required disabled>
      <web-ui-checkbox value="cheese">芝士</web-ui-checkbox>
      <web-ui-checkbox value="bacon">培根</web-ui-checkbox>
    </web-ui-checkbox-group>
  )
}
