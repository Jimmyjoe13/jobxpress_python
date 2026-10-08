# Audit SEO croisé GSC × GA4 — JobXpress — 2026-10-08

> Prolonge `AUDIT-2026-10-05.md` et `AUDIT-2026-10-06-GSC-GA4.md`.
> GSC : 09/09 → 06/10 (28 j) vs 12/08 → 08/09. GA4 : 28 j glissants au 08/10.
> Preuves : API GSC + GA4 (compte de service), inspection des 25 URLs du sitemap, HTTP live.
> Script : `analytics-credentials/audit_gsc_ga4_20261008.py` — sortie brute : `output/audit_20261008_raw.txt`.

## 1. Synthèse

**Les impressions montent (×3 en 28 j), mais le blog est quasi invisible pour une cause technique
découverte aujourd'hui : le corps des articles n'est pas présent dans le HTML servi.**
Seuls 3 articles sur 15 sont indexés, et ceux qui le sont rankent en position 45-95 sur leurs vraies requêtes.

## 2. Constat bloquant — contenu des articles rendu uniquement côté client 🔴

- `frontend/src/components/blog/ArticleContent.tsx` est `"use client"` et renvoie un **squelette
  `animate-pulse` tant que `mounted=false`** → au premier rendu (SSR), l'`<article>` contient 69 mots
  et 0 `<h2>` ; les ~1 240 mots de l'article n'existent que dans le payload RSC (`self.__next_f.push`).
- Conséquence : Google doit passer par la file de rendu JS pour voir le texte → indexation lente,
  « Discovered – not indexed », positions faibles sur les requêtes de fond.
- Le commentaire du composant est faux : `dangerouslySetInnerHTML` fonctionne très bien en Server Component.
- **Fix (15 min)** : supprimer `"use client"`, `useState`/`useEffect` et le squelette ; rendre directement
  le `<div dangerouslySetInnerHTML>`. Puis redéployer, vérifier `<h2>` dans le HTML brut, request-indexing
  des 3 articles en page 2 + resoumission sitemap.

## 3. GSC — dynamique

| Métrique | 12/08→08/09 | 09/09→06/10 | Delta |
|---|---|---|---|
| Clics | 8 | **7** | −1 |
| Impressions | 73 | **228** | **×3,1** |
| CTR | 11,0 % | 3,1 % | mécanique (non-marque) |
| Position | 13,8 | 12,9 | ≈ |

Par semaine : 24 → 13 → 92 → **99 impressions** ; la marche du 24/09 coïncide avec l'indexation du blog.
Position hebdo qui glisse (3,7 → 17,0) = arrivée de requêtes non-marque mal classées, pas une chute.

- **Marque** : « jobxpress » 9 imp, pos 3,0, **0 clic** ; « job express » 30 imp, 2 clics. La home n'est
  pas 1re sur son propre nom → manque d'autorité (0 backlink) et titre en cours de changement (non déployé).
- **Non-marque** : 100 % de requêtes à 1-2 impressions. Lettre de stage : positions **46 à 94** sur
  « lettre de motivation stage », « exemple lettre motivation stage »… → l'article est indexé mais jugé pauvre.
  Négociation salaire : pos 1 à 7 sur des longues traînes (« conseils pour une négociation salariale »).
- **Géographie** : France 140 imp, puis Suisse 19, Côte d'Ivoire 10, Sénégal 9 (3 des 7 clics hors France).
- **Device** : mobile pos 6,6 vs desktop 16,3.

### Pages

| Page | Imp | Pos | Clics | GA4 landing organique |
|---|---|---|---|---|
| `/` | 75 | 5,3 | 4 | 4 sessions, 2 engagées, 27 s |
| `/blog/lettre-motivation-stage` | **96** | **16,9** | 1 | 1 session engagée, 40 s |
| `/blog/travailler-remote-france` | 39 | 13,1 | 1 | 1 session, 0 s (rebond) |
| `/guide-emploi` | 13 | 15,2 | 0 | — |
| `/blog/negociation-salaire-techniques` | 9 | 18,8 | 0 | — |
| `/pricing` | 3 | 7,3 | 1 | 1 session, 0 s |

**Opportunité n°1** : `/blog/lettre-motivation-stage` — 96 imp/28 j en page 2. Passer en top 5
(CTR ~6 %) ≈ **+5 à 7 clics/mois**, soit le double du trafic organique actuel. Prérequis : le fix §2.

