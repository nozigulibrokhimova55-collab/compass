// Supabase Edge Function: writes quiz questions from a teacher's notes with Gemini.
// The Gemini key lives here as a secret (GEMINI_API_KEY), never in the browser.
//
//   supabase secrets set GEMINI_API_KEY=your-key
//   supabase functions deploy generate-quiz
//
// Optional: supabase secrets set GEMINI_MODEL=gemini-3.8-flash

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { buildPrompt, checkInput, extractText, InputError, parseQuestions, RESPONSE_SCHEMA, SYSTEM_PROMPT } from './validate.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return reply(405, { error: 'Use POST.' })

  // Only signed-in teachers may spend the Gemini quota.
  const auth = req.headers.get('Authorization')
  if (!auth) return reply(401, { error: 'Log in first.' })
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } })
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) return reply(401, { error: 'Log in first.' })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', userData.user.id).maybeSingle()
  if (profile?.role !== 'teacher') return reply(403, { error: 'Only teachers can make quizzes.' })

  let input
  try {
    input = checkInput(await req.json().catch(() => null))
  } catch (err) {
    if (err instanceof InputError) return reply(400, { error: err.message })
    throw err
  }

  const key = Deno.env.get('GEMINI_API_KEY')
  if (!key) {
    console.error('GEMINI_API_KEY is not set')
    return reply(500, { error: 'Question writing is not set up yet. Ask whoever runs Compass to add the Gemini key.' })
  }
  const model = Deno.env.get('GEMINI_MODEL') || 'gemini-3.8-flash'

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: buildPrompt(input) }] }],
        generationConfig: { temperature: 0.7, responseMimeType: 'application/json', responseSchema: RESPONSE_SCHEMA },
      }),
      signal: AbortSignal.timeout(50_000),
    })
    if (!res.ok) {
      console.error('Gemini error', res.status, (await res.text()).slice(0, 500))
      if (res.status === 429) return reply(429, { error: 'The AI is busy right now. Wait a minute and try again.' })
      return reply(502, { error: 'The AI could not write questions right now. Try again in a moment.' })
    }
    const questions = parseQuestions(extractText(await res.json()), input)
    return reply(200, { questions })
  } catch (err) {
    console.error('generate-quiz failed', err)
    if (err instanceof Error && err.name === 'TimeoutError') return reply(504, { error: 'The AI took too long. Try again with fewer questions.' })
    return reply(502, { error: err instanceof Error ? err.message : 'Something went wrong. Try again.' })
  }
})
