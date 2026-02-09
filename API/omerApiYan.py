import clickhouse_connect
import pandas as pd
import numpy as np
from datetime import date, timedelta
import random
from typing import List, Optional



category_map = {
        100: "LIKITLER",
        101: "TEMIZLIK",
        102: "PARFÜMERI VE HIJYEN",
        104: "KURU GIDALAR",
        105: "SELF SERVIS",
        109: "PARAPHARMACIE",
        200: "SARKÜTERI",
        201: "BALIK",
        202: "MEYVE VE SEBZE",
        203: "PASTA-EKMEK",
        204: "KASAP",
        206: "LEZZET ARASI",
        207: "L.A MUTFAK",
        300: "TAMIR VE ONARIM",
        301: "EV YAŞAM",
        302: "KÜLTÜR",
        303: "OYUNCAK-EGLENCE",
        304: "BAHÇECILIK",
        305: "OTO",
        306: "TICARI DIGER ÜRÜNLER",
        307: "BEBEK",
        309: "DIGER SATISLAR",
        400: "BÜYÜK BEYAZ ESYALAR",
        401: "KÜÇÜK BEYAZ ESYALAR",
        402: "TELEKOM VE DİJİTAL Ü",
        403: "TELEVİZYON VE AKS.",
        404: "BILGISAYAR",
        405: "ALTIN-OR",
        407: "EK GARANTİ",
        600: "AYAKKABI",
        601: "IC GIYIM&PLAJ GIYIM",
        602: "ÇOCUK",
        603: "KADIN",
        604: "ERKEK",
        605: "EVTEKSTIL",
        801: "İÇ SATINALMA",
        803: "YATIRIM VE İNŞAAT",
        804: "PAZARLAMA",
        809: "LOJİSTİK",
        811: "AVM"
    }



def get_regions_hierarchy(
    client,
    table_name: str = "demoVerileri"
) -> dict:

    # ----- kategori kodları map -----
    

    # ----- clickhouse sorgu -----
    query = f"""
    SELECT
        lowerUTF8(cografi_bolge) AS region,
        concat(lowerUTF8(bulundugusehir), '_', lowerUTF8(ilce)) AS store_key,
        concat(bulundugusehir, ' - ', ilce) AS store_label,
        reyonkodu AS category,
        urunkodu AS product_code,
        any(urunismi) AS product_label,
        any(stok) AS current_stock,
        anyLast(roll_mean_14) AS forecast_demand
    FROM {table_name}
    WHERE tarih = yesterday()
    GROUP BY
        region,
        store_key,
        store_label,
        category,
        product_code
    """

    rows = client.query(query).result_set

    regions = {}

    for (
        region,
        store_key,
        store_label,
        category_code,
        product_code,
        product_label,
        current_stock,
        forecast_demand
    ) in rows:

        # kategori kodunu isim ile değiştir
        category_name = category_map.get(int(category_code), f"Kategori {category_code}")

        regions.setdefault(region, {
            "value": region,
            "label": region.capitalize(),
            "stores": {}
        })

        stores = regions[region]["stores"]
        stores.setdefault(store_key, {
            "value": store_key,
            "label": store_label,
            "categories": {}
        })

        categories = stores[store_key]["categories"]
        categories.setdefault(category_name, {
            "value": category_name,
            "label": category_name,
            "products": []
        })

        categories[category_name]["products"].append({
            "value": str(product_code),
            "label": product_label,
            "forecastDemand": int(forecast_demand),
            "currentStock": int(current_stock)
        })

    return {
        "regions": [
            {
                "value": r["value"],
                "label": r["label"],
                "stores": [
                    {
                        "value": s["value"],
                        "label": s["label"],
                        "categories": list(s["categories"].values())
                    }
                    for s in r["stores"].values()
                ]
            }
            for r in regions.values()
        ]
    }




def get_stores(
    client,
    table_name: str = "demoVerileri",
    region_ids: list[str] | None = None
) -> dict:
    """
    Returns flat store list.
    Optional filter by regionIds (cografi_bolge).
    """

    where_clause = ""
    if region_ids:
        region_list = ", ".join(f"'{r.lower()}'" for r in region_ids)
        where_clause = f"WHERE lower(cografi_bolge) IN ({region_list})"

    query = f"""
    SELECT DISTINCT
        toString(magazakodu)                   AS value,
        concat(
            toString(bulundugusehir),
            ' - ',
            ilce
        )                                      AS label,
        lower(cografi_bolge)                   AS regionValue
    FROM {table_name}
    {where_clause}
    ORDER BY label
    """

    df = client.query_df(query)

    return {
        "stores": [
            {
                "value": row["value"],
                "label": row["label"],
                "regionValue": row["regionValue"]
            }
            for _, row in df.iterrows()
        ]
    }


def get_categories(
    client,
    table_name: str = "demoVerileri",
    store_ids: list[str] | None = None,
    region_ids: list[str] | None = None
) -> dict:
    """
    Returns flat category list.
    Category value format: {storeValue}_{categoryValue}
    Optional filters: storeIds, regionIds
    """


    where_clauses = []

    if store_ids:
        store_list = ", ".join(f"'{s}'" for s in store_ids)
        where_clauses.append(f"toString(magazakodu) IN ({store_list})")

    if region_ids:
        region_list = ", ".join(f"'{r.lower()}'" for r in region_ids)
        where_clauses.append(f"lower(cografi_bolge) IN ({region_list})")

    where_sql = ""
    if where_clauses:
        where_sql = "WHERE " + " AND ".join(where_clauses)

    query = f"""
    SELECT DISTINCT
        concat(
            toString(magazakodu),
            '_',
            toString(reyonkodu)
        )                               AS value,
        reyonkodu                        AS category_code,
        toString(magazakodu)              AS storeValue
    FROM {table_name}
    {where_sql}
    ORDER BY category_code
    """

    df = client.query_df(query)

    # ----- category_code -> category_name -----
    df["label"] = df["category_code"].apply(
        lambda c: category_map.get(int(c), f"Kategori {c}")
    )

    return {
        "categories": [
            {
                "value": row["value"],
                "label": row["label"],       # artık isim
                "storeValue": row["storeValue"]
            }
            for _, row in df.iterrows()
        ]
    }


def get_products(
    client,
    table_name: str = "demoVerileri",
    region_ids: list[str] | None = None,
    store_ids: list[str] | None = None,
    category_ids: list[str] | None = None
) -> dict:
    """
    Returns flat product list.

    Product value format:
      {storeValue}_{categoryValue}_{productValue}

    Category key format:
      {storeValue}_{categoryValue}

    Optional filters:
      - regionIds (cografi_bolge)
      - storeIds (magazakodu)
      - categoryIds (store_sektorkodu)
    """

    where_clauses = []

    if region_ids:
        region_list = ", ".join(f"'{r.lower()}'" for r in region_ids)
        where_clauses.append(f"lower(cografi_bolge) IN ({region_list})")

    if store_ids:
        store_list = ", ".join(f"'{s}'" for s in store_ids)
        where_clauses.append(f"toString(magazakodu) IN ({store_list})")

    if category_ids:
        # Support both composite {storeValue}_{categoryValue} and simple {categoryValue} IDs
        composite_filters = []
        simple_ids = []

        for cid in category_ids:
            if "_" in cid:
                parts = cid.split("_", 1)
                if len(parts) == 2:
                    store_val, category_val = parts
                    composite_filters.append(
                        f"(toString(magazakodu) = '{store_val}' AND toString(sektorkodu) = '{category_val}')"
                    )
            else:
                simple_ids.append(f"'{cid}'")

        conditions = []
        if composite_filters:
            conditions.append("(" + " OR ".join(composite_filters) + ")")
        
        if simple_ids:
            conditions.append(f"toString(sektorkodu) IN ({', '.join(simple_ids)})")
            
        if conditions:
            where_clauses.append("(" + " OR ".join(conditions) + ")")

    where_sql = ""
    if where_clauses:
        where_sql = "WHERE " + " AND ".join(where_clauses)

    query = f"""
    SELECT
        concat(
            toString(magazakodu),
            '_',
            toString(reyonkodu),
            '_',
            toString(urunkodu)
        )                               AS value,

        toString(urunismi)              AS label,

        concat(
            toString(magazakodu),
            '_',
            toString(reyonkodu)
        )                               AS categoryKey,

        anyLast(roll_mean_14)            AS forecastDemand,
        anyLast(stok)                   AS currentStock
    FROM {table_name}
    {where_sql}
    GROUP BY
        value,
        label,
        categoryKey
    ORDER BY label
    """

    df = client.query_df(query)

    return {
        "products": [
            {
                "value": row["value"],
                "label": row["label"],
                "categoryKey": row["categoryKey"],
                "forecastDemand": (
                    int(row["forecastDemand"])
                    if row["forecastDemand"] is not None else 0
                ),
                "currentStock": (
                    int(row["currentStock"])
                    if row["currentStock"] is not None else 0
                )
            }
            for _, row in df.iterrows()
        ]
    }


