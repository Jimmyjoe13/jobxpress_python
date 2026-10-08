# Mini-audit GSC + GA4 JobXpress — 2026-10-06

> Fenêtre GSC 28j : 08/09 → 05/10 (lag GSC, 06/10 non consolidé). GA4 : 28j glissants au 06/10.
> Prolonge AUDIT-2026-10-05.md. Preuve directe : API GSC + GA4 (compte de service), HTTP live.

## GSC : plateau, pas de décollage

- 28j : **5 clics / 177 impressions** (vs 8 / 197 au 05/10 sur fenêtre décalée d'1 jour).
- 7j 29/09-05/10 : 2 clics / 77 imp vs 1 / 78 les 7j précédents → **flat**.
- Marque domine toujours : "job express" 28 imp / 3 clics pos 3,8 ; "jobxpress" **8 imp / 0 clic pos 3,0** → anormal : pos 3 sur son propre nom.
- Non-marque : que du one-shot (1 imp chacune), sauf "lettre de motivation stage" 2 imp pos 65,5.
- Pages : `/blog/lettre-motivation-stage` 75 imp pos 15,5 / 0 clic = top opportunité ; `/blog/travailler-remote-france` 30 imp pos 11,6 / 1 clic ; `/guide-emploi` 10 imp pos 13,6 ; `/blog/negociation-salaire-techniques` 9 imp pos 18,8 / 0 clic ; `/` 72 imp pos 5,5 / 5 clics.

## GA4 : collecte OK, tunnel toujours aveugle

- 28j : 18 utilisateurs (100 % nouveaux), 19 sessions, 24 vues, engagement 47 %, durée 79 s.
- Continuité : trous les 29/09 et 01/10 (0 session) ; pic 4 sessions le 02/10 (jour du sign_up).
- Sources : Direct 12, Organic 6, Referral 1. Pages : `/` 17 vues, `/register` 2, 1 vue chacun sur 3 articles + dashboard + pricing.
- Événements : page_view 24, session_start 19, first_visit 18, user_engagement 11, scroll 5, **sign_up 1**. Toujours **0 login / cv_adapted / ats_check / purchase**.
- Anomalie : États-Unis 7 sessions (37 %) pour un site FR → bots ou tests non filtrés.
- Temps réel : 0 au moment du contrôle.

## Prod (check rapide)

- `jobxpress.fr` 200, `api.jobxpress.fr/health` healthy, balise gtag G-PTVRXLF7NR présente dans le HTML live, Schema SoftwareApplication + Organization + WebSite + HowTo + FAQ présents.

## Quick wins (ordre d'impact)

1. Reprendre la marque "jobxpress" (8 imp, 0 clic, pos 3,0) : vérifier concurrence sur le nom, request-indexing home, favicon/title stables.
2. Sortir `/blog/lettre-motivation-stage` de pos 15,5 : titre exact + intro + 1 FAQ + 2 liens internes + CTA register + request-indexing → 4 à 7 clics/mois récupérables.
3. Pousser `/blog/travailler-remote-france` de 11,6 en page 1 : maillage home + update contenu (0,4 pt à gagner).
4. Prouver le tracking produit : parcours réel inscription → CV → ATS en DebugView, corriger ce qui ne remonte pas, alerter si 0 événement clé sur 7j.
5. Filtrer le trafic US/bots GA4 et lancer outreach 5 annuaires/semaine (templates déjà prêts) : sans autorité, la page 2 ne bougera pas.
