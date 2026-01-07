import { PageHeader } from "@/components/ui/PageHeader"
import { Card } from "@/components/ui/Card"
import { UserPlus } from "lucide-react"

export function OnboardingPlaceholderPage() {
  return (
    <div className="px-8 py-8 max-w-4xl mx-auto">
      <PageHeader
        title="Onboarding"
        subtitle="Walk new clients through kickoff and audit handoff."
      />
      <Card className="p-10 text-center">
        <UserPlus size={32} className="mx-auto text-slate-400 mb-3" />
        <h2 className="text-lg font-semibold text-slate-900">Coming soon</h2>
        <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
          The Onboarding workspace will track new accounts from signed contract
          through their first audit cycle. Stay tuned.
        </p>
      </Card>
    </div>
  )
}