def get_reyonlar(
    
    client,
    table_name: str = "demoVerileri"
) -> dict:
    """
    Returns flat reyon (department) list.
    Independent from region / store hierarchy.
    """

    # ----- kategori kodları map -----

    query = f"""
    SELECT DISTINCT
        reyonkodu AS category_code
    FROM {table_name}
    WHERE reyonkodu IS NOT NULL
    ORDER BY category_code
    """

    df = client.query_df(query)

    # ----- category_code -> category_name -----
    df["value"] = df["category_code"].astype(str)
    df["label"] = df["category_code"].apply(lambda c: category_map.get(int(c), f"Kategori {c}"))

    return {
        "reyonlar": [
            {
                "value": row["value"],
                "label": row["label"]
            }
            for _, row in df.iterrows()
        ]
    }


# ---------  ikinci bolum

def get_dashboard_metrics(
    client,
    table_name: str = "demoVerileri",
    region_ids: list[str] | None = None,
    store_ids: list[str] | None = None,
    category_ids: list[str] | None = None
) -> dict:
    """
    Dashboard metrics with Revenue (TL) and Units (Adet).
    Forecast based on roll_mean_14.
    YTD based on current year starting Jan 1st.
    """
    from datetime import date
    today_dt = date.today()
    start_of_year = date(today_dt.year, 1, 1).isoformat()

    common_where = ["1=1"]
    if region_ids:
        region_list = ", ".join(f"'{r.lower()}'" for r in region_ids)
        common_where.append(f"lower(cografi_bolge) IN ({region_list})")
    if store_ids:
        store_list = ", ".join(f"'{s}'" for s in store_ids)
        common_where.append(f"toString(magazakodu) IN ({store_list})")
    if category_ids:
        category_list = ", ".join(f"'{c}'" for c in category_ids)
        common_where.append(f"toString(reyonkodu) IN ({category_list})")

    where_sql = " AND ".join(common_where)

    query = f"""
    WITH
    forecast_stats AS (
        -- Last 14 days (Current)
        SELECT
            sum(roll_mean_14) AS forecast_unit,
            sum(roll_mean_14 * (satistutarikdvsiz / nullIf(satismiktari, 0))) AS forecast_revenue,
            sum(satismiktari) AS actual_unit,
            sum(satistutarikdvsiz) AS actual_revenue
        FROM {table_name}
        WHERE {where_sql}
          AND tarih >= today() - 13
    ),
    prev_forecast AS (
        -- Previous 14 days for growth calculation
        SELECT
            sum(roll_mean_14) AS prev_unit
        FROM {table_name}
        WHERE {where_sql}
          AND tarih BETWEEN today() - 27 AND today() - 14
    ),
    ytd_stats AS (
        -- YTD from Jan 1st
        SELECT
            sum(satismiktari) AS ytd_unit,
            sum(satistutarikdvsiz) AS ytd_revenue
        FROM {table_name}
        WHERE {where_sql}
          AND tarih >= '{start_of_year}'
          AND tarih <= today()
    ),
    ytd_prev_stats AS (
        -- Previous YTD (approximate for change calculation, e.g., same period last year)
        SELECT
            sum(satismiktari) AS prev_ytd_unit
        FROM {table_name}
        WHERE {where_sql}
          AND tarih >= addYears(toDate('{start_of_year}'), -1)
          AND tarih <= addYears(today(), -1)
    )
    SELECT
        -- Accuracy based on units
        round((1 - abs(forecast_unit - actual_unit) / nullIf(actual_unit, 0)) * 100, 1) AS accuracy,
        
        -- Gap to sales (percentage)
        round((forecast_unit - actual_unit) / nullIf(actual_unit, 0) * 100, 1) AS gap_to_sales,
        
        forecast_unit,
        forecast_revenue,
        
        -- Forecast Unit Growth
        round((forecast_unit - prev_unit) / nullIf(prev_unit, 0) * 100, 1) AS forecast_change,
        
        ytd_unit,
        ytd_revenue,
        
        -- YTD Unit Growth
        round((ytd_unit - prev_ytd_unit) / nullIf(prev_ytd_unit, 0) * 100, 1) AS ytd_change
        
    FROM forecast_stats, prev_forecast, ytd_stats, ytd_prev_stats
    """

    res = client.query(query).first_row
    if not res:
        return {
            "accuracy": 0.0, "accuracyChange": 0.0,
            "forecastValue": 0, "forecastRevenue": 0, "forecastUnit": 0, "forecastChange": 0.0,
            "ytdValue": 0, "ytdRevenue": 0, "ytdChange": 0.0,
            "gapToSales": 0.0, "gapToSalesChange": 0.0
        }

    (accuracy, gap_to_sales, f_unit, f_rev, f_change, ytd_unit, ytd_rev, ytd_change) = res

    return {
        "accuracy": float(accuracy or 0),
        "accuracyChange": 1.0, # Placeholder or mock constant
        "forecastValue": int(f_unit or 0),
        "forecastUnit": int((f_unit or 0) / 14), # Daily average
        "forecastRevenue": int(f_rev or 0),
        "forecastChange": float(f_change or 0),
        "ytdValue": int(ytd_unit or 0),
        "ytdRevenue": int(ytd_rev or 0),
        "ytdChange": float(ytd_change or 0),
        "gapToSales": float(gap_to_sales or 0),
        "gapToSalesChange": 0.3 # Placeholder or mock constant
    }

def get_dashboard_revenue_chart(
    client,
    table_name: str = "demoVerileri",
    region_ids: list[str] | None = None,
    store_ids: list[str] | None = None,
    category_ids: list[str] | None = None
) -> dict:
    """
    Weekly revenue chart
    actual = weekly sum(satistutarikdvsiz)
    plan   = avg(roll_mean_14) * 7
    """

    where_clauses = ["tarih >= today() - 60"]

    if region_ids:
        region_list = ", ".join(f"'{r.lower()}'" for r in region_ids)
        where_clauses.append(f"lower(cografi_bolge) IN ({region_list})")

    if store_ids:
        store_list = ", ".join(f"'{s}'" for s in store_ids)
        where_clauses.append(f"toString(magazakodu) IN ({store_list})")

    if category_ids:
        category_list = ", ".join(f"'{c}'" for c in category_ids)
        where_clauses.append(f"toString(reyonkodu) IN ({category_list})")

    where_sql = " AND ".join(where_clauses)

    query = f"""
    SELECT
        toStartOfWeek(tarih)                               AS week_start,
        formatDateTime(toStartOfWeek(tarih), '%e %b')     AS week_label,
        sum(satistutarikdvsiz)                             AS actualCiro,
        sum(roll_mean_14 * (satistutarikdvsiz / nullIf(satismiktari, 0))) AS plan
    FROM {table_name}
    WHERE {where_sql}
    GROUP BY week_start, week_label
    ORDER BY week_start
    """

    rows = client.query(query).result_set

    return {
        "data": [
            {
                "week": week_label.strip(),
                "actualCiro": int(actualCiro or 0),
                "plan": int(plan or 0)
            }
            for week_start, week_label, actualCiro, plan in rows
        ]
    }


