import { FileText, Truck, Wallet, Receipt, Layers } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Card, CardBody } from '@/components/ui/Card'
import { AppLayout } from '@/components/layout/AppLayout'

const STATS = [
  { label: 'Challans Today', value: '—', icon: FileText },
  { label: 'Pending Dispatch', value: '—', icon: Truck },
  { label: 'Collected Today', value: '—', icon: Wallet },
  { label: 'Open Payments', value: '—', icon: Receipt },
]

export default function DashboardPage() {
  const { user } = useAuth()

  return (
    <AppLayout
      title="Dashboard"
      subtitle="Bhoomi Enterprises · Samadhan Operations"
      breadcrumbs={['Bhoomi Enterprises', 'Dashboard']}
    >
      <div className="px-4 py-6 md:px-8">
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((s) => {
            const Icon = s.icon
            return (
              <Card key={s.label} hover className="overflow-hidden">
                <CardBody className="flex items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-bhoomi-50 text-bhoomi-600">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-display text-2xl tracking-wide text-surface-900">
                      {s.value}
                    </div>
                    <div className="text-xs uppercase tracking-wide text-surface-500">
                      {s.label}
                    </div>
                  </div>
                </CardBody>
              </Card>
            )
          })}
        </div>

        <Card className="mx-auto max-w-2xl">
          <CardBody className="flex flex-col items-center px-8 py-12 text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-bhoomi-50 text-bhoomi-600">
              <Layers className="h-8 w-8" />
            </div>
            <h2 className="font-display text-2xl tracking-wide text-surface-900">Portal Ready</h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-surface-600">
              You&apos;re signed in as <strong className="text-surface-900">{user?.email}</strong>.
              Use the sidebar to manage challans, customers, rates and collections.
            </p>
          </CardBody>
        </Card>
      </div>
    </AppLayout>
  )
}
