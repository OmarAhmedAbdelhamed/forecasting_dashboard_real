"""
FastAPI Server for Forecasting Dashboard
Exposes ClickHouse query functions as REST endpoints
"""

from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
import clickhouse_connect
import os
from dotenv import load_dotenv

# Import all functions from omerApiYan
from omerApiYan import (
    get_regions_hierarchy,
    get_stores,
    get_categories,
    get_products,
    get_reyonlar,
    get_dashboard_metrics,
    get_dashboard_revenue_chart,
    get_dashboard_historical_chart,
    get_alerts_summary,
    get_inventory_kpis,
    get_product_promotions,
    get_demand_kpis,
    get_demand_trend_forecast,
    get_demand_year_comparison,
    get_demand_monthly_bias,
    get_growth_products,
    get_forecast_errors,
    get_inventory_items,
    get_inventory_stock_trends,
    get_inventory_store_performance,
    get_inventory_alerts,
    get_forecast_promotion_history,
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

# CORS middleware for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ClickHouse Cloud connection settings (from sunucuDB.ipynb)
CLICKHOUSE_HOST = "l3flqlcyjf.germanywestcentral.azure.clickhouse.cloud"
CLICKHOUSE_USER = "default"
CLICKHOUSE_PASSWORD = "e11Uq697dnZq_"
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
        from datetime import datetime
        client = get_client()
        result = get_product_promotions(
            client, TABLE_NAME,
            region_ids=regionIds,
            store_ids=storeIds,
            category_ids=categoryIds,
        )
        
        # Post-process for "integration" (formatting and fixing large durations)
        formatted_promotions = []
        for p in result.get("promotions", []):
            try:
                # Parse strings (expecting YYYY-MM-DD)
                start_dt = datetime.strptime(p["startDate"][:10], "%Y-%m-%d")
                end_dt = datetime.strptime(p["endDate"][:10], "%Y-%m-%d")
                
                # Recalculate duration as date difference
                duration = (end_dt - start_dt).days + 1
                
                formatted_promotions.append({
                    "name": p["name"],
                    "startDate": start_dt.strftime("%d.%m.%Y"),
                    "endDate": end_dt.strftime("%d.%m.%Y"),
                    "durationDays": max(1, duration),
                    "discount": p["discount"],
                    "status": p["status"]
                })
            except Exception:
                formatted_promotions.append(p)
                
        return {"promotions": formatted_promotions}
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
        
        # Get raw data from omerApiYan
        raw_data = get_alerts_summary(
            client,
            table_name=TABLE_NAME,
            region_ids=regionIds,
            store_ids=storeIds,
            category_ids=categoryIds
        )
        
        # Transform to frontend expected format (AlertsSummary interface)
        formatted_response = {
            "summary": {
                "lowGrowth": raw_data.get("sharp_decline", {"count": 0, "severity": "low"}),
                "highGrowth": raw_data.get("explosive_growth", {"count": 0, "severity": "low"}),
                "forecastErrors": {
                    "count": raw_data.get("major_forecast_errors", {}).get("count", 0) + 
                             raw_data.get("anomaly_errors", {}).get("count", 0),
                    "criticalCount": raw_data.get("anomaly_errors", {}).get("count", 0),
                    "severity": raw_data.get("anomaly_errors", {}).get("severity", "low") 
                                if raw_data.get("anomaly_errors", {}).get("count", 0) > 0 
                                else raw_data.get("major_forecast_errors", {}).get("severity", "low")
                },
                "inventory": {
                    "count": raw_data.get("stockout", {}).get("count", 0) + 
                             raw_data.get("extreme_overstock", {}).get("count", 0) + 
                             raw_data.get("urgent_reorder", {}).get("count", 0),
                    "stockout": raw_data.get("stockout", {}).get("count", 0),
                    "overstock": raw_data.get("extreme_overstock", {}).get("count", 0),
                    "reorder": raw_data.get("urgent_reorder", {}).get("count", 0),
                    "severity": "critical" if raw_data.get("stockout", {}).get("count", 0) > 0 else
                                "high" if raw_data.get("urgent_reorder", {}).get("count", 0) > 0 else 
                                "medium" if raw_data.get("extreme_overstock", {}).get("count", 0) > 0 else "low"
                }
            },
            "totalAlerts": raw_data.get("total_alerts", 0)
        }
        
        return formatted_response
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Alerts Summary Error: {str(e)}")


@app.get("/api/alerts/inventory")
def api_get_inventory_alerts(
    regionIds: Optional[List[str]] = Query(None),
    storeIds: Optional[List[str]] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
):
    """Get inventory stock alerts"""
    try:
        client = get_client()
        s_ids = [int(s) for s in storeIds] if storeIds else None
        
        return get_inventory_alerts(
            client,
            region_ids=regionIds,
            store_ids=s_ids,
            search=search,
            limit=limit,
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
):
    """Get demand forecasting KPIs"""
    client = get_client()
    return get_demand_kpis(
        client,
        region_ids=regionIds,
        store_ids=storeIds,
        category_ids=categoryIds,
        product_ids=productIds,
        table_name=TABLE_NAME
    )

@app.get("/api/demand/trend-forecast")
def api_get_demand_trend_forecast(
    storeIds: Optional[List[str]] = Query(None),
    productIds: Optional[List[str]] = Query(None),
    period: str = "daily"
):
    """Get demand trend and forecast data"""
    client = get_client()
    s_ids = [int(s) for s in storeIds] if storeIds else None
    p_ids = [int(p) for p in productIds] if productIds else None
    
    return get_demand_trend_forecast(
        client,
        store_ids=s_ids,
        product_ids=p_ids,
        period=period,
        table_name=TABLE_NAME
    )

@app.get("/api/demand/year-comparison")
def api_get_demand_year_comparison(
    storeIds: Optional[List[str]] = Query(None),
    productIds: Optional[List[str]] = Query(None)
):
    """Get year-over-year comparison for a product/store"""
    client = get_client()
    s_ids = [int(s) for s in storeIds] if storeIds else None
    p_ids = [int(p) for p in productIds] if productIds else None

    return get_demand_year_comparison(
        client,
        store_ids=s_ids,
        product_ids=p_ids,
        table_name=TABLE_NAME
    )

@app.get("/api/demand/monthly-bias")
def api_get_demand_monthly_bias(
    storeIds: Optional[List[str]] = Query(None),
    productIds: Optional[List[str]] = Query(None)
):
    """Get monthly bias for a product/store"""
    client = get_client()
    s_ids = [int(s) for s in storeIds] if storeIds else None
    p_ids = [int(p) for p in productIds] if productIds else None

    return get_demand_monthly_bias(
        client,
        store_ids=s_ids,
        product_ids=p_ids,
        table_name=TABLE_NAME
    )

@app.get("/api/demand/growth-products")
def api_get_demand_growth_products(
    storeIds: List[str] = Query([]),
    type: str = "high"
):
    """Get high or low growth products"""
    client = get_client()
    return get_growth_products(
        client,
        store_ids=[int(s) for s in storeIds] if storeIds else [],
        type_=type,
        table_name=TABLE_NAME
    )

@app.get("/api/demand/forecast-errors")
def api_get_demand_forecast_errors(
    storeIds: Optional[List[str]] = Query(None),
    severityFilter: Optional[str] = Query(None)
):
    """Get products with significant forecast errors"""
    client = get_client()
    return get_forecast_errors(
        client,
        store_ids=storeIds,
        severity_filter=severityFilter,
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
):
    """Get inventory KPIs (stock value, coverage, excess, etc.)"""
    client = get_client()
    # Corrected argument passing order for omerApiYan.get_inventory_kpis
    return get_inventory_kpis(
        client,
        region_ids=regionIds,
        store_ids=storeIds,
        category_ids=categoryIds,
        product_ids=productIds,
        table_name=TABLE_NAME
    )


@app.get("/api/inventory/items")
def api_get_inventory_items(
    regionIds: Optional[List[str]] = Query(None),
    storeIds: Optional[List[str]] = Query(None),
    categoryIds: Optional[List[str]] = Query(None),
    productIds: Optional[List[str]] = Query(None),
    status: Optional[str] = Query(None),
    page: int = 1,
    limit: int = 50,
    sortBy: str = "stockValue",
    sortOrder: str = "desc"
):
    """Get inventory items with pagination"""
    client = get_client()
    return get_inventory_items(
        client,
        table_name=TABLE_NAME,
        region_ids=regionIds,
        store_ids=storeIds,
        category_ids=categoryIds,
        product_ids=productIds,
        status=status,
        page=page,
        limit=limit,
        sort_by=sortBy,
        sort_order=sortOrder
    )


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
):
    """Get store inventory performance"""
    client = get_client()
    return get_inventory_store_performance(
        client,
        table_name=TABLE_NAME,
        region_ids=regionIds,
        store_ids=storeIds,
        category_ids=categoryIds,
        product_ids=productIds
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
