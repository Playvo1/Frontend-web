import './Button.css'

// Shared Button used across both the Admin and Venue Owner dashboards.
// Keep it generic (variant + fullWidth) instead of one-off buttons per page.
function Button({ children, type = 'button', variant = 'primary', fullWidth = false, ...props }) {
  const className = ['btn', `btn-${variant}`, fullWidth ? 'btn-full-width' : ''].filter(Boolean).join(' ')

  return (
    <button type={type} className={className} {...props}>
      {children}
    </button>
  )
}

export default Button