def get_dashboard_historical_chart(
    client,
    table_name: str = "demoVerileri",
    region_ids: list[str] | None = None,
    store_ids: list[str] | None = None,
    category_ids: list[str] | None = None,
    weeks: int = 52
) -> dict:
    """
    Year-over-Year comparison by week number.
    Ensures exactly 52 weeks are returned via Python-side padding.
    Current year stops at the last complete week.
    """
    from datetime import date
    today = date.today()
    curr_year = today.year
    curr_week = today.isocalendar()[1]

    years = [curr_year - 2, curr_year - 1, curr_year]
    
    where_clauses = [f"yil IN ({','.join(map(str, years))})"]

    if region_ids:
        region_list = ", ".join(f"'{r.lower()}'" for r in region_ids)
        where_clauses.append(f"lower(cografi_bolge) IN ({region_list})")

    if store_ids:
        store_list = ", ".join(f"'{s}'" for s in store_ids)
        where_clauses.append(f"toString(magazakodu) IN ({store_list})")

    if category_ids:
        category_list = ", ".join(f"'{c}'" for c in category_ids)
        where_clauses.append(f"toString(reyonkodu) IN ({category_list})")

    where_sql = " AND ".join(where_clauses)

    query = f"""
    SELECT
        toWeek(tarih, 3) AS week_index,
        yil,
        sum(satistutarikdvsiz) AS revenue
    FROM {table_name}
    WHERE {where_sql}
    GROUP BY week_index, yil
    ORDER BY week_index
    """

    res_rows = client.query(query).result_set

    # Accumulate into a lookup dict: results[week_index][year]
    lookup = {}
    for w_idx, year, rev in res_rows:
        if w_idx not in lookup:
            lookup[w_idx] = {}
        lookup[w_idx][year] = int(rev or 0)

    # Build the final 52-week skeleton
    data = []
    for w in range(1, 53):
        week_label = f"Hafta {w}"
        row = {"week": week_label}
        
        # Pull data for each year
        week_data = lookup.get(w, {})
        
        row[f"y{years[0]}"] = week_data.get(years[0], 0)
        row[f"y{years[1]}"] = week_data.get(years[1], 0)
        
        # Current year logic: stop at curr_week
        if w < curr_week:
            row[f"y{years[2]}"] = week_data.get(years[2], 0)
        else:
            row[f"y{years[2]}"] = None
            
        data.append(row)

    return {
        "data": data,
        "currentWeek": curr_week - 1
    }




def get_product_promotions(
    client,
    table_name: str = "demoVerileri",
    region_ids: list[str] | None = None,
    store_ids: list[str] | None = None,
    category_ids: list[str] | None = None
) -> dict:
    """
    Detects promotions based on:
    - promosyonVar = 1
    - aktifPromosyonAdi
    - continuous date ranges
    """
    where_clauses = [
        "promosyonVar = 1",
        "aktifPromosyonAdi IS NOT NULL",
        "aktifPromosyonAdi != 'Tayin edilmedi'"
    ]

    if region_ids:
        region_list = ", ".join(f"'{r.lower()}'" for r in region_ids)
        where_clauses.append(f"lower(cografi_bolge) IN ({region_list})")

    if store_ids:
        store_list = ", ".join(f"'{s}'" for s in store_ids)
        where_clauses.append(f"toString(magazakodu) IN ({store_list})")

    if category_ids:
        category_list = ", ".join(f"'{c}'" for c in category_ids)
        where_clauses.append(f"toString(reyonkodu) IN ({category_list})")

    where_sql = " AND ".join(where_clauses)

    query = f"""
    WITH base AS (
        SELECT
            tarih,
            aktifPromosyonAdi,
            indirimYuzdesi,
            lag(tarih) OVER (
                PARTITION BY aktifPromosyonAdi
                ORDER BY tarih
            ) AS prev_tarih
        FROM {table_name}
        WHERE {where_sql}
    ),

    marked AS (
        SELECT
            *,
            if(
                prev_tarih IS NULL
                OR dateDiff('day', prev_tarih, tarih) > 1,
                1,
                0
            ) AS new_promo_flag
        FROM base
    ),

    grouped AS (
        SELECT
            *,
            sum(new_promo_flag) OVER (
                PARTITION BY aktifPromosyonAdi
                ORDER BY tarih
            ) AS promo_group_id
        FROM marked
    )

    SELECT
        aktifPromosyonAdi                 AS promo_name,
        promo_group_id,
        min(tarih)                        AS start_date,
        max(tarih)                        AS end_date,
        count()                           AS promo_days,
        round(avg(indirimYuzdesi), 1)     AS discount,
        multiIf(
            max(tarih) < today(), 'Tamamlandi',
            min(tarih) > today(), 'Beklemede',
            'Aktif'
        )                                 AS status
    FROM grouped
    GROUP BY
        aktifPromosyonAdi,
        promo_group_id
    ORDER BY start_date DESC
    """

    rows = client.query(query).result_set

    return {
        "promotions": [
            {
                "name": promo_name,
                "startDate": str(start_date),
                "endDate": str(end_date),
                "durationDays": int(promo_days),
                "discount": f"%{int(discount)}" if discount else "%0",
                "status": status
            }
            for (
                promo_name,
                promo_group_id,
                start_date,
                end_date,
                promo_days,
                discount,
                status
            ) in rows
        ]
    }



def get_alerts_summary(
    client,
    table_name: str = "demoVerileri",
    region_ids: list[str] | None = None,
    store_ids: list[str] | None = None,
    category_ids: list[str] | None = None
) -> dict:

    where_clauses = []
    if region_ids:
        region_list = ", ".join(f"'{r.lower()}'" for r in region_ids)
        where_clauses.append(f"lower(cografi_bolge) IN ({region_list})")
    if store_ids:
        store_list = ", ".join(str(s) for s in store_ids)
        where_clauses.append(f"magazakodu IN ({store_list})")
    if category_ids:
        category_list = ", ".join(str(c) for c in category_ids)
        where_clauses.append(f"reyonkodu IN ({category_list})")

    where_sql = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""

    query = f"""
    WITH base AS (
        SELECT satismiktari, roll_mean_7, roll_mean_21, stok
        FROM {table_name}
        {where_sql}
    )
    SELECT
        countIf(roll_mean_7 < roll_mean_21 * 0.7)        AS sharp_decline,
        countIf(roll_mean_7 > roll_mean_21 * 1.5)        AS explosive_growth,
        countIf(abs(satismiktari - roll_mean_7) > roll_mean_7 * 0.5) AS major_errors,
        countIf(abs(satismiktari - roll_mean_7) > roll_mean_7 * 1.0) AS anomaly_errors,
        countIf(stok <= 0)                               AS stockout,
        countIf(stok > roll_mean_21 * 4)                 AS extreme_overstock,
        countIf(stok < (roll_mean_7 * 0.5))              AS urgent_reorder
    FROM base
    """

    row = client.query(query).first_row
    s_decline, e_growth, m_errors, a_errors, s_out, e_overstock, u_reorder = row

    # Yardımcı fonksiyon: Sayıya göre severity belirle
    def get_sev(count, high_thresh=1, crit_thresh=10):
        if count == 0: return "low"
        if count < crit_thresh: return "high"
        return "critical"

    return {
        "sharp_decline": {
            "count": int(s_decline),
            "severity": "high" if s_decline > 0 else "low"
        },
        "explosive_growth": {
            "count": int(e_growth),
            "severity": "info" if e_growth > 0 else "low"
        },
        "major_forecast_errors": {
            "count": int(m_errors),
            "severity": "medium" if m_errors > 0 else "low"
        },
        "anomaly_errors": {
            "count": int(a_errors),
            "severity": "critical" if a_errors > 0 else "low"
        },
        "stockout": {
            "count": int(s_out),
            "severity": "critical" if s_out > 0 else "low"
        },
        "extreme_overstock": {
            "count": int(e_overstock),
            "severity": "medium" if e_overstock > 0 else "low"
        },
        "urgent_reorder": {
            "count": int(u_reorder),
            "severity": "high" if u_reorder > 0 else "low"
        },
        "total_alerts": int(sum(row))
    }

#--------------------------------------demand forecasting page

