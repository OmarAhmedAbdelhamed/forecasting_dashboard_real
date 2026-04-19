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
from datetime import date, datetime, timedelta
import json
import math
import urllib.request
import urllib.error
import time
import re
from dotenv import load_dotenv
import traceback
import logging
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
    get_promotion_products_detail,
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
# 1) API/.env (preferred for backend runtime)
# 2) process environment / default .env resolution
API_ENV_PATH = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(API_ENV_PATH)
load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="Forecasting Dashboard API",
    description="REST API for inventory forecasting and planning dashboard",
    version="1.0.0",
)
logger = logging.getLogger("uvicorn.error")


def _quote_sql_list(values: Optional[List[object]], *, lower: bool = False) -> str:
    if not values:
        return ""
    quoted: list[str] = []
    for value in values:
        if value is None:
            continue
        token = str(value).strip()
        if not token:
            continue
        if lower:
            token = token.lower()
        quoted.append("'" + token.replace("'", "''") + "'")
    return ", ".join(quoted)

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

# ClickHouse Cloud connection settings
CLICKHOUSE_HOST = os.getenv("CLICKHOUSE_HOST", "localhost")
CLICKHOUSE_PORT = int(os.getenv("CLICKHOUSE_PORT", "8443"))
CLICKHOUSE_USER = os.getenv("CLICKHOUSE_USER", "default")
CLICKHOUSE_PASSWORD = os.getenv("CLICKHOUSE_PASSWORD", "")
CLICKHOUSE_SECURE = os.getenv("CLICKHOUSE_SECURE", "true").strip().lower() in {
    "1",
    "true",
    "yes",
    "on",
}
CLICKHOUSE_CONNECT_TIMEOUT = int(os.getenv("CLICKHOUSE_CONNECT_TIMEOUT", "30"))
CLICKHOUSE_SEND_RECEIVE_TIMEOUT = int(os.getenv("CLICKHOUSE_SEND_RECEIVE_TIMEOUT", "300"))
CLICKHOUSE_QUERY_RETRIES = int(os.getenv("CLICKHOUSE_QUERY_RETRIES", "2"))
CLICKHOUSE_CONNECT_RETRIES = int(os.getenv("CLICKHOUSE_CONNECT_RETRIES", "2"))
TABLE_NAME = os.getenv("CLICKHOUSE_TABLE_NAME", "demoVerileri")
PREDICTION_API_URL = os.getenv("PREDICTION_API_URL", "http://13.53.45.133:8890/predict")
MARKET_SEARCH_API_URL = os.getenv("MARKET_SEARCH_API_URL", "http://13.53.139.80:8891/search")



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


class MarketSearchRequest(BaseModel):
    query: str
    storeId: str
    storeLabel: Optional[str] = None
    page: int = 0
    size: int = 24
    distance: int = 10


def _extract_store_code(store_id: str) -> Optional[str]:
    value = str(store_id).strip()
    if not value:
        return None
    if value.isdigit():
        return value
    # Accept mixed inputs like "Magaza - 1012" or "store_1012"
    match = re.search(r"(\d{3,})", value)
    return match.group(1) if match else None


STORE_COORDINATES_LOCAL: dict[str, tuple[float, float]] = {
    # Pulled from ClickHouse once (default.gokkusagi, argMax(LAT/LON, tarih)).
    "1": (41.07396439, 28.90454099),
    "3": (41.17286789, 29.05198410),
    "13": (41.08098043, 28.25897165),
    "18": (41.07653403, 28.90128715),
    "20": (41.08540218, 28.89373253),
    "24": (41.09809490, 28.90576702),
    "27": (41.07249055, 28.91081824),
    "29": (41.04883086, 28.88287436),
    "30": (41.15578791, 29.02938320),
}


