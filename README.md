# Fmcg Flow Compass

Build a production-grade, enterprise FMCG Supply Chain & Sales Analytics Platform named "FMCG Supply Chain & Revenue Analytics" using React 19, TypeScript, Tailwind CSS, Express (tsx server.ts), and Cloud SQL PostgreSQL with Drizzle ORM.

### 1. Database Architecture & Seed Dataset (Cloud SQL PostgreSQL)

Provision a Cloud SQL PostgreSQL database with the following normalized relational schema:

- `categories`: `id` (serial PK), `name` (text, unique: Personal Care, Home Care, Foods & Refreshments, Packaged Foods)

- `brands`: `id` (serial PK), `name` (text, unique), `category_id` (FK to categories)

- `skus`: `id` (serial PK), `sku_code` (text), `sku_name` (text), `brand_id` (FK), `base_price` (numeric), `weight_tier` (text: Sachet/Travel, Small/Single, Medium/Family, Large/Bulk)

- `plants`: `id` (serial PK), `name` (text, unique), `state` (text), `latitude` (numeric), `longitude` (numeric), `capacity_units` (bigint), `operational_status` (text: Optimal, Near Capacity, Maintenance)

- `mother_warehouses`: `id` (serial PK), `name` (text), `state` (text), `zone` (text: North, South, East, West), `capacity_pallets` (integer), `latitude` (numeric), `longitude` (numeric)

- `distributors`: `id` (serial PK), `name` (text, unique), `region` (text: North, South, East, West), `credit_tier` (text: Platinum, Gold, Silver), `fulfillment_lead_days` (integer)

- `transactions`: `id` (serial PK), `period_month` (text: April to March), `period_quarter` (text: Q1-Q4), `month_index` (integer 1-12), `plant_id` (FK), `mother_warehouse_id` (FK), `distributor_id` (FK), `sku_id` (FK), `units_sold` (bigint), `sales_inr` (bigint), `transaction_rows` (integer), `created_at` (timestamp)

Seed an authoritative enterprise benchmark dataset with:

- Exactly 11,000 transaction records across 16 authentic FMCG brands (e.g., Velvet Soft Soap, CleanMax Detergent, SunGlow Face Wash, FreshLeaf Tea, Golden Crunch Biscuits, NutriSpread Peanut Butter), 8 manufacturing plants, 13 regional distributors, and 640 SKUs across Indian fiscal year FY2023-24 (April to March).

- Financial reconciliation targets: ~₹2,225 Cr gross revenue, ~69.5M units dispatched, average realization of ~₹320/unit, and ~650k dispatch rows.

- CRITICAL: In `node-postgres`, configure `pg.types.setTypeParser(20, (val) => parseInt(val, 10))` so SQL `BIGINT` (OID 20) fields are parsed as native JavaScript numbers rather than strings.

### 2. Backend API Service Layer (Express & Drizzle ORM)

Implement high-performance REST APIs in `server.ts` backed by SQL queries:

- `GET /api/analytics/status`: Returns database connection status, table inventory, record counts, and gross metric reconciliation totals.

- `GET /api/analytics/summary`: Returns filtered aggregated KPIs (Total Sales, Units Sold, Realization, Transaction Count) supporting query parameters: `category`, `brand`, `plant`, `distributor`, `quarter`, `month`.

- `GET /api/analytics/all-records`: Streams all transaction records with normalized relations for client-side multi-dimensional filtering and instant drill-downs. Ensure numeric columns are strictly cast to numbers.

- `GET /api/analytics/brands`, `/plants`, `/distributors`: Returns top ranking entities by revenue, volume, and realization.

- `GET /api/analytics/time-series`: Chronological 12-month fiscal trend (April through March).

- `GET /api/analytics/network-graph`: Returns supply-chain logistics graph nodes (plants, warehouses, distributors) and directional flow edges with volume weights.

- `GET /api/analytics/skus`: Paginated SKU master catalog with brand, category, realization, and total volume.

- `POST /api/analytics/chat`: AI Assistant endpoint grounded with SQL tool calling for supply chain queries, revenue forecasts, and operational diagnostics.

### 3. Application State & Interactive Dashboard Architecture

Build a single-page analytics application featuring 6 unified tabs:

#### Global Controls & Top Bar:

- Global Filters: Multi-select Category, Brand, Plant, Distributor, Quarter (Q1-Q4), and Month (April-March).

- Clear All Filters button, Dark/Light mode toggle, and Live Database Status badge (showing connected status and record count).

- Data Source Switcher: Toggle between "Database (11,000 records)" and "Upload Custom CSV/Excel" with instant file parsing and schema validation.

- Export Center: Export current filtered view to CSV and formatted Excel (.xlsx).

#### Global KPI Cards (Header):

- 4 primary KPI cards: **Gross Revenue (INR)**, **Dispatched Volume (Units)**, **Average Realization (₹/unit)**, and **Transaction Count**.

- Indian Numbering System formatting (Cr for Crores, L for Lakhs, k for thousands, e.g., ₹2225.64 Cr, 69.56M units, ₹319.98/u).

- Comparative Analysis toggle: **Quarter-over-Quarter (QoQ)** and **Month-over-Month (MoM)** showing percentage change pills, absolute difference, and prior period baseline value. Guard against divide-by-zero, `NaN`, and `Infinity`.

#### Tab 1: Executive Overview

- Period-over-period waterfall / monthly dispatch trajectory chart (Recharts dual-axis line/bar: Revenue vs Dispatched Units).

- Category Breakdown: Interactive Donut chart with category revenue share and realization tooltips.

- Top 5 Brands leaderboard with quick-filter clickability.

- Operational Health status bar: Manufacturing plant capacity distribution and order fulfillment velocity.

#### Tab 2: Brand & SKU Performance

- High-Volume / Low-Realization (HVLR) 2x2 Matrix: Scatter plot of Dispatched Units (X-axis) vs Average Realization (Y-axis) with benchmark quadrant crosshairs (Margin Diluters, Star Performers, Niche High-Margin, Low-Velocity).

- Brand Performance Matrix Table: Brand name, Category, Units Sold, Gross Sales INR, Realization/Unit, and Margin contribution with column sorting and search.

- SKU Catalog Explorer: Searchable SKU table with SKU Code, Description, Brand, Weight/Pack Tier, and Units.

#### Tab 3: Plant Operations & Capacity

- 8 Manufacturing Plants Performance: Bar chart of revenue output and unit volume by facility (Baddi, Bhiwadi, Haridwar, Sanand, Hosur, Kolkata, Hyderabad, Guwahati).

- Capacity Utilization Gauges & Status: Visual badge for Operational Status (Optimal / Near Capacity / Maintenance).

- Plant-to-Distributor Flow Matrix: Cross-tabulation heatmap or table of dispatch volumes from each plant to recipient distribution zones.

#### Tab 4: Logistics & Geospatial Network

- Interactive Supply Chain Geospatial Map: D3 / SVG rendering of India's geographic regions showing Manufacturing Plants (blue origin markers), Mother Warehouses (amber transfer hubs), and Regional Distributors (green destination nodes).

- Animated route connection lines connecting supply hubs with dispatch volume tooltip on hover.

- Network Graph Inspector: Click any plant or distributor to filter and highlight its exact supply routes and dispatch volumes.

#### Tab 5: Distributor Leaderboard & Receivables

- 13 Key Distributors Leaderboard with sorting by Gross Sales, Unit Dispatches, and Fulfillment Lead Time.

- Credit Tier Classification (Platinum, Gold, Silver) with credit risk indicators.

- Regional Market Share: Polar/Radar chart or regional breakdown (North, South, East, West) comparing sales vs volume.

#### Tab 6: Raw Data & Audit Trail

- High-performance paginated data table (25 / 50 / 100 rows per page) showing all underlying records.

- Instant search filter across SKU, Brand, Plant, and Distributor.

- One-click CSV and Excel export of filtered rows.

- Data integrity reconciliation summary card validating row counts against PostgreSQL totals.

### 4. UI/UX & Design Guidelines

- Modern, clean enterprise interface using Tailwind CSS with cohesive neutral palettes (slate/zinc) and vibrant semantic accents (emerald for revenue/growth, blue for operations, violet for brands, amber for alerts).

- Full Dark Mode and Light Mode support with smooth transitions.

- Fully responsive layout with mobile drawer for filters on smaller viewports.

- Zero mock fallbacks: Ensure all metrics reflect the authoritative PostgreSQL dataset.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b37c5621-5d26-5703-85bd-95c25e361d6b).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