def get_demand_kpis(
    client,
    region_ids: list[int] | None = None,
    store_ids: list[int] | None = None,
    category_ids: list[int] | None = None,
    product_ids: list[int] | None = None,
    table_name: str = "demoVerileri"
) -> dict:

    filters = []

    if region_ids:
        filters.append(f"cografi_bolge IN ({','.join(map(str, region_ids))})")
    if store_ids:
        filters.append(f"magazakodu IN ({','.join(map(str, store_ids))})")
    if category_ids:
        filters.append(f"malgrubukodu IN ({','.join(map(str, category_ids))})")
    if product_ids:
        filters.append(f"urunkodu IN ({','.join(map(str, product_ids))})")

    where_sql = " AND ".join(filters) if filters else "1=1"

    query = f"""
    WITH base AS (
        SELECT
            tarih,
            satismiktari,
            satistutarikdvsiz,
            roll_mean_14 AS forecast
        FROM {table_name}
        WHERE {where_sql}
    ),

    agg AS (
        SELECT
            sum(forecast)                       AS forecast_units,
            sum(satistutarikdvsiz)              AS revenue,
            avg(abs(forecast - satismiktari)
                / nullIf(satismiktari, 0)) * 100 AS mape,
            avg((forecast - satismiktari)
                / nullIf(satismiktari, 0)) * 100 AS bias
        FROM base
    ),

    yoy AS (
        SELECT
            sumIf(satistutarikdvsiz, yil = toYear(today())) AS this_year,
            sumIf(satistutarikdvsiz, yil = toYear(today()) - 1) AS last_year
        FROM {table_name}
        WHERE {where_sql}
    ),

    growth_alerts AS (
        SELECT
            countIf(growth < 2)  AS low_growth,
            countIf(growth > 10) AS high_growth
        FROM (
            SELECT
                urunkodu,
                (
                    sumIf(satistutarikdvsiz, yil = toYear(today())) -
                    sumIf(satistutarikdvsiz, yil = toYear(today()) - 1)
                )
                / nullIf(sumIf(satistutarikdvsiz, yil = toYear(today()) - 1), 0)
                * 100 AS growth
            FROM {table_name}
            WHERE {where_sql}
            GROUP BY urunkodu
        )
    )

    SELECT
        forecast_units,
        revenue,
        mape,
        bias,
        this_year,
        last_year,
        low_growth,
        high_growth
    FROM agg, yoy, growth_alerts
    """

    (
        forecast_units,
        revenue,
        mape,
        bias,
        this_year,
        last_year,
        low_growth,
        high_growth
    ) = client.query(query).result_set[0]

    yoy_growth = (
        (this_year - last_year) / last_year * 100
        if last_year else 0
    )

    return {
        "totalForecast": {
            "value": int(revenue),
            "units": int(forecast_units),
            "trend": round(yoy_growth, 1)
        },
        "accuracy": {
            "value": round(100 - mape, 1),
            "trend": 0.0
        },
        "yoyGrowth": {
            "value": round(yoy_growth, 1),
            "trend": 0.0
        },
        "bias": {
            "value": round(abs(bias), 1),
            "type": "over" if bias > 0 else "under",
            "trend": "stable"
        },
        "lowGrowthCount": int(low_growth),
        "highGrowthCount": int(high_growth)
    }


def get_demand_year_comparison(
    client,
    store_ids: list[int] | None = None,
    product_ids: list[int] | None = None,
    table_name: str = "demoVerileri"
) -> dict:

    filters = []
    if store_ids:
        filters.append(f"magazakodu IN ({','.join(map(str, store_ids))})")
    if product_ids:
        filters.append(f"urunkodu IN ({','.join(map(str, product_ids))})")
        
    filters.append("yil IN (2024, 2025, 2026)")
    where_sql = " AND ".join(filters)

    query = f"""
    SELECT
        toWeek(tarih) AS week_no,
        concat('hafta ', toString(week_no)) AS week,

        sumIf(satistutarikdvsiz, yil = 2024) AS y2024,
        sumIf(satistutarikdvsiz, yil = 2025) AS y2025,
        sumIf(satistutarikdvsiz, yil = 2026) AS y2026

    FROM {table_name}
    WHERE {where_sql}

    GROUP BY week_no
    ORDER BY week_no
    """

    rows = client.query(query).result_set

    return {
        "data": [
            {
                "month": week,
                "y2024": int(y2024 or 0),
                "y2025": int(y2025 or 0),
                "y2026": int(y2026 or 0)
            }
            for (
                week_no,
                week,
                y2024,
                y2025,
                y2026
            ) in rows
        ]
    }



def get_demand_monthly_bias(
    client,
    store_ids: list[int] | None = None,
    product_ids: list[int] | None = None,
    table_name: str = "demoVerileri"
) -> dict:

    filters = []
    if store_ids:
        filters.append(f"magazakodu IN ({','.join(map(str, store_ids))})")
    if product_ids:
        filters.append(f"urunkodu IN ({','.join(map(str, product_ids))})")
        
    where_sql = " AND ".join(filters) if filters else "1=1"

    query = f"""
    SELECT
        ay,
        avg(roll_mean_21) AS forecast,
        avg(satismiktari) AS actual
    FROM {table_name}
    WHERE {where_sql}
    GROUP BY ay
    ORDER BY ay
    """

    rows = client.query(query).result_set

    ay_map = {
        1: "Ocak", 2: "Şubat", 3: "Mart", 4: "Nisan",
        5: "Mayıs", 6: "Haziran", 7: "Temmuz", 8: "Ağustos",
        9: "Eylül", 10: "Ekim", 11: "Kasım", 12: "Aralık"
    }

    data = []

    for ay, forecast, actual in rows:
        forecast = forecast or 0
        actual = actual or 0

        bias = (
            ((forecast - actual) / actual) * 100
            if actual > 0 else 0
        )

        data.append({
            "month": ay_map.get(ay, f"Ay {ay}"),
            "bias": round(bias, 1),
            "forecast": int(forecast),
            "actual": int(actual)
        })

    return {"data": data}




from datetime import date, timedelta

def get_growth_products(
    client,
    store_ids,
    type_,              # "high" | "low"
    table_name="demoVerileri",
    growth_threshold=10
):
    """
    High / Low growth ürünleri döner.
    Forecast = son 30 gün roll_mean_21 ortalaması
    Growth % = (actual - last_month) / last_month * 100
    Category = reyonkodu → category_map
    """

CATEGORY_MAP = {
    100: "LIKITLER",
    101: "TEMIZLIK",
    102: "PARFÜMERI VE HIJYEN",
    104: "KURU GIDALAR",
    105: "SELF SERVIS",
    109: "PARAPHARMACIE",
    200: "SARKÜTERI",
    201: "BALIK",
    202: "MEYVE VE SEBZE",
    203: "PASTA-EKMEK",
    204: "KASAP",
    206: "LEZZET ARASI",
    207: "L.A MUTFAK",
    300: "TAMIR VE ONARIM",
    301: "EV YAŞAM",
    302: "KÜLTÜR",
    303: "OYUNCAK-EGLENCE",
    304: "BAHÇECILIK",
    305: "OTO",
    306: "TICARI DIGER ÜRÜNLER",
    307: "BEBEK",
    309: "DIGER SATISLAR",
    400: "BÜYÜK BEYAZ ESYALAR",
    401: "KÜÇÜK BEYAZ ESYALAR",
    402: "TELEKOM VE DİJİTAL Ü",
    403: "TELEVİZYON VE AKS.",
    404: "BILGISAYAR",
    405: "ALTIN-OR",
    407: "EK GARANTİ",
    600: "AYAKKABI",
    601: "IC GIYIM&PLAJ GIYIM",
    602: "ÇOCUK",
    603: "KADIN",
    604: "ERKEK",
    605: "EVTEKSTIL",
    801: "İÇ SATINALMA",
    803: "YATIRIM VE İNŞAAT",
    804: "PAZARLAMA",
    809: "LOJİSTİK",
    811: "AVM"
}

def get_demand_trend_forecast(
    client,
    store_ids: list[int] | None = None,
    product_ids: list[int] | None = None,
    period: str = "daily", # daily, weekly, monthly
    table_name: str = "demoVerileri"
) -> dict:
    """
    GET /api/demand/trend-forecast
    Returns actual, forecast and trendline data.
    Aggregates if multiple stores/products or None are provided.
    """
    
    group_by_sql = "toDate(tarih)"
    if period == "weekly":
        group_by_sql = "toStartOfWeek(tarih)"
    elif period == "monthly":
        group_by_sql = "toStartOfMonth(tarih)"
        
    filters = []
    if store_ids:
        filters.append(f"magazakodu IN ({','.join(map(str, store_ids))})")
    if product_ids:
        filters.append(f"urunkodu IN ({','.join(map(str, product_ids))})")
        
    where_sql = " AND ".join(filters) if filters else "1=1"
        
    query = f"""
    SELECT 
        {group_by_sql} AS d,
        sumIf(satismiktari, tarih < today()) AS actual,
        sumIf(roll_mean_14, tarih >= today()) AS forecast,
        avg(roll_mean_60) AS trendline
    FROM {table_name}
    WHERE {where_sql}
    GROUP BY d
    ORDER BY d ASC
    """
    
    try:
        rows = client.query(query).result_rows
    except Exception as e:
        print(f"Error executing trend forecast query: {e}")
        # Return empty data instead of crashing
        return {"data": [], "error": str(e)}
    
    data = []
    for d, actual, forecast, trendline in rows:
        data.append({
            "date": d.isoformat(),
            "actual": int(actual) if actual is not None and d < date.today() else None,
            "forecast": int(forecast) if forecast is not None and d >= date.today() else None,
            "trendline": int(trendline or 0)
        })
        
    return {"data": data}