def _resolve_market_coordinates(
    store_id: str,
    store_label: Optional[str] = None,
) -> tuple[float, float]:
    raw_sid = str(store_id).strip()
    sid = _extract_store_code(raw_sid)
    if not sid:
        raise HTTPException(status_code=400, detail="storeId bos olamaz.")
    if not str(sid).isdigit():
        raise HTTPException(
            status_code=400,
            detail=f"Gecersiz storeId: {raw_sid}. Sayisal magaza kodu bekleniyor.",
        )

    coords = STORE_COORDINATES_LOCAL.get(sid)
    if coords is not None:
        return coords

    label_suffix = f" ({store_label})" if store_label else ""
    raise HTTPException(
        status_code=404,
        detail=(
            f"Magaza koordinati bulunamadi: {sid}{label_suffix}. "
            "Yerel store coordinate mapping listesine eklenmeli."
        ),
    )

def _parse_prediction_date(value: object) -> Optional[date]:
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    try:
        return datetime.fromisoformat(text.replace("Z", "+00:00")).date()
    except ValueError:
        try:
            return date.fromisoformat(text[:10])
        except ValueError:
            return None


def _normalize_prediction_response(
    raw_response: object,
    request_data: dict,
) -> object:
    # Helper: fetch real per-day stock and roll_mean_7 from ClickHouse
    def _fetch_ch_timeseries(rows_to_enrich: list[dict]) -> None:
        client = request_data.get("_client")
        table_name = request_data.get("_table_name", "demoVerileri")
        store_code = request_data.get("magazaKodu")
        product_code = request_data.get("urunKodu")
        if client is None or not rows_to_enrich:
            return
        dates = sorted({str(r.get("tarih") or "")[:10] for r in rows_to_enrich if r.get("tarih")})
        if not dates:
            return
        min_d, max_d = dates[0], dates[-1]
        try:
            ch_q = f"""
                SELECT
                    toDate(tarih) AS day,
                    sum(greatest(toFloat64(acilis_stok), 0)) AS stock,
                    round(avg(greatest(toFloat64(roll_mean_7), 0)), 2) AS baseline
                FROM {table_name}
                WHERE
                    toString(magazakodu) = '{store_code}'
                    AND toString(urunkodu) = '{product_code}'
                    AND toDate(tarih) BETWEEN '{min_d}' AND '{max_d}'
                GROUP BY day ORDER BY day ASC
            """
            ch_rows = client.query(ch_q).result_rows
            stock_map = {r[0].isoformat(): (max(0, int(r[1] or 0)), round(float(r[2] or 0), 2)) for r in ch_rows}
            for row in rows_to_enrich:
                key = str(row.get("tarih") or "")[:10]
                if key in stock_map:
                    stk, bl = stock_map[key]
                    row["stok"] = stk
                    if row.get("baseline") is None:
                        row["baseline"] = bl if bl > 0 else row.get("tahmin")
        except Exception:
            pass  # best-effort

    if isinstance(raw_response, dict) and isinstance(raw_response.get("forecast"), list):
        _fetch_ch_timeseries(raw_response["forecast"])
        return raw_response

    weekly_rows: list[dict] = []
    if isinstance(raw_response, dict) and isinstance(raw_response.get("value"), list):
        weekly_rows = [
            row for row in raw_response["value"] if isinstance(row, dict)
        ]
    elif isinstance(raw_response, list):
        weekly_rows = [row for row in raw_response if isinstance(row, dict)]
    else:
        return raw_response

    start_date = _parse_prediction_date(request_data.get("tarihBaslangic"))
    end_date = _parse_prediction_date(request_data.get("tarihBitis"))
    if start_date is None or end_date is None or start_date > end_date:
        return {
            "forecast": [],
            "raw": raw_response,
            "period": "weekly",
            "normalized": False,
        }

    desired_price = request_data.get("istenenFiyat")
    if desired_price is None:
        desired_price = request_data.get("hedef_satisFiyati")

    forecast_rows: list[dict[str, object]] = []
    for weekly_row in weekly_rows:
        week_start = _parse_prediction_date(weekly_row.get("haftaBaslangicTarihi"))
        if week_start is None:
            continue

        requested_week_days = int(float(weekly_row.get("promosyonGunSayisi") or 0))
        week_end = min(week_start + timedelta(days=6), end_date)
        effective_start = max(week_start, start_date)
        effective_end = min(week_end, end_date)
        if effective_start > effective_end:
            continue

        day_count = (effective_end - effective_start).days + 1
        divisor = max(requested_week_days, day_count, 1)
        total_forecast = float(weekly_row.get("AI Tahmin") or 0)
        daily_forecast = total_forecast / divisor
        target_price = float(
            weekly_row.get("hedef_satisFiyati")
            or desired_price
            or 0
        )
        discount_pct = float(weekly_row.get("hedef_indirimYuzdesi") or 0)
        ham_fiyat = float(weekly_row.get("hamFiyat") or 0)
        birim_kar = target_price - ham_fiyat
        birim_marj = (
            float(weekly_row.get("hedef_marj"))
            if weekly_row.get("hedef_marj") is not None
            else (birim_kar / target_price * 100 if target_price else 0)
        )

        for offset in range(day_count):
            current_date = effective_start + timedelta(days=offset)
            forecast_rows.append(
                {
                    "tarih": current_date.isoformat(),
                    "tahmin": daily_forecast,
                    "baseline": None,
                    "ciro_adedi": daily_forecast,
                    "ciro": daily_forecast * target_price,
                    "stok": None,
                    "satisFiyati": target_price,
                    "ham_fiyat": ham_fiyat,
                    "birim_kar": birim_kar,
                    "birim_marj_yuzde": birim_marj,
                    "gunluk_kar": daily_forecast * birim_kar,
                    "benim_promom": (
                        []
                        if str(weekly_row.get("aktifPromosyonKodu") or "0") == "0"
                        else [str(weekly_row.get("aktifPromosyonKodu"))]
                    ),
                    "benim_promom_yuzde": discount_pct,
                    "weather": "sun",
                    "lost_sales": 0,
                    "unconstrained_demand": None,
                }
            )

    forecast_rows.sort(key=lambda row: str(row.get("tarih") or ""))

    # Fill any gaps between the model's last covered date and end_date by
    # extending the last row's values forward. This prevents the chart from
    # showing a hard drop to 0 when the model returned fewer weeks than requested.
    if forecast_rows:
        covered_dates = {str(r["tarih"])[:10] for r in forecast_rows}
        last_row = forecast_rows[-1]
        current = start_date
        while current <= end_date:
            key = current.isoformat()
            if key not in covered_dates:
                forecast_rows.append({**last_row, "tarih": key})
            current += timedelta(days=1)
        forecast_rows.sort(key=lambda row: str(row.get("tarih") or ""))

    # Fetch real per-day stock AND roll_mean_7 baseline from ClickHouse.
    _fetch_ch_timeseries(forecast_rows)

    return {
        "forecast": forecast_rows,
        "raw": weekly_rows,
        "period": "weekly",
        "normalized": True,
    }


