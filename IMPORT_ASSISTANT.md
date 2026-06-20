# Antokton Import Assistant

Antokton Import Assistant është robot/importues për burime publike, API dhe RSS. Ai merr njoftime, i normalizon, i deduplifikon, i vlerëson për relevancë, risk dhe etikë/hallall, krijon titull e përmbledhje shqip dhe i ruan si `pending_review`.

Njoftimet nuk publikohen automatikisht. Publikimi bëhet nga admini/moderatori, përveç nëse `auto_publish_enabled` aktivizohet në mënyrë eksplicite në të ardhmen.

## Aktivizimi

Environment variables:

```env
IMPORT_ASSISTANT_ENABLED=true
IMPORT_ASSISTANT_AUTO_PUBLISH=false
IMPORT_ASSISTANT_MAX_PER_RUN=100
IMPORT_ASSISTANT_DEFAULT_FREQUENCY_HOURS=6
ADZUNA_APP_ID=
ADZUNA_APP_KEY=
JOOBLE_API_KEY=
EURES_API_KEY=
```

Provider-i teknik `arbeitnow` punon pa API key kur admini ka krijuar një burim `api` me `provider_key=arbeitnow`. `Adzuna`, `Jooble` dhe `EURES` janë të përgatitur; kur mungojnë çelësat nuk rrëzojnë importin.

## Burimet dinamike

Burimet konkrete ruhen si rreshta `ImportedSource` në databazë. Kodi mban vetëm parser-at/provider-at teknikë (`api`, `rss`, `html`, `facebook`, `telegram`, `manual`, `custom`). Burime si Staff.al, PortalPune, faqe Facebook, kanale Telegram, agjenci shqiptare ose partnerë nuk krijohen më nga lista hardcoded në kod; ato shtohen, ndryshohen, çaktivizohen ose fshihen nga admini.

Admin → Import Assistant → Burime lejon:

- shtimin e burimeve të pakufizuara RSS, HTML, API, Facebook, Instagram, TikTok, LinkedIn, Telegram, WhatsApp, YouTube, X/Twitter, Reddit, Discord ose Manual;
- aktivizim/çaktivizim;
- zgjedhje `import_mode`: `automatic`, `manual`, `mixed`;
- frekuencë për çdo burim: OFF, çdo 1, 3, 6, 12 ose 24 orë;
- fshirje për burimet editueshme;
- vendosje të `base_url`, `jobs_url`, `category_url`, `country_scope`, `region_scope`, `language`, `notes`;
- vendosje të `source_group`, `parser_type`, `trust_level`;
- “Importo tani” për një burim edhe kur auto import është OFF.

`source_type` mund të jetë `rss`, `html`, `api`, `facebook`, `instagram`, `tiktok`, `linkedin`, `telegram`, `whatsapp`, `youtube`, `x_twitter`, `reddit`, `discord`, `manual`, `html_needs_review`.

`source_group` mund të jetë `global_provider`, `albanian_source`, `partner`, `community`, `rss`, `custom_api`, `manual_url`.

`trust_level` mund të jetë `trusted`, `needs_review`, `manual_only` ose vlerat e vjetra `high`, `medium`, `low`, `unknown`. Nëse stafi e klasifikon një burim shqiptar si të besueshëm, ky nivel ruhet te burimi dhe përdoret në importet e ardhshme.

Burimet pa API/RSS të qartë ose ku scraping nuk lejohet duhen regjistruar si `manual` ose `html_needs_review`. Roboti nuk bën scraping agresiv dhe nuk tenton të lexojë grupe private ose platforma ku nuk ka leje/API të qartë.

### Import automatik dhe manual

Import automatik lejohet vetëm për RSS, API zyrtare, HTML publik ku lejohet, ose platforma sociale kur ka API/leje të qartë. Facebook Groups pa API, WhatsApp Communities/Channels, Instagram profile personale, TikTok pa API, Messenger/Signal/Viber/Snapchat dhe burime të paqëndrueshme ruhen si manuale.

Për instalime të reja, sistemi nuk krijon automatikisht burime konkrete. Admini duhet t'i shtojë nga paneli `Burime` ose përmes API/DB, duke zgjedhur tipin teknik, frekuencën dhe besueshmërinë për secilin burim.

## Settings

Admin → Import Assistant → Robot lejon:

- Auto Import ON/OFF;
- frekuencën globale çdo X orë për cron-in;
- maksimumin për run;
- Auto Publish OFF/ON;
- Run Import Now.

Nëse `auto_import_enabled=false`, cron nuk importon vetë. Butoni “Importo tani” punon gjithmonë për admin/moderator. Kur zgjidhet një burim specifik, importi manual mund të ekzekutohet edhe nëse ai burim është OFF.

