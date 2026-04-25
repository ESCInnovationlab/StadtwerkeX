# STADTWERKE X — Change Documentation

**Project:** EnergyBot_Offline  
**Date:** 2026-04-20  
**Scope:** Dashboard Restructuring + KPI Expansion

---

## 1. Page Structure

### Before

The entire dashboard was a **single page** (`/dashboard`).  
It had:
- A fixed left **Sidebar** (280 px) with tab navigation buttons
- A **KPI grid** (4 cards) at the top of the main content
- A **tab bar** below the KPI cards with 4 tabs rendered inline on the same page:
  - Strategische Analyse
  - Netz-Karte
  - Compliance & Daten
  - KI-Assistent
- Clicking a KPI card only switched the active tab — it did **not** navigate anywhere

```
/dashboard
└── Sidebar (fixed left)
    ├── Tab: Strategische Analyse
    ├── Tab: Netz-Karte
    ├── Tab: Compliance & Daten
    └── Tab: KI-Assistent
└── Main content
    ├── KPI row (4 cards — click = switch tab)
    └── Active tab content (rendered in-place)
```

### After

The dashboard is now a **multi-page application** using React Router nested routes.  
`/dashboard` acts as a layout shell. Each of the 4 categories is its own dedicated page.

```
/dashboard                    → DashboardHome  (front page with description)
/dashboard/anschluesse        → AnschlussePage
/dashboard/kritisch           → KritischPage
/dashboard/ueber-nutzungsdauer → UeberNutzungsdauerPage
/dashboard/modernisierung     → ModernisierungPage
```

Navigation is handled by a **TopNav bar** (sticky, top of page) with the 4 links on the right side.  
The Sidebar remains but now only handles utility selection (Sparte) and system status — tab navigation was removed from it.

---

## 2. Navigation

### Before

| Element | Location | Behavior |
|---------|----------|----------|
| Tab buttons | Left sidebar (fixed) | Switched active tab in-place |
| KPI card click | Main content | Switched active tab in-place |
| No URL change | — | Browser back/forward did nothing |

### After

| Element | Location | Behavior |
|---------|----------|----------|
| **TopNav links** | Top right (sticky bar) | Navigate to a full sub-page via React Router |
| **Übersicht** link | Top left of TopNav | Returns to `/dashboard` home page |
| KPI cards on home | Dashboard home | Navigate to the relevant sub-page |
| Browser back/forward | — | Works correctly (URL-based routing) |

---

## 3. Dashboard Home Page

### Before

No dedicated home/landing screen for the dashboard. After login the user landed directly on the KPI row + Strategische Analyse tab.

### After

`/dashboard` now shows a **DashboardHome** page with:

- **Hero section** — Platform name, tagline
- **"Was ist diese Plattform?"** — Two-column description block explaining the purpose and use cases of the platform
- **4 navigation cards** — One per category, showing the live KPI value, a description, and an "Bereich öffnen →" link
- All 4 KPI values are live (fetched from the API)

---

## 4. Theme

### Before

- Primary accent color: **Red** (`#ef4444`)
- Glass card borders: `rgba(239, 68, 68, 0.3)` (red-tinted)
- Sidebar active state: red glow
- Tab active underline: red
- Button gradients: red-to-black

### After

- Primary accent color: **White** (`#ffffff`)
- Glass card borders: `rgba(255, 255, 255, 0.1)` (neutral white)
- Background: pure black (`#050505`)
- All accents, borders, active states, and underlines: white/light gray
- **Semantic color exceptions kept** (not removed):
  - Red (`#ef4444`) — Kritisch / danger values
  - Amber (`#f59e0b`) — Über Nutzungsdauer / warning values
  - Green (`#10b981`) — LLM status indicator

**Files changed for theme:**

| File | What changed |
|------|-------------|
| `frontend/src/index.css` | All CSS variables rewritten (white primary, black bg) |
| `frontend/src/components/ui/Sidebar.css` | Borders, hover states, active states → white-based |
| `frontend/src/components/ui/KpiCard.css` | Border, button, hover → white-based |

