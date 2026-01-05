import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useArchiveCategory, useCategories, useCreateCategory } from "@/api/categories"

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
    } catch (e) {
      setServerError("Could not create category")
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Categories</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white shadow rounded p-4 flex gap-2 items-start">
        <div className="flex-1">
          <input placeholder="Category name (e.g. Health & Household)" {...register("name")} className="w-full border rounded px-2 py-1.5" />
          {errors.name && <p className="text-rose-600 text-xs mt-1">{errors.name.message}</p>}
        </div>
        <div className="flex-1">
          <input placeholder="Amazon URL pattern (optional)" {...register("amazon_url_pattern")} className="w-full border rounded px-2 py-1.5" />
        </div>
        <button type="submit" disabled={create.isPending} className="px-3 py-2 bg-slate-900 text-white rounded hover:bg-slate-700 disabled:opacity-50">
          {create.isPending ? "Adding…" : "Add"}
        </button>
      </form>

      {serverError && <p className="text-rose-600 text-sm">{serverError}</p>}

      {isLoading ? (
        <p className="text-slate-500">Loading…</p>
      ) : (
        <table className="w-full bg-white shadow rounded">
          <thead className="text-left bg-slate-100">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">URL pattern</th>
              <th className="p-3"># Campaigns</th>
              <th className="p-3">Status</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {(categories ?? []).map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-3 font-medium">{c.name}</td>
                <td className="p-3 text-slate-600 font-mono text-xs">{c.amazon_url_pattern ?? "—"}</td>
                <td className="p-3">{c.campaigns_count}</td>
                <td className="p-3">
                  {c.active ? (
                    <span className="text-emerald-700 text-xs">active</span>
                  ) : (
                    <span className="text-slate-400 text-xs">archived</span>
                  )}
                </td>
                <td className="p-3 text-right">
                  {c.active && (
                    <button
                      onClick={() => confirm(`Archive ${c.name}?`) && archive.mutate(c.id)}
                      className="text-rose-600 text-sm hover:underline"
                      disabled={archive.isPending}
                    >
                      Archive
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
