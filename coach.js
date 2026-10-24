// Cloudflare Pages Function. GEMINI_API_KEY is a server-side Cloudflare secret.
export async function onRequestPost({ request, env }) {
  const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
  if (!env.GEMINI_API_KEY || !env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return json({error:'Server secrets are not configured.'},503);
  const bearer = request.headers.get('Authorization') || '';
  if (!bearer.startsWith('Bearer ')) return json({error:'Sign in first.'},401);
  const token = bearer.slice(7);
  const auth = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {headers:{apikey:env.SUPABASE_ANON_KEY,Authorization:`Bearer ${token}`}});
  if (!auth.ok) return json({error:'Your session expired. Please sign in again.'},401);
  const user = await auth.json();
  if (!user?.id) return json({error:'Unauthorized'},401);
  let payload;
  try { payload = await request.json(); } catch { return json({error:'Invalid request'},400); }
  const message = String(payload.message || '').trim();
  if (!message || message.length > 1800) return json({error:'Message must be between 1 and 1800 characters.'},400);
  // Read profile/records server-side, constrained to the authenticated user by RLS.
  const headers = {apikey:env.SUPABASE_ANON_KEY,Authorization:`Bearer ${token}`};
  const base = `${env.SUPABASE_URL}/rest/v1`;
  const [profileRes,recordRes] = await Promise.all([
    fetch(`${base}/form_profiles?select=data&user_id=eq.${user.id}`,{headers}),
    fetch(`${base}/form_records?select=kind,data,created_at&user_id=eq.${user.id}&order=created_at.desc&limit=24`,{headers})
  ]);
  if (!profileRes.ok || !recordRes.ok) return json({error:'Unable to load your saved information.'},502);
  const profiles=await profileRes.json(), records=await recordRes.json();
  const context = JSON.stringify({profile:profiles[0]?.data || {},recentRecords:records}).slice(0,14000);
  const instructions = `You are FORM Coach, a supportive, evidence-aware bodybuilding and nutrition assistant. Never diagnose, prescribe, encourage extreme restriction, or guarantee results. If the user is under 18, avoid weight-loss prescriptions. Respect allergies and medical limitations. Do not invent verified macro or calorie figures for ingredients. You can recommend changes but NEVER claim to have saved them. If the user requests a change to an existing meal or workout, respond in concise JSON only: {"reply":"short explanation","proposal":{"kind":"meal" or "workout","title":"brief name","before":"existing plan summary","after":"proposed plan summary","notes":"cautions"}}. Only propose changes when the user explicitly asks for a change; otherwise return JSON {"reply":"your answer","proposal":null}. The frontend requires user approval before saving. User context: ${context}`;
  const model=env.GEMINI_MODEL || 'gemini-2.5-flash';
  let result;
  try { result=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':env.GEMINI_API_KEY},body:JSON.stringify({systemInstruction:{parts:[{text:instructions}]},contents:[{role:'user',parts:[{text:message}]}],generationConfig:{responseMimeType:'application/json',temperature:0.5,maxOutputTokens:1100}})}); }
  catch { return json({error:'AI service is temporarily unreachable.'},502); }
  if (!result.ok) {const raw=await result.text();return json({error:result.status===429?'AI free-tier limit reached. Try again later.':`AI service error (${result.status}).`,detail:raw.slice(0,200)},502);}
  const body=await result.json();const output=body.candidates?.[0]?.content?.parts?.map(x=>x.text||'').join('')||'';
  try {const parsed=JSON.parse(output);return json({reply:String(parsed.reply||'').slice(0,5000),proposal:parsed.proposal && ['meal','workout'].includes(parsed.proposal.kind)?parsed.proposal:null});}
  catch {return json({reply:output.slice(0,5000)||'Please try rephrasing that.',proposal:null});}
}