---

## 5. KPI System

### Before — Single `/api/kpis` endpoint

The API returned **7 flat values** used only in the 4 header KPI cards:

| Key | Description | Value |
|-----|-------------|-------|
| `total` | Total connections | 4,056 |
| `critical` | High-risk connections | 1,326 |
| `over_lifespan` | Past renewal date | 1,886 |
| `unsuitable` | Unsuitable infrastructure | 1,886 |
| `aging_30` | Age ≥ 30 years | 3,307 |
| `aging_40` | Age ≥ 40 years | 3,013 |
| `avg_age` | Average age | 59.9 |

These 4 cards were the only KPI display. No per-page breakdown existed.

---

### After — New `/api/kpis/detailed` endpoint

A second API endpoint (`GET /api/kpis/detailed?utility=...`) returns **per-page KPI groups** with **28 metrics** derived directly from the Excel dataset (`Hausanschluss_data.xlsx`, 2,300 properties / 4,056 connections).

---

#### 5a. Anschlüsse KPIs

*Source columns: `Einbaudatum`, `Sparte`, `Objektzweck Haushalt`, `Mehrspartenhauseinführung`, `Länge`*

| KPI | Value | Description |
|-----|-------|-------------|
| Gesamtbestand | **4,056** | All connections (Wasser + Gas) |
| Wasser-Anschlüsse | **2,141** | 52.8 % of total |
| Gas-Anschlüsse | **1,915** | 47.2 % of total |
| Ø Anlagenalter | **59.9 Jahre** | Average age of all assets |
| Haushaltsobjekte | **3,331** | Residential buildings |
| Mehrspartenhauseinf. | **1,819** | Properties with both Gas + Water entry |

**Before:** Only `total` (4,056) was shown as a single card.  
**After:** 6 detailed KPI cards showing the breakdown of the full stock.

---

#### 5b. Kritisch KPIs

*Source columns: `Risiko`, `Keine Mängel`, `(Letztes) Inspektionsdatum`, `Sparte`*

| KPI | Value | Description |
|-----|-------|-------------|
| Hohes Risiko | **1,326** | Risk = "Hoch" — 32.7 % of stock |
| Mittleres Risiko | **1,399** | Risk = "Mittel" |
| Mit Mängeln | **1,708** | Inspected with defects (Keine Mängel = Nein) |
| Inspektion überfällig | **1,228** | Last inspection > 5 years ago |
| Keine Inspektionsdaten | **119** | No inspection date on record |
| Wasser kritisch | **686** | High-risk Water connections |
| Gas kritisch | **640** | High-risk Gas connections |
| Hochrisiko-Anteil | **32.7 %** | Share of stock with high risk |

**Before:** Only `critical` (1,326) was shown as a single card.  
**After:** 8 KPI cards with full risk breakdown and inspection status.

**Most critical materials in high-risk group (from data):**

| Werkstoff | Anzahl |
|-----------|--------|
| Stahl | 334 |
| Stahl mit KKS | 320 |
| Asbestzement (AZ) | 248 |
| Stahl ohne KKS | 212 |

---

#### 5c. Über Nutzungsdauer KPIs

*Source columns: `Erneuerung_empfohlen_bis`, `Alter`, `Sparte`*

| KPI | Value | Description |
|-----|-------|-------------|
| Über Nutzungsdauer | **1,886** | Renewal date already past (< 2026) |
| Erneuerung < 10 Jahre | **537** | Due by 2036 |
| Erneuerung < 20 Jahre | **913** | Due by 2046 |
| Älter als 80 Jahre | **1,145** | Highest failure risk |
| Älter als 60 Jahre | **2,137** | Elevated renewal need |
| Ältestes Asset | **106 Jahre** | Installed in 1920 |
| Wasser überfällig | **985** | Water connections past renewal date |
| Gas überfällig | **901** | Gas connections past renewal date |

