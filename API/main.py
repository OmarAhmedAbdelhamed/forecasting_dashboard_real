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
from dotenv import load_dotenv
import traceback

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
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    # Dev convenience: allow any localhost/127.0.0.1 port.
    allow_origin_regex=r"^https?://(localhost|127\\.0\\.0\\.1)(:\\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ClickHouse Cloud connection settings (from sunucuDB.ipynb)
# Ideally, these should be loaded from environment variables
CLICKHOUSE_HOST = os.getenv("CLICKHOUSE_HOST", "l3flqlcyjf.germanywestcentral.azure.clickhouse.cloud")
CLICKHOUSE_USER = os.getenv("CLICKHOUSE_USER", "default")
CLICKHOUSE_PASSWORD = os.getenv("CLICKHOUSE_PASSWORD", "e11Uq697dnZq_")
TABLE_NAME = "demoVerileri"


def get_client():
    """Create and return a ClickHouse Cloud client connection"""
    try:
        client = clickhouse_connect.get_client(
            host=CLICKHOUSE_HOST,
            user=CLICKHOUSE_USER,
            password=CLICKHOUSE_PASSWORD,
            secure=True
        )
        return client
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database connection failed: {str(e)}")


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
):
    """Get demand trend + forecast series (daily/weekly/monthly)"""
    client = get_client()
    return get_demand_trend_forecast(
        client,
        store_ids=[int(s) for s in storeIds] if storeIds else None,
        product_ids=[int(p) for p in productIds] if productIds else None,
        category_ids=[int(c) for c in categoryIds] if categoryIds else None,
        period=period,
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
):
    """Get promotion history with uplift, profit, and stock status"""
    client = get_client()
    return get_forecast_promotion_history(
        client,
        product_ids=productIds,
        store_ids=storeIds,
        table_name=TABLE_NAME
    )


@app.get("/api/forecast/similar-campaigns")
def api_get_similar_campaigns(
    promotionType: Optional[str] = Query(None),
    productIds: Optional[List[str]] = Query(None),
    limit: int = 5
):
    """Get similar past campaigns"""
    client = get_client()
    return get_similar_campaigns(
        client,
        table_name=TABLE_NAME,
        promotion_type=promotionType,
        product_ids=productIds,
        limit=limit
    )


@app.get("/api/forecast/calendar")
def api_get_forecast_calendar(
    month: int = Query(..., description="Month (1-12)"),
    year: int = Query(..., description="Year (e.g. 2024)"),
    storeIds: Optional[List[str]] = Query(None),
    includeFuture: bool = Query(False),
    futureCount: int = Query(10, ge=1, le=60),
):
    """Get promotion calendar events"""
    client = get_client()
    return get_forecast_calendar(
        client,
        table_name=TABLE_NAME,
        store_ids=storeIds,
        month=month,
        year=year,
        include_future=includeFuture,
        future_count=futureCount,
    )


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
    days: int = 30
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
        days=days
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
