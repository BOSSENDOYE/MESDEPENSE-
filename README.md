# Mes Dépenses

PWA de suivi de dépenses personnelles en FCFA, pour un seul utilisateur, **100 % hors-ligne**.
Aucun compte, aucun serveur : les données sont stockées dans IndexedDB, sur le téléphone.

Stack : React 18 · Vite 5 · TypeScript (strict) · Tailwind CSS 3 · idb · Recharts · date-fns (fr) · vite-plugin-pwa · Vitest.

## Prérequis

- Node.js 18 ou plus récent (testé avec Node 22) et npm.

## Commandes

```bash
npm install              # installer les dépendances
npm run dev              # lancer en développement → http://localhost:5173
npm run dev:mobile       # idem, accessible depuis le téléphone sur le même Wi-Fi
npm test                 # tests unitaires (calculs, récurrences, import/export)
npm run typecheck        # vérification TypeScript
npm run build            # build de production dans dist/
npm run preview          # servir le build (PWA + service worker actifs)
node scripts/prepare-logo.mjs   # détourer public/logo.png → branding/logo-source.png + public/logo-app.png
npm run generate-pwa-assets    # régénérer favicon et icônes PWA depuis branding/logo-source.png
```

> Le service worker (mode hors-ligne) n'est actif qu'avec `npm run build` puis `npm run preview`,
> ou une fois déployé en HTTPS.

## Fonctionnalités

- **Ajout rapide** : bouton « + » toujours visible, clavier numérique, catégories en boutons,
  date du jour par défaut (raccourcis Aujourd'hui / Hier), moyen de paiement mémorisé.
- **Aucune saisie perdue** : le formulaire est enregistré en brouillon à chaque frappe
  (localStorage). Si l'app est fermée, un bandeau « Saisie non terminée » permet de reprendre.
- **Liste** groupée par jour, recherche dans les notes (sans tenir compte des accents),
  filtres par mois et par catégorie, modification et suppression avec confirmation.
- **Tableau de bord** : total du mois, camembert par catégorie, barres par jour,
  comparaison en % avec le mois précédent (pour le mois en cours : même période, du 1er à aujourd'hui).
- **Catégories** personnalisables (nom, emoji, couleur). Supprimer une catégorie déplace ses
  dépenses vers « Autres ».
- **Budgets mensuels** par catégorie, avec alerte à 80 % (orange) et 100 % (rouge).
- **Épargne** : objectifs (montant visé, échéance, effort mensuel conseillé), versements et retraits,
  versement automatique mensuel, part d'épargne réservée dans le budget du mois.
- **Revenus** et **reste à vivre** du mois (revenus − dépenses − épargne), taux d'épargne.
- **Assistant 💬** hors-ligne : « taxi 2000 », « épargne 5000 tabaski », « salaire 250000 »…
- **Dépenses récurrentes** créées automatiquement à l'ouverture de l'app (les mois manqués
  sont rattrapés ; jour 31 → dernier jour des mois courts).
- **Export CSV** (séparateur `;`, compatible Excel français) et **sauvegarde/restauration JSON**.
- Mode sombre automatique, accessible (labels, contrastes, cibles ≥ 44 px).

## Structure

```
src/
  types/       Types du modèle de données
  db/          Accès IndexedDB (idb) : ouverture, CRUD, transactions
  utils/       Fonctions pures testées : stats, récurrences, CSV, sauvegarde, formats
  hooks/       Contexte des données, toasts, navigation, thème
  components/  Composants d'interface (formulaire, graphiques, modales…)
  pages/       Accueil, Dépenses, Budgets, Épargne, Réglages
```

## Modèle de données (IndexedDB `mes-depenses`)

| Store        | Champs |
|--------------|--------|
| `expenses`   | id, amount (entier FCFA), categoryId, date (`yyyy-MM-dd`), paymentMethod, note, createdAt, *recurringId?* |
| `categories` | id, name, color, icon, *order* |
| `budgets`    | categoryId (clé), monthlyLimit |
| `recurring`  | id, amount, categoryId, paymentMethod, note, dayOfMonth, active, *lastRunMonth* |
| `settings`   | key (`totalBudget`, `savingsBudget`), value |
| `goals`      | id, name, icon, target, deadline (`yyyy-MM`), createdAt, auto? (amount, dayOfMonth, active, lastRunMonth) |
| `movements`  | id, goalId, amount (> 0 versement, < 0 retrait), date, note, createdAt, auto? |
| `incomes`    | id, amount, date, source, note, createdAt |

Champs ajoutés au cahier des charges (en italique) : `order` pour l'ordre d'affichage des catégories,
`lastRunMonth` pour éviter les doublons de récurrences, `recurringId` pour repérer les dépenses générées.

## Déploiement

- **Netlify** : `netlify.toml` est fourni (build `npm run build`, dossier `dist`).
- **Vercel** : `vercel.json` est fourni (preset Vite).
