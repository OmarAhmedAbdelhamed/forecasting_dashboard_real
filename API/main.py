"""
FastAPI Server for Forecasting Dashboard
Exposes ClickHouse query functions from omerApi_combined.py as REST endpoints
"""

from fastapi import FastAPI, Query, HTTPException
from fastapi import Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import List, Optional
import clickhouse_connect
import os
from datetime import date, timedelta
import json
import math
import urllib.request
import urllib.error
import time
from dotenv import load_dotenv
import traceback
from pydantic import BaseModel

# Import all functions from omerApi_combined
from omerApiYan import (
    get_regions_hierarchy,
    get_stores,
    get_categories,
    get_products,
    get_reyonlar,
    get_dashboard_metrics,
    get_dashboard_revenue_chart,
    get_dashboard_historical_chart,
    get_product_promotions,
    get_demand_kpis,
    get_demand_trend_forecast,
    get_demand_year_comparison,
    get_demand_monthly_bias,
    get_growth_products,
    get_inventory_kpis,
    get_inventory_stock_trends,
    get_inventory_store_performance,
    get_inventory_alerts,
    get_alerts_summary,
    get_forecast_errors,
    get_inventory_items,
    get_similar_campaigns,
    get_forecast_calendar,
)

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="Forecasting Dashboard API",
    description="REST API for inventory forecasting and planning dashboard",
    version="1.0.0",
)

@app.get("/healthz")
def healthz():
    return {"status": "ok"}

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
  # Ensure the frontend always receives a JSON error payload (useful in dev).
  traceback.print_exc()
  return JSONResponse(
    status_code=500,
    content={
      "detail": str(exc),
      "path": str(request.url),
    },
  )

# CORS middleware for Next.js frontend
cors_allow_origins_raw = os.getenv("CORS_ALLOW_ORIGINS", "").strip()
cors_allow_origin_regex = os.getenv("CORS_ALLOW_ORIGIN_REGEX", "").strip() or None

cors_allow_origins = ["http://localhost:3000", "http://127.0.0.1:3000"]
if cors_allow_origins_raw:
    if cors_allow_origins_raw == "*":
        cors_allow_origins = ["*"]
    else:
        cors_allow_origins = [
            o.strip() for o in cors_allow_origins_raw.split(",") if o.strip()
        ]

# Dev convenience: allow any localhost/127.0.0.1 port only when no env override is provided.
# In prod, an overly-restrictive regex breaks preflight for real domains.
if not cors_allow_origins_raw and cors_allow_origin_regex is None:
    cors_allow_origin_regex = r"^https?://(localhost|127\\.0\\.0\\.1)(:\\d+)?$"

# If allow_origins is "*", never apply an origin regex.
if cors_allow_origins == ["*"]:
    cors_allow_origin_regex = None

# If allow_origins is "*", credentials cannot be enabled in CORSMiddleware.
cors_allow_credentials = cors_allow_origins != ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_allow_origins,
    allow_origin_regex=cors_allow_origin_regex,
    allow_credentials=cors_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ClickHouse Cloud connection settings (from sunucuDB.ipynb)
# Ideally, these should be loaded from environment variables
CLICKHOUSE_HOST = os.getenv("CLICKHOUSE_HOST", "l3flqlcyjf.germanywestcentral.azure.clickhouse.cloud")
CLICKHOUSE_USER = os.getenv("CLICKHOUSE_USER", "default")
CLICKHOUSE_PASSWORD = os.getenv("CLICKHOUSE_PASSWORD", "e11Uq697dnZq_")
CLICKHOUSE_CONNECT_TIMEOUT = int(os.getenv("CLICKHOUSE_CONNECT_TIMEOUT", "30"))
CLICKHOUSE_SEND_RECEIVE_TIMEOUT = int(os.getenv("CLICKHOUSE_SEND_RECEIVE_TIMEOUT", "300"))
CLICKHOUSE_QUERY_RETRIES = int(os.getenv("CLICKHOUSE_QUERY_RETRIES", "2"))
CLICKHOUSE_CONNECT_RETRIES = int(os.getenv("CLICKHOUSE_CONNECT_RETRIES", "2"))
TABLE_NAME = os.getenv("CLICKHOUSE_TABLE_NAME", "demoVerileri")
PREDICTION_API_URL = os.getenv("PREDICTION_API_URL", "http://13.53.171.130:8890/predict")


class PredictDemandRequest(BaseModel):
    magazaKodu: int
    urunKodu: int
    tarihBaslangic: str
    tarihBitis: str
    ozelgunsayisi: Optional[int] = None
    aktifPromosyonKodu: str
    istenenIndirim: Optional[float] = None
    istenenMarj: Optional[float] = None
    istenenFiyat: Optional[float] = None


