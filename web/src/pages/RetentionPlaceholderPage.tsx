import { PageHeader } from "@/components/ui/PageHeader"
import { Card } from "@/components/ui/Card"
import { RotateCw } from "lucide-react"

export function RetentionPlaceholderPage() {
  return (
    <div className="px-8 py-8 max-w-4xl mx-auto">
      <PageHeader
        title="Retention"
        subtitle="Keep paying clients active and renewing on time."
      />
      <Card className="p-10 text-center">
        <RotateCw size={32} className="mx-auto text-slate-400 mb-3" />
        <h2 className="text-lg font-semibold text-slate-900">Coming soon</h2>
        <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
          The Retention workspace will surface health scores, renewal dates,
          and at-risk accounts so the success team can act early.
        </p>
      </Card>
    </div>
  )
}
