import { useState } from "react"
import {
  useSmartleadConfig,
  useTestSmartleadConnection,
  useUpdateSmartleadConfig,
  useSmartleadHealth,
} from "@/api/smartlead"
import { PageHeader } from "@/components/ui/PageHeader"
import { Card, CardHeader, CardBody } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input, Label } from "@/components/ui/Input"
import { Stat } from "@/components/ui/Stat"
import { Activity, Inbox, AlertTriangle, Save, Wifi } from "lucide-react"

export function SettingsPage() {
  const { data: config } = useSmartleadConfig()
  const { data: health } = useSmartleadHealth()
  const update = useUpdateSmartleadConfig()
  const test = useTestSmartleadConnection()

  const [apiKey, setApiKey] = useState("")
  const [webhookSecret, setWebhookSecret] = useState("")
  const [message, setMessage] = useState<string | null>(null)

  const onSave = async () => {
    setMessage(null)
    const payload: Record<string, string> = {}
    if (apiKey) payload.api_key = apiKey
    if (webhookSecret) payload.webhook_secret = webhookSecret
    if (Object.keys(payload).length === 0) return
    await update.mutateAsync(payload)
    setApiKey("")
    setWebhookSecret("")
    setMessage("Saved.")
  }

  const onTest = async () => {
    setMessage(null)
    try {
      const r = await test.mutateAsync()
      setMessage(r.message ?? "Connection OK")
    } catch (e) {
      const err = e as { response?: { data?: { error?: string } } }
      setMessage(err.response?.data?.error ?? "Test failed")
    }
  }

  return (
    <div className="px-8 py-8 max-w-4xl mx-auto">
      <PageHeader title="Settings" subtitle="Smartlead integration + system configuration." />

      <Card className="mb-6">
        <CardHeader title="Smartlead integration" subtitle="API key + webhook secret." />
        <CardBody className="space-y-5">
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-slate-500">API key</dt>
            <dd className="font-mono">{config?.masked_api_key ?? <span className="text-slate-400">not configured</span>}</dd>
            <dt className="text-slate-500">Webhook secret</dt>
            <dd>{config?.webhook_secret_set ? <span className="text-emerald-700">set</span> : <span className="text-slate-400">not set</span>}</dd>
            <dt className="text-slate-500">Last connection test</dt>
            <dd>
              {config?.last_test_at ? (
                <>
                  {new Date(config.last_test_at).toLocaleString()} —{" "}
                  {config.last_test_success ? <span className="text-emerald-700 font-medium">OK</span> : <span className="text-rose-700 font-medium">failed</span>}
                </>
              ) : <span className="text-slate-400">never</span>}
            </dd>
          </dl>

          {message && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm p-2.5 rounded-md">
              {message}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="api_key">New API key</Label>
              <Input id="api_key" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk_…" />
            </div>
            <div>
              <Label htmlFor="webhook_secret">New webhook secret</Label>
              <Input id="webhook_secret" type="password" value={webhookSecret} onChange={(e) => setWebhookSecret(e.target.value)} placeholder="whsec_…" />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={onSave} disabled={update.isPending}>
              <Save size={14} />
              {update.isPending ? "Saving…" : "Save"}
            </Button>
            <Button variant="secondary" onClick={onTest} disabled={test.isPending || !config?.configured}>
              <Wifi size={14} />
              {test.isPending ? "Testing…" : "Test connection"}
            </Button>
          </div>

          <p className="text-xs text-slate-500 border-t border-slate-100 pt-3">
            Webhook URL to configure in Smartlead:{" "}
            <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">
              {(import.meta.env.VITE_API_URL ?? "http://localhost:3010")}/webhooks/smartlead</code>
          </p>
        </CardBody>
      </Card>

      {health && (
        <Card>
          <CardHeader title="Webhook health" subtitle="Last 24 hours." />
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Stat icon={<Inbox size={16} />}     tone="indigo"  label="Received" value={health.events_received_24h} />
              <Stat icon={<Activity size={16} />}  tone="emerald" label="Processed" value={health.events_processed_24h} />
              <Stat icon={<AlertTriangle size={16} />} tone="amber" label="Unmatched (total)" value={health.events_unmatched_total} />
            </div>
            <div className="mt-4 text-xs text-slate-500 grid grid-cols-2 gap-1">
              <span>Last event</span>
              <span>{health.last_event_at ? new Date(health.last_event_at).toLocaleString() : "—"}</span>
              <span>Last processed</span>
              <span>{health.last_processed_at ? new Date(health.last_processed_at).toLocaleString() : "—"}</span>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  )
}
