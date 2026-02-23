import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) return (
      <div style={{background:"#030810",color:"#ff4d8d",minHeight:"100vh",padding:40,fontFamily:"monospace"}}>
        <h1 style={{color:"#00e5ff",marginBottom:16}}>Topic Viewer - Error</h1>
        <pre style={{whiteSpace:"pre-wrap",fontSize:14}}>{this.state.error.message}</pre>
        <pre style={{whiteSpace:"pre-wrap",fontSize:11,color:"#c77dff",marginTop:12}}>{this.state.error.stack}</pre>
      </div>
    );
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
