# PROCUREWISE
### An Intelligent Procurement Analytics and Automated Canvassing System with Best-Value Recommendation Engine
**Capstone Project for Batanes State College**

---

## 🚀 Merged Features (Master Branch)

### 📊 Price Comparison Dashboard (`/price-comparison`)
The first major feature successfully implemented and merged into the `master` branch is the **Price Comparison Dashboard**. This module allows procurement officers to canvass and compare office supply prices across local and regional suppliers to optimize public funds.

#### Core Capabilities:
* **Key Performance Indicators (KPIs)**:
  * **Items Compared**: The count of active supplies analyzed.
  * **Suppliers Evaluated**: Total number of registered local/regional vendors.
  * **Avg. Savings Potential**: Average percentage of savings possible by opting for the best-value quote instead of the highest.
  * **Total Savings Opportunity**: Real-time calculation of overall budget optimization if best-value quotes are chosen for all items.
* **Interactive Comparison Table**:
  * Currency formatted in Philippine Pesos (₱).
  * Color-coded price highlights (Green = Best value/lowest price, Red = Worst value/highest price).
  * Availability tags (In Stock, Limited, Unavailable) for inventory management.
  * Dynamic sorting by item name, category, or specific supplier columns.
  * Expandable detail rows displaying item descriptions and delivery lead times per supplier.
* **Supplier Search & Filter Engine**:
  * Real-time search query matching.
  * Category-based filter.
  * Multi-select supplier toggle filter.
* **Visual Price Chart**:
  * Pure CSS horizontal bar chart visualization comparing items across all active vendors.
  * Automatic green highlighting for the best quote inside the chart.
* **Sleek Dark Theme**:
  * Premium slate-indigo and sky-blue design matching professional dashboard standards.

---

## 🛠️ Technology Stack
* **Framework**: Next.js 16.2.7 (Turbopack) & React 19
* **Language**: TypeScript (Strict Mode)
* **Styles**: Custom CSS variables, gradients, and glassmorphism ([globals.css](file:///c:/Users/sy/procurewise/src/app/globals.css))
* **Database / Backend**: Prisma configuration ready

---

## 💻 Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