## Flow

Burimi → provider → normalizim → deduplikim → identitet burimi → risk score → ethical/hallall score → relevance score → gjuha e kontaktit → titull/përmbledhje shqip → `pending_review` → miratim/refuzim/publikim.

## Scoring

Final Score:

- 35% relevanca profesionale;
- 25% besueshmëria e burimit;
- 20% ethical/hallall score;
- 10% freskia;
- 10% plotësia.

Burimet shqiptare nuk marrin prioritet automatik. Bonus jepet vetëm kur ka identitet publik, histori/besueshmëri dhe përputhje etike.

## Risk

Risk rritet për: pagë joreale, pagesë paraprake, vetëm WhatsApp pa identitet, pa kompani, pa adresë, profil anonim, tekst i paqartë, kripto/trading, adult, punë ilegale.

Risk i lartë e mban njoftimin në shqyrtim manual.

## Ethical/Hallall

Score ulet për: alkool, kazino, baste, lojëra fati, kamatë, pornografi, shërbime erotike, aktivitete të paligjshme, skema investimi dhe mish jo hallall.

Restorantet, hoteleria, furra e bukës dhe pasticeria nuk marrin bonus etik pa qartësi hallall.

## Kontakti dhe gjuha

Kontaktet ruhen si `contact_methods`:

```json
[
  { "type": "phone", "value": "+32..." },
  { "type": "email", "value": "info@example.com" },
  { "type": "website", "value": "https://..." },
  { "type": "whatsapp", "value": "+32..." },
  { "type": "application_form", "value": "https://..." }
]
```

Nëse kontakti është shqiptar ose kompani shqiptare e verifikuar, nuk shfaqet “Gjuha e komunikimit”. Nëse kontakti është i huaj, ruhen gjuhët: `sq`, `en`, `fr`, `nl`, `de`, `it`, `es`, `tr`, `ar`, `sv`, `da`, `fi`.

Endpoint placeholder për mesazhe:

`POST /api/admin/import-assistant/translate-contact-message`

## Publikimi

Kur admini publikon një import, krijohet `Job` normal në Antokton me:

- titull shqip;
- përmbledhje shqip;
- kategori/profesion/vend/qytet;
- pagë kur ekziston;
- kontakte sipas llojit;
- gjuhë komunikimi vetëm për kontakte të huaja;
- `source_url` dhe `source_name` private default;
- `imported_public_badge_visible=false` default.

Linku burimor dhe etiketa “Njoftim i importuar nga burim publik” ruhen, por nuk shfaqen publikisht pa miratim të stafit.

## Skadenca e njoftimeve

Çdo njoftim i importuar ose i krijuar manualisht merr fushat:

- `expires_at`
- `original_expires_at`
- `expiry_source`
- `expired_at`
- `is_expired`
- `auto_archive_after_expiry`
- `renewal_count`
- `last_renewed_at`

Importuesi kërkon afate në tekst me sinjale si “Afati i aplikimit”, “Apliko deri”, “Deadline”, “Closing date”, “Valid until”, “Skadon”, “Data e fundit”, “Rok za prijavu” dhe “Краен рок”. Nëse gjen afat, e ruan si `original_expires_at` dhe `expiry_source=original`.

Në mungesë të afatit origjinal, sistemi cakton afat automatik sipas kategorisë: punë 30 ditë, banesa 21 ditë, automjete 30-45 ditë, shërbime/komunitet/biznes 60-90 ditë sipas llojit. Cron-i ditor shënon postimet e skaduara me `is_expired=true`, `expired_at`, dhe i arkivon kur `auto_archive_after_expiry=true`. Postimet e skaduara nuk shfaqen në listat publike normale, por mbeten në detaj/arkiv për histori dhe auditim.

## API

- `POST /api/admin/import-assistant/run`
- `GET /api/admin/import-assistant/settings`
- `PUT /api/admin/import-assistant/settings`
- `GET /api/admin/import-assistant/sources`
- `POST /api/admin/import-assistant/sources`
- `PUT /api/admin/import-assistant/sources/:id`
- `DELETE /api/admin/import-assistant/sources/:id`
- `POST /api/admin/import-assistant/sources/:id/test`
- `GET /api/admin/import-assistant/logs`
- `POST /api/admin/import-assistant/items/:id/approve`
- `POST /api/admin/import-assistant/items/:id/reject`
- `POST /api/admin/import-assistant/items/:id/publish`

Të gjitha endpoint-et janë vetëm për admin/moderator.