def get_forecast_errors(
    client,
    store_ids: list[str] | None = None,
    severity_filter: str | None = None,
    table_name: str = "demoVerileri"
) -> dict:
    """
    GET /api/demand/forecast-errors
    Identifies products with high forecast errors.
    """
    
    where_clauses = ["1=1"]
    if store_ids:
        store_list = ", ".join(f"'{s}'" for s in store_ids)
        where_clauses.append(f"toString(magazakodu) IN ({store_list})")
        
    where_sql = " AND ".join(where_clauses)
    
    # Error calculated over last 30 days
    query = f"""
    WITH base AS (
        SELECT 
            urunkodu,
            any(urunismi) AS product_name,
            sum(satismiktari) AS total_actual,
            sum(roll_mean_14) AS total_forecast,
            avg(abs(roll_mean_14 - satismiktari) / nullIf(satismiktari, 0)) * 100 AS mape
        FROM {table_name}
        WHERE {where_sql}
          AND tarih >= today() - 30
          AND tarih < today()
        GROUP BY urunkodu
    )
    SELECT 
        urunkodu,
        product_name,
        mape,
        total_forecast,
        total_actual,
        (total_forecast - total_actual) / nullIf(total_actual, 0) * 100 AS bias
    FROM base
    WHERE mape > 10
    ORDER BY mape DESC
    """
    
    rows = client.query(query).result_rows
    
    products = []
    for urunkodu, name, mape, forecast, actual, bias in rows:
        mape = mape or 0
        accuracy = max(0, 100 - mape)
        
        severity = "normal"
        if mape > 50: severity = "critical"
        elif mape > 30: severity = "high"
        elif mape > 20: severity = "medium"
        
        if severity_filter and severity_filter != "all" and severity != severity_filter:
            continue
            
        products.append({
            "id": str(urunkodu),
            "name": name,
            "error": round(mape, 1),
            "accuracy": round(accuracy, 1),
            "forecast": int(forecast or 0),
            "actual": int(actual or 0),
            "bias": round(bias or 0, 1),
            "severity": severity,
            "action": "İnceleme Bekliyor"
        })
        
    return {"products": products}

def get_growth_products(
    client,
    store_ids,
    type_,              # "high" | "low"
    table_name="demoVerileri",
    growth_threshold=10
):
    where_clauses = ["1=1"]
    if store_ids:
        store_list = ", ".join(f"'{s}'" for s in store_ids)
        where_clauses.append(f"toString(magazakodu) IN ({store_list})")
    
    where_sql = " AND ".join(where_clauses)
    
    query = f"""
    WITH base AS (
        SELECT 
            urunkodu,
            any(urunismi) AS product_name,
            any(reyonkodu) AS reyonkodu,
            sumIf(satismiktari, tarih >= today() - 30) AS current_sales,
            sumIf(satismiktari, tarih < today() - 30 AND tarih >= today() - 60) AS last_month_sales,
            sum(roll_mean_14) AS total_forecast
        FROM {table_name}
        WHERE {where_sql}
          AND tarih >= today() - 60
        GROUP BY urunkodu
    )
    SELECT 
        urunkodu,
        product_name,
        reyonkodu,
        current_sales,
        last_month_sales,
        (current_sales - last_month_sales) / nullIf(last_month_sales, 0) * 100 AS growth_pct,
        total_forecast / 60 AS forecast
    FROM base
    WHERE last_month_sales > 0
    ORDER BY growth_pct {"DESC" if type_ == "high" else "ASC"}
    LIMIT 100
    """
    
    rows = client.query(query).result_rows
    
    products = []
    for urunkodu, name, reyon, current, last, growth, forecast in rows:
        products.append({
            "id": str(urunkodu),
            "name": name,
            "growth": round(growth or 0, 1),
            "type": type_,
            "category": CATEGORY_MAP.get(reyon, "DİĞER"),
            "forecast": int(forecast or 0),
            "actualSales": int(current or 0),
            "lastMonthSales": int(last or 0)
        })
        
    return {"products": products}

def get_inventory_kpis(
    client,
    region_ids=None,
    store_ids=None,
    category_ids=None,
    product_ids=None,
    table_name="demoVerileri"
):
    """
    Inventory KPI calculator (ClickHouse compatible)
    """

    where = ["1=1"]

    if region_ids:
        # Assuming region matches 'cografi_bolge' based on other functions
        regions = ", ".join(f"'{r}'" for r in region_ids)
        where.append(f"cografi_bolge IN ({regions})")

    if store_ids:
        where.append(f"magazakodu IN ({','.join(map(str, store_ids))})")

    if category_ids:
        where.append(f"reyonkodu IN ({','.join(map(str, category_ids))})")

    if product_ids:
        where.append(f"urunkodu IN ({','.join(map(str, product_ids))})")

    where_sql = " AND ".join(where)

    today = date.today()
    last_30 = today - timedelta(days=30)

    query = f"""
    WITH base AS (
        SELECT
            urunkodu,
            magazakodu,
            sum(degerlenmisstok)                         AS stock_value,
            avg(stok)                                    AS avg_stock,
            sumIf(satismiktari, tarih >= toDate('{last_30}')) / 30
                                                         AS daily_sales
        FROM {table_name}
        WHERE {where_sql}
        GROUP BY urunkodu, magazakodu
    )
    SELECT
        sum(stock_value)                                                       AS totalStockValue,
        countDistinct(urunkodu)                                                AS totalInventoryItems,

        if(
            sum(daily_sales) > 0,
            toInt32(sum(avg_stock) / sum(daily_sales)),
            0
        )                                                                       AS stockCoverageDays,

        countIf(avg_stock > daily_sales * 45)                                  AS excessInventoryItems,
        sumIf(stock_value, avg_stock > daily_sales * 45)                       AS excessInventoryValue,

        countIf(avg_stock <= daily_sales * 7 AND daily_sales > 0)              AS stockOutRiskItems,
        sumIf(stock_value, avg_stock <= daily_sales * 7 AND daily_sales > 0)   AS stockOutRiskValue,

        countIf(daily_sales = 0)                                               AS neverSoldItems,
        sumIf(stock_value, daily_sales = 0)                                    AS neverSoldValue,

        round(
            countIf(avg_stock > daily_sales * 45) 
            / nullIf(countDistinct(urunkodu), 0) * 100,
            1
        )                                                                       AS overstockPercentage,

        countIf(avg_stock <= daily_sales * 14 AND daily_sales > 0)             AS reorderNeededItems
    FROM base
    """

    (
        totalStockValue,
        totalInventoryItems,
        stockCoverageDays,
        excessInventoryItems,
        excessInventoryValue,
        stockOutRiskItems,
        stockOutRiskValue,
        neverSoldItems,
        neverSoldValue,
        overstockPercentage,
        reorderNeededItems
    ) = client.query(query).result_set[0]

    return {
        "totalStockValue": int(totalStockValue or 0),
        "totalInventoryItems": int(totalInventoryItems or 0),
        "stockCoverageDays": int(stockCoverageDays or 0),
        "excessInventoryItems": int(excessInventoryItems or 0),
        "excessInventoryValue": int(excessInventoryValue or 0),
        "stockOutRiskItems": int(stockOutRiskItems or 0),
        "stockOutRiskValue": int(stockOutRiskValue or 0),
        "neverSoldItems": int(neverSoldItems or 0),
        "neverSoldValue": int(neverSoldValue or 0),
        "overstockPercentage": float(overstockPercentage or 0),
        "reorderNeededItems": int(reorderNeededItems or 0)
    }    


