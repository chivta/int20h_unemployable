import { createFileRoute } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'

const AdminPage = lazy(() =>
  import('../modules/admin/index').then((m) => ({ default: m.AdminPage }))
)

export const Route = createFileRoute('/admin')({
  component: () => (
    <Suspense fallback={<div className="flex h-screen items-center justify-center text-sm text-gray-400">Loading…</div>}>
      <AdminPage />
    </Suspense>
  ),
})
