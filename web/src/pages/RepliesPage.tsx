import { useState } from "react"
import { useReplies, useClassifyReply, type ReplyClassification, type ReplyEvent } from "@/api/replies"
import { useAuth } from "@/auth/AuthProvider"
import { PageHeader } from "@/components/ui/PageHeader"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Inbox } from "lucide-react"

const CLASSIFICATIONS: { value: ReplyClassification; label: string; tone: "success" | "danger" | "secondary" }[] = [
  { value: "positive",            label: "Positive",    tone: "success" },
  { value: "negative",            label: "Negative",    tone: "danger" },
  { value: "ooo",                 label: "OOO",         tone: "secondary" },
  { value: "info_request",        label: "Info req",    tone: "secondary" },
  { value: "unsubscribe_request", label: "Unsubscribe", tone: "danger" },
]

export function RepliesPage() {
  const { user } = useAuth()
  const { data: replies, isLoading } = useReplies()
  const isAdmin = user?.role === "admin"

  return (
    <div className="px-8 py-8 max-w-5xl mx-auto">
      <PageHeader
        title="Replies"
        subtitle={isAdmin ? "Classify replies to feed positive-lead routing." : "Read-only feed of replies on your team's brands."}
      />

      {isLoading && <p className="text-slate-500">Loading…</p>}

      {replies && replies.length === 0 && (
        <Card className="p-10 text-center">
          <Inbox className="mx-auto text-slate-300 mb-3" size={32} />
          <p className="text-slate-500 text-sm">No replies yet. Pushes that drive engagement land here as Smartlead delivers webhooks.</p>
        </Card>
      )}

      <div className="space-y-3">
        {(replies ?? []).map((r) => <ReplyCard key={r.id} reply={r} canClassify={!!isAdmin} />)}
      </div>
    </div>
  )
}

function ReplyCard({ reply, canClassify }: { reply: ReplyEvent; canClassify: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const classify = useClassifyReply(reply.id)
  const lines = (reply.reply_body ?? "").split("\n")
  const showToggle = lines.length > 3

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="text-xs text-slate-500 mb-1">
            {reply.brand_name ?? "Unknown brand"}
            {reply.category_name && <> · {reply.category_name}</>}
            {reply.sdr_name && <> · sourced by {reply.sdr_name}</>}
          </div>
          <div className="font-medium text-slate-900">{reply.reply_subject ?? "(no subject)"}</div>
          <div className="text-sm text-slate-700 whitespace-pre-line mt-2">
            {expanded ? reply.reply_body : lines.slice(0, 3).join("\n")}
          </div>
          {showToggle && (
            <button onClick={() => setExpanded(!expanded)} className="text-xs text-indigo-600 hover:underline mt-1">
              {expanded ? "Show less" : "Show more"}
            </button>
          )}
        </div>
        <div className="text-xs text-slate-400 whitespace-nowrap">
          {reply.occurred_at ? new Date(reply.occurred_at).toLocaleString() : "—"}
        </div>
      </div>

      {canClassify && (
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100">
          {CLASSIFICATIONS.map((c) => (
            <Button
              key={c.value}
              size="sm"
              variant={c.tone === "success" ? "success" : c.tone === "danger" ? "danger" : "secondary"}
              disabled={classify.isPending}
              onClick={() => classify.mutate(c.value)}
            >
              {c.label}
            </Button>
          ))}
        </div>
      )}
    </Card>
  )
}
