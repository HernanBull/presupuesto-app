import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('CRITICAL_REACT_CRASH:', error, errorInfo);
    if (typeof window !== 'undefined') {
      window.__last_error = {
        message: error?.message,
        stack: error?.stack,
        componentStack: errorInfo?.componentStack
      };
    }
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mb-6 shadow-lg shadow-red-500/5">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-2xl font-black text-zinc-100 mb-2">Algo no salió como esperábamos</h2>
          <p className="text-sm text-zinc-400 max-w-md mb-6">
            Ocurrió un error al cargar esta sección. Puedes recargar la página o volver al directorio.
          </p>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 max-w-lg w-full mb-6 text-left overflow-auto max-h-48">
            <div className="text-xs font-mono text-red-400 font-bold mb-1">
              {this.state.error?.name}: {this.state.error?.message}
            </div>
            <pre className="text-[10px] font-mono text-zinc-500 whitespace-pre-wrap">
              {this.state.error?.stack}
            </pre>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-md"
            >
              <RefreshCw size={14} /> Recargar Página
            </button>
            <button
              onClick={() => { window.location.href = '/'; }}
              className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl font-bold text-xs flex items-center gap-2 transition-all"
            >
              <Home size={14} /> Volver al Inicio
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