def get_similar_campaigns(
    client,
    table_name: str = "demoVerileri",
    promotion_type: str | None = None,
    product_ids: list[str] | None = None,
    limit: int = 5
) -> dict:
    """
    GET /api/forecast/similar-campaigns
    """

    where_clauses = [
        "aktifPromosyonKodu > 0",
        "aktifPromosyonAdi != 'Tayin edilmedi'"
    ]

    if promotion_type:
        where_clauses.append(
            f"""
            multiIf(
                KATALOG=1, 'KATALOG',
                LEAFLET=1, 'LEAFLET',
                `GAZETE ILANI`=1, 'GAZETE ILANI',
                `Hybris % Kampanya`=1, 'INTERNET_INDIRIMI',
                HYBR=1, 'HYBR',
                'DIGER'
            ) = '{promotion_type}'
            """
        )

    if product_ids:
        where_clauses.append(
            "urunkodu IN (" + ",".join([f"'{p}'" for p in product_ids]) + ")"
        )

    where_sql = "WHERE " + " AND ".join(where_clauses)

    query = f"""
    WITH campaign_stats AS (
        SELECT
            aktifPromosyonKodu                         AS campaign_id,
            any(aktifPromosyonAdi)                     AS name,
            min(tarih)                                 AS start_date,
            max(tarih)                                 AS end_date,

            multiIf(
                max(KATALOG)=1, 'KATALOG',
                max(LEAFLET)=1, 'LEAFLET',
                max(`GAZETE ILANI`)=1, 'GAZETE ILANI',
                max(`Hybris % Kampanya`)=1, 'INTERNET_INDIRIMI',
                max(HYBR)=1, 'HYBR',
                'DIGER'
            ) AS type,

            round(
                100 * (
                    sum(satismiktari * satisFiyati)
                    - sum(roll_mean_7 * satisFiyati)
                )
                / nullIf(sum(roll_mean_7 * satisFiyati), 0),
            0) AS lift,

            countIf(stok_out = 1)                      AS stockOutDays,

            round(sum(roll_mean_7 * satisFiyati), 0)   AS targetRevenue,
            round(sum(satismiktari * satisFiyati), 0)  AS actualRevenue,

            dateDiff('day', min(tarih), max(tarih)) + 1 AS actualStockDays,

            round(
                100 * sum(satismiktari)
                / nullIf(sum(stok + satismiktari), 1),
            0) AS sellThrough,

            round(
                sum(
                    (roll_mean_7 - satismiktari)
                    * satisFiyati
                ),
            0) AS markdownCost

        FROM {table_name}
        {where_sql}
        GROUP BY aktifPromosyonKodu
    )

    SELECT
        concat('SC-', toString(campaign_id))            AS id,
        name,
        formatDateTime(start_date, '%b %Y')             AS date,
        type,
        lift,

        stockOutDays,
        targetRevenue,
        actualRevenue,
        actualStockDays,
        actualStockDays                                AS plannedStockDays,
        sellThrough,
        markdownCost,

        greatest(
            0,
            100
            - abs(lift - avg(lift) OVER ())
            - abs(actualStockDays - avg(actualStockDays) OVER ()) * 2
        ) AS similarityScore

    FROM campaign_stats
    ORDER BY similarityScore DESC
    LIMIT {limit}
    """

    df = client.query_df(query)

    return {
        "campaigns": df.to_dict(orient="records")
    }

from typing import List, Optional


def get_forecast_calendar(
    client,
    table_name: str = "demoVerileri",
    store_ids: Optional[List[str]] = None,
    month: int = None,
    year: int = None,
    include_future: bool = False,
    future_count: int = 10,
) -> dict:
    """
    GET /api/forecast/calendar
    """

    if month is None or year is None:
        raise ValueError("month ve year zorunludur")

    where_clauses = ["aktifPromosyonKodu IS NOT NULL"]

    # 🔴 FIX: magazakodu UInt → toString + lower
    if store_ids:
        store_list = ", ".join(f"'{s.lower()}'" for s in store_ids)
        where_clauses.append(
            f"lower(toString(magazakodu)) IN ({store_list})"
        )

    where_clauses.append(f"toYear(tarih) = {year}")
    where_clauses.append(f"toMonth(tarih) = {month}")

    where_sql = " AND ".join(where_clauses)

    query = f"""
        SELECT
            toDate(tarih) AS event_date,
            aktifPromosyonKodu AS promo_id,
            any(aktifPromosyonAdi) AS promo_name,
            multiIf(
                KATALOG = 1, 'Katalog',
                LEAFLET = 1, 'Leaflet',
                `GAZETE ILANI` = 1, 'Gazete İlanı',
                `Hybris % Kampanya` = 1, 'Hybris % Kampanya',
                HYBR = 1, 'Hybrid',
                'Diğer'
            ) AS promo_type,
            round(any(indirimYuzdesi), 0) AS discount
        FROM {table_name}
        WHERE {where_sql}
        GROUP BY
            event_date,
            promo_id,
            promo_type
        ORDER BY event_date ASC
    """

    rows = client.query(query).result_rows

    calendar_map = {}

    for event_date, promo_id, promo_name, promo_type, discount in rows:
        date_key = event_date.isoformat()

        calendar_map.setdefault(date_key, []).append({
            "id": str(promo_id),
            "name": promo_name,
            "type": promo_type,
            "discount": int(discount) if discount is not None else None
        })

    if include_future:
        hist_where_clauses = ["aktifPromosyonKodu IS NOT NULL", "tarih >= today() - 365"]

        if store_ids:
            store_list = ", ".join(f"'{s.lower()}'" for s in store_ids)
            hist_where_clauses.append(f"lower(toString(magazakodu)) IN ({store_list})")

        hist_where_sql = " AND ".join(hist_where_clauses)

        history_query = f"""
            SELECT
                any(aktifPromosyonAdi) AS promo_name,
                multiIf(
                    KATALOG = 1, 'Katalog',
                    LEAFLET = 1, 'Leaflet',
                    `GAZETE ILANI` = 1, 'Gazete İlanı',
                    `Hybris % Kampanya` = 1, 'Hybris % Kampanya',
                    HYBR = 1, 'Hybrid',
                    'Diğer'
                ) AS promo_type,
                round(avg(indirimYuzdesi), 0) AS avg_discount,
                count() AS freq
            FROM {table_name}
            WHERE {hist_where_sql}
            GROUP BY promo_type, aktifPromosyonAdi
            ORDER BY freq DESC
            LIMIT 12
        """

        history_rows = client.query(history_query).result_rows

        promo_pool = [
            {
                "name": r[0] or "Tayin edilmedi",
                "type": r[1] or "Diğer",
                "discount": int(r[2]) if r[2] is not None else 10,
            }
            for r in history_rows
        ]

        if not promo_pool:
            promo_pool = [
                {"name": "Mağ.İçi Akt-FMCG", "type": "Diğer", "discount": 12},
                {"name": "HYBR", "type": "Hybrid", "discount": 9},
                {"name": "GAZETE ILANI", "type": "Gazete İlanı", "discount": 15},
                {"name": "LEAFLET", "type": "Leaflet", "discount": 10},
            ]

        today = date.today()
        generation_count = max(1, min(int(future_count or 10), 60))

        for i in range(generation_count):
            template = random.choice(promo_pool)
            start_offset = random.randint(1, 30)
            duration = random.randint(2, 8)
            start_day = today + timedelta(days=start_offset)

            discount_base = template["discount"] if template["discount"] is not None else 10
            discount_value = int(max(-10, min(70, discount_base + random.randint(-4, 4))))

            for day_offset in range(duration):
                event_day = start_day + timedelta(days=day_offset)
                date_key = event_day.isoformat()
                calendar_map.setdefault(date_key, []).append(
                    {
                        "id": f"FUT-{i + 1}",
                        "name": template["name"],
                        "type": template["type"],
                        "discount": discount_value,
                    }
                )

    return {
        "events": [
            {"date": d, "promotions": promos}
            for d, promos in sorted(calendar_map.items(), key=lambda x: x[0])
        ]
    }

from typing import List, Optional


