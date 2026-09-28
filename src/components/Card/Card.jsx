import './Card.css'

// Shared dashboard panel: white card with an optional header (title,
// subtitle and an `actions` slot at the end edge — e.g. a date chip or a
// chart legend). Used by both dashboards.
function Card({ title, subtitle, actions, className = '', children, ...props }) {
  return (
    <section className={`card ${className}`.trim()} {...props}>
      {(title || actions) && (
        <header className="card-header">
          <div className="card-heading">
            {title && <h2 className="card-title">{title}</h2>}
            {subtitle && <p className="card-subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="card-actions">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  )
}

export default Card
