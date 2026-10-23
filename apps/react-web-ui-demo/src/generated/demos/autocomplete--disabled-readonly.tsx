const frameworks = ['Vue', 'React', 'Svelte', 'Angular']

export default function Demo() {
  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-autocomplete value="Vue" disabled placeholder="禁用">
        {frameworks.map(name => (
          <web-ui-option key={name} value={name} label={name}></web-ui-option>
        ))}
      </web-ui-autocomplete>
      <web-ui-autocomplete value="Vue" readonly placeholder="只读">
        {frameworks.map(name => (
          <web-ui-option key={name} value={name} label={name}></web-ui-option>
        ))}
      </web-ui-autocomplete>
    </div>
  )
}
