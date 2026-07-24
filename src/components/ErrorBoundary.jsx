import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Unhandled application error', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <main className="main">
        <div className="state-panel error-panel" role="alert">
          <div className="state-icon">!</div>
          <h2>Something went wrong</h2>
          <p>{this.state.error.message || 'The page could not be displayed.'}</p>
          <button className="primary-button" onClick={() => window.location.reload()}>Reload application</button>
        </div>
      </main>
    )
  }
}