def get_client():
    """Create and return a ClickHouse Cloud client connection"""
    last_error = None
    attempts = max(1, CLICKHOUSE_CONNECT_RETRIES)

    for attempt in range(1, attempts + 1):
        try:
            client = clickhouse_connect.get_client(
                host=CLICKHOUSE_HOST,
                username=CLICKHOUSE_USER,
                password=CLICKHOUSE_PASSWORD,
                secure=True,
                connect_timeout=CLICKHOUSE_CONNECT_TIMEOUT,
                send_receive_timeout=CLICKHOUSE_SEND_RECEIVE_TIMEOUT,
                query_retries=CLICKHOUSE_QUERY_RETRIES,
            )
            return client
        except Exception as e:
            last_error = e
            if attempt < attempts:
                time.sleep(0.4 * attempt)
                continue
            raise HTTPException(
                status_code=500,
                detail=(
                    f"Database connection failed after {attempts} attempts: {str(last_error)}"
                ),
            )


# =============================================================================
# DASHBOARD ENDPOINTS
# =============================================================================

@app.get("/api/dashboard/metrics")
def api_get_dashboard_metrics(
    regionIds: Optional[List[str]] = Query(None),
    storeIds: Optional[List[str]] = Query(None),
    categoryIds: Optional[List[str]] = Query(None),
):
    """Get overview key metrics (Model Accuracy, Forecast, YTD, Gap to Sales)"""
    client = get_client()
    result = get_dashboard_metrics(
        client, TABLE_NAME,
        region_ids=regionIds,
        store_ids=storeIds,
        category_ids=categoryIds,
    )
    print(f"DEBUG: Dashboard Metrics Response: {result}")
    return result


@app.get("/api/dashboard/revenue-chart")
def api_get_revenue_chart(
    regionIds: Optional[List[str]] = Query(None),
    storeIds: Optional[List[str]] = Query(None),
    categoryIds: Optional[List[str]] = Query(None),
):
    """Get weekly revenue vs target chart"""
    try:
        client = get_client()
        result = get_dashboard_revenue_chart(
            client, TABLE_NAME,
            region_ids=regionIds,
            store_ids=storeIds,
            category_ids=categoryIds,
        )
        print(f"DEBUG: Revenue Chart Response: {result}")
        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Revenue Chart Error: {str(e)}")


@app.get("/api/dashboard/promotions")
def api_get_dashboard_promotions(
    regionIds: Optional[List[str]] = Query(None),
    storeIds: Optional[List[str]] = Query(None),
    categoryIds: Optional[List[str]] = Query(None),
):
    """
    Get upcoming promotions list.
    """
    try:
        client = get_client()

        result = get_product_promotions(
            client,
            table_name=TABLE_NAME,
            region_ids=regionIds,
            store_ids=storeIds,
            category_ids=categoryIds,
        )
        print(f"DEBUG: Dashboard Promotions Response: {result}")
        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Promotions Error: {str(e)}")


# =============================================================================
# HIERARCHY ENDPOINTS
# =============================================================================

@app.get("/api/hierarchy")
def api_get_regions_hierarchy():
    """Get full Region -> Store -> Category -> Product hierarchy"""
    client = get_client()
    return get_regions_hierarchy(client, TABLE_NAME)


@app.get("/api/stores")
def api_get_stores(
    regionIds: Optional[List[str]] = Query(None, description="Filter by region IDs")
):
    """Get flat store list with optional region filter"""
    client = get_client()
    return get_stores(client, TABLE_NAME, region_ids=regionIds)


@app.get("/api/categories")
def api_get_categories(
    storeIds: Optional[List[str]] = Query(None, description="Filter by store IDs"),
    regionIds: Optional[List[str]] = Query(None, description="Filter by region IDs"),
):
    """Get flat category list with optional filters"""
    client = get_client()
    # Note: verify signature. omerApi_combined.get_categories takes store_ids, region_ids.
    return get_categories(client, TABLE_NAME, store_ids=storeIds, region_ids=regionIds)


@app.get("/api/products")
def api_get_products(
    regionIds: Optional[List[str]] = Query(None),
    storeIds: Optional[List[str]] = Query(None),
    categoryIds: Optional[List[str]] = Query(None),
):
    """Get flat product list with optional filters"""
    client = get_client()
    return get_products(
        client, TABLE_NAME,
        region_ids=regionIds,
        store_ids=storeIds,
        category_ids=categoryIds,
    )


@app.get("/api/reyonlar")
def api_get_reyonlar():
    """Get department (reyon) list"""
    client = get_client()
    return get_reyonlar(client, TABLE_NAME)


# =============================================================================
# CHART ENDPOINTS
# =============================================================================

@app.get("/api/chart/historical")
def api_get_historical_chart(
    regionIds: Optional[List[str]] = Query(None),
    storeIds: Optional[List[str]] = Query(None),
    categoryIds: Optional[List[str]] = Query(None),
):
    """Get weekly historical sales comparison by year"""
    try:
        client = get_client()
        result = get_dashboard_historical_chart(
            client, TABLE_NAME,
            region_ids=regionIds,
            store_ids=storeIds,
            category_ids=categoryIds,
        )
        print(f"DEBUG: Historical Chart Data Points: {len(result.get('data', []))}")
        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Historical Chart Error: {str(e)}")


# =============================================================================
# ALERTS ENDPOINTS
# =============================================================================

