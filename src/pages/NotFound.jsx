import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="state-panel not-found">
      <div className="state-code">404</div>
      <h2>Page not found</h2>
      <p>The football page you requested does not exist or the link is no longer valid.</p>
      <Link className="primary-button" to="/">Return home</Link>
    </div>
  )
}
