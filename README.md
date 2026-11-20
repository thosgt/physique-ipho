# Physique des olympiades

Préparation au test de présélection des IPhO (Terminale et CPGE) et au Concours général de physique : cours, simulations, annales classées, fiches méthode, correction des réponses rédigées par Claude, comptes élèves et tableaux de bord.

- Site : https://physique-ipho.vercel.app
- Artefact Claude source : https://claude.ai/artifact/USoqxVAkNMq9ZvTr2Rf5M6
- Mis à jour le 20 novembre 2026 (version 20) : cinq nouveaux chapitres (mécanique du point, mécanique céleste, oscillateurs, circuits électriques, thermodynamique et rayonnement), deux problèmes EuPhO corrigés et la liste des sujets EuPhO 2017-2026 ; version 19 : section CPGE « Problèmes à prise d’initiative », poids de chaque chapitre dans les tests 2014-2026, vidéos PhysiCité.

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
