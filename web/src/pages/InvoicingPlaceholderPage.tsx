import { PageHeader } from "@/components/ui/PageHeader"
import { Card } from "@/components/ui/Card"
import { Receipt } from "lucide-react"

export function InvoicingPlaceholderPage() {
  return (
    <div className="px-8 py-8 max-w-4xl mx-auto">
      <PageHeader
        title="Invoicing"
        subtitle="Bill clients, track payments, and manage statements."
      />
      <Card className="p-10 text-center">
        <Receipt size={32} className="mx-auto text-slate-400 mb-3" />
        <h2 className="text-lg font-semibold text-slate-900">Coming soon</h2>
        <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
          The Invoicing workspace will hold open invoices, paid history, and
          monthly billing exports for the accounting team.
        </p>
      </Card>
    </div>
  )
}