def get_client():
    """Create and return a ClickHouse Cloud client connection"""
    last_error = None
    attempts = max(1, CLICKHOUSE_CONNECT_RETRIES)

    for attempt in range(1, attempts + 1):
        try:
            client = clickhouse_connect.get_client(
                host=CLICKHOUSE_HOST,
                port=CLICKHOUSE_PORT,
                username=CLICKHOUSE_USER,
                password=CLICKHOUSE_PASSWORD,
                secure=CLICKHOUSE_SECURE,
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


@app.get("/api/dashboard/promotions/details")
def api_get_dashboard_promotion_details(
    promotionName: str = Query(...),
    startDate: str = Query(...),
    endDate: str = Query(...),
    regionIds: Optional[List[str]] = Query(None),
    storeIds: Optional[List[str]] = Query(None),
    categoryIds: Optional[List[str]] = Query(None),
):
    """
    Get selected promotion details with affected products and before/after prices.
    """
    try:
        client = get_client()
        result = get_promotion_products_detail(
            client,
            table_name=TABLE_NAME,
            promotion_name=promotionName,
            start_date=startDate,
            end_date=endDate,
            region_ids=regionIds,
            store_ids=storeIds,
            category_ids=categoryIds,
        )
        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Promotion Details Error: {str(e)}",
        )


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
    result = get_stores(client, TABLE_NAME, region_ids=regionIds)
    store_count = len(result.get("stores", [])) if isinstance(result, dict) else 0
    payload = json.dumps(result, ensure_ascii=False, default=str)
    logger.info(
        "DEBUG /api/stores response regionIds=%s count=%s payload=%s",
        regionIds,
        store_count,
        payload,
    )
    print(
        f"DEBUG: /api/stores response (regionIds={regionIds}, count={store_count}): {payload}",
        flush=True,
    )
    return result


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
    """Get sektor list for category filtering."""
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
            table_name=TABLE_NAME,
            region_ids=regionIds,
            store_ids=[int(s) for s in storeIds] if storeIds else None,
            category_ids=categoryIds,
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
    limit: int = Query(5000, ge=1, le=20000),
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
        category_ids=categoryIds,
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
        category_ids=categoryIds,
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
        category_ids=categoryIds,
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
        category_ids=categoryIds,
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
        category_ids=categoryIds,
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
        category_ids=categoryIds,
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
    where_clauses = ["(toString(aktifPromosyonKodu) NOT IN ('', '0') OR indirimVar = 1)"]
    if productIds:
        where_clauses.append(f"toString(urunkodu) IN ({_quote_sql_list(productIds)})")
    if storeIds:
        where_clauses.append(f"toString(magazakodu) IN ({_quote_sql_list(storeIds)})")
    if regionIds:
        where_clauses.append(f"lower(il) IN ({_quote_sql_list(regionIds, lower=True)})")
    if categoryIds:
        where_clauses.append(f"toString(hier2_kod) IN ({_quote_sql_list(categoryIds)})")
    where_sql = " AND ".join(where_clauses)

    query = f"""
    WITH source AS (
        SELECT
            toDate(tarih) AS event_date,
            magazakodu,
            urunkodu,
            il,
            hier2_ad AS sektor,
            toString(aktifPromosyonKodu) AS promo_code,
            multiIf(
                toString(aktifPromosyonKodu) IN ('', '0'), 'Promosyon Yok',
                abs(toFloat64(indirimYuzdesi)) > 0,
                    concat('Promo ', toString(aktifPromosyonKodu), ' - %', toString(toInt32(round(abs(toFloat64(indirimYuzdesi)))))),
                concat('Promo ', toString(aktifPromosyonKodu))
            ) AS promo_name,
            multiIf(
                abs(toFloat64(indirimYuzdesi)) >= 25, 'Yuksek Indirim',
                abs(toFloat64(indirimYuzdesi)) >= 10, 'Indirim Kampanyasi',
                'Kod Bazli Kampanya'
            ) AS promo_type,
            toFloat64(satismiktari) AS actual_units,
            avg(toFloat64(satismiktari)) OVER (
                PARTITION BY magazakodu, urunkodu
                ORDER BY toDate(tarih)
                ROWS BETWEEN 13 PRECEDING AND CURRENT ROW
            ) AS baseline_units,
            toFloat64(acilis_stok) AS stock_units,
            toFloat64(satistutarikdvsiz) AS actual_revenue,
            if(
                toFloat64(satismiktari) > 0,
                toFloat64(satistutarikdvsiz) / toFloat64(satismiktari),
                toFloat64(satisFiyati)
            ) AS unit_price,
            toFloat64(maliyetFiyati) AS cost_price,
            toFloat64(indirimYuzdesi) AS discount_pct,
            toUInt8(stok_out) AS stock_out_flag
        FROM {TABLE_NAME}
        WHERE {where_sql}
    )
    SELECT
        concat(toString(magazakodu), '_', toString(urunkodu), '_', promo_code, '_', toString(min(event_date))) AS campaignKey,
        max(event_date) AS eventDate,
        min(event_date) AS campaignStartDate,
        max(event_date) AS campaignEndDate,
        magazakodu AS storeCode,
        urunkodu AS productCode,
        any(il) AS region,
        any(sektor) AS category,
        promo_code AS promoCode,
        concat(toString(min(event_date)), ' - ', toString(max(event_date))) AS date,
        any(promo_name) AS name,
        any(promo_type) AS type,
        round(
            100 * (sum(actual_units) - sum(greatest(baseline_units, 0)))
            / nullIf(sum(greatest(baseline_units, 0)), 0),
            2
        ) AS uplift,
        round(sum(actual_revenue) - sum(greatest(baseline_units, 0) * unit_price), 2) AS upliftVal,
        round(sum(actual_revenue - (actual_units * cost_price)), 2) AS profit,
        round(avg(stock_units), 2) AS stock,
        round(sum(greatest(baseline_units, 0)), 2) AS forecast,
        round(avg(stock_units * cost_price), 2) AS stockCostIncrease,
        round(sum(if(stock_out_flag = 1, greatest(baseline_units - actual_units, 0) * unit_price, 0)), 2) AS lostSalesVal
    FROM source
    GROUP BY magazakodu, urunkodu, promo_code
    ORDER BY campaignEndDate DESC, campaignStartDate DESC
    LIMIT {int(limit)}
    """

    rows = client.query(query).result_rows
    history = []
    for row in rows:
        (
            campaign_key,
            event_date,
            campaign_start,
            campaign_end,
            store_code,
            product_code,
            region,
            category,
            promo_code,
            date_label,
            name,
            promo_type,
            uplift,
            uplift_val,
            profit,
            stock,
            forecast,
            stock_cost_increase,
            lost_sales_val,
        ) = row
        type_label = f"{promo_type} (Kod: {promo_code})"
        history.append(
            {
                "campaignKey": str(campaign_key),
                "eventDate": event_date.isoformat() if event_date else None,
                "campaignStartDate": campaign_start.isoformat() if campaign_start else None,
                "campaignEndDate": campaign_end.isoformat() if campaign_end else None,
                "storeCode": int(store_code),
                "productCode": int(product_code),
                "region": str(region or ""),
                "category": str(category or ""),
                "promoCode": str(promo_code),
                "date": str(date_label),
                "name": str(name or ""),
                "type": str(promo_type or ""),
                "typeLabel": type_label,
                "uplift": round(float(uplift or 0), 2),
                "upliftVal": round(float(uplift_val or 0), 2),
                "profit": round(float(profit or 0), 2),
                "stock": str(round(float(stock or 0), 2)),
                "forecast": round(float(forecast or 0), 2),
                "stockCostIncrease": round(float(stock_cost_increase or 0), 2),
                "lostSalesVal": round(float(lost_sales_val or 0), 2),
            }
        )
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

    query = f"""
    WITH source AS (
        SELECT
            toDate(tarih) AS tarih,
            toFloat64(satismiktari)                                               AS actual_units,
            avg(toFloat64(satismiktari)) OVER (
                PARTITION BY magazakodu, urunkodu
                ORDER BY toDate(tarih)
                ROWS BETWEEN 13 PRECEDING AND CURRENT ROW
            )                                                                     AS baseline_raw,
            toFloat64(acilis_stok)                                                AS stock_units,
            toFloat64(satistutarikdvsiz)                                          AS revenue,
            if(
                toFloat64(satismiktari) > 0,
                toFloat64(satistutarikdvsiz) / toFloat64(satismiktari),
                toFloat64(satisFiyati)
            )                                                                     AS unit_price,
            toFloat64(maliyetFiyati)                                              AS cost_price,
            toUInt8(stok_out)                                                     AS stock_out_flag
        FROM {TABLE_NAME}
        WHERE magazakodu = {int(storeCode)}
          AND urunkodu = {int(productCode)}
          AND toString(aktifPromosyonKodu) = '{str(promoCode).replace("'", "''")}'
          AND toDate(tarih) >= toDate('{start_date_obj.isoformat()}')
          AND toDate(tarih) <= toDate('{end_date_obj.isoformat()}')
    ),
    expanded AS (
        SELECT
            tarih,
            actual_units,
            greatest(baseline_raw, 0)                          AS baseline_units,
            stock_units,
            revenue,
            unit_price,
            cost_price,
            stock_out_flag,
            -- pre-compute per-row derived columns to avoid agg-in-agg
            greatest(baseline_raw, 0) * unit_price             AS baseline_revenue,
            greatest(baseline_raw - actual_units, 0)           AS lost_units,
            revenue - (actual_units * cost_price)              AS profit_row,
            if(actual_units > 0,
               greatest(0, 100 - abs(baseline_raw - actual_units) / actual_units * 100),
               100)                                            AS accuracy_row
        FROM source
    )
    SELECT
        tarih,
        round(sum(baseline_units), 2)                          AS baselineUnits,
        round(sum(actual_units), 2)                            AS actualUnits,
        round(avg(stock_units), 2)                             AS stockUnits,
        round(sum(lost_units), 2)                              AS lostSalesUnits,
        round(sum(revenue), 2)                                 AS revenue,
        round(sum(baseline_revenue), 2)                        AS targetRevenue,
        sum(stock_out_flag)                                    AS stockOutDays,
        round(sum(profit_row), 2)                              AS profitEffect,
        round(avg(accuracy_row), 2)                            AS forecastAccuracy,
        round(sum(baseline_revenue) - sum(revenue), 2)         AS markdownCost
    FROM expanded
    GROUP BY tarih
    ORDER BY tarih
    """
    rows = client.query(query).result_rows
    if not rows:
        return {
            "series": [],
            "summary": {
                "targetRevenue": 0.0,
                "actualRevenue": 0.0,
                "soldUnits": 0.0,
                "markdownCost": 0.0,
                "sellThrough": 0.0,
                "stockOutDays": 0,
                "upliftValue": 0.0,
                "profitEffect": 0.0,
                "forecastAccuracy": 0.0,
            },
        }

    series = []
    target_revenue_total = 0.0
    actual_revenue_total = 0.0
    sold_units_total = 0.0
    markdown_cost_total = 0.0
    stock_out_days_total = 0
    profit_effect_total = 0.0
    accuracy_samples: list[float] = []
    sell_through_samples: list[float] = []
    uplift_value_total = 0.0

    for row in rows:
        tarih, baseline_units, actual_units, stock_units, lost_sales_units, revenue, target_revenue, stock_out_days, profit_effect, forecast_accuracy, markdown_cost = row
        series.append(
            {
                "date": tarih.isoformat() if tarih else None,
                "baselineUnits": round(float(baseline_units or 0), 2),
                "actualUnits": round(float(actual_units or 0), 2),
                "stockUnits": round(float(stock_units or 0), 2),
                "lostSalesUnits": round(float(lost_sales_units or 0), 2),
                "revenue": round(float(revenue or 0), 2),
            }
        )
        target_revenue_total += float(target_revenue or 0)
        actual_revenue_total += float(revenue or 0)
        sold_units_total += float(actual_units or 0)
        markdown_cost_total += float(markdown_cost or 0)
        stock_out_days_total += int(stock_out_days or 0)
        profit_effect_total += float(profit_effect or 0)
        uplift_value_total += float(revenue or 0) - float(target_revenue or 0)
        if forecast_accuracy is not None:
            accuracy_samples.append(float(forecast_accuracy))
        denominator = float(stock_units or 0) + float(actual_units or 0)
        if denominator > 0:
            sell_through_samples.append(float(actual_units or 0) / denominator * 100.0)

    return {
        "series": series,
        "summary": {
            "targetRevenue": round(target_revenue_total, 2),
            "actualRevenue": round(actual_revenue_total, 2),
            "soldUnits": round(sold_units_total, 2),
            "markdownCost": round(markdown_cost_total, 2),
            "sellThrough": round(sum(sell_through_samples) / len(sell_through_samples), 2) if sell_through_samples else 0.0,
            "stockOutDays": stock_out_days_total,
            "upliftValue": round(uplift_value_total, 2),
            "profitEffect": round(profit_effect_total, 2),
            "forecastAccuracy": round(sum(accuracy_samples) / len(accuracy_samples), 2) if accuracy_samples else 0.0,
        },
    }


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
    where_clauses = [
        f"urunkodu = {int(productCode)}",
        "(toString(aktifPromosyonKodu) NOT IN ('', '0') OR indirimVar = 1)",
    ]
    if storeCode is not None:
        where_clauses.append(f"magazakodu = {int(storeCode)}")
    elif storeIds:
        where_clauses.append(f"toString(magazakodu) IN ({_quote_sql_list(storeIds)})")
    query = f"""
    SELECT
        toString(aktifPromosyonKodu) AS code,
        multiIf(
            abs(toFloat64(indirimYuzdesi)) >= 25, 'Yuksek Indirim',
            abs(toFloat64(indirimYuzdesi)) >= 10, 'Indirim Kampanyasi',
            'Kod Bazli Kampanya'
        ) AS typeLabel,
        countDistinct(toDate(tarih)) AS occurrenceDays,
        round(avg(toFloat64(indirimYuzdesi)), 1) AS avgDiscount,
        min(toDate(tarih)) AS firstDate,
        max(toDate(tarih)) AS lastDate
    FROM {TABLE_NAME}
    WHERE {" AND ".join(where_clauses)}
    GROUP BY code, typeLabel
    ORDER BY occurrenceDays DESC, lastDate DESC
    """
    promotions = []
    for code, type_label, occurrence_days, avg_discount, first_date, last_date in client.query(query).result_rows:
        promotions.append(
            {
                "code": str(code),
                "name": str(type_label),
                "label": f"{type_label} (Kod: {code})",
                "occurrenceDays": int(occurrence_days or 0),
                "avgDiscount": None if avg_discount is None else round(float(avg_discount), 1),
                "firstDate": first_date.isoformat() if first_date else None,
                "lastDate": last_date.isoformat() if last_date else None,
            }
        )
    return {"promotions": promotions}


