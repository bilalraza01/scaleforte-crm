import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useCampaigns, useCreateCampaign, useAssignSdrToCampaign } from "@/api/campaigns"
import { useCategories } from "@/api/categories"
import { useUsers } from "@/api/users"
import type { Campaign } from "@/types"
import { PageHeader } from "@/components/ui/PageHeader"
import { Card, CardHeader, CardBody } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input, Select, Label, FieldError } from "@/components/ui/Input"
import { Badge } from "@/components/ui/Badge"
import { Table, THead, TR, TH, TD } from "@/components/ui/Table"
import { CalendarPlus, UserPlus2, X } from "lucide-react"

const schema = z.object({
  category_id: z.coerce.number().int().positive(),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2025).max(2099),
  status: z.enum(["draft", "active", "closed"]),
})
type Input = z.infer<typeof schema>

export function CampaignsPage() {
  const { data: campaigns, isLoading } = useCampaigns()
  const { data: categories } = useCategories()
  const { data: users } = useUsers()
  const create = useCreateCampaign()
  const [assigningTo, setAssigningTo] = useState<Campaign | null>(null)

  const now = new Date()
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Input>({
    resolver: zodResolver(schema),
    defaultValues: { month: now.getMonth() + 1, year: now.getFullYear(), status: "active" },
  })

  const onSubmit = async (input: Input) => {
    await create.mutateAsync(input)
    reset({ month: now.getMonth() + 1, year: now.getFullYear(), status: "active" })
  }

  return (
    <div className="px-8 py-8 max-w-6xl mx-auto">
      <PageHeader title="Campaigns" subtitle="Monthly category × SDR assignments." />

      <Card className="mb-6">
        <CardHeader title="Create campaign" />
        <CardBody>
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
            <div className="md:col-span-2">
              <Label>Category</Label>
              <Select {...register("category_id")}>
                <option value="">— pick —</option>
                {(categories ?? []).filter((c) => c.active).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
              <FieldError>{errors.category_id && "required"}</FieldError>
            </div>
            <div>
              <Label>Month</Label>
              <Input type="number" min={1} max={12} {...register("month")} />
            </div>
            <div>
              <Label>Year</Label>
              <Input type="number" min={2025} max={2099} {...register("year")} />
            </div>
            <Button type="submit" disabled={create.isPending}>
              <CalendarPlus size={14} />
              {create.isPending ? "Creating…" : "Create"}
            </Button>
          </form>
        </CardBody>
      </Card>

      {isLoading ? (
        <p className="text-slate-500">Loading…</p>
      ) : (
        <Card>
          <Table>
            <THead>
              <TR>
                <TH>Campaign</TH><TH>Status</TH><TH>SDRs</TH><TH>Brands</TH><TH></TH>
              </TR>
            </THead>
            <tbody>
              {(campaigns ?? []).map((c) => (
                <TR key={c.id}>
                  <TD className="font-medium text-slate-900">{c.label}</TD>
                  <TD>
                    <Badge tone={c.status === "active" ? "emerald" : c.status === "closed" ? "slate" : "amber"}>
                      {c.status}
                    </Badge>
                  </TD>
                  <TD className="tabular-nums">{c.assignments_count}</TD>
                  <TD className="tabular-nums">{c.brands_count}</TD>
                  <TD className="text-right">
                    <Button variant="secondary" size="sm" onClick={() => setAssigningTo(c)}>
                      <UserPlus2 size={14} />
                      Assign SDR
                    </Button>
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      {assigningTo && (
        <AssignModal
          campaign={assigningTo}
          sdrs={(users ?? []).filter((u) => u.role === "sdr" && u.active)}
          onClose={() => setAssigningTo(null)}
        />
      )}
    </div>
  )
}

function AssignModal({ campaign, sdrs, onClose }: {
  campaign: Campaign
  sdrs: { id: number; name: string; email: string }[]
  onClose: () => void
}) {
  const assign = useAssignSdrToCampaign(campaign.id)
  const [sdrId, setSdrId] = useState<number | "">("")
  const [target, setTarget] = useState(50)
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6 z-50" onClick={onClose}>
      <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <CardHeader
          title={`Assign SDR to ${campaign.label}`}
          action={<button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>}
        />
        <CardBody className="space-y-3">
          {error && <div className="bg-rose-50 border border-rose-200 text-rose-900 text-sm p-2 rounded">{error}</div>}
          <div>
            <Label>SDR</Label>
            <Select value={sdrId} onChange={(e) => setSdrId(e.target.value === "" ? "" : Number(e.target.value))}>
              <option value="">— pick an SDR —</option>
              {sdrs.map((s) => <option key={s.id} value={s.id}>{s.name || s.email}</option>)}
            </Select>
          </div>
          <div>
            <Label>Target brand count</Label>
            <Input type="number" min={0} value={target} onChange={(e) => setTarget(Number(e.target.value))} />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button
              disabled={assign.isPending}
              onClick={async () => {
                if (sdrId === "") return setError("Pick an SDR")
                try {
                  await assign.mutateAsync({ sdr_id: Number(sdrId), target_count: target })
                  onClose()
                } catch {
                  setError("Could not assign — already assigned?")
                }
              }}
            >
              {assign.isPending ? "Saving…" : "Assign"}
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
