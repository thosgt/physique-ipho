// Correction d'une réponse rédigée par Claude, via l'API Anthropic (clé côté serveur uniquement).

const plain = s => String(s || "")
  .replace(/<figure[\s\S]*?<\/figure>/g, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"')
  .replace(/\s+/g, " ").trim();

function correctionPrompt(q, g, answer) {
  return `Tu es un professeur de physique qui corrige la copie d'un élève préparant les Olympiades de physique (test de présélection IPhO, Concours général). Compare la réponse de l'élève au corrigé de référence. Juge le fond, pas la forme : ce qui compte est le résultat final (expression littérale ou valeur numérique, à quelques pour cent près) et la justesse physique de la démarche. N'exige pas le détail des calculs intermédiaires ni une rédaction complète : une réponse courte qui donne le bon résultat avec l'idée clé est juste ; une expression équivalente algébriquement est juste ; le LaTeX et le texte brut sont acceptés. Réserve « faux » à un résultat ou un raisonnement erroné.
${g ? "CONTEXTE DU PROBLÈME : " + plain(g.intro).slice(0, 2500) + "\n" : ""}QUESTION : ${plain(q.statement).slice(0, 3000)}
CORRIGÉ DE RÉFÉRENCE : ${plain(q.expected || "").slice(0, 2000)} ${plain(q.explanation || "").slice(0, 3000)}
RÉPONSE DE L'ÉLÈVE : ${String(answer).slice(0, 3000)}
Réponds uniquement par un objet JSON {"verdict": "juste" | "partiel" | "faux", "commentaire": "..."} ; le commentaire (3 phrases maximum, en français, tutoiement) dit ce qui est juste, ce qui manque ou l'erreur, sans réécrire tout le corrigé. Tu peux écrire des formules en LaTeX entre \\( et \\).`;
}

async function correct(q, g, answer) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw Object.assign(new Error("La correction par Claude n'est pas encore configurée (clé API absente)."), { status: 503 });
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-haiku-5-5",
      max_tokens: 600,
      messages: [{ role: "user", content: correctionPrompt(q, g, answer) }],
    }),
  });
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    console.error("Anthropic", r.status, txt.slice(0, 500));
    throw Object.assign(new Error(r.status === 429 ? "Claude est très sollicité : réessayez dans une minute." : "La correction n'a pas pu être générée."), { status: 502 });
  }
  const j = await r.json();
  const text = (j.content || []).filter(b => b.type === "text").map(b => b.text).join("");
  const m = text.match(/\{[\s\S]*\}/);
  let data = null;
  try { data = m ? JSON.parse(m[0]) : null; } catch (e) { data = null; }
  if (!data) throw Object.assign(new Error("Réponse de Claude illisible ; réessayez."), { status: 502 });
  const verdict = ["juste", "partiel", "faux"].includes(data.verdict) ? data.verdict : "partiel";
  return { verdict, commentaire: String(data.commentaire || "").slice(0, 1500) };
}

module.exports = { correct, correctionPrompt, plain };