@app.post("/api/forecast/predict-demand")
def api_predict_demand(payload: PredictDemandRequest):
    """Proxy request to external demand prediction model."""
    request_data = payload.model_dump() if hasattr(payload, "model_dump") else payload.dict()

    # Stash client + table for use in _normalize_prediction_response (stock fetch).
    _ch_client = get_client()
    request_data["_client"] = _ch_client
    request_data["_table_name"] = TABLE_NAME

    # External model accepts 0 as "not provided"; normalize those placeholders to null.
    for key in ["istenenIndirim", "istenenMarj", "istenenFiyat"]:
        if request_data.get(key) == 0:
            request_data[key] = None

    selected_count = sum(
        1
        for value in [
            request_data.get("istenenIndirim"),
            request_data.get("istenenMarj"),
            request_data.get("istenenFiyat"),
        ]
        if value is not None
    )
    if selected_count != 1:
        raise HTTPException(
            status_code=400,
            detail="istenenIndirim / istenenMarj / istenenFiyat alanlarından sadece biri dolu olmalı.",
        )

    # Strip private keys before sending to external ML API.
    api_payload = {k: v for k, v in request_data.items() if not k.startswith("_")}
    req = urllib.request.Request(
        PREDICTION_API_URL,
        data=json.dumps(api_payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req) as response:
            body = response.read().decode("utf-8")
            raw_response = json.loads(body) if body else {"status": "ok"}
            return _normalize_prediction_response(raw_response, request_data)
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="ignore")
        detail = body or str(e)
        raise HTTPException(status_code=e.code or 502, detail=detail)
    except urllib.error.URLError as e:
        raise HTTPException(status_code=502, detail=f"Prediction service connection failed: {e.reason}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction proxy failed: {str(e)}")