@app.get("/api/alerts/summary")
def api_get_alerts_summary(
    regionIds: Optional[List[str]] = Query(None),
    storeIds: Optional[List[str]] = Query(None),
    categoryIds: Optional[List[str]] = Query(None),
):
    """Get alerts summary (low/high growth, forecast errors, inventory)"""
    try:
        client = get_client()
        
        # Get raw data from omerApi_combined
        # Note: Check signature. get_alerts_summary(client, region_ids, store_ids, category_ids, ...)
        raw_data = get_alerts_summary(
            client,
            region_ids=regionIds,
            store_ids=[int(s) for s in storeIds] if storeIds else None,
            category_ids=[int(c) for c in categoryIds] if categoryIds else None,
        )

        # Keep compatibility with both old and new alerts-summary formats.
        # Frontend expects:
        # { summary: { lowGrowth, highGrowth, forecastErrors, inventory }, totalAlerts }
        if isinstance(raw_data, dict) and "summary" in raw_data:
            print(f"DEBUG: Alerts Summary Response (new format): {raw_data}")
            return raw_data

        low_growth_count = int(
            (raw_data.get("sharp_decline") or {}).get("count", 0)
        )
        high_growth_count = int(
            (raw_data.get("explosive_growth") or {}).get("count", 0)
        )
        major_errors_count = int(
            (raw_data.get("major_forecast_errors") or {}).get("count", 0)
        )
        anomaly_errors_count = int(
            (raw_data.get("anomaly_errors") or {}).get("count", 0)
        )
        stockout_count = int((raw_data.get("stockout") or {}).get("count", 0))
        overstock_count = int(
            (raw_data.get("extreme_overstock") or {}).get("count", 0)
        )
        reorder_count = int((raw_data.get("urgent_reorder") or {}).get("count", 0))

        normalized_data = {
            "summary": {
                "lowGrowth": {
                    "count": low_growth_count,
                    "severity": (raw_data.get("sharp_decline") or {}).get(
                        "severity", "low"
                    ),
                },
                "highGrowth": {
                    "count": high_growth_count,
                    "severity": (raw_data.get("explosive_growth") or {}).get(
                        "severity", "low"
                    ),
                },
                "forecastErrors": {
                    "count": major_errors_count,
                    "criticalCount": anomaly_errors_count,
                    "severity": (raw_data.get("major_forecast_errors") or {}).get(
                        "severity", "low"
                    ),
                },
                "inventory": {
                    "count": stockout_count + overstock_count + reorder_count,
                    "stockout": stockout_count,
                    "overstock": overstock_count,
                    "reorder": reorder_count,
                    "severity": "high" if stockout_count > 0 else "medium",
                },
            },
            "totalAlerts": int(raw_data.get("total_alerts", 0)),
        }

        print(f"DEBUG: Alerts Summary Response (normalized): {normalized_data}")
        return normalized_data
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Alerts Summary Error: {str(e)}")


