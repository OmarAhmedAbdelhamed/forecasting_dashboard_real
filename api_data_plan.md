# Forecasting Dashboard - API Data Requirements Plan

This document outlines the API data requirements for each section of the Forecasting Dashboard application, based on the current mock data structures.

---

## Table of Contents

1. [Common/Shared Data](#1-commonshared-data)
2. [Overview Section](#2-overview-section)
3. [Forecasting Section](#3-forecasting-section)
4. [Demand Forecasting Section](#4-demand-forecasting-section)
5. [Inventory Planning Section](#5-inventory-planning-section)
6. [Alert Center](#6-alert-center)
7. [Export Modals](#7-export-modals)

---

## 1. Common/Shared Data

These are hierarchical filter data used across all sections.

### API Endpoints Needed

#### `GET /api/filters/regions`

**Response:**

```json
{
  "regions": [
    {
      "value": "marmara",
      "label": "Marmara",
      "stores": [
        {
          "value": "ist_kadikoy",
          "label": "İstanbul - Kadıköy",
          "categories": [
            {
              "value": "gida",
              "label": "Gıda",
              "products": [
                {
                  "value": "sut",
                  "label": "Süt",
                  "forecastDemand": 1000,
                  "currentStock": 400
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

**Note:** This returns the complete hierarchical structure. For flat lists, use the specific endpoints below.

#### `GET /api/filters/stores`

**Query Params:** `regionIds[]` (optional)

**Response:**

```json
{
  "stores": [
    {
      "value": "ist_kadikoy",
      "label": "İstanbul - Kadıköy",
      "regionValue": "marmara"
    }
  ]
}
```

**Note:** If `regionIds` are provided, only returns stores from those regions. Otherwise returns all stores.

#### `GET /api/filters/categories`

**Query Params:** `storeIds[]` (optional), `regionIds[]` (optional)

**Response:**

```json
{
  "categories": [
    {
      "value": "ist_kadikoy_gida",
      "label": "Gıda",
      "storeValue": "ist_kadikoy"
    }
  ]
}
```

**Note:** Category values are formatted as `{storeValue}_{categoryValue}` (e.g., `ist_kadikoy_gida`). Filters by selected stores/regions if provided.

#### `GET /api/filters/products`

**Query Params:** `regionIds[]` (optional), `storeIds[]` (optional), `categoryIds[]` (optional)

**Response:**

```json
{
  "products": [
    {
      "value": "ist_kadikoy_gida_sut",
      "label": "Süt",
      "categoryKey": "ist_kadikoy_gida",
      "forecastDemand": 1000,
      "currentStock": 400
    }
  ]
}
```

**Note:** Product values are formatted as `{storeValue}_{categoryValue}_{productValue}` (e.g., `ist_kadikoy_gida_sut`). Filters by selected regions/stores/categories if provided.

#### `GET /api/filters/reyonlar`

**Response:**

```json
{
  "reyonlar": [
    { "value": "kasap", "label": "Kasap" },
    { "value": "manav", "label": "Manav" },
    { "value": "sut_urunleri", "label": "Süt Ürünleri" },
    { "value": "atistirmalik", "label": "Atıştırmalık" },
    { "value": "icecekler", "label": "İçecekler" },
    { "value": "temizlik", "label": "Temizlik" },
    { "value": "dondurma", "label": "Dondurma" },
    { "value": "unlu_mamuller", "label": "Unlu Mamuller" }
  ]
}
```

**Note:** Reyonlar (departments) are independent of the hierarchical structure and used for cross-cutting categorization.

---

## 2. Overview Section

### Components

- Metric Cards (4 KPIs)
- Revenue vs Plan Chart
- Historical Units Chart
- Upcoming Promotions Table
- Stock Risk Table
- Alert Center Summary

### API Endpoints Needed

#### `GET /api/dashboard/metrics`

**Query Params:** `regionIds[]`, `storeIds[]`, `categoryIds[]`

**Response:**

```json
{
  "accuracy": 94.5,
  "accuracyChange": 1.2, //gecen aya gore mesela
  "forecastValue": 2450000,
  "forecastUnit": 125000,
  "forecastChange": 5.3,
  "ytdValue": 12250000,
  "ytdChange": 12.5,
  "gapToSales": -2.1,
  "gapToSalesChange": -0.3
}
```

#### `GET /api/dashboard/revenue-chart`

**Query Params:** `regionIds[]`, `storeIds[]`, `categoryIds[]`

**Response:**

```json
{
  "data": [
    {
      "week": "6 Oca",
      "actual": 245000,
      "plan": 250000
    }
  ]
}
```

#### `GET /api/dashboard/historical-chart`

**Query Params:** `regionIds[]`, `storeIds[]`, `categoryIds[]`

**Response:**

```json
{
  "data": [
    {
      "week": "hafta 1",
      "y2024": 12500,
      "y2025": 14200,
      "y2026": 15800
    }
  ]
}
```

#### `GET /api/dashboard/promotions`

**Response:**

```json
{
  "promotions": [
    {
      "id": "PROMO-1024",
      "name": "Yaz İndirimleri - Yudum Yağ",
      "type": "Katalog",
      "startDate": "2026-05-28",
      "endDate": "2026-05-30",
      "discount": "%15",
      "status": "Onaylandı | Taslak | Beklemede"
    }
  ]
}
```

#### `GET /api/alerts/summary`

**Query Params:** `regionIds[]`, `storeIds[]`, `categoryIds[]`

**Response:**

```json
{
  "summary": {
    "lowGrowth": {
      "count": 4,
      "severity": "medium"
    },
    "highGrowth": {
      "count": 12,
      "severity": "info"
    },
    "forecastErrors": {
      "count": 7,
      "criticalCount": 2,
      "severity": "high"
    },
    "inventory": {
      "count": 15,
      "stockout": 3,
      "overstock": 5,
      "reorder": 7,
      "severity": "high"
    }
  },
  "totalAlerts": 38
}
```

**Usage:** This endpoint provides all alert counts for the Overview page Alert Center cards. For detailed alert lists, use the specific endpoints in section 7 (Alert Center).

---

## 3. Forecasting Section (Pricing & Promotion Analysis)

### Components

- Product Forecast Chart (with weather, promotions, stock tracking)
- Promotion Calendar
- Promotion History Table
- Similar Campaigns Analysis (Past Experiences)
- Lift & Revenue Share Calculator
- Stock Status Tracker

### API Endpoints Needed

#### `GET /api/forecast/product-data`

**Query Params:** `regionIds[]`, `storeIds[]`, `categoryIds[]`, `productIds[]`, `startDate`, `endDate`, `promotionStartDate`, `promotionEndDate`, `promotionType`, `discountPercent`

**Response:**

```json
{
  "forecastData": [
    {
      "tarih": "2026-02-01T00:00:00",
      "baseline": 140,
      "tahmin": 175,
      "ciro_adedi": 0,
      "benim_promom": ["INTERNET_INDIRIMI"],
      "benim_promom_yuzde": 15,
      "ciro": 15303.75,
      "stok": 650,
      "satisFiyati": 87.45,
      "ham_fiyat": 67.67,
      "birim_kar": 19.78,
      "birim_marj_yuzde": 22.62,
      "gunluk_kar": 3461.5,
      "weather": "sun",
      "lost_sales": 0,
      "unconstrained_demand": 175
    }
  ]
}
```

**Field Descriptions:**

- `tarih`: ISO datetime string
- `baseline`: Baseline demand in **Units** (without promotion)
- `tahmin`: Forecasted sales in **Units** (with promotion and stock constraints)
- `ciro_adedi`: Reserved for future use (currently 0)
- `benim_promom`: Array of active promotion types
- `benim_promom_yuzde`: Discount percentage applied
- `ciro`: Actual revenue for the day in **TL** (tahmin * satisFiyati)
- `stok`: Current stock level (units)
- `satisFiyati`: Selling price per unit (TL)
- `ham_fiyat`: Cost price per unit (TL)
- `birim_kar`: Profit per unit (TL)
- `birim_marj_yuzde`: Profit margin percentage
- `gunluk_kar`: Daily profit (TL)
- `weather`: Weather condition (sun/cloud/rain)
- `lost_sales`: Units lost due to stockout
- `unconstrained_demand`: Potential demand in **Units** if no stock constraints (null if stock sufficient)

**Note:** `tahmin`, `baseline`, and `unconstrained_demand` are Unit values. `tahmin` reflects actual sales (capped by stock).

#### `GET /api/forecast/promotion-history`

**Query Params:** `productIds[]`, `storeIds[]` (optional), `limit`

**Response:**

```json
{
  "history": [
    {
      "date": "10-19 Mayıs 2025",
      "name": "Bahar Temizliği",
      "type": "INTERNET_INDIRIMI",
      "uplift": 42,
      "upliftVal": 12400,
      "profit": 3200,
      "profit": 3200,
      "stock": "OK",
      "forecast": 92,
      "stockCostIncrease": 1200,
      "lostSalesVal": 0
    }
  ]
}
```

**Field Descriptions:**

- `uplift`: Revenue increase percentage (number)
- `upliftVal`: Revenue increase amount in TL (number)
- `profit`: Net profit in TL (number)

- `stock`: Stock status (OK/OOS/Over)
- `forecast`: Forecast accuracy percentage (number)
- `stockCostIncrease`: Additional stock cost in TL (number)
- `lostSalesVal`: Lost sales value calculation in TL (number)

**Note:** In the Mock Data, some of these fields (uplift, profit) are currently returned as formatted strings (e.g., "+42%"), but the API contract should prefer raw numbers.

#### `GET /api/forecast/similar-campaigns`

**Query Params:** `promotionType`, `productIds[]`, `limit`

**Response:**

```json
{
  "campaigns": [
    {
      "id": "SC-1",
      "name": "İnternet'e Özel İndirim Günleri",
      "date": "Nisan 2024",
      "similarityScore": 95,
      "type": "INTERNET_INDIRIMI",
      "lift": 38,

      "stockOutDays": 0,
      "targetRevenue": 100000,
      "actualRevenue": 125000,
      "plannedStockDays": 14,
      "actualStockDays": 14,
      "sellThrough": 92,
      "markdownCost": 5000
    }
  ]
}
```

**Field Descriptions:**

- `id`: Unique campaign ID
- `name`: Campaign Name
- `date`: Campaign Date/Niod
- `similarityScore`: Similarity percentage (0-100)
- `type`: Promotion Type
- `lift`: Lift percentage

- `stockOutDays`: Number of days out of stock
- `targetRevenue`: Target Revenue Goal (TL)
- `actualRevenue`: Actual Revenue Realized (TL)
- `plannedStockDays`: Planned Days of Supply
- `actualStockDays`: Actual Days of Supply (before stockout or end)
- `sellThrough`: Sell-through rate percentage (0-100)
- `markdownCost`: Total cost of discounts (TL)

#### `GET /api/forecast/calendar`

**Query Params:** `storeIds[]`, `month`, `year`

**Response:**

```json
{
  "events": [
    {
      "date": "2026-02-15",
      "promotions": [
        {
          "id": "PROMO-1024",
          "name": "Yaz İndirimleri",
          "type": "Katalog",
          "discount": 15
        }
      ]
    }
  ]
}
```

**Note:** Used for the calendar view to display promotion schedules. `discount` is a number (percentage).

## 4. Demand Forecasting Section

### Components

- KPI Cards (Bias, Accuracy, etc.)
- Trend Forecast Chart (Daily/Weekly/Monthly)
- Year Comparison Chart
- Monthly Bias Chart
- Growth Products Table (High/Low)
- Forecast Error Products Table

### API Endpoints Needed

#### `GET /api/demand/kpis`

**Query Params:** `regionIds[]`, `storeIds[]`, `categoryIds[]`, `productIds[]`

**Response:**

```json
{
  "totalForecast": {
    "value": 2800000,
    "units": 142000,
    "trend": 8.5
  },
  "accuracy": {
    "value": 94.8,
    "trend": 1.2
  },
  "yoyGrowth": {
    "value": 12.4,
    "trend": -2.1
  },
  "bias": {
    "value": 2.3,
    "type": "over",
    "trend": "stable"
  },
  "lowGrowthCount": 4,
  "highGrowthCount": 12
}
```

**Note:** This endpoint returns KPIs filtered by the selected regions, stores, categories, and products. The `lowGrowthCount` and `highGrowthCount` should match the counts from `/api/alerts/summary` for consistency.

#### `GET /api/demand/trend-forecast`

**Query Params:** `storeId`, `productId`, `period` (daily/weekly/monthly)

**Response:**

```json
{
  "data": [
    {
      "date": "2026-04-20",
      "actual": 1250, // null for future dates
      "forecast": 1200, // null for past dates
      "trendline": 1800
    }
  ]
}
```

#### `GET /api/demand/year-comparison`

**Query Params:** `storeId`, `productId`

**Response:**

```json
{
  "data": [
    {
      "month": "hafta 1",
      "y2024": 12500,
      "y2025": 14200,
      "y2026": 15800
    }
  ]
}
```

#### `GET /api/demand/monthly-bias`

**Query Params:** `storeId`, `productId`

**Response:**

```json
{
  "data": [
    {
      "month": "Ocak",
      "bias": 2.5,
      "forecast": 12000,
      "actual": 11700
    }
  ]
}
```

#### `GET /api/demand/growth-products`

**Query Params:** `storeIds[]`, `type` (high/low)

**Response:**

```json
{
  "products": [
    {
      "id": "SKU-001",
      "name": "Yudum Ayçiçek Yağı 5L",
      "growth": 18.5,
      "type": "high",
      "category": "Gıda",
      "forecast": 2450,
      "actualSales": 2890,
      "lastMonthSales": 2440,
      "store": "1001"
    }
  ]
}
```

#### `GET /api/demand/forecast-errors`

**Query Params:** `storeIds[]`, `severityFilter`

**Response:**

```json
{
  "products": [
    {
      "id": "SKU-010",
      "name": "Omo Matik 6kg",
      "error": 18.5,
      "accuracy": 81.5,
      "forecast": 450,
      "actual": 534,
      "bias": +5,
      "action": "string",
      "storeCode": "string",
      "severity": "critical | high | medium | low | normal" // boyle bir bilgi alabildigi isek iyi olur
    }
  ]
}
```

---

## 5. Inventory Planning Section

### Components

- Inventory KPI Cards
- Inventory Table with Filters
- Stock Trends Chart
- Store Performance Comparison
- Inventory Alerts

### API Endpoints Needed

#### `GET /api/inventory/kpis`

**Query Params:** `regionIds[]`, `storeIds[]`, `categoryIds[]`, `productIds[]`

**Response:**

```json
{
  "totalStockValue": 15450000,
  "totalInventoryItems": 2500,
  "stockCoverageDays": 28,
  "excessInventoryItems": 125,
  "excessInventoryValue": 1250000,
  "stockOutRiskItems": 45,
  "stockOutRiskValue": 890000,
  "neverSoldItems": 15,
  "neverSoldValue": 125000,
  "overstockPercentage": 5,
  "reorderNeededItems": 85
}
```

#### `GET /api/inventory/items`

**Query Params:** `regionIds[]`, `storeIds[]`, `categoryIds[]`, `productIds[]`, `status`, `page`, `limit`, `sortBy`, `sortOrder`

**Response:**

```json
{
  "items": [
    {
      "id": "INV-001",
      "sku": "SKU-SUT-1234",
      "productName": "Süt",
      "category": "gida",
      "productKey": "ist_kadikoy_gida_sut",
      "stockLevel": 450,
      "minStockLevel": 150,
      "maxStockLevel": 600,
      "reorderPoint": 200,
      "forecastedDemand": 1000,
      "stockValue": 45000,
      "daysOfCoverage": 13.5,
      "status": "In Stock | Low Stock | Out of Stock | Overstock",
      "turnoverRate": 8.5,
      "lastRestockDate": "2026-01-28",
      "leadTimeDays": 5,
      "quantityOnOrder": 0,
      "todaysSales": 35,
      "price": 100
    }
  ],
  "pagination": {
    "total": 2500,
    "page": 1,
    "limit": 50,
    "totalPages": 50
  }
}
```

#### `GET /api/inventory/stock-trends`

**Query Params:** `regionIds[]`, `storeIds[]`, `categoryIds[]`, `productIds[]`, `days` (default: 30)

**Response:**

```json
{
  "trends": [
    {
      "date": "2026-01-15",
      "actualStock": 12500,
      "forecastDemand": 850,
      "safetyStock": 2500
    }
  ]
}
```

**Note:** Returns aggregated stock trends for the selected filters. Date format is ISO (YYYY-MM-DD). If multiple products/stores are selected, returns combined totals.

#### `GET /api/inventory/store-performance`

**Query Params:** `regionIds[]`, `storeIds[]`, `categoryIds[]`, `productIds[]`

**Response:**

```json
{
  "stores": [
    {
      "storeId": "ist_kadikoy",
      "storeName": "İstanbul - Kadıköy",
      "stockLevel": 45000,
      "sellThroughRate": 78.5,
      "dailySales": 1250,
      "daysOfInventory": 36,
      "storeEfficiency": 85.2
    }
  ]
}
```

**Note:** If `storeIds` are provided, returns only those stores. Otherwise returns all stores filtered by regions/categories/products. `sellThroughRate` is a percentage (0-100) indicating how quickly inventory is sold.

#### `GET /api/inventory/alerts`

**Query Params:** `regionIds[]`, `storeIds[]`, `severity` (high/medium/low), `type` (stockout/overstock/reorder/expiration/deadstock/surge)

**Response:**

```json
{
  "alerts": [
    {
      "id": "alert-INV-001",
      "type": "stockout | overstock | reorder | expiration | deadstock | surge",
      "sku": "SKU-SUT-1234",
      "productName": "Süt",
      "storeName": "İstanbul - Kadıköy",
      "message": "Stok tükendi. Acil tedarik gerekiyor.",
      "date": "Feb 04, 10:30",
      "severity": "high | medium | low",
      "metrics": {
        "currentStock": 0,
        "threshold": 150,
        "forecastedDemand": 1000,
        "transferSourceStore": "İstanbul - Beşiktaş",
        "transferQuantity": 500
      },
      "recommendation": "Stok tükendi. İzmir - Karşıyaka mağazasında fazla stok tespit edildi.",
      "actionType": "reorder | transfer | promotion | review"
    }
  ]
}
```

---

## 6. Alert Center

### Overview

1. **Low Growth Products** - Products with declining sales trends
2. **High Growth Products** - Products with increasing sales trends
3. **Forecast Errors** - Products with significant forecast accuracy issues
4. **Inventory Alerts** - Stock-related issues (stockout, overstock, reorder needed, deadstock)

### API Endpoints Needed

#### `GET /api/alerts/summary`

**Query Params:** `regionIds[]`, `storeIds[]`, `categoryIds[]`

**Response:**

```json
{
  "summary": {
    "lowGrowth": {
      "count": 4,
      "severity": "medium"
    },
    "highGrowth": {
      "count": 12,
      "severity": "info"
    },
    "forecastErrors": {
      "count": 7,
      "criticalCount": 2,
      "severity": "high"
    },
    "inventory": {
      "count": 15,
      "stockout": 3,
      "overstock": 5,
      "reorder": 7,
      "severity": "high"
    }
  },
  "totalAlerts": 38
}
```

**Usage:** Provides aggregated alert counts for Overview page and KPI cards. Single source of truth for all alert statistics.

#### `GET /api/alerts/growth-products`

**Query Params:** `type` (high/low), `storeIds[]`, `search`

**Response:** Same as `/api/demand/growth-products`

#### `GET /api/alerts/forecast-errors`

**Query Params:** `storeIds[]`, `search`, `severity`

**Response:** Same as `/api/demand/forecast-errors`

#### `GET /api/alerts/inventory`

**Query Params:** `regionIds[]`, `storeIds[]`, `search`

**Response:** Same as `/api/inventory/alerts`

#### `POST /api/alerts/resolve`

**Request:**

```json
{
  "alertId": "string",
  "alertType": "low-growth | high-growth | forecast-error | inventory",
  "action": "review | adjust_forecast | check_stock | promote | ignore | transfer | reorder | count",
  "comment": "string"
}
```

**Response:**

```json
{
  "success": true,
  "resolvedAt": "ISO datetime"
}
```

#### `GET /api/alerts/resolved`

**Query Params:** `alertType`, `dateFrom`, `dateTo`

**Response:**

```json
{
  "resolvedAlerts": [
    {
      "id": "string",
      "type": "string",
      "name": "string",
      "action": "string",
      "comment": "string",
      "resolvedAt": "ISO datetime",
      "resolvedBy": "string (user id)"
    }
  ]
}
```

---

## 7. Export Modals

### Export Forecast Modal

#### `GET /api/export/forecast`

**Query Params:** `regionIds[]`, `storeIds[]`, `reyonIds[]`, `search`, `period` (monthly/weekly), `page`, `limit`

**Response:**

```json
{
  "data": [
    {
      "id": "EXP-1000",
      "sku": "30000000",
      "productName": "Süt 1L",
      "region": "Marmara",
      "store": "İstanbul - Kadıköy",
      "category": "Süt Ürünleri",
      "forecastQty": 450,
      "actualSales": 480,
      "accuracy": 93,
      "stockLevel": 250,
      "sellingRate": 16,
      "futureForecast": 520,
      "revenue": "48000.00",
      "forecastRevenue": "45000.00"
    }
  ],
  "pagination": {
    "total": 2500,
    "page": 1,
    "limit": 100
  }
}
```

**Note:**

- `sellingRate` is calculated as average daily sales (actualSales / periodDays). For monthly period, divide by 30; for weekly, divide by 7.

### Export Promotion Modal

#### `GET /api/export/promotions`

**Query Params:** `regionIds[]`, `storeIds[]`, `reyonIds[]`, `search`, `page`, `limit`

**Response:**

```json
{
  "data": [
    {
      "id": "PROMO-1000",
      "date": "10 Mayıs 2025",
      "name": "Bahar Temizliği",
      "type": "INTERNET_INDIRIMI",
      "region": "Marmara",
      "store": "İstanbul - Kadıköy",
      "category": "Temizlik",
      "uplift": 42,
      "upliftVal": 12400.5,
      "profit": 3200.0,
      "roi": 142,
      "stock": "string",
      "forecast": 92,
      "promotionStatus": "string"
    }
  ],
  "pagination": {
    "total": 500,
    "page": 1,
    "limit": 100
  }
}
```

**Note:**

- `uplift` is percentage (0-100)
- `upliftVal` is revenue increase in TL
- `profit` is net profit impact in TL
- `roi` is Return on Investment percentage
- `forecast` is forecast accuracy percentage (0-100)
- `stock` indicates stock status during campaign period (OK/OOS/Over)