@app.post("/api/market/search")
def api_market_search(payload: MarketSearchRequest):
    """Proxy request to market comparison API using store-based coordinates."""
    coords = _resolve_market_coordinates(payload.storeId, payload.storeLabel)

    latitude, longitude = coords
    request_data = {
        "query": payload.query,
        "latitude": float(latitude),
        "longitude": float(longitude),
        "page": int(payload.page),
        "size": int(payload.size),
        "distance": int(payload.distance),
    }
    logger.info(
        "Market search proxy payload: storeId=%s, lat=%s, lon=%s, query=%s",
        payload.storeId,
        request_data["latitude"],
        request_data["longitude"],
        payload.query,
    )

    req = urllib.request.Request(
        MARKET_SEARCH_API_URL,
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
        raise HTTPException(
            status_code=502,
            detail=f"Market service connection failed: {e.reason}",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Market proxy failed: {str(e)}")


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
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    performance: Optional[str] = Query(None),
    days: int = Query(30, ge=1, le=3650),
    page: int = 1,
    limit: int = 25,
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
            search=search,
            status=status,
            performance=performance,
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


@app.get("/api/inventory/product-store-comparison")
def api_get_inventory_product_store_comparison(
    productId: str = Query(..., description="Product code (urunkodu)"),
    storeIds: Optional[List[str]] = Query(None),
):
    """Get exact product snapshot across stores for comparison."""
    client = get_client()
    filters = [f"urunkodu = {int(productId)}"]
    if storeIds:
        filters.append(f"toString(magazakodu) IN ({_quote_sql_list(storeIds)})")
    query = f"""
    WITH anchor_date AS (
        SELECT max(toDate(tarih)) AS d FROM {TABLE_NAME}
    ),
    latest_rows AS (
        SELECT
            toString(magazakodu) AS storeCode,
            anyLast(concat(il, ' - ', ilce)) AS storeName,
            anyLast(urunAdi) AS productName,
            argMax(toFloat64(acilis_stok), tarih) AS stockLevel,
            argMax(toFloat64(satisFiyati), tarih) AS price,
            argMax(toFloat64(degerlenmisstok), tarih) AS stockValue
        FROM {TABLE_NAME}
        WHERE {" AND ".join(filters)}
        GROUP BY magazakodu
    ),
    forecast_rows AS (
        SELECT
            toString(magazakodu) AS storeCode,
            avgIf(
                toFloat64(satismiktari),
                toDate(tarih) >= addDays((SELECT d FROM anchor_date), -6)
                AND toDate(tarih) <= (SELECT d FROM anchor_date)
            ) AS forecastedDemand
        FROM {TABLE_NAME}
        WHERE {" AND ".join(filters)}
        GROUP BY magazakodu
    )
    SELECT
        l.storeCode,
        l.storeName,
        l.productName,
        l.stockLevel,
        round(greatest(coalesce(f.forecastedDemand, 0), 0) * 7, 0) AS reorderPoint,
        round(greatest(coalesce(f.forecastedDemand, 0), 0), 0) AS forecastedDemand,
        l.price,
        l.stockValue,
        round(l.stockLevel / nullIf(greatest(coalesce(f.forecastedDemand, 0), 0), 0), 1) AS daysOfCoverage,
        multiIf(
            l.stockLevel <= 0, 'Out of Stock',
            l.stockLevel <= greatest(coalesce(f.forecastedDemand, 0), 0) * 7, 'Low Stock',
            l.stockLevel > greatest(coalesce(f.forecastedDemand, 0), 0) * 30, 'Overstock',
            'In Stock'
        ) AS status
    FROM latest_rows l
    LEFT JOIN forecast_rows f ON l.storeCode = f.storeCode
    ORDER BY l.storeCode
    """
    items = []
    for row in client.query(query).result_rows:
        store_code, store_name, product_name, stock_level, reorder_point, forecasted_demand, price, stock_value, days_of_coverage, status = row
        items.append(
            {
                "storeCode": str(store_code),
                "storeName": str(store_name or ""),
                "productName": str(product_name or ""),
                "stockLevel": int(round(float(stock_level or 0))),
                "reorderPoint": int(round(float(reorder_point or 0))),
                "forecastedDemand": int(round(float(forecasted_demand or 0))),
                "price": round(float(price or 0), 2),
                "stockValue": round(float(stock_value or 0), 2),
                "daysOfCoverage": round(float(days_of_coverage or 0), 1),
                "status": str(status or "In Stock"),
            }
        )
    return {"items": items}


# =============================================================================
# HEALTH CHECK
# =============================================================================

@app.get("/api/health")
def health_check():
    """Health check endpoint"""
    try:
        client = get_client()
        row_count, latest_date = client.query(
            f"SELECT count() AS rows, max(toDate(tarih)) AS latestDate FROM {TABLE_NAME}"
        ).first_row
        return {
            "status": "healthy",
            "database": "clickhouse",
            "rows": int(row_count or 0),
            "latestDate": latest_date.isoformat() if latest_date else None,
            "table": TABLE_NAME,
        }
    except Exception as e:
        return {"status": "unhealthy", "database": "clickhouse", "error": str(e)}


# =============================================================================
# RUN SERVER
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
