export default function Demo() {
  return (
    <div className="grid w-full max-w-xl gap-5">
      <web-ui-progress aria-label="Profile completion" value={24}></web-ui-progress>
      <web-ui-progress aria-label="Upload progress" value={62}></web-ui-progress>
      <web-ui-progress aria-label="Sync complete" value={100}></web-ui-progress>
    </div>
  )
}
