export default function Demo() {
  return (
    <web-ui-checkbox-group name="toppings" value={['cheese']} required disabled>
      <web-ui-checkbox value="cheese">Cheese</web-ui-checkbox>
      <web-ui-checkbox value="bacon">Bacon</web-ui-checkbox>
    </web-ui-checkbox-group>
  )
}
