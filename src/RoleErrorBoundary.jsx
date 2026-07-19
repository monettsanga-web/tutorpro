import { Component } from 'react'
import { ArrowLeft, RefreshCcw, ShieldAlert } from 'lucide-react'

export default class RoleErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="role-error-card" role="alert">
        <span><ShieldAlert size={29} /></span>
        <small>Dashboard recovery</small>
        <h2>This profile needs a safe refresh.</h2>
        <p>{this.state.error?.message || 'A profile field could not be displayed.'}</p>
        <div><button onClick={() => this.setState({ error: null })}><RefreshCcw size={16} /> Try again</button><button onClick={this.props.onBack}><ArrowLeft size={16} /> Return to Admin</button></div>
      </div>
    )
  }
}