def get_inventory_items(
    client,
    table_name: str = "demoVerileri",
    region_ids: Optional[List[str]] = None,
    store_ids: Optional[List[str]] = None,
    category_ids: Optional[List[str]] = None,
    product_ids: Optional[List[str]] = None,
    status: Optional[str] = None,   # In Stock | Low Stock | Out of Stock | Overstock
    page: int = 1,
    limit: int = 50,
    sort_by: str = "stockValue",
    sort_order: str = "desc",
) -> dict:
    """
    GET /api/inventory/items
    """

    offset = (page - 1) * limit
    sort_order = "ASC" if sort_order.lower() == "asc" else "DESC"

    where_clauses = ["1 = 1"]

    if region_ids:
        regions = ", ".join(f"'{r}'" for r in region_ids)
        where_clauses.append(f"cografi_bolge IN ({regions})")

    if store_ids:
        stores = ", ".join(f"'{s}'" for s in store_ids)
        where_clauses.append(f"toString(magazakodu) IN ({stores})")

    if category_ids:
        cats = ", ".join(f"'{c}'" for c in category_ids)
        where_clauses.append(f"toString(sektorkodu) IN ({cats})")

    if product_ids:
        prods = ", ".join(f"'{p}'" for p in product_ids)
        where_clauses.append(f"toString(urunkodu) IN ({prods})")

    # STATUS FILTER
    if status == "Out of Stock":
        where_clauses.append("stok = 0")
    elif status == "Low Stock":
        where_clauses.append("stok < roll_mean_7 * 3 AND stok > 0")
    elif status == "Overstock":
        where_clauses.append("stok > roll_mean_7 * 30")
    elif status == "In Stock":
        where_clauses.append("stok BETWEEN roll_mean_7 * 3 AND roll_mean_7 * 30")

    where_sql = " AND ".join(where_clauses)

    query = f"""
        SELECT
            toString(urunkodu)                                       AS id,
            toString(urunkodu)                                       AS sku,
            any(urunismi)                                            AS productName,
            toString(sektorkodu)                                     AS category,
            concat(
                toString(magazakodu), '_',
                toString(sektorkodu), '_',
                toString(urunkodu)
            )                                                        AS productKey,

            sum(stok)                                                AS stockLevel,
            round(avg(roll_mean_7) * 3, 0)                           AS minStockLevel,
            round(avg(roll_mean_7) * 30, 0)                          AS maxStockLevel,
            round(avg(roll_mean_7) * 7, 0)                           AS reorderPoint,
            round(avg(satismiktari), 0)                              AS forecastedDemand,

            sum(degerlenmisstok)                                     AS stockValue,
            round(sum(stok) / nullIf(avg(satismiktari), 0), 1)       AS daysOfCoverage,

            multiIf(
                sum(stok) = 0, 'Out of Stock',
                sum(stok) < avg(roll_mean_7) * 3, 'Low Stock',
                sum(stok) > avg(roll_mean_7) * 30, 'Overstock',
                'In Stock'
            )                                                        AS status,

            round(
                sum(satismiktari) / nullIf(avg(stok), 0),
                2
            )                                                        AS turnoverRate,

            maxIf(tarih, stok > 0)                                   AS lastRestockDate,
            5                                                        AS leadTimeDays,
            0                                                        AS quantityOnOrder,
            sumIf(satismiktari, tarih = today())                     AS todaysSales,
            round(avg(satisFiyati), 2)                               AS price
        FROM {table_name}
        WHERE {where_sql}
        GROUP BY urunkodu, sektorkodu, magazakodu
        ORDER BY {sort_by} {sort_order}
        LIMIT {limit} OFFSET {offset}
    """

    items = client.query(query).result_rows

    count_query = f"""
        SELECT count(DISTINCT urunkodu)
        FROM {table_name}
        WHERE {where_sql}
    """
    total = client.query(count_query).result_rows[0][0]
    total_pages = (total + limit - 1) // limit

    return {
        "items": [
            {
                "id": r[0],
                "sku": r[1],
                "productName": r[2],
                "category": r[3],
                "productKey": r[4],
                "stockLevel": int(r[5] or 0),
                "minStockLevel": int(r[6] or 0),
                "maxStockLevel": int(r[7] or 0),
                "reorderPoint": int(r[8] or 0),
                "forecastedDemand": int(r[9] or 0),
                "stockValue": int(r[10] or 0),
                "daysOfCoverage": float(r[11] or 0),
                "status": r[12],
                "turnoverRate": float(r[13] or 0),
                "lastRestockDate": r[14].isoformat() if r[14] else None,
                "leadTimeDays": r[15],
                "quantityOnOrder": r[16],
                "todaysSales": int(r[17] or 0),
                "price": float(r[18] or 0),
            }
            for r in items
        ],
        "pagination": {
            "total": int(total),
            "page": page,
            "limit": limit,
            "totalPages": int(total_pages),
        },
    }


from typing import List, Optional


def get_inventory_stock_trends(
    client,
    table_name: str = "demoVerileri",
    region_ids: Optional[List[str]] = None,
    store_ids: Optional[List[str]] = None,
    category_ids: Optional[List[str]] = None,
    product_ids: Optional[List[str]] = None,
    days: int = 30,
) -> dict:
    """
    GET /api/inventory/stock-trends
    """

    where_clauses = [
        f"tarih >= today() - {int(days)}"
    ]

    if region_ids:
        regions = ", ".join(f"'{r}'" for r in region_ids)
        where_clauses.append(f"cografi_bolge IN ({regions})")

    if store_ids:
        stores = ", ".join(f"'{s}'" for s in store_ids)
        where_clauses.append(f"toString(magazakodu) IN ({stores})")

    if category_ids:
        cats = ", ".join(f"'{c}'" for c in category_ids)
        where_clauses.append(f"toString(sektorkodu) IN ({cats})")

    if product_ids:
        prods = ", ".join(f"'{p}'" for p in product_ids)
        where_clauses.append(f"toString(urunkodu) IN ({prods})")

    where_sql = " AND ".join(where_clauses)

    query = f"""
        SELECT
            toDate(tarih)                              AS date,
            sum(stok)                                  AS actualStock,
            round(sum(roll_mean_7), 0)                 AS forecastDemand,
            round(sum(roll_mean_7) * 3, 0)             AS safetyStock
        FROM {table_name}
        WHERE {where_sql}
        GROUP BY date
        ORDER BY date ASC
    """

    rows = client.query(query).result_rows

    return {
        "trends": [
            {
                "date": r[0].isoformat(),
                "actualStock": int(r[1] or 0),
                "forecastDemand": int(r[2] or 0),
                "safetyStock": int(r[3] or 0),
            }
            for r in rows
        ]
    }


from typing import List, Optional


def get_inventory_store_performance(
    client,
    table_name: str = "demoVerileri",
    region_ids: Optional[List[str]] = None,
    store_ids: Optional[List[str]] = None,
    category_ids: Optional[List[str]] = None,
    product_ids: Optional[List[str]] = None,
) -> dict:
    """
    GET /api/inventory/store-performance
    """

    where_clauses = ["1 = 1"]

    if region_ids:
        regions = ", ".join(f"'{r}'" for r in region_ids)
        where_clauses.append(f"cografi_bolge IN ({regions})")

    if store_ids:
        stores = ", ".join(f"'{s}'" for s in store_ids)
        where_clauses.append(f"toString(magazakodu) IN ({stores})")

    if category_ids:
        cats = ", ".join(f"'{c}'" for c in category_ids)
        where_clauses.append(f"toString(sektorkodu) IN ({cats})")

    if product_ids:
        prods = ", ".join(f"'{p}'" for p in product_ids)
        where_clauses.append(f"toString(urunkodu) IN ({prods})")

    where_sql = " AND ".join(where_clauses)

    query = f"""
        SELECT
            toString(magazakodu)                                            AS storeId,
            concat(bulundugusehirkodu, ' - ', ilce)                          AS storeName,

            sum(stok)                                                       AS stockLevel,

            round(
                100 * sum(satismiktari) /
                nullIf(sum(satismiktari) + sum(stok), 0),
                2
            )                                                               AS sellThroughRate,

            round(
                sum(satismiktari) / nullIf(countDistinct(toDate(tarih)), 0),
                0
            )                                                               AS dailySales,

            round(
                sum(stok) /
                nullIf(
                    sum(satismiktari) / nullIf(countDistinct(toDate(tarih)), 0),
                    0
                ),
                0
            )                                                               AS daysOfInventory,

            round(
                (
                    0.4 * (
                        100 * sum(satismiktari) /
                        nullIf(sum(satismiktari) + sum(stok), 0)
                    )
                    +
                    0.3 * (
                        100 - abs(
                            (
                                sum(stok) /
                                nullIf(
                                    sum(satismiktari) /
                                    nullIf(countDistinct(toDate(tarih)), 0),
                                    0
                                )
                            ) - 30
                        )
                    )
                    +
                    0.3 * (
                        sum(satismiktari) /
                        nullIf(countDistinct(toDate(tarih)), 0)
                    )
                ),
                2
            )                                                               AS storeEfficiency

        FROM {table_name}
        WHERE {where_sql}
        GROUP BY magazakodu, bulundugusehirkodu, ilce
        ORDER BY storeEfficiency DESC
    """

    rows = client.query(query).result_rows

    return {
        "stores": [
            {
                "storeId": r[0],
                "storeName": r[1],
                "stockLevel": int(r[2] or 0),
                "sellThroughRate": float(r[3] or 0),
                "dailySales": int(r[4] or 0),
                "daysOfInventory": int(r[5] or 0),
                "storeEfficiency": float(r[6] or 0),
            }
            for r in rows
        ]
    }

