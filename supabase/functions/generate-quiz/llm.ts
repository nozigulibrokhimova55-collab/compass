// Calls the configured language model. The provider is set with secrets, never in code:
//
//   LLM_PROVIDER  "gemini" (Google's generateContent API) or "openai" (any OpenAI-compatible chat completions API)
//   LLM_API_KEY   the provider's key
//   LLM_MODEL     the model id
//   LLM_BASE_URL  optional; defaults to the provider's public API
//
// For the setup that existed before these secrets, GEMINI_API_KEY and GEMINI_MODEL still work on their own.
// No Deno-only code here: the env is passed in, so this can be tested in Node.

import { extractText } from './validate.ts'

export type LlmProvider = 'gemini' | 'openai'
export type LlmConfig = { provider: LlmProvider; apiKey: string; model: string; baseUrl: string }

const DEFAULT_BASE: Record<LlmProvider, string> = {
  gemini: 'https://generativelanguage.googleapis.com/v1beta',
  openai: 'https://api.openai.com/v1',
}
/** Only for the older Gemini-only setup, so it keeps working unchanged. */
const LEGACY_GEMINI_MODEL = 'gemini-3.8-flash'

/** Reads the secrets. Returns a message for the logs when something is missing. */
export function llmConfig(env: (name: string) => string | undefined): LlmConfig | { problem: string } {
  const provider = (env('LLM_PROVIDER') ?? '').trim().toLowerCase()
  if (!provider) {
    const apiKey = env('GEMINI_API_KEY')
    if (!apiKey) return { problem: 'Set LLM_PROVIDER, LLM_API_KEY and LLM_MODEL (or the older GEMINI_API_KEY).' }
    return { provider: 'gemini', apiKey, model: env('GEMINI_MODEL') || LEGACY_GEMINI_MODEL, baseUrl: DEFAULT_BASE.gemini }
  }
  if (provider !== 'gemini' && provider !== 'openai') return { problem: `LLM_PROVIDER must be "gemini" or "openai", not "${provider}".` }
  const apiKey = env('LLM_API_KEY') || (provider === 'gemini' ? env('GEMINI_API_KEY') : undefined)
  const model = env('LLM_MODEL') || (provider === 'gemini' ? env('GEMINI_MODEL') : undefined)
  if (!apiKey) return { problem: 'LLM_API_KEY is not set.' }
  if (!model) return { problem: 'LLM_MODEL is not set.' }
  return { provider, apiKey, model, baseUrl: (env('LLM_BASE_URL') || DEFAULT_BASE[provider]).replace(/\/+$/, '') }
}

/** A failed call. `status` is the provider's HTTP status (429 means busy). */
export class LlmError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export type LlmRequest = {
  system: string
  user: string
  /** Gemini responseSchema. OpenAI-compatible APIs get JSON mode and the shape from the prompt. */
  schema: unknown
  temperature?: number
  timeoutMs?: number
}

/** Sends one prompt and returns the model's text (JSON). */
export async function callLlm(cfg: LlmConfig, req: LlmRequest, fetchImpl: typeof fetch = fetch): Promise<string> {
  const signal = AbortSignal.timeout(req.timeoutMs ?? 55_000)
  const temperature = req.temperature ?? 0.6
  let res: Response
  if (cfg.provider === 'gemini') {
    res = await fetchImpl(`${cfg.baseUrl}/models/${encodeURIComponent(cfg.model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': cfg.apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: req.system }] },
        contents: [{ role: 'user', parts: [{ text: req.user }] }],
        generationConfig: { temperature, responseMimeType: 'application/json', responseSchema: req.schema },
      }),
      signal,
    })
  } else {
    res = await fetchImpl(`${cfg.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.apiKey}` },
      body: JSON.stringify({
        model: cfg.model,
        temperature,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: req.system },
          { role: 'user', content: req.user },
        ],
      }),
      signal,
    })
  }
  if (!res.ok) {
    const detail = (await res.text().catch(() => '')).slice(0, 500)
    throw new LlmError(res.status, `${cfg.provider} ${res.status}: ${detail}`)
  }
  const body = await res.json()
  if (cfg.provider === 'gemini') return extractText(body)
  const content = (body as { choices?: { message?: { content?: unknown } }[] })?.choices?.[0]?.message?.content
  return typeof content === 'string' ? content : ''
}