@app.get("/api/alerts/inventory")
def api_get_inventory_alerts(
    regionIds: Optional[List[str]] = Query(None),
    storeIds: Optional[List[str]] = Query(None),
    categoryIds: Optional[List[str]] = Query(None),
    productIds: Optional[List[str]] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    days: int = Query(30, ge=1, le=3650),
):
    """Get inventory stock alerts"""
    try:
        client = get_client()
        s_ids = (
            [int(s) for s in storeIds if s is not None and str(s).isdigit()]
            if storeIds
            else None
        )
        
        return get_inventory_alerts(
            client,
            region_ids=regionIds,
            store_ids=s_ids,
            category_ids=categoryIds,
            product_ids=productIds,
            search=search,
            limit=limit,
            days=days,
            table_name=TABLE_NAME
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Inventory Alerts Error: {str(e)}")


# =============================================================================
# DEMAND FORECASTING ENDPOINTS
# =============================================================================

@app.get("/api/demand/kpis")
def api_get_demand_kpis(
    regionIds: Optional[List[str]] = Query(None),
    storeIds: Optional[List[str]] = Query(None),
    categoryIds: Optional[List[str]] = Query(None),
    productIds: Optional[List[str]] = Query(None),
    periodValue: int = Query(30, ge=1, le=3650),
    periodUnit: str = Query("gun"),
):
    """Get demand forecasting KPIs"""
    client = get_client()
    return get_demand_kpis(
        client,
        region_ids=regionIds,
        store_ids=[int(s) for s in storeIds] if storeIds else None,
        category_ids=[int(c) for c in categoryIds] if categoryIds else None,
        product_ids=[int(p) for p in productIds] if productIds else None,
        period_value=periodValue,
        period_unit=periodUnit,
        table_name=TABLE_NAME
    )

@app.get("/api/demand/trend-forecast")
def api_get_demand_trend_forecast(
    storeIds: Optional[List[str]] = Query(None),
    productIds: Optional[List[str]] = Query(None),
    categoryIds: Optional[List[str]] = Query(None),
    period: str = Query("daily"),
    daysPast: int = Query(30, ge=1, le=3650),
    daysFuture: int = Query(30, ge=1, le=3650),
):
    """Get demand trend + forecast series (daily/weekly/monthly)"""
    client = get_client()
    return get_demand_trend_forecast(
        client,
        store_ids=[int(s) for s in storeIds] if storeIds else None,
        product_ids=[int(p) for p in productIds] if productIds else None,
        category_ids=[int(c) for c in categoryIds] if categoryIds else None,
        period=period,
        days_past=daysPast,
        days_future=daysFuture,
        table_name=TABLE_NAME,
    )

@app.get("/api/demand/year-comparison")
def api_get_demand_year_comparison(
    storeIds: Optional[List[str]] = Query(None),
    productIds: Optional[List[str]] = Query(None),
    categoryIds: Optional[List[str]] = Query(None),
):
    """Get year-over-year comparison for a product/store"""
    client = get_client()
    return get_demand_year_comparison(
        client,
        store_ids=[int(s) for s in storeIds] if storeIds else None,
        product_ids=[int(p) for p in productIds] if productIds else None,
        category_ids=[int(c) for c in categoryIds] if categoryIds else None,
        table_name=TABLE_NAME
    )

@app.get("/api/demand/monthly-bias")
def api_get_demand_monthly_bias(
    storeIds: Optional[List[str]] = Query(None),
    productIds: Optional[List[str]] = Query(None),
    categoryIds: Optional[List[str]] = Query(None),
):
    """Get monthly bias for a product/store"""
    client = get_client()
    return get_demand_monthly_bias(
        client,
        store_ids=[int(s) for s in storeIds] if storeIds else None,
        product_ids=[int(p) for p in productIds] if productIds else None,
        category_ids=[int(c) for c in categoryIds] if categoryIds else None,
        table_name=TABLE_NAME
    )

@app.get("/api/demand/growth-products")
def api_get_demand_growth_products(
    storeIds: List[str] = Query([]),
    categoryIds: Optional[List[str]] = Query(None),
    productIds: Optional[List[str]] = Query(None),
    days: int = Query(30, ge=1, le=3650),
    type: str = "high"
):
    """Get high or low growth products"""
    client = get_client()
    return get_growth_products(
        client,
        store_ids=[int(s) for s in storeIds] if storeIds else [],
        category_ids=[int(c) for c in categoryIds] if categoryIds else None,
        product_ids=[int(p) for p in productIds] if productIds else None,
        type_=type,
        days=days,
        table_name=TABLE_NAME
    )

@app.get("/api/demand/forecast-errors")
def api_get_demand_forecast_errors(
    storeIds: Optional[List[str]] = Query(None),
    categoryIds: Optional[List[str]] = Query(None),
    productIds: Optional[List[str]] = Query(None),
    severityFilter: Optional[str] = Query(None),
    days: int = Query(30, ge=1, le=3650),
):
    """Get products with significant forecast errors"""
    client = get_client()
    # Check signature: get_forecast_errors(client, store_ids: List[int], search, severity, ...)
    return get_forecast_errors(
        client,
        store_ids=[int(s) for s in storeIds] if storeIds else None,
        category_ids=[int(c) for c in categoryIds] if categoryIds else None,
        product_ids=[int(p) for p in productIds] if productIds else None,
        severity_filter=severityFilter,
        days=days,
        table_name=TABLE_NAME
    )


# =============================================================================
# FORECAST ENDPOINTS
# =============================================================================

@app.get("/api/forecast/promotion-history")
def api_get_promotion_history(
    productIds: Optional[List[int]] = Query(None),
    storeIds: Optional[List[int]] = Query(None),
    regionIds: Optional[List[str]] = Query(None),
    categoryIds: Optional[List[str]] = Query(None),
    limit: int = Query(40, ge=1, le=200),
):
    """Get promotion history rows at campaign-period granularity."""
    client = get_client()
    where_clauses = [
        "aktifPromosyonKodu IS NOT NULL",
        "toString(aktifPromosyonKodu) != '17'",
        "aktifPromosyonAdi IS NOT NULL",
        "aktifPromosyonAdi != ''",
        "aktifPromosyonAdi != 'Tayin edilmedi'",
    ]

    if productIds:
        product_list = ", ".join(str(p) for p in productIds)
        where_clauses.append(f"toInt64(urunkodu) IN ({product_list})")

    if storeIds:
        store_list = ", ".join(str(s) for s in storeIds)
        where_clauses.append(f"toInt64(magazakodu) IN ({store_list})")

    if regionIds:
        region_list = ", ".join(
            "'" + str(r).replace("'", "''").lower() + "'" for r in regionIds
        )
        where_clauses.append(f"lowerUTF8(cografi_bolge) IN ({region_list})")

    if categoryIds:
        category_list = ", ".join(
            "'" + str(c).replace("'", "''") + "'" for c in categoryIds
        )
        where_clauses.append(f"toString(reyonkodu) IN ({category_list})")

    where_sql = " AND ".join(where_clauses)

    query = f"""
    WITH daily AS (
        SELECT
            toDate(tarih) AS campaign_date,
            toInt64(magazakodu) AS store_code,
            toInt64(urunkodu) AS product_code,
            any(lowerUTF8(cografi_bolge)) AS region_value,
            any(toString(reyonkodu)) AS category_value,
            toString(aktifPromosyonKodu) AS promo_code,
            any(aktifPromosyonAdi) AS promo_name,
            toString(aktifPromosyonKodu) AS promo_type,
            round(sum((satismiktari - roll_mean_14) * satisFiyati), 2) AS uplift_val,
            round(sum(satistutarikdvsiz) * 0.08, 2) AS profit_val,
            round(avg(100 - abs((satismiktari - roll_mean_14) / nullIf(roll_mean_14, 0)) * 100), 2) AS forecast_accuracy,
            round(sum(satismiktari * satisFiyati * greatest(indirimYuzdesi, 0) / 100.0), 2) AS markdown_cost,
            round(sum(greatest(roll_mean_14 - satismiktari, 0) * satisFiyati), 2) AS lost_sales_val,
            round(sum(roll_mean_14 * satisFiyati), 2) AS target_revenue,
            max(if(stok_out = 1, 1, 0)) AS stock_out_flag
        FROM {TABLE_NAME}
        WHERE {where_sql}
        GROUP BY campaign_date, store_code, product_code, promo_code
    ),
    daily_with_seq AS (
        SELECT
            *,
            row_number() OVER (
                PARTITION BY store_code, product_code, promo_code
                ORDER BY campaign_date
            ) AS seq_no
        FROM daily
    ),
    periodized AS (
        SELECT
            *,
            (toInt32(toRelativeDayNum(campaign_date)) - toInt32(seq_no)) AS period_group
        FROM daily_with_seq
    ),
    period_agg AS (
        SELECT
            max(campaign_date) AS event_date,
            min(campaign_date) AS campaign_start_date,
            max(campaign_date) AS campaign_end_date,
            store_code,
            product_code,
            any(region_value) AS region_value,
            any(category_value) AS category_value,
            promo_code,
            any(promo_name) AS promo_name,
            any(promo_type) AS promo_type,
            round(sum(uplift_val), 2) AS uplift_val,
            round(sum(profit_val), 2) AS profit_val,
            if(max(stock_out_flag) = 1, 'OOS', 'OK') AS stock_status,
            round(avg(forecast_accuracy), 2) AS forecast_accuracy,
            round(sum(markdown_cost), 2) AS stock_cost_increase,
            round(sum(lost_sales_val), 2) AS lost_sales_val,
            round(sum(target_revenue), 2) AS target_revenue
        FROM periodized
        GROUP BY store_code, product_code, promo_code, period_group
    )
    SELECT
        event_date,
        campaign_start_date,
        campaign_end_date,
        store_code,
        product_code,
        region_value,
        category_value,
        promo_code,
        promo_name,
        promo_type,
        round(
            if(target_revenue = 0, 0, (uplift_val / target_revenue) * 100),
            2
        ) AS uplift_pct,
        uplift_val,
        profit_val,
        stock_status,
        forecast_accuracy,
        stock_cost_increase,
        lost_sales_val
    FROM period_agg
    ORDER BY campaign_end_date DESC, store_code, product_code, promo_code
    LIMIT {limit}
    """

    rows = client.query(query).result_set
    def safe_number(value: Optional[float]) -> float:
        if value is None:
            return 0.0
        try:
            n = float(value)
            return n if math.isfinite(n) else 0.0
        except Exception:
            return 0.0

    def safe_text(value: Optional[object], fallback: str = "") -> str:
        if value is None:
            return fallback
        try:
            if isinstance(value, float) and not math.isfinite(value):
                return fallback
            text = str(value)
            return text if text.strip() else fallback
        except Exception:
            return fallback

    history = []
    for row in rows:
        (event_date, campaign_start_date, campaign_end_date, store_code, product_code, region_value, category_value, promo_code, promo_name, promo_type, uplift_pct, uplift_val, profit_val, stock_status,
         forecast_accuracy, stock_cost_increase, lost_sales_val) = row
        event_date_value = safe_text(event_date, "")
        campaign_start_date_value = safe_text(campaign_start_date, event_date_value)
        campaign_end_date_value = safe_text(campaign_end_date, event_date_value)
        store_code_value = int(safe_number(store_code))
        product_code_value = int(safe_number(product_code))
        region_value_text = safe_text(region_value, "")
        category_value_text = safe_text(category_value, "")
        promo_code_value = safe_text(promo_code, "")
        campaign_key = (
            f"{store_code_value}_{product_code_value}_{promo_code_value}_"
            f"{campaign_start_date_value}_{campaign_end_date_value}"
        )
        promo_name_text = safe_text(promo_name, "")
        if promo_name_text:
            type_label = f"{promo_name_text} (Kod: {promo_code_value})"
        else:
            type_label = f"Kod: {promo_code_value}"
        history.append({
            "campaignKey": campaign_key,
            "eventDate": event_date_value,
            "campaignStartDate": campaign_start_date_value,
            "campaignEndDate": campaign_end_date_value,
            "storeCode": store_code_value,
            "productCode": product_code_value,
            "region": region_value_text,
            "category": category_value_text,
            "promoCode": promo_code_value,
            "date": event_date_value,
            "name": promo_name_text or f"Promosyon {safe_text(promo_type, '')}",
            "type": safe_text(promo_type, ""),
            "typeLabel": type_label,
            "uplift": safe_number(uplift_pct),
            "upliftVal": safe_number(uplift_val),
            "profit": safe_number(profit_val),
            "stock": safe_text(stock_status, "OK"),
            "forecast": safe_number(forecast_accuracy),
            "stockCostIncrease": safe_number(stock_cost_increase),
            "lostSalesVal": safe_number(lost_sales_val),
        })

    return {"history": history}


@app.get("/api/forecast/campaign-detail-series")
def api_get_campaign_detail_series(
    storeCode: int = Query(...),
    productCode: int = Query(...),
    promoCode: str = Query(...),
    eventDate: str = Query(..., description="YYYY-MM-DD"),
    campaignStartDate: Optional[str] = Query(None, description="YYYY-MM-DD"),
    campaignEndDate: Optional[str] = Query(None, description="YYYY-MM-DD"),
    windowDaysBefore: int = Query(3, ge=0, le=30),
    windowDaysAfter: int = Query(3, ge=0, le=30),
):
    """Return real daily series for popup chart and KPI summary."""
    client = get_client()

    def parse_iso_date(value: str, field_name: str) -> date:
        try:
            return date.fromisoformat(value)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"{field_name} must be in YYYY-MM-DD format",
            )

    event_date_obj = parse_iso_date(eventDate, "eventDate")

    if campaignStartDate and campaignEndDate:
        start_date_obj = parse_iso_date(campaignStartDate, "campaignStartDate")
        end_date_obj = parse_iso_date(campaignEndDate, "campaignEndDate")
        if end_date_obj < start_date_obj:
            raise HTTPException(
                status_code=400,
                detail="campaignEndDate must be greater than or equal to campaignStartDate",
            )
    else:
        start_date_obj = event_date_obj - timedelta(days=windowDaysBefore)
        end_date_obj = event_date_obj + timedelta(days=windowDaysAfter)

    start_date = start_date_obj.isoformat()
    end_date = end_date_obj.isoformat()

    query = f"""
    WITH
      toDate('{start_date}') AS start_date,
      toDate('{end_date}') AS end_date
    SELECT
      toDate(tarih) AS d,
      round(sum(roll_mean_14), 2) AS baseline_units,
      round(sum(satismiktari), 2) AS actual_units,
      round(avg(stok), 2) AS stock_units,
      round(sum(greatest(roll_mean_14 - satismiktari, 0)), 2) AS lost_sales_units,
      round(sum(satismiktari * satisFiyati), 2) AS revenue,
      round(sum(roll_mean_14 * satisFiyati), 2) AS target_revenue,
      max(if(stok_out = 1, 1, 0)) AS stock_out_days,
      round(sum((satismiktari - roll_mean_14) * satisFiyati), 2) AS uplift_value,
      round(sum(satistutarikdvsiz) * 0.08, 2) AS profit_effect,
      round(avg(100 - abs((satismiktari - roll_mean_14) / nullIf(roll_mean_14, 0)) * 100), 2) AS forecast_accuracy,
      round(
        sum(satismiktari * satisFiyati * greatest(indirimYuzdesi, 0) / 100.0),
        2
      ) AS markdown_cost
    FROM {TABLE_NAME}
    WHERE toInt64(magazakodu) = {storeCode}
      AND toInt64(urunkodu) = {productCode}
      AND toString(aktifPromosyonKodu) = '{promoCode}'
      AND toDate(tarih) BETWEEN start_date AND end_date
    GROUP BY d
    ORDER BY d ASC
    """

    rows = client.query(query).result_set
    series = []
    total_target_revenue = 0.0
    total_actual_revenue = 0.0
    total_sold_units = 0.0
    total_markdown_cost = 0.0
    total_stock_out_days = 0
    total_uplift_value = 0.0
    total_profit_effect = 0.0
    avg_sell_through_samples = []
    avg_forecast_accuracy_samples = []

    for row in rows:
        (
            d,
            baseline_units,
            actual_units,
            stock_units,
            lost_sales_units,
            revenue,
            target_revenue,
            stock_out_days,
            uplift_value,
            profit_effect,
            forecast_accuracy,
            markdown_cost,
        ) = row

        baseline_units_f = float(baseline_units or 0)
        actual_units_f = float(actual_units or 0)
        stock_units_f = float(stock_units or 0)
        lost_sales_units_f = float(lost_sales_units or 0)
        revenue_f = float(revenue or 0)
        target_revenue_f = float(target_revenue or 0)
        stock_out_days_i = int(stock_out_days or 0)
        uplift_value_f = float(uplift_value or 0)
        profit_effect_f = float(profit_effect or 0)
        forecast_accuracy_f = float(forecast_accuracy or 0)
        markdown_cost_f = float(markdown_cost or 0)

        sell_through_den = stock_units_f + actual_units_f
        if sell_through_den > 0:
            avg_sell_through_samples.append((actual_units_f / sell_through_den) * 100)
        if math.isfinite(forecast_accuracy_f):
            avg_forecast_accuracy_samples.append(forecast_accuracy_f)

        total_target_revenue += target_revenue_f
        total_actual_revenue += revenue_f
        total_sold_units += actual_units_f
        total_markdown_cost += markdown_cost_f
        total_stock_out_days += stock_out_days_i
        total_uplift_value += uplift_value_f
        total_profit_effect += profit_effect_f

        series.append(
            {
                "date": str(d),
                "baselineUnits": baseline_units_f,
                "actualUnits": actual_units_f,
                "stockUnits": stock_units_f,
                "lostSalesUnits": lost_sales_units_f,
                "revenue": revenue_f,
            }
        )

    sell_through = (
        float(sum(avg_sell_through_samples) / len(avg_sell_through_samples))
        if avg_sell_through_samples
        else 0.0
    )
    forecast_accuracy = (
        float(sum(avg_forecast_accuracy_samples) / len(avg_forecast_accuracy_samples))
        if avg_forecast_accuracy_samples
        else 0.0
    )

    summary = {
        "targetRevenue": round(total_target_revenue, 2),
        "actualRevenue": round(total_actual_revenue, 2),
        "soldUnits": round(total_sold_units, 2),
        "markdownCost": round(total_markdown_cost, 2),
        "sellThrough": round(sell_through, 2),
        "stockOutDays": int(total_stock_out_days),
        "upliftValue": round(total_uplift_value, 2),
        "profitEffect": round(total_profit_effect, 2),
        "forecastAccuracy": round(forecast_accuracy, 2),
    }

    return {"series": series, "summary": summary}


