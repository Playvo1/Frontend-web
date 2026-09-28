import './StatCard.css'

// Dashboard statistics card (shared component listed in the SRS): icon +
// label, the main value (orange) and a short note. `noteEmphasis` renders a
// bold prefix before the note (e.g. "+12%").
function StatCard({ icon: Icon, label, value, note, noteEmphasis }) {
  return (
    <article className="stat-card">
      <h3 className="stat-card-label">
        {Icon && <Icon className="stat-card-icon" size={20} aria-hidden="true" />}
        {label}
      </h3>
      <p className="stat-card-value">{value}</p>
      {(note || noteEmphasis) && (
        <p className="stat-card-note">
          {noteEmphasis && <strong className="stat-card-note-emphasis">{noteEmphasis}</strong>}{' '}
          {note}
        </p>
      )}
    </article>
  )
}

export default StatCard