# =============================================================================
# NEW FUNCTIONS FROM V5
# =============================================================================

def get_forecast_promotion_history(
    client,
    product_ids: List[int],
    store_ids: List[int] | None = None,
    table_name: str = "demoVerileri"
) -> dict:

    if not product_ids:
        return {"history": []}

    where_clauses = [f"urunkodu IN ({', '.join(map(str, product_ids))})"]
    if store_ids:
        where_clauses.append(f"magazakodu IN ({', '.join(map(str, store_ids))})")
    where_sql = " AND ".join(where_clauses)

    query = f"""
    WITH base AS (
        SELECT
            urunkodu,
            magazakodu,
            tarih,
            aktifPromosyonAdi AS promo_name,
            promosyonVar,
            satistutarikdvsiz,
            satismiktari,
            degerlenmisstok,
            stok,
            lag(promosyonVar, 1, 0) OVER (
                PARTITION BY urunkodu, magazakodu
                ORDER BY tarih
            ) AS prev_promo
        FROM {table_name}
        WHERE promosyonVar IN (0,1)
    ),

    promo_blocks AS (
        SELECT
            *,
            sum(promosyonVar = 1 AND prev_promo = 0) OVER (
                PARTITION BY urunkodu, magazakodu
                ORDER BY tarih
            ) AS promo_block_id
        FROM base
        WHERE promosyonVar = 1
    )

    SELECT
        urunkodu,
        magazakodu,
        anyLast(promo_name) AS promo_name,
        min(tarih) AS start_date,
        max(tarih) AS end_date,
        sum(satistutarikdvsiz) AS promo_revenue,
        sum(satismiktari) AS promo_units,
        sum(
            satismiktari *
            if(stok > 0, degerlenmisstok / stok, 0)
        ) AS total_cost,
        countIf(stok <= 0) AS stockout_days
    FROM promo_blocks
    WHERE {where_sql}
    GROUP BY urunkodu, magazakodu, promo_block_id
    ORDER BY start_date DESC
    """

    rows = client.query(query).result_set
    today = date.today()
    history = []

    for (
        urunkodu,
        magazakodu,
        promo_name,
        start_date,
        end_date,
        promo_revenue,
        promo_units,
        total_cost,
        stockout_days
    ) in rows:

        start_d = start_date.date()
        end_d = end_date.date()
        promo_days = (end_d - start_d).days + 1

        # Net profit
        net_profit = promo_revenue - total_cost
        margin_pct = (net_profit / promo_revenue * 100) if promo_revenue else 0

        # Stock status
        stock_status = "OOS" if stockout_days > 0 else "OK"

        # Lost sales value (basit tahmini)
        lost_sales_val = int((promo_revenue / promo_days) * stockout_days)

        # Uplift hesaplama
        # Basit mantık: promo süresi kadar önceki günlerin toplamı ile karşılaştır
        pre_start = start_d - timedelta(days=promo_days)
        pre_end = start_d - timedelta(days=1)

        pre_query = f"""
        SELECT
            sum(satistutarikdvsiz) AS pre_revenue
        FROM {table_name}
        WHERE urunkodu = {urunkodu}
          AND magazakodu = {magazakodu}
          AND tarih BETWEEN '{pre_start}' AND '{pre_end}'
        """
        pre_rev_row = client.query(pre_query).first_row
        pre_revenue = pre_rev_row[0] if pre_rev_row and pre_rev_row[0] else 0

        uplift_val = promo_revenue - pre_revenue
        uplift_pct = round((uplift_val / pre_revenue * 100) if pre_revenue else 0, 1)

        history.append({
            "date": f"{start_d:%d-%m-%Y} – {end_d:%d-%m-%Y}",
            "name": promo_name,
            "type": "PROMOTION",
            "revenue": int(promo_revenue),
            "profit": int(net_profit),
            "marginPct": round(margin_pct, 1),
            "promoUnits": int(promo_units),
            "hadStockout": stockout_days > 0,
            "stockoutDays": int(stockout_days),
            "status": "Tamamlandi" if end_d < today else "Aktif",
            "uplift": uplift_pct,
            "upliftVal": int(uplift_val),
            "stock": stock_status,
            "lostSalesVal": lost_sales_val,
            "forecast": random.randint(80, 100)  # Tahmini %80-100 arası
        })

    return {"history": history}


def get_inventory_alerts(
    client,
    region_ids: List[str] | None = None,
    store_ids: List[int] | None = None,
    search: str | None = None,
    limit: int = 100,
    table_name: str = "demoVerileri"
) -> dict:

    where_clauses = ["1=1"]

    if store_ids:
        where_clauses.append(f"magazakodu IN ({','.join(str(s) for s in store_ids)})")

    if region_ids:
        region_list = ",".join([f"'{r}'" for r in region_ids])
        where_clauses.append(f"cografi_bolge IN ({region_list})")


    if search:
        where_clauses.append(f"lower(urunismi) LIKE '%{search.lower()}%'")

    where_sql = " AND ".join(where_clauses)

    # ClickHouse sorgusu: stok seviyelerine göre uyarı tespiti
    query = f"""
    WITH base AS (
        SELECT
            urunkodu,
            any(urunismi) AS product_name,
            magazakodu,
            any(bulundugusehir) AS city,
            sum(stok) AS current_stock,
            avg(roll_mean_21) AS forecasted_demand
        FROM {table_name}
        WHERE {where_sql}
        GROUP BY urunkodu, magazakodu
    )

    SELECT
        urunkodu,
        product_name,
        magazakodu,
        city,
        current_stock,
        forecasted_demand,
        -- stok uyarı tipleri
        if(current_stock <= 0, 'stockout',
           if(current_stock > forecasted_demand * 1.5, 'overstock',
              if(current_stock <= forecasted_demand * 0.5, 'reorder',
                 'ok'))) AS alert_type,
        -- örnek eşik değerler
        if(current_stock <= 0, 0, forecasted_demand * 0.5) AS threshold,
        forecasted_demand AS forecasted_demand_metric,
        'review' AS action_type
    FROM base
    WHERE alert_type != 'ok'
    ORDER BY alert_type DESC
    LIMIT {int(limit)}
    """

    rows = client.query(query).result_set

    alerts = []
    for urunkodu, product_name, magazakodu, city, current_stock, forecasted_demand, alert_type, threshold, forecast_metric, action_type in rows:
        alerts.append({
            "id": f"alert-INV-{urunkodu}-{magazakodu}",
            "type": alert_type,
            "sku": str(urunkodu),
            "productName": product_name,
            "storeName": f"{city} - {magazakodu}",
            "message": f"Stok durumu uyarısı: {alert_type}",
            "date": date.today().strftime("%b %d, %H:%M"),
            "severity": "high" if alert_type == "stockout" else "medium" if alert_type == "reorder" else "low",
            "metrics": {
                "currentStock": current_stock,
                "threshold": threshold,
                "forecastedDemand": forecast_metric,
                "transferSourceStore": None,
                "transferQuantity": 0
            },
            "recommendation": "Stok durumu kontrol edilmeli.",
            "actionType": action_type
        })

    return {"alerts": alerts}
