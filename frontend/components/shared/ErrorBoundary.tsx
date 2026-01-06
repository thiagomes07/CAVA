'use client';

import { Component, type ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      // Aqui você pode enviar o erro para um serviço de monitoramento
      // Ex: Sentry, LogRocket, etc.
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-mineral flex items-center justify-center p-6">
          <Card className="max-w-2xl w-full" variant="elevated">
            <CardContent className="text-center py-12">
              <AlertCircle className="w-16 h-16 text-rose-500 mx-auto mb-6" strokeWidth={1.5} />
              
              <h1 className="font-serif text-3xl text-obsidian mb-4">
                Algo deu errado
              </h1>
              
              <p className="text-slate-600 mb-8 max-w-md mx-auto">
                Ocorreu um erro inesperado. Nossa equipe foi notificada e está trabalhando para
                resolver o problema.
              </p>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="mb-8 text-left bg-rose-50 border border-rose-200 rounded-sm p-4 overflow-auto max-h-64">
                  <p className="font-mono text-sm text-rose-900 mb-2">
                    <strong>Error:</strong> {this.state.error.toString()}
                  </p>
                  {this.state.errorInfo && (
                    <pre className="font-mono text-xs text-rose-800 whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button
                  variant="primary"
                  onClick={this.handleReset}
                  className="w-full sm:w-auto"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Tentar Novamente
                </Button>
                
                <Button
                  variant="secondary"
                  onClick={() => window.location.href = '/dashboard'}
                  className="w-full sm:w-auto"
                >
                  Ir para Dashboard
                </Button>
              </div>

              <p className="text-xs text-slate-400 mt-8">
                Se o problema persistir, entre em contato com o suporte.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export function ErrorFallback({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center min-h-[400px] p-6">
      <div className="text-center max-w-md">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" strokeWidth={1.5} />
        
        <h3 className="font-serif text-xl text-obsidian mb-2">
          Erro ao carregar dados
        </h3>
        
        <p className="text-sm text-slate-600 mb-6">
          {error.message || 'Não foi possível carregar as informações'}
        </p>
        
        <Button onClick={reset} variant="secondary">
          Tentar Novamente
        </Button>
      </div>
    </div>
  );
}