@app.get("/api/forecast/similar-campaigns")
def api_get_similar_campaigns(
    promotionType: Optional[str] = Query(None),
    productIds: Optional[List[str]] = Query(None),
    storeIds: Optional[List[str]] = Query(None),
    regionIds: Optional[List[str]] = Query(None),
    categoryIds: Optional[List[str]] = Query(None),
    limit: int = 5
):
    """Get similar past campaigns"""
    client = get_client()
    return get_similar_campaigns(
        client,
        table_name=TABLE_NAME,
        promotion_type=promotionType,
        product_ids=productIds,
        store_ids=storeIds,
        region_ids=regionIds,
        category_ids=categoryIds,
        limit=limit
    )


@app.get("/api/forecast/calendar")
def api_get_forecast_calendar(
    month: int = Query(..., description="Month (1-12)"),
    year: int = Query(..., description="Year (e.g. 2024)"),
    storeIds: Optional[List[str]] = Query(None),
    regionIds: Optional[List[str]] = Query(None),
    categoryIds: Optional[List[str]] = Query(None),
    includeFuture: bool = Query(False),
    futureCount: int = Query(10, ge=1, le=60),
):
    """Get promotion calendar events"""
    client = get_client()
    return get_forecast_calendar(
        client,
        table_name=TABLE_NAME,
        store_ids=storeIds,
        region_ids=regionIds,
        category_ids=categoryIds,
        month=month,
        year=year,
        include_future=includeFuture,
        future_count=futureCount,
    )