**Before:** Only `over_lifespan` (1,886) was shown as a single card.  
**After:** 8 KPI cards covering the full age distribution and renewal timeline.

**Average age by material (Water):**

| Werkstoff | Ø Alter | Anzahl |
|-----------|---------|--------|
| Stahl | 66.6 J | 713 |
| Asbestzement (AZ) | 62.6 J | 362 |
| PVC | 39.8 J | 599 |
| PE | 44.5 J | 467 |

---

#### 5d. Modernisierung KPIs

*Source columns: `Infrastruktur_ungeeignet`, `Mehrspartenhauseinführung`, `Werkstoff`, `Druckstufe`*

| KPI | Value | Description |
|-----|-------|-------------|
| Infrastruktur ungeeignet | **1,886** | Not suitable for WP / EV (46.5 %) |
| Ohne Mehrspartenhauseinf. | **481** | Single-utility entry only |
| AZ-Leitungen (Wasser) | **362** | Asbestos-cement — mandatory replacement |
| Stahl ohne KKS (Gas) | **540** | No cathodic corrosion protection |
| Gas MD-Druckstufe | **976** | Medium-pressure connections |
| Gas ND-Druckstufe | **939** | Low-pressure connections |
| Ungeeignet-Anteil | **46.5 %** | Share of stock needing modernization |

**Before:** Only `unsuitable` (1,886) was shown as a single card.  
**After:** 7 KPI cards covering material deficiencies, pressure levels, and multi-utility gaps.

---

## 6. Files Changed — Complete List

### New Files Created

| File | Purpose |
|------|---------|
| `frontend/src/components/ui/TopNav.jsx` | Sticky top navigation bar with 4 page links |
| `frontend/src/components/ui/TopNav.css` | TopNav styles |
| `frontend/src/components/ui/PageKpiGrid.jsx` | Reusable KPI stat-card row component |
| `frontend/src/components/ui/PageKpiGrid.css` | PageKpiGrid styles |
| `frontend/src/pages/DashboardHome.jsx` | Dashboard front page with description + 4 nav cards |
| `frontend/src/pages/DashboardHome.css` | DashboardHome styles |
| `frontend/src/pages/AnschlussePage.jsx` | Anschlüsse dedicated page |
| `frontend/src/pages/KritischPage.jsx` | Kritisch dedicated page |
| `frontend/src/pages/UeberNutzungsdauerPage.jsx` | Über Nutzungsdauer dedicated page |
| `frontend/src/pages/ModernisierungPage.jsx` | Modernisierung dedicated page |
| `frontend/src/pages/SubPage.css` | Shared styles for all 4 sub-pages |

### Modified Files

| File | What Changed |
|------|-------------|
| `fastapi_server.py` | Added `GET /api/kpis/detailed` endpoint with 28 metrics |
| `frontend/src/App.jsx` | Added nested routes under `/dashboard` |
| `frontend/src/pages/Dashboard.jsx` | Converted to layout component using `<Outlet />` |
| `frontend/src/pages/Dashboard.css` | Rewritten for sidebar+body flex layout |
| `frontend/src/context/AppContext.jsx` | Added `detailedKpis` state, parallel API fetch |
| `frontend/src/index.css` | Full theme rewrite — red → black & white |
| `frontend/src/components/ui/Sidebar.jsx` | Removed tab nav, kept utility selector + status |
| `frontend/src/components/ui/Sidebar.css` | B&W theme applied |
| `frontend/src/components/ui/KpiCard.css` | B&W theme applied |

---

## 7. Data Source

All KPI values are computed at runtime from:

**`excel_data/Hausanschluss_data.xlsx`**
- 2,300 properties
- 67 columns (Wasser + Gas fields per property)
- 4,056 total connections after long-format expansion in `geo_utils.py`
- Location: Wülfrath, NRW (PLZ 42489)
