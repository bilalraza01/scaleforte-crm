import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useArchiveCategory, useCategories, useCreateCategory } from "@/api/categories"
import { PageHeader } from "@/components/ui/PageHeader"
import { Card, CardHeader, CardBody } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input, Label, FieldError } from "@/components/ui/Input"
import { Badge } from "@/components/ui/Badge"
import { Table, THead, TR, TH, TD } from "@/components/ui/Table"
import { Plus } from "lucide-react"

const schema = z.object({
  name: z.string().min(1, "Required"),
  amazon_url_pattern: z.string().optional(),
})
type Input = z.infer<typeof schema>

export function CategoriesPage() {
  const { data: categories, isLoading } = useCategories()
  const create = useCreateCategory()
  const archive = useArchiveCategory()
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<Input>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (input: Input) => {
    setServerError(null)
    try {
      await create.mutateAsync({ name: input.name, amazon_url_pattern: input.amazon_url_pattern || null })
      reset()
    } catch {
      setServerError("Could not create category")
    }
  }

  return (
    <div className="px-8 py-8 max-w-5xl mx-auto">
      <PageHeader title="Categories" subtitle="Amazon categories assigned to monthly campaigns." />

      <Card className="mb-6">
        <CardHeader title="Add a category" />
        <CardBody>
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="md:col-span-1">
              <Label htmlFor="name">Name</Label>
              <Input id="name" placeholder="Health & Household" {...register("name")} />
              <FieldError>{errors.name?.message}</FieldError>
            </div>
            <div className="md:col-span-1">
              <Label htmlFor="pattern">Amazon URL pattern (optional)</Label>
              <Input id="pattern" placeholder="amazon.com/s?k=…" {...register("amazon_url_pattern")} />
            </div>
            <Button type="submit" disabled={create.isPending}>
              <Plus size={14} />
              {create.isPending ? "Adding…" : "Add category"}
            </Button>
          </form>
          {serverError && <p className="text-rose-600 text-sm mt-2">{serverError}</p>}
        </CardBody>
      </Card>

      {isLoading ? (
        <p className="text-slate-500">Loading…</p>
      ) : (
        <Card>
          <Table>
            <THead>
              <TR>
                <TH>Name</TH><TH>URL pattern</TH><TH>Campaigns</TH><TH>Status</TH><TH></TH>
              </TR>
            </THead>
            <tbody>
              {(categories ?? []).map((c) => (
                <TR key={c.id}>
                  <TD className="font-medium text-slate-900">{c.name}</TD>
                  <TD className="text-slate-500 font-mono text-xs">{c.amazon_url_pattern ?? "—"}</TD>
                  <TD className="tabular-nums">{c.campaigns_count}</TD>
                  <TD>{c.active ? <Badge tone="emerald">active</Badge> : <Badge tone="slate">archived</Badge>}</TD>
                  <TD className="text-right">
                    {c.active && (
                      <Button
                        variant="ghost" size="sm" disabled={archive.isPending}
                        onClick={() => confirm(`Archive ${c.name}?`) && archive.mutate(c.id)}
                      >
                        Archive
                      </Button>
                    )}
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </div>
  )
}
