import { Component, type ReactNode } from 'react'
import { RefreshCw, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught:', error.message, info.componentStack)
  }

  reset() {
    this.setState({ error: null })
  }

  render() {
    if (!this.state.error) return this.props.children

    const isChunkError =
      this.state.error.name === 'ChunkLoadError' ||
      /Loading chunk|Failed to fetch dynamically imported module|Unable to preload CSS/i.test(
        this.state.error.message
      )

    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[50vh] px-6 text-center gap-4">
        <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="h-7 w-7 text-destructive" />
        </div>
        <div className="space-y-1">
          <h2 className="font-semibold text-lg text-foreground">Something went wrong</h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            {isChunkError
              ? 'A page failed to load — this usually happens after a network blip or a new deployment.'
              : 'An unexpected error occurred. Try again or reload the page.'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => this.reset()} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Try again
          </Button>
          <Button size="sm" onClick={() => window.location.reload()} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Reload page
          </Button>
        </div>
        {import.meta.env.DEV && (
          <pre className="mt-2 text-left text-[10px] text-muted-foreground bg-muted rounded-lg p-3 max-w-sm overflow-auto max-h-40 whitespace-pre-wrap">
            {this.state.error.message}
          </pre>
        )}
      </div>
    )
  }
}
