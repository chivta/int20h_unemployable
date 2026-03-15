import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { AppProvider } from '../modules/admin/state/context'

export const Route = createRootRoute({
  component: () => (
    <AppProvider>
      <Outlet />
      {import.meta.env.DEV && <TanStackRouterDevtools />}
    </AppProvider>
  ),
})
