import { AppProvider } from './state/context'
import { Toolbar } from './components/Toolbar'
import { OffersPanel } from './components/OffersPanel'
import { FlowCanvas } from './components/FlowCanvas'
import { Sidebar } from './components/Sidebar'
import { ValidationBanner } from './components/ValidationBanner'
import { JsonViewer } from './components/JsonViewer'

export function AdminPage() {
  return (
    <AppProvider>
      <div className="flex h-screen flex-col overflow-hidden bg-white">
        <Toolbar />
        <OffersPanel />
        <ValidationBanner />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <FlowCanvas />
        </div>
        <JsonViewer />
      </div>
    </AppProvider>
  )
}
