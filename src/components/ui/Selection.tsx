/**
 * Design-tool selection marks: four edges that draw themselves one after another and four
 * square corner handles. Sits just outside its parent (which needs `position: relative`).
 * The parent's classes decide when it shows: see `.ui-sel` in index.css.
 */
export function Selection({ tone = 'blue' }: { tone?: 'blue' | 'orange' }) {
  return (
    <span aria-hidden="true" className={`ui-sel ${tone === 'orange' ? 'is-orange' : ''}`}>
      <span className="ui-sel-edge top" />
      <span className="ui-sel-edge right" />
      <span className="ui-sel-edge bottom" />
      <span className="ui-sel-edge left" />
      <span className="ui-sel-handle -left-[4.5px] -top-[4.5px]" />
      <span className="ui-sel-handle -right-[4.5px] -top-[4.5px]" />
      <span className="ui-sel-handle -bottom-[4.5px] -left-[4.5px]" />
      <span className="ui-sel-handle -bottom-[4.5px] -right-[4.5px]" />
    </span>
  )
}
