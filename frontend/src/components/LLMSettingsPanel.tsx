"use client";

import { useState, useEffect } from "react";
import type { LLMProvider, LLMSettings } from "@/lib/api";

const PROVIDERS: { value: LLMProvider; label: string; description: string; free: boolean }[] = [
  { value: "groq", label: "Groq", description: "Llama 3.3 70B", free: true },
  { value: "anthropic", label: "Anthropic", description: "Claude Sonnet 4", free: false },
];

const STORAGE_KEY = "chat-assistant-llm-settings";

function loadSettings(): LLMSettings {
  if (typeof window === "undefined") return { provider: "groq", apiKey: "" };
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return { provider: "groq", apiKey: "" };
}

function saveSettings(settings: LLMSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

interface Props {
  onChange: (settings: LLMSettings) => void;
}

export default function LLMSettingsPanel({ onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState<LLMProvider>("groq");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    const saved = loadSettings();
    setProvider(saved.provider);
    setApiKey(saved.apiKey);
    onChange(saved);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleProviderChange = (p: LLMProvider) => {
    setProvider(p);
    const settings = { provider: p, apiKey };
    saveSettings(settings);
    onChange(settings);
  };

  const handleKeyChange = (key: string) => {
    setApiKey(key);
    const settings = { provider, apiKey: key };
    saveSettings(settings);
    onChange(settings);
  };

  const currentProvider = PROVIDERS.find((p) => p.value === provider)!;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        title="LLM Settings"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span>{currentProvider.label}</span>
        {apiKey && (
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" title="Custom API key set" />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-30 p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              LLM Provider
            </h3>

            <div className="space-y-2 mb-4">
              {PROVIDERS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => handleProviderChange(p.value)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-left transition-colors ${
                    provider === p.value
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                  }`}
                >
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {p.label}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {p.description}
                    </div>
                  </div>
                  {p.free && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400">
                      FREE
                    </span>
                  )}
                </button>
              ))}
            </div>

            {provider === "anthropic" && (
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Anthropic API Key
                  <span className="text-gray-400 dark:text-gray-500 font-normal ml-1">
                    (required for Claude)
                  </span>
                </label>
                <div className="relative">
                  <input
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => handleKeyChange(e.target.value)}
                    placeholder="sk-ant-..."
                    className="w-full px-3 py-2 pr-10 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  />
                  <button
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showKey ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                {apiKey && (
                  <button
                    onClick={() => handleKeyChange("")}
                    className="mt-1.5 text-xs text-red-500 hover:text-red-600 dark:hover:text-red-400"
                  >
                    Clear API key
                  </button>
                )}
              </div>
            )}

            <p className="mt-3 text-[10px] text-gray-400 dark:text-gray-500 leading-relaxed">
              Your API key is stored only in your browser and sent per request. It is never saved on the server.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