@app.get("/api/forecast/product-promotions")
def api_get_product_promotions_for_product(
    storeCode: Optional[int] = Query(None, description="Store code (magazakodu)"),
    storeIds: Optional[List[int]] = Query(None, description="Optional store filter list"),
    productCode: int = Query(..., description="Product code (urunkodu)"),
):
    """Return only promotions previously applied to the selected product.
    If storeCode/storeIds are omitted, promotions are aggregated across all stores.
    """
    client = get_client()
    store_filter_sql = ""
    if storeCode is not None:
        store_filter_sql = f"AND toInt64(magazakodu) = {int(storeCode)}"
    elif storeIds:
        unique_store_ids = sorted(set(int(s) for s in storeIds))
        if unique_store_ids:
            store_ids_csv = ", ".join(str(s) for s in unique_store_ids)
            store_filter_sql = f"AND toInt64(magazakodu) IN ({store_ids_csv})"

    query = f"""
    SELECT
        toString(aktifPromosyonKodu) AS promo_code,
        any(aktifPromosyonAdi) AS promo_name,
        count() AS day_count,
        round(avg(indirimYuzdesi), 1) AS avg_discount,
        min(tarih) AS first_date,
        max(tarih) AS last_date
    FROM {TABLE_NAME}
    WHERE toInt64(urunkodu) = {productCode}
      {store_filter_sql}
      AND aktifPromosyonKodu IS NOT NULL
      AND toString(aktifPromosyonKodu) != '17'
      AND aktifPromosyonAdi IS NOT NULL
      AND aktifPromosyonAdi != ''
      AND aktifPromosyonAdi != 'Tayin edilmedi'
    GROUP BY promo_code
    ORDER BY day_count DESC, last_date DESC
    """

    rows = client.query(query).result_set
    promotions = [
        {
            "code": code,
            "name": name,
            "label": f"{name} (Kod: {code})",
            "occurrenceDays": int(day_count or 0),
            "avgDiscount": float(avg_discount) if avg_discount is not None else None,
            "firstDate": str(first_date),
            "lastDate": str(last_date),
        }
        for code, name, day_count, avg_discount, first_date, last_date in rows
    ]

    return {"promotions": promotions}


