# Physique des olympiades

Préparation au test de présélection des IPhO (Terminale et CPGE) et au Concours général de physique : cours, simulations, annales classées, fiches méthode, correction des réponses rédigées par Claude, comptes élèves et tableaux de bord.

- Site : https://physique-ipho.vercel.app
- Artefact Claude source : https://claude.ai/artifact/USoqxVAkNMq9ZvTr2Rf5M6
- Mis à jour le 20 novembre 2026 (version 19) : section CPGE « Problèmes à prise d’initiative » (méthode en cinq étapes, douze problèmes ouverts de 2014 à 2026 dont trois en mode guidé), poids de chaque chapitre et de chaque méthode dans les tests 2014-2026 (`data/importance.json`), liens vers les cours vidéo de PhysiCité en tête de chapitre.

Généré depuis l'artefact Claude ; ne pas modifier à la main, redemander un déploiement à Claude. Hébergé sur Vercel.

## Organisation

- `index.html`, `chap/`, `data/`, `img/`, `sim/`, `simkit.js` : le site, identique à l'artefact.
- `compte.js` : connexion par code, enregistrement des réponses, tableau de bord élève (`#suivi`) et espace professeur (`#admin`).
- `api/app.js` : une seule fonction Vercel (`/api/app?a=…`) ; `lib/db.js` (Postgres Neon, tables créées automatiquement), `lib/auth.js` (session signée), `lib/claude.js` (correction par l'API Anthropic).

## Variables d'environnement (projet Vercel → Settings → Environment Variables)

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | Base Postgres, ajoutée automatiquement par l'intégration Neon (Storage) |
| `ADMIN_PASSWORD` | Mot de passe professeur, saisi dans le même champ que les codes élèves |
| `ANTHROPIC_API_KEY` | Clé API Anthropic pour la correction par Claude |
| `ANTHROPIC_MODEL` | Facultatif, `claude-haiku-5-5` par défaut |

Après un changement de variable, redéployer (Deployments → ⋯ → Redeploy).
