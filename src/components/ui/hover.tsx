/**
 * A label that rolls up on hover: the text slides out the top while a copy slides in from below.
 * The parent link needs the `roll-host` class. CSS in index.css runs it only with a real mouse.
 */
export function RollLabel({ children }: { children: string }) {
  return (
    <span className="roll">
      <span>{children}</span>
      <span aria-hidden="true">{children}</span>
    </span>
  )
}