@app.post("/api/forecast/predict-demand")
def api_predict_demand(payload: PredictDemandRequest):
    """Proxy request to external demand prediction model."""
    request_data = payload.model_dump() if hasattr(payload, "model_dump") else payload.dict()

    if payload.aktifPromosyonKodu == "17":
        request_data["istenenIndirim"] = None
        request_data["istenenMarj"] = None
        request_data["istenenFiyat"] = None
    else:
        selected_count = sum(
            1
            for value in [payload.istenenIndirim, payload.istenenMarj, payload.istenenFiyat]
            if value is not None
        )
        if selected_count != 1:
            raise HTTPException(
                status_code=400,
                detail="Promosyon senaryosunda istenenIndirim / istenenMarj / istenenFiyat alanlarından sadece biri dolu olmalı.",
            )

    req = urllib.request.Request(
        PREDICTION_API_URL,
        data=json.dumps(request_data).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req) as response:
            body = response.read().decode("utf-8")
            return json.loads(body) if body else {"status": "ok"}
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="ignore")
        detail = body or str(e)
        raise HTTPException(status_code=e.code or 502, detail=detail)
    except urllib.error.URLError as e:
        raise HTTPException(status_code=502, detail=f"Prediction service connection failed: {e.reason}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction proxy failed: {str(e)}")


