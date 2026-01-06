import { useState } from "react"
import { useReplies, useClassifyReply, type ReplyClassification, type ReplyEvent } from "@/api/replies"
import { useAuth } from "@/auth/AuthProvider"

const CLASSIFICATIONS: { value: ReplyClassification; label: string; color: string }[] = [
  { value: "positive",            label: "Positive",   color: "bg-emerald-600" },
  { value: "negative",            label: "Negative",   color: "bg-rose-600" },
  { value: "ooo",                 label: "OOO",        color: "bg-slate-500" },
  { value: "info_request",        label: "Info req",   color: "bg-amber-600" },
  { value: "unsubscribe_request", label: "Unsubscribe", color: "bg-rose-700" },
]

export function RepliesPage() {
  const { user } = useAuth()
  const { data: replies, isLoading } = useReplies()
  const isAdmin = user?.role === "admin"

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Replies</h1>
      <p className="text-slate-600 text-sm">
        Real replies received from Smartlead webhooks. {isAdmin ? "Admins" : "Managers"} can read; admins can classify.
      </p>

      {isLoading && <p className="text-slate-500">Loading…</p>}
      {replies && replies.length === 0 && (
        <p className="text-slate-400 text-sm">No replies yet. Pushes that drive engagement land here as Smartlead delivers webhook events.</p>
      )}

      <div className="space-y-3">
        {(replies ?? []).map((r) => (
          <ReplyCard key={r.id} reply={r} canClassify={isAdmin} />
        ))}
      </div>
    </div>
  )
}

function ReplyCard({ reply, canClassify }: { reply: ReplyEvent; canClassify: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const classify = useClassifyReply(reply.id)

  return (
    <div className="bg-white shadow rounded p-4">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="text-sm text-slate-500 mb-1">
            {reply.brand_name ?? "Unknown brand"}
            {reply.category_name && <> · {reply.category_name}</>}
            {reply.sdr_name && <> · sourced by {reply.sdr_name}</>}
          </div>
          <div className="font-medium">{reply.reply_subject ?? "(no subject)"}</div>
          <div className="text-sm text-slate-700 whitespace-pre-line mt-1">
            {expanded
              ? reply.reply_body ?? ""
              : (reply.reply_body ?? "").split("\n").slice(0, 3).join("\n")}
          </div>
          {(reply.reply_body ?? "").split("\n").length > 3 && (
            <button onClick={() => setExpanded(!expanded)} className="text-xs text-blue-600 hover:underline mt-1">
              {expanded ? "Show less" : "Show more"}
            </button>
          )}
        </div>
        <div className="text-xs text-slate-400 whitespace-nowrap">
          {reply.occurred_at ? new Date(reply.occurred_at).toLocaleString() : "—"}
        </div>
      </div>

      {canClassify && (
        <div className="flex gap-2 mt-3 pt-3 border-t flex-wrap">
          {CLASSIFICATIONS.map((c) => (
            <button
              key={c.value}
              onClick={() => classify.mutate(c.value)}
              disabled={classify.isPending}
              className={`text-xs px-2 py-1 rounded text-white ${c.color} hover:opacity-90 disabled:opacity-50`}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
