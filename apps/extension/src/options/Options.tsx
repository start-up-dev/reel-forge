import { useState, useEffect, useCallback } from "react";
import type { ExtensionSettings } from "../lib/messages.js";
import { DEFAULT_SETTINGS } from "../lib/messages.js";

// ── Load / save helpers ───────────────────────────────────────────────────────

async function loadSettings(): Promise<ExtensionSettings> {
  const s = await chrome.storage.local.get(null);
  return {
    backendUrl: (s.backendUrl as string | undefined) ?? DEFAULT_SETTINGS.backendUrl,
    operatorSecret: (s.operatorSecret as string | undefined) ?? DEFAULT_SETTINGS.operatorSecret,
    batchSize: (s.batchSize as number | undefined) ?? DEFAULT_SETTINGS.batchSize,
    concurrentTabs: (s.concurrentTabs as number | undefined) ?? DEFAULT_SETTINGS.concurrentTabs,
  };
}

async function saveSettings(settings: ExtensionSettings): Promise<void> {
  await chrome.storage.local.set({
    backendUrl: settings.backendUrl,
    operatorSecret: settings.operatorSecret,
    batchSize: settings.batchSize,
    concurrentTabs: settings.concurrentTabs,
  });
}

// ── Options page ──────────────────────────────────────────────────────────────

export function Options() {
  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "ok" | "fail">("idle");

  useEffect(() => {
    loadSettings().then(setSettings).catch(console.error);
  }, []);

  const update = useCallback(
    <K extends keyof ExtensionSettings>(key: K, value: ExtensionSettings[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
      setSaved(false);
    },
    [],
  );

  const handleSave = async () => {
    await saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTestConnection = async () => {
    setTestStatus("testing");
    try {
      const res = await fetch(`${settings.backendUrl}/health`, {
        headers: { "X-Operator-Secret": settings.operatorSecret },
      });
      setTestStatus(res.ok ? "ok" : "fail");
    } catch {
      setTestStatus("fail");
    }
    setTimeout(() => setTestStatus("idle"), 3000);
  };

  return (
    <div className="bg-bg-base min-h-screen text-text-primary font-sans">
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-8 h-8 rounded-lg bg-accent-primary flex items-center justify-center">
            <span className="text-sm font-bold text-white">RF</span>
          </div>
          <div>
            <h1 className="text-lg font-semibold">ReelForge Operator Settings</h1>
            <p className="text-text-muted text-xs">Configure API connection and queue behaviour</p>
          </div>
        </div>

        {/* API Configuration */}
        <Section title="API Configuration">
          <Field label="Backend URL">
            <input
              type="url"
              value={settings.backendUrl}
              onChange={(e) => update("backendUrl", e.target.value)}
              className={inputCls}
              placeholder="https://api.yourapp.com"
            />
          </Field>
          <Field label="Operator Secret" hint="The X-Operator-Secret value set in your API env">
            <input
              type="password"
              value={settings.operatorSecret}
              onChange={(e) => update("operatorSecret", e.target.value)}
              className={inputCls}
              placeholder="••••••••••••••••••••••••••••••••"
            />
          </Field>
          <div className="flex items-center gap-3">
            <button onClick={handleTestConnection} className={secondaryBtnCls}>
              {testStatus === "testing" ? "Testing…" : "Test Connection"}
            </button>
            {testStatus === "ok" && (
              <span className="text-accent-success text-sm">✓ Connected</span>
            )}
            {testStatus === "fail" && (
              <span className="text-accent-danger text-sm">✗ Failed — check URL and secret</span>
            )}
          </div>
        </Section>

        {/* Queue Settings */}
        <Section title="Queue Settings">
          <Field label="Batch size" hint="How many clips to claim at once from the queue">
            <input
              type="number"
              min={1}
              max={100}
              value={settings.batchSize}
              onChange={(e) => update("batchSize", Number(e.target.value))}
              className={`${inputCls} w-24`}
            />
          </Field>
          <Field label="Concurrent tabs" hint="Maximum number of Grok tabs open simultaneously">
            <input
              type="number"
              min={1}
              max={20}
              value={settings.concurrentTabs}
              onChange={(e) => update("concurrentTabs", Number(e.target.value))}
              className={`${inputCls} w-24`}
            />
          </Field>
        </Section>

        {/* Save */}
        <div className="flex items-center gap-4 mt-6">
          <button onClick={handleSave} className={primaryBtnCls}>
            {saved ? "✓ Saved" : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Layout components ─────────────────────────────────────────────────────────

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-8">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
        {hint && <p className="text-text-muted text-xs mt-0.5">{hint}</p>}
      </div>
      <div className="bg-bg-surface rounded-xl p-4 flex flex-col gap-4 border border-border">
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-text-secondary">{label}</label>
      {hint && <p className="text-text-muted text-xs">{hint}</p>}
      {children}
    </div>
  );
}

// ── Shared class strings ──────────────────────────────────────────────────────

const inputCls =
  "bg-bg-elevated border border-border rounded-lg px-3 py-2 text-text-primary text-sm w-full focus:outline-none focus:border-accent-primary/60 transition-colors";

const primaryBtnCls =
  "bg-accent-primary hover:bg-accent-primary/90 text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors";

const secondaryBtnCls =
  "border border-border hover:border-accent-primary/40 text-text-secondary text-sm px-4 py-2 rounded-lg transition-colors";
