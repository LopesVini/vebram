import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
  errorStack: string;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: "",
    errorStack: ""
  };

  public static getDerivedStateFromError(error: Error): State {
    return { 
      hasError: true, 
      errorMessage: error.message,
      errorStack: error.stack || "Nenhum stack trace disponível"
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-8 text-center z-[9999] relative">
          <h1 className="text-3xl font-bold text-red-500 mb-4">Erro de Renderização Capturado</h1>
          <p className="text-xl mb-4">A tela branca era na verdade este erro quebrando o React!</p>
          <div className="bg-muted text-muted-foreground p-6 rounded-lg max-w-4xl w-full text-left overflow-auto font-mono text-xs border border-red-500/30 whitespace-pre-wrap">
            <strong className="text-red-400 block mb-2">{this.state.errorMessage}</strong>
            {this.state.errorStack}
          </div>
          <button 
            onClick={() => window.location.href = '/'}
            className="mt-8 px-6 py-3 bg-accent text-accent-foreground rounded-full hover:scale-105 transition-transform"
          >
            Voltar para o Início
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
