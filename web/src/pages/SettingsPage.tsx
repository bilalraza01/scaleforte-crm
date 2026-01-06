import { useState } from "react"
import {
  useSmartleadConfig,
  useTestSmartleadConnection,
  useUpdateSmartleadConfig,
  useSmartleadHealth,
} from "@/api/smartlead"

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
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <section className="bg-white shadow rounded p-4 space-y-4">
        <h2 className="text-lg font-semibold">Smartlead integration</h2>

        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-slate-500">API key</dt>
          <dd className="font-mono">{config?.masked_api_key ?? "not configured"}</dd>
          <dt className="text-slate-500">Webhook secret</dt>
          <dd>{config?.webhook_secret_set ? "set" : "not set"}</dd>
          <dt className="text-slate-500">Last test</dt>
          <dd>
            {config?.last_test_at ? (
              <>
                {new Date(config.last_test_at).toLocaleString()} —{" "}
                {config.last_test_success ? (
                  <span className="text-emerald-700">OK</span>
                ) : (
                  <span className="text-rose-700">failed</span>
                )}
              </>
            ) : (
              "never"
            )}
          </dd>
        </dl>

        {message && <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm p-2 rounded">{message}</div>}

        <div>
          <label className="block text-sm font-semibold mb-1">New API key</label>
          <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk_…" className="w-full border rounded px-2 py-1.5" />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">New webhook secret</label>
          <input type="password" value={webhookSecret} onChange={(e) => setWebhookSecret(e.target.value)} placeholder="whsec_…" className="w-full border rounded px-2 py-1.5" />
        </div>

        <div className="flex gap-2">
          <button onClick={onSave} disabled={update.isPending} className="px-3 py-2 bg-slate-900 text-white rounded hover:bg-slate-700 disabled:opacity-50">
            {update.isPending ? "Saving…" : "Save"}
          </button>
          <button onClick={onTest} disabled={test.isPending || !config?.configured} className="px-3 py-2 border rounded hover:bg-slate-50 disabled:opacity-50">
            {test.isPending ? "Testing…" : "Test connection"}
          </button>
        </div>

        <p className="text-xs text-slate-500">
          Webhook URL to configure in Smartlead: <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">{(import.meta.env.VITE_API_URL ?? "http://localhost:3010")}/webhooks/smartlead</code>
        </p>
      </section>

      {health && (
        <section className="bg-white shadow rounded p-4 space-y-3">
          <h2 className="text-lg font-semibold">Webhook health (last 24h)</h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <Stat label="Received" value={health.events_received_24h} />
            <Stat label="Processed" value={health.events_processed_24h} />
            <Stat label="Unmatched (total)" value={health.events_unmatched_total} />
          </div>
          <div className="text-xs text-slate-500 grid grid-cols-2 gap-1">
            <span>Last event:</span>
            <span>{health.last_event_at ? new Date(health.last_event_at).toLocaleString() : "—"}</span>
            <span>Last processed:</span>
            <span>{health.last_processed_at ? new Date(health.last_processed_at).toLocaleString() : "—"}</span>
          </div>
        </section>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-xs text-slate-500 uppercase">{label}</div>
    </div>
  )
}
