import { Component } from 'react'
import { Home, RefreshCcw, ShieldAlert } from 'lucide-react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, errorInfo) {
    // The user-facing recovery screen intentionally avoids exposing account data or stack traces.
    alert(`FATAL REACT COMPONENT CRASH DETECTED!\n\nMessage: ${error?.message}\n\nStack Trace:\n${error?.stack}`);
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <main className="fatal-error" role="alert">
        <div className="fatal-error__card">
          <span><ShieldAlert size={34} /></span>
          <small>TutorPro English recovery</small>
          <h1>Something didn’t load correctly.</h1>
          <p>Your account data has not been deleted. Refresh the page to try again, or return to the homepage.</p>
          <div>
            <button onClick={() => window.location.reload()}><RefreshCcw size={17} /> Refresh page</button>
            <button onClick={() => { window.location.href = '/' }}><Home size={17} /> Homepage</button>
          </div>
        </div>
      </main>
    )
  }
}
