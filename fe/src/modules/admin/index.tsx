import { AppProvider } from './state/context'
import { Toolbar } from './components/Toolbar'
import { FlowCanvas } from './components/FlowCanvas'
import { ValidationBanner } from './components/ValidationBanner'
export function AdminPage() {
  return (
    <AppProvider>
      <div className="flex h-screen flex-col overflow-hidden bg-white">
        <Toolbar />
        <ValidationBanner />
        <div className="flex flex-1 overflow-hidden">
          <FlowCanvas />
        </div>
      </div>
    </AppProvider>
  )
}