### Indexation (inspection des 25 URLs du sitemap)

- **8 indexées** : `/`, `/pricing`, `/guide-emploi`, `/blog` + 3 articles (lettre stage, remote, négociation).
- **6 « Discovered – not indexed »** : `/about`, `/privacy`, `/terms`, `cv-ats-passe-filtre`,
  `reconversion-professionnelle-ia`, `cv-optimise-ia`.
- **11 « URL unknown to Google »** : `/careers`, `/contact`, `/testimonials` + **8 articles**.
- Dernier crawl de toutes les pages indexées : **23-24/09** → plus aucun recrawl depuis 2 semaines.
- Sitemap : 25 soumises, 0 erreur, téléchargé le 04/10. Les `lastmod` sont désormais différenciés.

## 4. GA4 — croisement avec GSC

| | 28 j | 7 j |
|---|---|---|
| Utilisateurs | 20 (100 % nouveaux) | 11 |
| Sessions | 21 | 11 |
| Engagement | 43 % | **27 %** |
| Durée moy. | 72 s | **16 s** |

- **Cohérence GSC↔GA4 ✅** : 7 clics Google ↔ 7 sessions google/organic (+1 Bing). Landings organiques
  alignées page par page avec les clics GSC → le tracking pageview est fiable.
- **Trafic US = bots datacenter** : San Jose, Ashburn, Boardman, Council Bluffs (AWS/Google/Azure).
  7 sessions à 185 s de moyenne → elles **gonflent artificiellement** la durée globale.
  **France réelle : 8 sessions, 2 engagées, 6,7 s de moyenne.**
- **Continuité** : trous le 29/09 et le 01/10, 1 session/jour depuis le 05/10.
- **Tunnel** : `sign_up` ×1 (02/10) ; **0** `login` / `cv_adapted` / `ats_check` / `purchase` en 56 jours.
  Pilotage produit toujours aveugle.
- Direct (12 sessions, 113 s) dominé par les bots et les visites internes ; l'organique pèse 38 % des sessions.

## 5. Constats annexes

- **Modifications locales non commitées** : nouveau titre home/layout (« Candidatures automatisées »),
  corrections de coquilles dans l'article remote, tracking `purchase` sur la page pricing.
- ⚠️ Ce tracking envoie `purchase` **au clic** vers le checkout Stripe, avant tout paiement → à renommer en
  `begin_checkout`, et déclencher `purchase` côté webhook Stripe (Measurement Protocol) ou sur la page de succès.
- Titre live encore l'ancien ; `/about`, `/careers`, `/testimonials` toujours dans le sitemap sans être indexés.
- Veille hebdo (`seo_weekly.py`) toujours limitée aux requêtes : elle ne voit pas l'opportunité page-level.

## 6. Plan d'action priorisé

1. **[Bloquant] Rendu serveur du contenu des articles** (§2), redeploy, contrôle HTML brut.
2. **Request-indexing GSC** : lettre stage, remote, négociation, puis les 8 articles inconnus (≤10/jour).
3. **Enrichir `/blog/lettre-motivation-stage`** : title et H1 sur « lettre de motivation stage : exemples et
   modèles », section exemples complets par domaine, FAQ + schema FAQPage, CTA `/register`, 2-3 liens
   depuis `negociation-salaire-techniques` et `/guide-emploi`.
4. **Commit + déploiement des changements locaux**, après correction `purchase` → `begin_checkout`.
5. **Filtre GA4** : exclure les villes datacenter / créer un segment « France + hors bots » pour lire l'engagement réel.
6. **Backlinks** : 5 annuaires/semaine (templates `docs/backlinks-outreach.md`) — la marque ne passera pas en pos 1 sans autorité.
7. **Sitemap** : retirer `/careers` et `/testimonials` tant qu'ils n'ont pas de contenu réel.
8. **Veille hebdo** : ajouter pages pos 10-20 avec ≥ 30 imp, couverture d'indexation du sitemap, alerte si 0 événement clé sur 7 j.

## 7. Non vérifié

- Le rendu Googlebot réel (test d'URL en direct GSC non dispo via API) : à confirmer dans l'interface.
- Backlinks externes, Core Web Vitals (pas d'appel PageSpeed), parcours payant Stripe.