# =============================================================================
# INVENTORY ENDPOINTS
# =============================================================================

@app.get("/api/inventory/kpis")
def api_get_inventory_kpis(
    regionIds: Optional[List[str]] = Query(None),
    storeIds: Optional[List[str]] = Query(None),
    categoryIds: Optional[List[str]] = Query(None),
    productIds: Optional[List[str]] = Query(None),
    days: int = Query(30, ge=1, le=3650),
):
    """Get inventory KPIs (stock value, coverage, excess, etc.)"""
    client = get_client()
    return get_inventory_kpis(
        client,
        region_ids=regionIds,
        store_ids=storeIds,
        category_ids=categoryIds,
        product_ids=productIds,
        days=days,
        table_name=TABLE_NAME
    )


@app.get("/api/inventory/items")
def api_get_inventory_items(
    regionIds: Optional[List[str]] = Query(None),
    storeIds: Optional[List[str]] = Query(None),
    categoryIds: Optional[List[str]] = Query(None),
    productIds: Optional[List[str]] = Query(None),
    status: Optional[str] = Query(None),
    days: int = Query(30, ge=1, le=3650),
    page: int = 1,
    limit: int = 50,
    sortBy: str = "stockValue",
    sortOrder: str = "desc"
):
    """Get inventory items with pagination"""
    try:
        client = get_client()
        return get_inventory_items(
            client,
            table_name=TABLE_NAME,
            region_ids=regionIds,
            store_ids=storeIds,
            category_ids=categoryIds,
            product_ids=productIds,
            status=status,
            days=days,
            page=page,
            limit=limit,
            sort_by=sortBy,
            sort_order=sortOrder,
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Inventory Items Error: {str(e)}")


@app.get("/api/inventory/stock-trends")
def api_get_inventory_stock_trends(
    regionIds: Optional[List[str]] = Query(None),
    storeIds: Optional[List[str]] = Query(None),
    categoryIds: Optional[List[str]] = Query(None),
    productIds: Optional[List[str]] = Query(None),
    days: int = 30,
    includeFuture: bool = Query(False),
    futureDays: int = Query(0, ge=0, le=180),
    dailyReplenishment: int = Query(0, ge=0),
):
    """Get aggregated stock trends"""
    client = get_client()
    return get_inventory_stock_trends(
        client,
        table_name=TABLE_NAME,
        region_ids=regionIds,
        store_ids=storeIds,
        category_ids=categoryIds,
        product_ids=productIds,
        days=days,
        include_future=includeFuture,
        future_days=futureDays,
        daily_replenishment=dailyReplenishment,
    )


@app.get("/api/inventory/store-performance")
def api_get_inventory_store_performance(
    regionIds: Optional[List[str]] = Query(None),
    storeIds: Optional[List[str]] = Query(None),
    categoryIds: Optional[List[str]] = Query(None),
    productIds: Optional[List[str]] = Query(None),
    days: int = Query(30, ge=1, le=3650),
):
    """Get store inventory performance"""
    client = get_client()
    return get_inventory_store_performance(
        client,
        table_name=TABLE_NAME,
        region_ids=regionIds,
        store_ids=storeIds,
        category_ids=categoryIds,
        product_ids=productIds,
        days=days,
    )


# =============================================================================
# HEALTH CHECK
# =============================================================================

@app.get("/api/health")
def health_check():
    """Health check endpoint"""
    try:
        client = get_client()
        client.query("SELECT 1")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": "disconnected", "error": str(e)}


# =============================================================================
# RUN SERVER
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
