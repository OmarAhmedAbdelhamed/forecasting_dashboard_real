import clickhouse_connect
import pandas as pd
import numpy as np
from datetime import date, timedelta
import math
import random
import hashlib
import re

# Legacy note:
# This module was originally written against the older ClickHouse layout
# that exposed fields such as `reyonkodu`, `urunismi`, `bulundugusehir`,
# `stok`, and precomputed rolling means. The current dataset keeps the same
# business concepts but uses the gokkusagi/parquet schema instead.
# New canonical mappings:
# - sektor code  -> `hier2_kod`
# - sektor label -> `hier2_ad`
# - product name -> `urunAdi`
# - city         -> `il`
# - stock        -> `acilis_stok`
# - year         -> derived from `tarih`
# - roll means   -> calculated in backend from `satismiktari`
# The active backend logic now computes these compatibility fields in
# `API/main.py` so the existing REST routes can keep their contracts.

SEKTOR_CODE_COLUMN = "hier2_kod"
SEKTOR_LABEL_COLUMN = "hier2_ad"


def _escape_sql_string(value: object) -> str:
    return str(value).replace("'", "''")


def _quote_sql(values: list[object] | None, *, lower: bool = False) -> str:
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
        quoted.append(f"'{_escape_sql_string(token)}'")
    return ", ".join(quoted)


def _compat_table(table_name: str) -> str:
    return f"""
    (
        SELECT
            toDate(tarih) AS tarih,
            magazakodu,
            magazaAdi,
            il,
            il AS bulundugusehir,
            ilce,
            il AS cografi_bolge,
            urunkodu,
            urunAdi,
            urunAdi AS urunismi,
            markaAdi,
            kategoriKodu,
            hier1_kod,
            hier1_ad,
            hier2_kod,
            hier2_kod AS reyonkodu,
            hier2_ad,
            hier3_kod,
            hier3_ad,
            satismiktari,
            satistutarikdvsiz,
            indirimYuzdesi,
            indirimVar,
            if(
                toUInt8(indirimVar) = 1 OR toString(aktifPromosyonKodu) NOT IN ('', '0'),
                1,
                0
            ) AS promosyonVar,
            ozel_gun_kodu,
            tufe,
            temp,
            icon,
            acilis_stok,
            acilis_stok AS stok,
            maliyetFiyati,
            satisFiyati,
            toString(aktifPromosyonKodu) AS aktifPromosyonKodu,
            multiIf(
                toString(aktifPromosyonKodu) IN ('', '0'), 'Promosyon Yok',
                abs(toFloat64(indirimYuzdesi)) > 0,
                    concat('Promo ', toString(aktifPromosyonKodu), ' - %', toString(toInt32(round(abs(toFloat64(indirimYuzdesi)))))),
                concat('Promo ', toString(aktifPromosyonKodu))
            ) AS aktifPromosyonAdi,
            multiIf(
                toString(aktifPromosyonKodu) IN ('', '0'), 'Promosyon Yok',
                abs(toFloat64(indirimYuzdesi)) >= 25, 'Yuksek Indirim',
                abs(toFloat64(indirimYuzdesi)) >= 10, 'Indirim Kampanyasi',
                'Kod Bazli Kampanya'
            ) AS promo_type,
            stok_out,
            avmcadde,
            sezon,
            stok_out_gun_sayisi,
            degerlenmisstok,
            cluster,
            toYear(tarih) AS yil,
            avg(toFloat64(satismiktari)) OVER (
                PARTITION BY magazakodu, urunkodu
                ORDER BY toDate(tarih)
                ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
            ) AS roll_mean_7,
            avg(toFloat64(satismiktari)) OVER (
                PARTITION BY magazakodu, urunkodu
                ORDER BY toDate(tarih)
                ROWS BETWEEN 13 PRECEDING AND CURRENT ROW
            ) AS roll_mean_14,
            avg(toFloat64(satismiktari)) OVER (
                PARTITION BY magazakodu, urunkodu
                ORDER BY toDate(tarih)
                ROWS BETWEEN 20 PRECEDING AND CURRENT ROW
            ) AS roll_mean_21
        FROM {table_name}
    )
    """


def _anchor_date_expr(raw_table_name: str) -> str:
    return f"(SELECT max(toDate(tarih)) FROM {raw_table_name})"


def _normalize_filter_ids(values: list[str] | None) -> list[str]:
    """
    Normalize filter IDs to numeric tokens for SQL IN clauses.
    Supports composite values such as:
      - store_category => "1054_101" -> "101"
      - store_category_product => "1054_101_30389579" -> "30389579"
    """
    if not values:
        return []

    normalized: list[str] = []
    for raw_value in values:
        if raw_value is None:
            continue

        token = str(raw_value).strip()
        if not token:
            continue

        if "_" in token:
            token = token.split("_")[-1]

        token = re.sub(r"[^0-9A-Za-z_-]", "", token)
        if token:
            normalized.append(token)

    # Keep order, drop duplicates
    return list(dict.fromkeys(normalized))


def _get_max_data_date(client, raw_table_name: str) -> date:
    """
    Resolve the latest available data date from source table.
    We intentionally avoid falling back to `date.today()` to prevent
    generating misleading future windows when data is stale.
    """
    row = client.query(f"SELECT max(toDate(tarih)) FROM {raw_table_name}").first_row
    anchor_day = row[0] if row and row[0] else None
    if anchor_day is None:
        raise ValueError(f"Kaynak tabloda tarih bulunamadi: {raw_table_name}")
    return anchor_day


def _estimate_future_forecast_sum(
    client,
    table_name: str,
    where_sql: str,
    future_start: date,
    horizon_days: int,
    history_days: int = 56,
) -> float:
    """
    Estimate future forecast total for a horizon.
    - Uses existing future daily forecast rows when available.
    - Fills missing days using weekday average from recent history.
    """
    safe_horizon = max(1, int(horizon_days))
    future_end = future_start + timedelta(days=safe_horizon - 1)

    future_query = f"""
    SELECT
        toDate(tarih) AS d,
        sum(greatest(toFloat64(roll_mean_14), 0)) AS forecast_day
    FROM {table_name}
    WHERE {where_sql}
      AND toDate(tarih) >= toDate('{future_start.isoformat()}')
      AND toDate(tarih) <= toDate('{future_end.isoformat()}')
    GROUP BY d
    """
    future_rows = client.query(future_query).result_rows
    future_map: dict[date, float] = {
        d: max(0.0, float(forecast_day or 0)) for d, forecast_day in future_rows
    }

    history_start = future_start - timedelta(days=max(7, int(history_days)))
    history_query = f"""
    WITH daily AS (
        SELECT
            toDate(tarih) AS d,
            sum(greatest(toFloat64(roll_mean_14), 0)) AS forecast_day
        FROM {table_name}
        WHERE {where_sql}
          AND toDate(tarih) >= toDate('{history_start.isoformat()}')
          AND toDate(tarih) < toDate('{future_start.isoformat()}')
        GROUP BY d
    )
    SELECT
        toDayOfWeek(d) AS dow,
        avg(forecast_day) AS avg_forecast
    FROM daily
    GROUP BY dow
    """
    weekday_rows = client.query(history_query).result_rows
    weekday_avg: dict[int, float] = {
        int(dow): max(0.0, float(avg_forecast or 0)) for dow, avg_forecast in weekday_rows
    }

    global_avg_query = f"""
    SELECT avg(forecast_day)
    FROM (
        SELECT
            toDate(tarih) AS d,
            sum(greatest(toFloat64(roll_mean_14), 0)) AS forecast_day
        FROM {table_name}
        WHERE {where_sql}
          AND toDate(tarih) >= toDate('{history_start.isoformat()}')
          AND toDate(tarih) < toDate('{future_start.isoformat()}')
        GROUP BY d
    )
    """
    global_avg_row = client.query(global_avg_query).first_row
    global_avg = (
        max(0.0, float(global_avg_row[0] or 0))
        if global_avg_row is not None
        else 0.0
    )

    forecast_sum = 0.0
    for i in range(safe_horizon):
        current_day = future_start + timedelta(days=i)
        current_val = future_map.get(current_day)
        if current_val is not None and current_val > 0:
            forecast_sum += current_val
            continue
        # ClickHouse toDayOfWeek: Monday=1 ... Sunday=7
        dow = current_day.weekday() + 1
        fallback = weekday_avg.get(dow, global_avg)
        forecast_sum += max(0.0, float(fallback or 0))

    return forecast_sum



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
    raw_table_name = table_name
    table_name = _compat_table(table_name)
    anchor_date = _anchor_date_expr(raw_table_name)

    # ----- kategori kodları map -----
    

    # ----- clickhouse sorgu -----
    table_name = _compat_table(table_name)
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
    WHERE tarih = {anchor_date}
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
        category_name = str(category_code)

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

    table_name = _compat_table(table_name)
    where_clause = ""
    if region_ids:
        region_list = _quote_sql(region_ids, lower=True)
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
    table_name = _compat_table(table_name)
    where_clauses = ["1=1"]

    if store_ids:
        store_list = _quote_sql(store_ids)
        where_clauses.append(f"toString(magazakodu) IN ({store_list})")

    if region_ids:
        region_list = _quote_sql(region_ids, lower=True)
        where_clauses.append(f"lower(cografi_bolge) IN ({region_list})")

    where_sql = ""
    if where_clauses:
        where_sql = "WHERE " + " AND ".join(where_clauses)

    query = f"""
    SELECT
        concat(
            toString(magazakodu),
            '_',
            toString(reyonkodu)
        )                               AS value,
        reyonkodu                        AS category_code,
        any(hier2_ad)                    AS category_label,
        toString(magazakodu)              AS storeValue
    FROM {table_name}
    {where_sql}
    GROUP BY value, category_code, storeValue
    ORDER BY category_label, category_code
    """

    df = client.query_df(query)
    df["label"] = df["category_label"].fillna(df["category_code"]).astype(str)

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
      - categoryIds (store_reyonkodu or reyonkodu)
    """

    table_name = _compat_table(table_name)
    where_clauses = ["1=1"]

    if region_ids:
        region_list = _quote_sql(region_ids, lower=True)
        where_clauses.append(f"lower(cografi_bolge) IN ({region_list})")

    if store_ids:
        store_list = _quote_sql(store_ids)
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
                        f"(toString(magazakodu) = '{store_val}' AND toString(reyonkodu) = '{category_val}')"
                    )
            else:
                simple_ids.append(f"'{cid}'")

        conditions = []
        if composite_filters:
            conditions.append("(" + " OR ".join(composite_filters) + ")")
        
        if simple_ids:
            conditions.append(f"toString(reyonkodu) IN ({', '.join(simple_ids)})")
            
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
    Returns flat sektor list.
    Independent from region / store hierarchy.
    """

    # ----- kategori kodları map -----

    query = f"""
    SELECT
        reyonkodu AS category_code,
        any(hier2_ad) AS category_label
    FROM {table_name}
    WHERE reyonkodu IS NOT NULL
    GROUP BY category_code
    ORDER BY category_label, category_code
    """

    df = client.query_df(query)

    # ----- category_code -> category_name -----
    df["value"] = df["category_code"].astype(str)
    df["label"] = df["category_label"].fillna(df["category_code"]).astype(str)

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
    raw_table_name = table_name
    table_name = _compat_table(table_name)
    anchor_day = _get_max_data_date(client, raw_table_name)
    anchor_date = _anchor_date_expr(raw_table_name)
    start_of_year = date(anchor_day.year, 1, 1).isoformat()

    common_where = ["1=1"]
    if region_ids:
        region_list = _quote_sql(region_ids, lower=True)
        common_where.append(f"lower(cografi_bolge) IN ({region_list})")
    if store_ids:
        store_list = _quote_sql(store_ids)
        common_where.append(f"toString(magazakodu) IN ({store_list})")
    if category_ids:
        category_list = _quote_sql(category_ids)
        common_where.append(f"toString(reyonkodu) IN ({category_list})")

    where_sql = " AND ".join(common_where)

    query = f"""
    WITH
    curr_30 AS (
        SELECT
            sum(roll_mean_14) AS forecast_unit,
            sum(roll_mean_14 * (satistutarikdvsiz / nullIf(satismiktari, 0))) AS forecast_revenue,
            sum(satismiktari) AS actual_unit,
            sum(satistutarikdvsiz) AS actual_revenue
        FROM {table_name}
        WHERE {where_sql}
          AND toDate(tarih) BETWEEN addDays({anchor_date}, -29) AND {anchor_date}
    ),
    prev_30 AS (
        SELECT
            sum(roll_mean_14) AS prev_forecast_unit,
            sum(satismiktari) AS prev_actual_unit
        FROM {table_name}
        WHERE {where_sql}
          AND toDate(tarih) BETWEEN addDays({anchor_date}, -59) AND addDays({anchor_date}, -30)
    ),
    ytd_stats AS (
        SELECT
            sum(satismiktari) AS ytd_unit,
            sum(satistutarikdvsiz) AS ytd_revenue
        FROM {table_name}
        WHERE {where_sql}
          AND tarih >= '{start_of_year}'
          AND tarih <= {anchor_date}
    ),
    ytd_prev_stats AS (
        SELECT
            sum(satismiktari) AS prev_ytd_unit
        FROM {table_name}
        WHERE {where_sql}
          AND tarih >= addYears(toDate('{start_of_year}'), -1)
          AND tarih <= addYears({anchor_date}, -1)
    )
    SELECT
        c.forecast_unit,
        c.forecast_revenue,
        c.actual_unit,
        p.prev_forecast_unit,
        p.prev_actual_unit,
        y.ytd_unit,
        y.ytd_revenue,
        round((y.ytd_unit - yp.prev_ytd_unit) / nullIf(yp.prev_ytd_unit, 0) * 100, 1) AS ytd_change
    FROM curr_30 c, prev_30 p, ytd_stats y, ytd_prev_stats yp
    """

    res = client.query(query).first_row
    if not res:
        return {
            "accuracy": 0.0, "accuracyChange": 0.0,
            "forecastValue": 0, "forecastRevenue": 0, "forecastUnit": 0, "forecastChange": 0.0,
            "ytdValue": 0, "ytdRevenue": 0, "ytdChange": 0.0,
            "gapToSales": 0.0, "gapToSalesChange": 0.0
        }

    (f_unit, f_rev, a_unit, prev_f_unit, prev_a_unit, ytd_unit, ytd_rev, ytd_change) = res

    horizon_days = 30
    future_forecast_units = _estimate_future_forecast_sum(
        client=client,
        table_name=table_name,
        where_sql=where_sql,
        future_start=anchor_day + timedelta(days=1),
        horizon_days=horizon_days,
    )

    actual_last_30 = float(a_unit or 0)
    prev_actual_30 = float(prev_a_unit or 0)
    forecast_curr_30 = float(f_unit or 0)
    forecast_prev_30 = float(prev_f_unit or 0)

    def _accuracy_from_totals(forecast_total: float, actual_total: float) -> float:
        if actual_total <= 0:
            return 0.0
        return max(
            0.0,
            min(
                100.0,
                100.0 - (abs(forecast_total - actual_total) / actual_total * 100.0),
            ),
        )

    accuracy = _accuracy_from_totals(future_forecast_units, actual_last_30)
    prev_accuracy = _accuracy_from_totals(forecast_curr_30, prev_actual_30)
    accuracy_change = accuracy - prev_accuracy

    gap_to_sales = (
        ((future_forecast_units - actual_last_30) / actual_last_30) * 100.0
        if actual_last_30 > 0
        else 0.0
    )
    prev_gap = (
        ((forecast_curr_30 - prev_actual_30) / prev_actual_30) * 100.0
        if prev_actual_30 > 0
        else 0.0
    )
    gap_change = gap_to_sales - prev_gap

    forecast_change = (
        ((future_forecast_units - forecast_curr_30) / forecast_curr_30) * 100.0
        if forecast_curr_30 > 0
        else 0.0
    )
    avg_unit_price_curr = (
        (float(f_rev or 0) / forecast_curr_30) if forecast_curr_30 > 0 else 0.0
    )
    future_forecast_revenue = future_forecast_units * avg_unit_price_curr

    return {
        "accuracy": round(float(accuracy or 0), 1),
        "accuracyChange": round(float(accuracy_change or 0), 1),
        "forecastValue": int(round(future_forecast_units)),
        "forecastUnit": int(round(future_forecast_units / max(1, horizon_days))),
        "forecastRevenue": int(round(future_forecast_revenue)),
        "forecastChange": round(float(forecast_change or 0), 1),
        "ytdValue": int(ytd_unit or 0),
        "ytdRevenue": int(ytd_rev or 0),
        "ytdChange": float(ytd_change or 0),
        "gapToSales": round(float(gap_to_sales or 0), 1),
        "gapToSalesChange": round(float(gap_change or 0), 1),
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
    plan   = weekly sum of 14-day rolling average revenue
             (computed per store+product, then aggregated)
    """

    raw_table_name = table_name
    table_name = _compat_table(table_name)
    anchor_date = _anchor_date_expr(raw_table_name)
    scope_clauses = ["1=1"]

    if region_ids:
        region_list = _quote_sql(region_ids, lower=True)
        scope_clauses.append(f"lower(cografi_bolge) IN ({region_list})")

    if store_ids:
        store_list = _quote_sql(store_ids)
        scope_clauses.append(f"toString(magazakodu) IN ({store_list})")

    if category_ids:
        category_list = _quote_sql(category_ids)
        scope_clauses.append(f"toString(reyonkodu) IN ({category_list})")

    scope_sql = " AND ".join(scope_clauses)

    query = f"""
    WITH base AS (
        SELECT
            toDate(tarih) AS tarih,
            satistutarikdvsiz,
            avg(greatest(toFloat64(satistutarikdvsiz), 0)) OVER (
                PARTITION BY magazakodu, urunkodu
                ORDER BY toDate(tarih)
                ROWS BETWEEN 13 PRECEDING AND CURRENT ROW
            ) AS roll_revenue_14
        FROM {table_name}
        WHERE {scope_sql}
          AND toDate(tarih) >= addDays({anchor_date}, -120)
          AND toDate(tarih) <= {anchor_date}
    )
    SELECT
        toStartOfWeek(tarih) AS week_start,
        formatDateTime(toStartOfWeek(tarih), '%e %b') AS week_label,
        round(sum(greatest(toFloat64(satistutarikdvsiz), 0)), 0) AS actualCiro,
        round(sum(greatest(toFloat64(roll_revenue_14), 0)), 0) AS plan
    FROM base
    WHERE toDate(tarih) >= addDays({anchor_date}, -60)
      AND toDate(tarih) <= {anchor_date}
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
    Year-over-Year comparison by ISO week number.
    Stops at the last available data week (from source table), not today.
    """
    raw_table_name = table_name
    table_name = _compat_table(table_name)
    anchor_day = _get_max_data_date(client, raw_table_name)
    curr_year = anchor_day.year
    last_available_week = int(anchor_day.isocalendar()[1])

    years = [curr_year - 2, curr_year - 1, curr_year]
    
    where_clauses = [f"yil IN ({','.join(map(str, years))})"]

    if region_ids:
        region_list = _quote_sql(region_ids, lower=True)
        where_clauses.append(f"lower(cografi_bolge) IN ({region_list})")

    if store_ids:
        store_list = _quote_sql(store_ids)
        where_clauses.append(f"toString(magazakodu) IN ({store_list})")

    if category_ids:
        category_list = _quote_sql(category_ids)
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

    # Keep full year skeleton; only current year tail should stop.
    max_week = 52
    data = []
    for w in range(1, max_week + 1):
        week_label = f"Hafta {w}"
        row = {"week": week_label}
        
        # Pull data for each year
        week_data = lookup.get(w, {})
        
        row[f"y{years[0]}"] = week_data.get(years[0], 0)
        row[f"y{years[1]}"] = week_data.get(years[1], 0)
        
        # Current year value only through last available week.
        if w <= last_available_week:
            row[f"y{years[2]}"] = week_data.get(years[2], 0)
        else:
            row[f"y{years[2]}"] = None
             
        data.append(row)

    return {
        "data": data,
        "currentWeek": last_available_week
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
    raw_table_name = table_name
    table_name = _compat_table(table_name)
    anchor_date = _anchor_date_expr(raw_table_name)
    where_clauses = [
        "promosyonVar = 1",
        "aktifPromosyonAdi IS NOT NULL",
        "aktifPromosyonAdi != 'Tayin edilmedi'"
    ]
    scope_clauses: list[str] = []

    if region_ids:
        region_list = _quote_sql(region_ids, lower=True)
        region_clause = f"lower(cografi_bolge) IN ({region_list})"
        where_clauses.append(region_clause)
        scope_clauses.append(region_clause)

    if store_ids:
        store_list = _quote_sql(store_ids)
        store_clause = f"toString(magazakodu) IN ({store_list})"
        where_clauses.append(store_clause)
        scope_clauses.append(store_clause)

    if category_ids:
        category_list = _quote_sql(category_ids)
        category_clause = f"toString(reyonkodu) IN ({category_list})"
        where_clauses.append(category_clause)
        scope_clauses.append(category_clause)

    where_sql = " AND ".join(where_clauses)
    scope_sql = " AND ".join(scope_clauses) if scope_clauses else "1 = 1"

    query = f"""
    WITH daily AS (
        -- Reduce to one row per promo+store+day (the source table has many rows per day).
        SELECT
            toDate(tarih) AS tarih,
            magazakodu,
            aktifPromosyonAdi,
            avg(abs(indirimYuzdesi)) AS discount_day
        FROM {table_name}
        WHERE {where_sql}
        GROUP BY
            tarih,
            magazakodu,
            aktifPromosyonAdi
    ),
    marked AS (
        SELECT
            *,
            lag(tarih) OVER (
                PARTITION BY aktifPromosyonAdi, magazakodu
                ORDER BY tarih
            ) AS prev_tarih,
            if(
                prev_tarih IS NULL
                OR dateDiff('day', prev_tarih, tarih) > 1,
                1,
                0
            ) AS new_promo_flag
        FROM daily
    ),
    grouped AS (
        SELECT
            *,
            sum(new_promo_flag) OVER (
                PARTITION BY aktifPromosyonAdi, magazakodu
                ORDER BY tarih
            ) AS promo_group_id
        FROM marked
    ),
    agg AS (
        SELECT
            aktifPromosyonAdi AS promo_name,
            promo_group_id,
            magazakodu,
            min(tarih) AS start_date,
            max(tarih) AS end_date,
            count() AS promo_days,
            round(avg(discount_day), 1) AS discount
        FROM grouped
        GROUP BY
            promo_name,
            promo_group_id,
            magazakodu
    ),
    windowed AS (
        SELECT
            promo_name,
            start_date,
            end_date,
            promo_days,
            discount
        FROM agg
        WHERE
            end_date >= addDays({anchor_date}, -7)
            AND start_date <= addDays({anchor_date}, 7)
    ),
    deduped AS (
        -- Collapse across stores so Overview doesn't show duplicates per store.
        SELECT
            promo_name,
            start_date,
            end_date,
            max(promo_days) AS promo_days,
            round(avg(discount), 1) AS discount
        FROM windowed
        GROUP BY
            promo_name,
            start_date,
            end_date
    ),
    product_counts AS (
        SELECT
            d.promo_name,
            d.start_date,
            d.end_date,
            uniqExact(toString(t.urunkodu)) AS product_count
        FROM deduped d
        LEFT JOIN {table_name} t
            ON t.aktifPromosyonAdi = d.promo_name
           AND toDate(t.tarih) BETWEEN d.start_date AND d.end_date
           AND t.promosyonVar = 1
           AND ({scope_sql})
        GROUP BY
            d.promo_name,
            d.start_date,
            d.end_date
    )
    SELECT
        d.promo_name,
        d.start_date,
        d.end_date,
        d.promo_days,
        d.discount,
        p.product_count,
        multiIf(
            d.end_date < {anchor_date}, 'Tamamlandi',
            d.start_date > {anchor_date}, 'Beklemede',
            'Aktif'
        ) AS status
    FROM deduped d
    LEFT JOIN product_counts p
      ON d.promo_name = p.promo_name
     AND d.start_date = p.start_date
     AND d.end_date = p.end_date
    ORDER BY d.start_date ASC
    """

    rows = client.query(query).result_set

    return {
        "promotions": [
            {
                "name": promo_name,
                "startDate": str(start_date),
                "endDate": str(end_date),
                "durationDays": int(promo_days),
                "discount": f"%{max(0, int(round(discount or 0)))}",
                "productCount": int(product_count or 0),
                "status": status
            }
            for (promo_name, start_date, end_date, promo_days, discount, product_count, status) in rows
        ]
    }


def get_promotion_products_detail(
    client,
    table_name: str = "demoVerileri",
    promotion_name: str = "",
    start_date: str = "",
    end_date: str = "",
    region_ids: list[str] | None = None,
    store_ids: list[str] | None = None,
    category_ids: list[str] | None = None,
) -> dict:
    """
    Return detailed product list for a selected promotion window including
    estimated before/after prices.
    """
    if not promotion_name or not start_date or not end_date:
        return {"summary": {}, "items": []}

    raw_table_name = table_name
    table_name = _compat_table(table_name)
    anchor_date = _anchor_date_expr(raw_table_name)

    where_clauses = [
        "promosyonVar = 1",
        "aktifPromosyonAdi = '{0}'".format(_escape_sql_string(promotion_name)),
        f"toDate(tarih) BETWEEN toDate('{_escape_sql_string(start_date)}') AND toDate('{_escape_sql_string(end_date)}')",
    ]

    if region_ids:
        region_list = _quote_sql(region_ids, lower=True)
        where_clauses.append(f"lower(cografi_bolge) IN ({region_list})")

    if store_ids:
        store_list = _quote_sql(store_ids)
        where_clauses.append(f"toString(magazakodu) IN ({store_list})")

    if category_ids:
        category_list = _quote_sql(category_ids)
        where_clauses.append(f"toString(reyonkodu) IN ({category_list})")

    where_sql = " AND ".join(where_clauses)
    esc_start = _escape_sql_string(start_date)
    esc_end = _escape_sql_string(end_date)

    query = f"""
    WITH promo_rows AS (
        SELECT
            toDate(tarih) AS tarih,
            magazakodu,
            urunkodu,
            anyLast(urunAdi) AS product_name,
            anyLast(markaAdi) AS brand,
            anyLast(magazaAdi) AS store_name,
            anyLast(il) AS city,
            anyLast(ilce) AS district,
            round(avg(toFloat64(satisFiyati)), 2) AS promo_price_day,
            round(avg(abs(toFloat64(indirimYuzdesi))), 1) AS discount_day
        FROM {table_name}
        WHERE {where_sql}
        GROUP BY
            tarih,
            magazakodu,
            urunkodu
    ),
    promo_agg AS (
        SELECT
            magazakodu,
            urunkodu,
            anyLast(product_name) AS product_name,
            anyLast(brand) AS brand,
            anyLast(store_name) AS store_name,
            anyLast(city) AS city,
            anyLast(district) AS district,
            round(quantileExact(0.5)(promo_price_day), 2) AS promo_price,
            round(avg(discount_day), 1) AS avg_discount,
            count() AS active_days
        FROM promo_rows
        GROUP BY
            magazakodu,
            urunkodu
    ),
    before_prices_exact_day AS (
        SELECT
            magazakodu,
            urunkodu,
            round(avg(toFloat64(satisFiyati)), 2) AS before_price_exact
        FROM {table_name}
        WHERE
            toDate(tarih) = addDays(toDate('{esc_start}'), -1)
            AND promosyonVar = 0
            AND toFloat64(satisFiyati) > 0
        GROUP BY
            magazakodu,
            urunkodu
    ),
    before_prices_recent_7d_daily AS (
        SELECT
            toDate(tarih) AS tarih,
            magazakodu,
            urunkodu,
            round(avg(toFloat64(satisFiyati)), 2) AS day_price
        FROM {table_name}
        WHERE
            toDate(tarih) >= addDays(toDate('{esc_start}'), -7)
            AND toDate(tarih) < toDate('{esc_start}')
            AND promosyonVar = 0
            AND toFloat64(satisFiyati) > 0
        GROUP BY
            tarih,
            magazakodu,
            urunkodu
    ),
    before_prices_recent_7d AS (
        SELECT
            magazakodu,
            urunkodu,
            argMax(day_price, tarih) AS before_price_recent_7d
        FROM before_prices_recent_7d_daily
        GROUP BY
            magazakodu,
            urunkodu
    ),
    before_prices_median_7d AS (
        SELECT
            magazakodu,
            urunkodu,
            round(quantileExact(0.5)(toFloat64(satisFiyati)), 2) AS before_price_median_7d
        FROM {table_name}
        WHERE
            toDate(tarih) >= addDays(toDate('{esc_start}'), -7)
            AND toDate(tarih) < toDate('{esc_start}')
            AND promosyonVar = 0
            AND toFloat64(satisFiyati) > 0
        GROUP BY
            magazakodu,
            urunkodu
    )
    SELECT
        toString(p.urunkodu) AS product_code,
        p.product_name,
        p.brand,
        toString(p.magazakodu) AS store_code,
        p.store_name,
        p.city,
        p.district,
        ifNull(
            be.before_price_exact,
            ifNull(br.before_price_recent_7d, bm.before_price_median_7d)
        ) AS before_price,
        p.promo_price,
        p.avg_discount,
        p.active_days
    FROM promo_agg p
    LEFT JOIN before_prices_exact_day be
      ON p.magazakodu = be.magazakodu
     AND p.urunkodu = be.urunkodu
    LEFT JOIN before_prices_recent_7d br
      ON p.magazakodu = br.magazakodu
     AND p.urunkodu = br.urunkodu
    LEFT JOIN before_prices_median_7d bm
      ON p.magazakodu = bm.magazakodu
     AND p.urunkodu = bm.urunkodu
    ORDER BY
        p.product_name ASC,
        p.store_name ASC
    """

    rows = client.query(query).result_set
    if not rows:
        status = "Tamamlandi"
        return {
            "summary": {
                "name": promotion_name,
                "startDate": start_date,
                "endDate": end_date,
                "status": status,
                "durationDays": 0,
                "productCount": 0,
                "affectedStoreCount": 0,
                "averageDiscount": 0,
            },
            "items": [],
        }

    grouped: dict[str, dict] = {}
    unique_stores: set[str] = set()
    discount_values: list[float] = []
    total_active_days = 0

    for (
        product_code,
        product_name,
        brand,
        store_code,
        store_name,
        city,
        district,
        before_price,
        promo_price,
        avg_discount,
        active_days,
    ) in rows:
        key = str(product_code)
        unique_stores.add(str(store_code))
        total_active_days += int(active_days or 0)
        if avg_discount is not None:
            discount_values.append(float(avg_discount))

        if key not in grouped:
            grouped[key] = {
                "productCode": key,
                "productName": str(product_name or ""),
                "brand": str(brand or ""),
                "beforePrices": [],
                "afterPrices": [],
                "discounts": [],
                "stores": set(),
            }

        entry = grouped[key]
        entry["stores"].add(str(store_code))
        if before_price is not None:
            entry["beforePrices"].append(float(before_price))
        if promo_price is not None:
            entry["afterPrices"].append(float(promo_price))
        if avg_discount is not None:
            entry["discounts"].append(float(avg_discount))

    items = []
    for _code, entry in grouped.items():
        before = (
            round(sum(entry["beforePrices"]) / len(entry["beforePrices"]), 2)
            if entry["beforePrices"]
            else None
        )
        after = (
            round(sum(entry["afterPrices"]) / len(entry["afterPrices"]), 2)
            if entry["afterPrices"]
            else None
        )
        avg_disc = (
            round(sum(entry["discounts"]) / len(entry["discounts"]), 1)
            if entry["discounts"]
            else 0.0
        )

        # Reliability guard:
        # If a promotion has positive discount but computed after >= before,
        # back-calculate a realistic pre-promo baseline from discount.
        # before ~= after / (1 - discount)
        if after is not None and avg_disc > 0:
            implied_before = round(after / max(0.01, (1 - (avg_disc / 100.0))), 2)
            if before is None:
                before = implied_before
            elif after > before:
                before = max(before, implied_before)

        if before and before > 0 and after is not None:
            change_pct = round(((after - before) / before) * 100, 1)
        else:
            change_pct = None

        items.append(
            {
                "productCode": entry["productCode"],
                "productName": entry["productName"],
                "brand": entry["brand"],
                "beforePrice": before,
                "afterPrice": after,
                "averageDiscount": avg_disc,
                "priceChangePct": change_pct,
                "storeCount": len(entry["stores"]),
            }
        )

    items.sort(key=lambda x: (x["productName"], x["productCode"]))
    avg_discount = round(sum(discount_values) / len(discount_values), 1) if discount_values else 0.0
    status = "Tamamlandi"
    query_status = f"""
    SELECT multiIf(
        toDate('{esc_end}') < {anchor_date}, 'Tamamlandi',
        toDate('{esc_start}') > {anchor_date}, 'Beklemede',
        'Aktif'
    )
    """
    status_row = client.query(query_status).first_row
    if status_row and status_row[0]:
        status = str(status_row[0])

    return {
        "summary": {
            "name": promotion_name,
            "startDate": start_date,
            "endDate": end_date,
            "status": status,
            "durationDays": int(round(total_active_days / max(1, len(unique_stores)))),
            "productCount": len(items),
            "affectedStoreCount": len(unique_stores),
            "averageDiscount": avg_discount,
        },
        "items": items,
    }



def get_alerts_summary(
    client,
    table_name: str = "demoVerileri",
    region_ids: list[str] | None = None,
    store_ids: list[str] | None = None,
    category_ids: list[str] | None = None
) -> dict:
    raw_table_name = table_name
    table_name = _compat_table(table_name)
    anchor_date = _anchor_date_expr(raw_table_name)

    where_clauses = ["1=1"]
    if region_ids:
        region_list = _quote_sql(region_ids, lower=True)
        where_clauses.append(f"lower(cografi_bolge) IN ({region_list})")
    if store_ids:
        store_list = ", ".join(str(s) for s in store_ids)
        where_clauses.append(f"magazakodu IN ({store_list})")
    if category_ids:
        category_list = ", ".join(str(c) for c in category_ids)
        where_clauses.append(f"toString(reyonkodu) IN ({_quote_sql(category_ids)})")

    where_sql = " AND ".join(where_clauses)

    safe_days = 30

    growth_query = f"""
    WITH growth_base AS (
        SELECT
            toString(magazakodu) AS store_code,
            toString(urunkodu) AS sku,
            sumIf(satismiktari, tarih >= addDays({anchor_date}, -{safe_days}) AND tarih <= {anchor_date}) AS current_sales,
            sumIf(
                satismiktari,
                tarih >= addDays({anchor_date}, -({safe_days} * 2))
                AND tarih < addDays({anchor_date}, -{safe_days})
            ) AS last_sales,
            (current_sales - last_sales) / nullIf(last_sales, 0) * 100 AS growth_pct
        FROM {table_name}
        WHERE {where_sql}
          AND tarih >= addDays({anchor_date}, -({safe_days} * 2))
          AND tarih <= {anchor_date}
        GROUP BY store_code, sku
    )
    SELECT
        countIf(last_sales > 0 AND growth_pct <= -10) AS low_growth,
        countIf(last_sales > 0 AND growth_pct >= 10) AS high_growth
    FROM growth_base
    """

    errors_query = f"""
    WITH errors_base AS (
        SELECT
            toString(magazakodu) AS store_code,
            toString(urunkodu) AS sku,
            sumIf(roll_mean_14, tarih >= addDays({anchor_date}, -{safe_days}) AND tarih <= {anchor_date}) AS forecast,
            sumIf(satismiktari, tarih >= addDays({anchor_date}, -{safe_days}) AND tarih <= {anchor_date}) AS actual,
            abs(forecast - actual) / nullIf(actual, 0) * 100 AS error_pct
        FROM {table_name}
        WHERE {where_sql}
          AND tarih >= addDays({anchor_date}, -{safe_days})
          AND tarih <= {anchor_date}
        GROUP BY store_code, sku
    )
    SELECT
        countIf(actual > 0 AND error_pct >= 5) AS forecast_error_total,
        countIf(actual > 0 AND error_pct >= 10) AS critical_errors
    FROM errors_base
    """

    inventory_query = f"""
    WITH base AS (
        SELECT
            toString(urunkodu) AS sku,
            magazakodu,
            toFloat64(argMax(stok, tarih)) AS current_stock,
            greatest(toFloat64(argMax(roll_mean_7, tarih)), 0) AS forecast_daily
        FROM {table_name}
        WHERE {where_sql}
        GROUP BY urunkodu, magazakodu
    )
    SELECT
        countIf(current_stock <= 0) AS stockout_count,
        countIf(current_stock > (forecast_daily * {safe_days}) AND forecast_daily > 0) AS overstock_count,
        countIf(current_stock > 0 AND current_stock <= (forecast_daily * 7) AND forecast_daily > 0) AS reorder_count
    FROM base
    """

    s_decline, e_growth = client.query(growth_query).first_row
    forecast_error_total, a_errors = client.query(errors_query).first_row
    s_out, e_overstock, u_reorder = client.query(inventory_query).first_row
    inventory_total = int((s_out or 0) + (e_overstock or 0) + (u_reorder or 0))

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
            "count": int(forecast_error_total),
            "severity": "medium" if forecast_error_total > 0 else "low"
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
        "total_alerts": int(
            (s_decline or 0)
            + (e_growth or 0)
            + (forecast_error_total or 0)
            + inventory_total
        )
    }

#--------------------------------------inventory alerts

def get_inventory_alerts(
    client,
    region_ids: list[str] | None = None,
    store_ids: list[int] | None = None,
    category_ids: list[str] | None = None,
    product_ids: list[str] | None = None,
    search: str | None = None,
    limit: int = 100,
    days: int = 30,
    table_name: str = "demoVerileri",
) -> dict:
    """
    Inventory stock alerts (stockout/overstock/reorder) based on current stock vs forecasted demand.
    Returns: { "alerts": [...] }
    """
    from datetime import date
    table_name = _compat_table(table_name)

    where_clauses = ["1=1"]

    if store_ids:
        where_clauses.append(
            f"magazakodu IN ({','.join(str(s) for s in store_ids)})"
        )

    if region_ids:
        def _escape_ch_str(value: object) -> str:
            return str(value).lower().replace("'", "''")

        region_list = ", ".join(f"'{_escape_ch_str(r)}'" for r in region_ids)
        where_clauses.append(f"lower(cografi_bolge) IN ({region_list})")

    normalized_category_ids = _normalize_filter_ids(category_ids)
    if normalized_category_ids:
        cats = ", ".join(f"'{c}'" for c in normalized_category_ids)
        where_clauses.append(f"toString(reyonkodu) IN ({cats})")

    normalized_product_ids = _normalize_filter_ids(product_ids)
    if normalized_product_ids:
        prods = ", ".join(f"'{p}'" for p in normalized_product_ids)
        where_clauses.append(f"toString(urunkodu) IN ({prods})")

    if search:
        safe_search = str(search).lower().replace("'", "''")
        where_clauses.append(f"lower(urunismi) LIKE '%{safe_search}%'")

    where_sql = " AND ".join(where_clauses)

    safe_days = int(days) if int(days) > 0 else 30

    count_query = f"""
    WITH base AS (
        SELECT
            toString(urunkodu) AS sku,
            magazakodu,
            toFloat64(argMax(stok, tarih)) AS current_stock,
            greatest(toFloat64(argMax(roll_mean_7, tarih)), 0) AS forecast_daily
        FROM {table_name}
        WHERE {where_sql}
        GROUP BY urunkodu, magazakodu
    )
    SELECT
        countIf(
            current_stock <= 0
            OR current_stock > (forecast_daily * {safe_days})
            OR current_stock <= (forecast_daily * {safe_days})
        ) AS total_alerts
    FROM base
    """

    query = f"""
    WITH base AS (
        SELECT
            toString(urunkodu) AS sku,
            any(urunismi) AS product_name,
            magazakodu,
            argMax(bulundugusehir, tarih) AS city,
            argMax(ilce, tarih) AS district,
            toFloat64(argMax(stok, tarih)) AS current_stock,
            greatest(toFloat64(argMax(roll_mean_7, tarih)), 0) AS forecast_daily
        FROM {table_name}
        WHERE {where_sql}
        GROUP BY urunkodu, magazakodu
    )

    SELECT
        sku,
        product_name,
        magazakodu,
        if(
            lengthUTF8(trim(BOTH ' ' FROM coalesce(district, ''))) = 0,
            coalesce(city, toString(magazakodu)),
            concat(coalesce(city, toString(magazakodu)), ' - ', district)
        ) AS store_name,
        current_stock,
        forecast_daily,
        (forecast_daily * {safe_days}) AS forecast_period,
        (forecast_daily * {safe_days}) AS min_stock,
        (forecast_daily * {safe_days}) AS reorder_point,
        (forecast_daily * {safe_days}) AS max_stock,
        multiIf(
            current_stock <= 0, 'stockout',
            current_stock > (forecast_daily * {safe_days}), 'overstock',
            current_stock <= (forecast_daily * {safe_days}), 'reorder',
            'ok'
        ) AS alert_type,
        multiIf(
            alert_type = 'overstock', (forecast_daily * {safe_days}),
            (forecast_daily * {safe_days})
        ) AS threshold,
        (forecast_daily * {safe_days}) AS forecasted_demand_metric,
        multiIf(
            alert_type = 'stockout', 'Acil siparis / transfer planlayin.',
            alert_type = 'reorder', 'Stok kritik seviyede: yeniden siparis planlayin.',
            alert_type = 'overstock', 'Fazla stok: promosyon veya magazalar arasi transfer dusunun.',
            'Durum normal.'
        ) AS recommendation,
        'review' AS action_type
    FROM base
    WHERE alert_type != 'ok'
    ORDER BY alert_type DESC
    LIMIT {int(limit)}
    """

    total_alerts_row = client.query(count_query).first_row
    total_alerts = int((total_alerts_row[0] or 0) if total_alerts_row else 0)

    rows = client.query(query).result_set

    parsed_rows: list[dict] = []
    for (
        sku,
        product_name,
        magazakodu,
        store_name,
        current_stock,
        forecast_daily,
        _forecast_period,
        _min_stock,
        _reorder_point,
        _max_stock,
        alert_type,
        threshold,
        forecast_metric,
        recommendation,
        action_type,
    ) in rows:
        current_stock_int = int(current_stock or 0)
        threshold_int = int(round(threshold or 0))
        forecast_metric_int = int(round(forecast_metric or 0))
        reorder_point_int = max(0, int(round((forecast_daily or 0) * safe_days)))
        surplus_after_reorder = max(0, current_stock_int - reorder_point_int)

        parsed_rows.append(
            {
                "sku": str(sku),
                "product_name": product_name,
                "magazakodu": int(magazakodu),
                "store_name": store_name,
                "current_stock": current_stock_int,
                "threshold": threshold_int,
                "forecast_metric": forecast_metric_int,
                "alert_type": alert_type,
                "recommendation": recommendation,
                "action_type": action_type,
                "surplus_after_reorder": surplus_after_reorder,
            }
        )

    surplus_by_sku: dict[str, list[dict]] = {}
    for row in parsed_rows:
        if row["surplus_after_reorder"] <= 0:
            continue
        surplus_by_sku.setdefault(row["sku"], []).append(row)

    alerts: list[dict] = []
    for row in parsed_rows:
        sku = row["sku"]
        product_name = row["product_name"]
        magazakodu = row["magazakodu"]
        store_name = row["store_name"]
        current_stock_int = row["current_stock"]
        threshold_int = row["threshold"]
        forecast_metric_int = row["forecast_metric"]
        alert_type = row["alert_type"]
        recommendation = row["recommendation"]

        transfer_source_store = None
        transfer_quantity = 0
        final_action_type = row["action_type"]

        if alert_type in {"stockout", "reorder"}:
            needed_qty = max(0, threshold_int - current_stock_int)
            candidates = [
                c
                for c in surplus_by_sku.get(sku, [])
                if int(c["magazakodu"]) != int(magazakodu)
            ]
            candidates.sort(key=lambda c: c["surplus_after_reorder"], reverse=True)

            if candidates and needed_qty > 0:
                best = candidates[0]
                transfer_quantity = min(needed_qty, int(best["surplus_after_reorder"]))
                if transfer_quantity > 0:
                    transfer_source_store = f"{best['store_name']} - {best['magazakodu']}"
                    final_action_type = "transfer"
                    recommendation = (
                        f"{product_name} urununde hedef seviye {threshold_int} adet, mevcut stok "
                        f"{current_stock_int} adet. Stok acigini hizli kapatmak icin "
                        f"{transfer_source_store} magazasindan {transfer_quantity} adet transfer "
                        f"onerilir; kalan ihtiyac varsa ek siparis acilmalidir."
                    )
                else:
                    final_action_type = "reorder"
            else:
                final_action_type = "reorder"
                if needed_qty > 0:
                    recommendation = (
                        f"{product_name} urununde mevcut stok {current_stock_int} adet, hedef seviye "
                        f"{threshold_int} adet. Uygun transfer kaynagi bulunamadigi icin en az "
                        f"{needed_qty} adet acil siparis planlayin."
                    )
        elif alert_type == "overstock":
            final_action_type = "promotion"
            excess_qty = max(0, current_stock_int - threshold_int)
            recommendation = (
                f"{product_name} urununde tahmini ihtiyacin uzerinde yaklasik {excess_qty} adet "
                f"fazla stok var. Kampanya, raf optimizasyonu veya bolgesel transferle stok "
                f"maliyetini azaltin."
            )

        alerts.append(
            {
                "id": f"alert-INV-{sku}-{magazakodu}",
                "type": alert_type,
                "sku": sku,
                "productName": product_name,
                "storeName": f"{store_name} - {magazakodu}",
                "message": f"Stok durumu uyarisi: {alert_type}",
                "date": date.today().strftime("%b %d, %H:%M"),
                "severity": "high"
                if alert_type == "stockout"
                else "medium"
                if alert_type == "reorder"
                else "low",
                "metrics": {
                    "currentStock": max(0, current_stock_int),
                    "threshold": max(0, threshold_int),
                    "forecastedDemand": max(0, forecast_metric_int),
                    "transferSourceStore": transfer_source_store,
                    "transferQuantity": max(0, int(transfer_quantity)),
                },
                "recommendation": recommendation,
                "actionType": final_action_type,
            }
        )

    return {"alerts": alerts, "totalCount": total_alerts}

#--------------------------------------demand forecasting page

def get_demand_kpis(
    client,
    region_ids: list[str] | None = None,
    store_ids: list[int] | None = None,
    category_ids: list[int] | None = None,
    product_ids: list[int] | None = None,
    period_value: int = 30,
    period_unit: str = "gun",
    table_name: str = "demoVerileri"
) -> dict:

    from datetime import date, timedelta
    import calendar
    raw_table_name = table_name
    table_name = _compat_table(table_name)
    anchor_date = _anchor_date_expr(raw_table_name)
    anchor_day = _get_max_data_date(client, raw_table_name)

    def add_months(d: date, months: int) -> date:
        y = d.year + (d.month - 1 + months) // 12
        m = (d.month - 1 + months) % 12 + 1
        last_day = calendar.monthrange(y, m)[1]
        return date(y, m, min(d.day, last_day))

    def add_years(d: date, years: int) -> date:
        try:
            return d.replace(year=d.year + years)
        except ValueError:
            # Feb 29 -> Feb 28 on non-leap years
            return d.replace(month=2, day=28, year=d.year + years)

    period_unit = (period_unit or "gun").lower()
    if period_unit not in {"gun", "hafta", "ay", "yil"}:
        period_unit = "gun"

    end_date = anchor_day + timedelta(days=1)

    if period_unit == "gun":
        start_date = end_date - timedelta(days=int(period_value))
        prev_start_date = start_date - timedelta(days=int(period_value))
    elif period_unit == "hafta":
        days = int(period_value) * 7
        start_date = end_date - timedelta(days=days)
        prev_start_date = start_date - timedelta(days=days)
    elif period_unit == "ay":
        months = int(period_value)
        start_date = add_months(end_date, -months)
        prev_start_date = add_months(start_date, -months)
    else:  # yil
        years = int(period_value)
        start_date = add_years(end_date, -years)
        prev_start_date = add_years(start_date, -years)

    prev_end_date = start_date
    prev_year_start_date = add_years(start_date, -1)
    prev_year_end_date = add_years(end_date, -1)

    filters = []

    if region_ids:
        region_list = _quote_sql(region_ids, lower=True)
        filters.append(f"lower(cografi_bolge) IN ({region_list})")
    if store_ids:
        filters.append(f"magazakodu IN ({','.join(map(str, store_ids))})")
    if category_ids:
        filters.append(f"toString(reyonkodu) IN ({_quote_sql(category_ids)})")
    if product_ids:
        filters.append(f"urunkodu IN ({','.join(map(str, product_ids))})")

    where_sql = " AND ".join(filters) if filters else "1=1"

    query = f"""
    WITH
        toDate('{start_date}') AS start_date,
        toDate('{end_date}') AS end_date,
        toDate('{prev_start_date}') AS prev_start_date,
        toDate('{prev_end_date}') AS prev_end_date,
        toDate('{prev_year_start_date}') AS prev_year_start_date,
        toDate('{prev_year_end_date}') AS prev_year_end_date,

        curr_prod AS (
            SELECT
                urunkodu,
                sum(satistutarikdvsiz) AS curr_rev
            FROM {table_name}
            WHERE {where_sql}
              AND tarih >= start_date AND tarih < end_date
            GROUP BY urunkodu
        ),
        prev_year_prod AS (
            SELECT
                urunkodu,
                sum(satistutarikdvsiz) AS prev_rev
            FROM {table_name}
            WHERE {where_sql}
              AND tarih >= prev_year_start_date AND tarih < prev_year_end_date
            GROUP BY urunkodu
        ),
        growth AS (
            SELECT
                countIf(
                    prev_rev > 0
                    AND (curr_rev - prev_rev) / prev_rev * 100 < 2
                ) AS low_growth,
                countIf(
                    prev_rev > 0
                    AND (curr_rev - prev_rev) / prev_rev * 100 > 10
                ) AS high_growth
            FROM curr_prod
            LEFT JOIN prev_year_prod USING (urunkodu)
        ),
        curr_daily AS (
            SELECT
                toDate(tarih) AS d,
                sum(greatest(toFloat64(satismiktari), 0)) AS actual_day,
                sum(greatest(toFloat64(roll_mean_14), 0)) AS forecast_day
            FROM {table_name}
            WHERE {where_sql}
              AND tarih >= start_date AND tarih < end_date
            GROUP BY d
        ),
        prev_daily AS (
            SELECT
                toDate(tarih) AS d,
                sum(greatest(toFloat64(satismiktari), 0)) AS actual_day,
                sum(greatest(toFloat64(roll_mean_14), 0)) AS forecast_day
            FROM {table_name}
            WHERE {where_sql}
              AND tarih >= prev_start_date AND tarih < prev_end_date
            GROUP BY d
        )

    SELECT
        sumIf(roll_mean_14, tarih >= start_date AND tarih < end_date) AS forecast_units_curr,
        sumIf(
            roll_mean_14 * if(satismiktari > 0, satistutarikdvsiz / satismiktari, satisFiyati),
            tarih >= start_date AND tarih < end_date
        ) AS forecast_revenue_curr,
        sumIf(
            roll_mean_14 * if(satismiktari > 0, satistutarikdvsiz / satismiktari, satisFiyati),
            tarih >= prev_start_date AND tarih < prev_end_date
        ) AS forecast_revenue_prev,
        sumIf(satistutarikdvsiz, tarih >= start_date AND tarih < end_date) AS revenue_curr,
        sumIf(satismiktari, tarih >= start_date AND tarih < end_date) AS units_curr,
        sumIf(satistutarikdvsiz, tarih >= prev_year_start_date AND tarih < prev_year_end_date) AS revenue_prev_year,

        -- Accuracy and bias based on daily aggregated totals to avoid noisy row-level distortion.
        100 * (
            SELECT sum(abs(forecast_day - actual_day)) FROM curr_daily
        ) / nullIf(
            (SELECT sum(actual_day) FROM curr_daily),
            0
        ) AS mape_curr,
        100 * (
            SELECT sum(abs(forecast_day - actual_day)) FROM prev_daily
        ) / nullIf(
            (SELECT sum(actual_day) FROM prev_daily),
            0
        ) AS mape_prev,

        100 * (
            SELECT sum(forecast_day - actual_day) FROM curr_daily
        ) / nullIf(
            (SELECT sum(actual_day) FROM curr_daily),
            0
        ) AS bias_curr,
        100 * (
            SELECT sum(forecast_day - actual_day) FROM prev_daily
        ) / nullIf(
            (SELECT sum(actual_day) FROM prev_daily),
            0
        ) AS bias_prev,

        (SELECT low_growth FROM growth) AS low_growth,
        (SELECT high_growth FROM growth) AS high_growth
    FROM {table_name}
    WHERE {where_sql}
    """

    try:
        (
            forecast_units_curr,
            forecast_revenue_curr,
            forecast_revenue_prev,
            revenue_curr,
            units_curr,
            revenue_prev_year,
            _mape,
            _prev_mape,
            bias,
            prev_bias,
            low_growth,
            high_growth
        ) = client.query(query).result_set[0]
    except Exception as e:
        print(f"Error executing demand KPIs query: {e}")
        return {
            "totalForecast": {"value": 0, "units": 0, "trend": 0.0},
            "accuracy": {"value": 0.0, "trend": 0.0},
            "yoyGrowth": {"value": 0.0, "trend": 0.0},
            "bias": {"value": 0.0, "type": "under", "trend": "stable"},
            "lowGrowthCount": 0,
            "highGrowthCount": 0,
        }

    forecast_units_curr = float(forecast_units_curr or 0)
    forecast_revenue_curr = float(forecast_revenue_curr or 0)
    forecast_revenue_prev = float(forecast_revenue_prev or 0)
    revenue_curr = float(revenue_curr or 0)
    units_curr = float(units_curr or 0)
    revenue_prev_year = float(revenue_prev_year or 0)

    daily_query = f"""
    WITH
        toDate('{start_date}') AS start_date,
        toDate('{end_date}') AS end_date,
        toDate('{prev_start_date}') AS prev_start_date,
        toDate('{prev_end_date}') AS prev_end_date
    SELECT
        if(d >= start_date AND d < end_date, 'curr', 'prev') AS period_key,
        d,
        sum(greatest(toFloat64(satismiktari), 0)) AS actual_day,
        sum(greatest(toFloat64(roll_mean_14), 0)) AS forecast_day
    FROM (
        SELECT toDate(tarih) AS d, satismiktari, roll_mean_14
        FROM {table_name}
        WHERE {where_sql}
          AND (
            (tarih >= start_date AND tarih < end_date)
            OR
            (tarih >= prev_start_date AND tarih < prev_end_date)
          )
    )
    GROUP BY period_key, d
    ORDER BY d
    """

    daily_rows = client.query(daily_query).result_rows
    curr_days: list[tuple[object, object, object]] = []
    prev_days: list[tuple[object, object, object]] = []
    for period_key, d, actual_day, forecast_day in daily_rows:
        row = (d, actual_day, forecast_day)
        if period_key == "curr":
            curr_days.append(row)
        else:
            prev_days.append(row)

    horizon_days = max(1, (end_date - start_date).days)
    future_start = end_date
    future_forecast_units = _estimate_future_forecast_sum(
        client=client,
        table_name=table_name,
        where_sql=where_sql,
        future_start=future_start,
        horizon_days=horizon_days,
    )

    actual_curr_units = sum(float(actual or 0) for _, actual, _ in curr_days)
    actual_prev_units = sum(float(actual or 0) for _, actual, _ in prev_days)
    forecast_curr_units = sum(float(forecast or 0) for _, _, forecast in curr_days)

    def _accuracy_from_totals(forecast_total: float, actual_total: float) -> float:
        if actual_total <= 0:
            return 0.0
        return max(
            0.0,
            min(
                100.0,
                100.0 - (abs(forecast_total - actual_total) / actual_total * 100.0),
            ),
        )

    yoy_growth = (
        (revenue_curr - revenue_prev_year) / revenue_prev_year * 100
        if revenue_prev_year
        else 0.0
    )
    forecast_trend = (
        ((future_forecast_units - forecast_curr_units) / forecast_curr_units) * 100.0
        if forecast_curr_units > 0
        else 0.0
    )
    avg_unit_price_curr = (
        (forecast_revenue_curr / forecast_units_curr)
        if forecast_units_curr > 0
        else 0.0
    )
    future_forecast_revenue = future_forecast_units * avg_unit_price_curr

    accuracy_value = _accuracy_from_totals(future_forecast_units, actual_curr_units)
    accuracy_prev_value = _accuracy_from_totals(forecast_curr_units, actual_prev_units)
    accuracy_trend = accuracy_value - accuracy_prev_value

    bias_value = (
        ((future_forecast_units - actual_curr_units) / actual_curr_units) * 100.0
        if actual_curr_units > 0
        else 0.0
    )
    prev_bias_value = (
        ((forecast_curr_units - actual_prev_units) / actual_prev_units) * 100.0
        if actual_prev_units > 0
        else 0.0
    )
    bias_abs = abs(bias_value)
    prev_bias_abs = abs(prev_bias_value)
    if abs(bias_abs - prev_bias_abs) < 1.0:
        bias_trend = "stable"
    elif bias_abs > prev_bias_abs:
        bias_trend = "Artiyor"
    else:
        bias_trend = "Azaliyor"

    return {
        "totalForecast": {
            "value": int(round(future_forecast_revenue)),
            "units": int(round(future_forecast_units)),
            "trend": round(forecast_trend, 1),
        },
        "accuracy": {
            "value": round(accuracy_value, 1),
            "trend": round(accuracy_trend, 1),
        },
        "yoyGrowth": {
            "value": round(yoy_growth, 1),
            "trend": 0.0
        },
        "bias": {
            "value": round(bias_abs, 1),
            "type": "over" if bias_value > 0 else "under",
            "trend": bias_trend,
        },
        "lowGrowthCount": int(low_growth),
        "highGrowthCount": int(high_growth)
    }


def get_demand_year_comparison(
    client,
    store_ids: list[int] | None = None,
    product_ids: list[int] | None = None,
    category_ids: list[int] | None = None,
    table_name: str = "demoVerileri"
) -> dict:
    raw_table_name = table_name
    table_name = _compat_table(table_name)

    anchor_day = _get_max_data_date(client, raw_table_name)
    current_year = anchor_day.year
    years = [current_year - 2, current_year - 1, current_year]

    # Stop at last available data week.
    last_available_week = max(1, min(53, int(anchor_day.isocalendar()[1])))

    filters = [f"toYear(tarih) IN ({','.join(map(str, years))})"]
    if store_ids:
        filters.append(f"magazakodu IN ({','.join(map(str, store_ids))})")
    if category_ids:
        filters.append(f"toString(reyonkodu) IN ({_quote_sql(category_ids)})")
    if product_ids:
        filters.append(f"urunkodu IN ({','.join(map(str, product_ids))})")

    where_sql = " AND ".join(filters) if filters else "1=1"

    query = f"""
    SELECT
        toYear(tarih) AS yil,
        toISOWeek(tarih) AS week_no,
        sum(satistutarikdvsiz) AS revenue
    FROM {table_name}
    WHERE {where_sql}
    GROUP BY yil, week_no
    ORDER BY yil, week_no
    """

    try:
        rows = client.query(query).result_set
    except Exception as e:
        print(f"Error executing demand year comparison query: {e}")
        return {"data": [], "error": str(e)}

    lookup = {}
    for yil, week_no, revenue in rows:
        try:
            week_int = int(week_no)
            year_int = int(yil)
        except Exception:
            continue
        if week_int < 1 or week_int > 53:
            continue
        lookup.setdefault(week_int, {})[year_int] = int(revenue or 0)

    data = []
    for w in range(1, 53):
        row = {"month": f"hafta {w}"}
        week_vals = lookup.get(w, {})

        row[f"y{years[0]}"] = week_vals.get(years[0], 0)
        row[f"y{years[1]}"] = week_vals.get(years[1], 0)
        if w <= last_available_week:
            row[f"y{years[2]}"] = week_vals.get(years[2], 0)
        else:
            row[f"y{years[2]}"] = None

        data.append(row)

    return {"data": data, "currentWeek": last_available_week}



def get_demand_monthly_bias(
    client,
    store_ids: list[int] | None = None,
    product_ids: list[int] | None = None,
    category_ids: list[int] | None = None,
    table_name: str = "demoVerileri"
) -> dict:
    table_name = _compat_table(table_name)

    filters = []
    if store_ids:
        filters.append(f"magazakodu IN ({','.join(map(str, store_ids))})")
    if category_ids:
        filters.append(f"toString(reyonkodu) IN ({_quote_sql(category_ids)})")
    if product_ids:
        filters.append(f"urunkodu IN ({','.join(map(str, product_ids))})")
        
    where_sql = " AND ".join(filters) if filters else "1=1"

    query = f"""
    SELECT
        toMonth(tarih) AS ay,
        avg(roll_mean_21) AS forecast,
        avg(satismiktari) AS actual
    FROM {table_name}
    WHERE {where_sql}
    GROUP BY ay
    ORDER BY ay
    """

    try:
        rows = client.query(query).result_set
    except Exception as e:
        print(f"Error executing demand monthly bias query: {e}")
        return {"data": [], "error": str(e)}

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
    type_,              # "all" | "high" | "low"
    category_ids=None,
    product_ids=None,
    days: int = 30,
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
    category_ids: list[int] | None = None,
    period: str = "daily",  # daily, weekly, monthly
    days_past: int = 30,
    days_future: int = 30,
    table_name: str = "demoVerileri",
) -> dict:
    """
    GET /api/demand/trend-forecast
    Returns actual, forecast and trendline data.
    Past window uses actual sales, future window uses model forecast (roll_mean_14).
    """

    raw_table_name = table_name
    table_name = _compat_table(table_name)
    anchor_day = _get_max_data_date(client, raw_table_name)
    period_value = period if period in {"daily", "weekly", "monthly"} else "daily"
    safe_days_past = max(1, int(days_past))
    safe_days_future = max(1, int(days_future))

    start_date = anchor_day - timedelta(days=safe_days_past)
    end_date = anchor_day + timedelta(days=safe_days_future)

    filters = []
    if store_ids:
        filters.append(f"magazakodu IN ({','.join(map(str, store_ids))})")
    if category_ids:
        filters.append(f"toString(reyonkodu) IN ({_quote_sql(category_ids)})")
    if product_ids:
        filters.append(f"urunkodu IN ({','.join(map(str, product_ids))})")

    filters.append(
        f"toDate(tarih) BETWEEN toDate('{start_date.isoformat()}') "
        f"AND toDate('{end_date.isoformat()}')"
    )
    where_sql = " AND ".join(filters) if filters else "1=1"

    query = f"""
    SELECT
        toDate(tarih) AS d,
        sum(greatest(toFloat64(satismiktari), 0)) AS actual,
        sum(greatest(toFloat64(roll_mean_14), 0)) AS forecast
    FROM {table_name}
    WHERE {where_sql}
    GROUP BY d
    ORDER BY d ASC
    """

    try:
        rows = client.query(query).result_rows
    except Exception as e:
        print(f"Error executing trend forecast query: {e}")
        return {"data": [], "error": str(e)}

    by_date = {}
    for d, actual, forecast in rows:
        by_date[d] = {
            "actual": max(0.0, float(actual or 0)),
            "forecast": max(0.0, float(forecast or 0)),
        }

    sorted_dates = sorted(by_date.keys())
    forecast_history = [
        float(by_date[d]["forecast"])
        for d in sorted_dates
        if d <= anchor_day and float(by_date[d]["forecast"] or 0) > 0
    ][-max(7, min(28, safe_days_past)):]
    forecast_baseline = float(np.mean(forecast_history)) if forecast_history else 0.0

    weekday_forecast_totals = {i: 0.0 for i in range(7)}
    weekday_forecast_counts = {i: 0 for i in range(7)}
    for d in sorted_dates:
        if d > anchor_day:
            continue
        val = float(by_date[d]["forecast"] or 0)
        if val <= 0:
            continue
        wd = d.weekday()
        weekday_forecast_totals[wd] += val
        weekday_forecast_counts[wd] += 1

    weekday_forecast_avg = {
        wd: (
            weekday_forecast_totals[wd] / weekday_forecast_counts[wd]
            if weekday_forecast_counts[wd] > 0
            else None
        )
        for wd in range(7)
    }
    daily_points = []
    trend_source = []
    cursor = start_date
    while cursor <= end_date:
        entry = by_date.get(cursor)
        weekday = cursor.weekday()

        if cursor <= anchor_day:
            if entry is None:
                actual_val = None
            else:
                actual_val = round(max(0.0, float(entry["actual"] or 0)), 2)
            forecast_val = None
        else:
            actual_val = None
            if entry is not None and float(entry["forecast"] or 0) > 0:
                forecast_val = round(max(0.0, float(entry["forecast"] or 0)), 2)
            else:
                weekday_base = weekday_forecast_avg.get(weekday)
                fallback_base = (
                    weekday_base if weekday_base is not None else forecast_baseline
                )
                forecast_val = (
                    round(max(0.0, float(fallback_base or 0)), 2)
                    if fallback_base > 0
                    else None
                )

        base_for_trend = (
            actual_val if actual_val is not None else (forecast_val or 0)
        )
        daily_points.append(
            {
                "date": cursor.isoformat(),
                "actual": actual_val,
                "forecast": forecast_val,
            }
        )
        trend_source.append(float(base_for_trend))
        cursor += timedelta(days=1)

    def compute_trendline(values: list[float]) -> list[float]:
        n = len(values)
        if n == 0:
            return []
        if n == 1:
            return [round(max(0.0, float(values[0])), 2)]

        sum_x = (n - 1) * n / 2
        sum_x2 = (n - 1) * n * (2 * n - 1) / 6
        sum_y = sum(values)
        sum_xy = sum(i * v for i, v in enumerate(values))
        denom = n * sum_x2 - sum_x * sum_x
        slope = 0.0 if denom == 0 else (n * sum_xy - sum_x * sum_y) / denom
        intercept = (sum_y - slope * sum_x) / n
        return [round(max(0.0, float(intercept + slope * i)), 2) for i in range(n)]

    daily_trendline = compute_trendline(trend_source)
    for idx, point in enumerate(daily_points):
        point["trendline"] = daily_trendline[idx]

    if period_value == "daily":
        return {"data": daily_points}

    # Optional aggregate view for larger horizons.
    bucketed = {}
    for point in daily_points:
        d = date.fromisoformat(point["date"])
        if period_value == "weekly":
            bucket_date = d - timedelta(days=d.weekday())
        else:
            bucket_date = d.replace(day=1)

        bucket = bucketed.setdefault(
            bucket_date,
            {"actual": 0, "forecast": 0, "has_actual": False, "has_forecast": False},
        )

        if point["actual"] is not None:
            bucket["actual"] += float(point["actual"])
            bucket["has_actual"] = True
        if point["forecast"] is not None:
            bucket["forecast"] += float(point["forecast"])
            bucket["has_forecast"] = True

    aggregated = []
    for bucket_date in sorted(bucketed.keys()):
        item = bucketed[bucket_date]
        aggregated.append(
            {
                "date": bucket_date.isoformat(),
                "actual": round(float(item["actual"]), 2)
                if item["has_actual"]
                else None,
                "forecast": round(float(item["forecast"]), 2)
                if item["has_forecast"]
                else None,
            }
        )

    agg_source = [
        float(
            p["actual"] if p["actual"] is not None else (p["forecast"] or 0)
        )
        for p in aggregated
    ]
    agg_trendline = compute_trendline(agg_source)
    for idx, point in enumerate(aggregated):
        point["trendline"] = agg_trendline[idx]

    return {"data": aggregated}

def get_forecast_errors(
    client,
    store_ids: list[str] | None = None,
    category_ids: list[str] | None = None,
    product_ids: list[str] | None = None,
    severity_filter: str | None = None,
    days: int = 30,
    table_name: str = "demoVerileri"
) -> dict:
    """
    GET /api/demand/forecast-errors
    Identifies products with high forecast errors.
    """
    
    raw_table_name = table_name
    table_name = _compat_table(table_name)
    anchor_date = _anchor_date_expr(raw_table_name)
    where_clauses = ["1=1"]
    if store_ids:
        store_list = ", ".join(f"'{s}'" for s in store_ids)
        where_clauses.append(f"toString(magazakodu) IN ({store_list})")

    if category_ids:
        category_list = _quote_sql(category_ids)
        where_clauses.append(f"toString(reyonkodu) IN ({category_list})")

    if product_ids:
        product_list = ", ".join(f"'{p}'" for p in product_ids)
        where_clauses.append(f"toString(urunkodu) IN ({product_list})")

    where_sql = " AND ".join(where_clauses)
    
    safe_days = int(days) if int(days) > 0 else 30

    # Weighted period metrics (more stable than averaging per-row percentages).
    # Error% is WMAPE: sum(abs(err)) / sum(actual) * 100.
    query = f"""
    WITH base AS (
        SELECT
            toString(urunkodu) AS sku,
            any(urunismi) AS product_name,
            sumIf(satismiktari, satismiktari > 0) AS total_actual,
            sumIf(roll_mean_14, satismiktari > 0) AS total_forecast
        FROM {table_name}
        WHERE {where_sql}
          AND tarih >= addDays({anchor_date}, -{safe_days})
          AND tarih <= {anchor_date}
        GROUP BY sku
    )
    SELECT
        sku,
        product_name,
        total_forecast,
        total_actual,
        100 * abs(total_forecast - total_actual) / nullIf(total_actual, 0) AS error_pct,
        100 * (total_forecast - total_actual) / nullIf(total_actual, 0) AS bias
    FROM base
    WHERE total_actual > 0
    ORDER BY error_pct DESC
    LIMIT 200
    """
    
    rows = client.query(query).result_rows
    
    products = []
    for sku, name, forecast, actual, error_pct, bias in rows:
        error_pct_value = float(error_pct or 0)
        accuracy = max(0.0, 100.0 - error_pct_value)
        
        severity = "normal"
        if error_pct_value > 50: severity = "critical"
        elif error_pct_value > 30: severity = "high"
        elif error_pct_value > 20: severity = "medium"
        
        # UI filter buckets:
        # high: >10%, medium: 5-10%, low: <5%.
        if severity_filter and severity_filter != "all":
            if severity_filter == "high" and error_pct_value <= 10:
                continue
            if severity_filter == "medium" and not (5 < error_pct_value <= 10):
                continue
            if severity_filter == "low" and error_pct_value > 5:
                continue
            
        products.append({
            "id": str(sku),
            "name": name,
            "error": round(error_pct_value, 1),
            "accuracy": round(accuracy, 1),
            "forecast": int(forecast or 0),
            "actual": int(actual or 0),
            "bias": round(float(bias or 0), 1),
            "severity": severity,
            "action": "İnceleme Bekliyor"
        })
        
    return {"products": products}

def get_growth_products(
    client,
    store_ids,
    type_,              # "all" | "high" | "low"
    category_ids=None,
    product_ids=None,
    days: int = 30,
    table_name="demoVerileri",
    growth_threshold=10
):
    raw_table_name = table_name
    table_name = _compat_table(table_name)
    anchor_date = _anchor_date_expr(raw_table_name)
    where_clauses = ["1=1"]
    if store_ids:
        store_list = _quote_sql(store_ids)
        where_clauses.append(f"toString(magazakodu) IN ({store_list})")

    if category_ids:
        category_list = _quote_sql(category_ids)
        where_clauses.append(f"toString(reyonkodu) IN ({category_list})")

    if product_ids:
        product_list = _quote_sql(product_ids)
        where_clauses.append(f"toString(urunkodu) IN ({product_list})")
    
    where_sql = " AND ".join(where_clauses)
    
    safe_days = int(days) if int(days) > 0 else 30

    where_growth_sql = "last_sales > 0"
    if type_ == "high":
        where_growth_sql = f"last_sales > 0 AND growth_pct >= {float(growth_threshold)}"
        order_sql = "growth_pct DESC"
    elif type_ == "low":
        where_growth_sql = f"last_sales > 0 AND growth_pct <= {-float(growth_threshold)}"
        order_sql = "growth_pct ASC"
    else:
        # "all": show both up/down movers
        order_sql = "abs(growth_pct) DESC"

    query = f"""
    WITH base AS (
        SELECT
            toString(urunkodu) AS sku,
            any(urunismi) AS product_name,
            any(reyonkodu) AS sektor_kodu,
            any(hier2_ad) AS sektor_adi,
            sumIf(satismiktari, tarih >= addDays({anchor_date}, -{safe_days}) AND tarih <= {anchor_date}) AS current_sales,
            sumIf(
                satismiktari,
                tarih >= addDays({anchor_date}, -({safe_days} * 2))
                AND tarih < addDays({anchor_date}, -{safe_days})
            ) AS last_sales,
            sumIf(roll_mean_14, tarih >= addDays({anchor_date}, -{safe_days}) AND tarih <= {anchor_date}) AS forecast_period,
            (current_sales - last_sales) / nullIf(last_sales, 0) * 100 AS growth_pct
        FROM {table_name}
        WHERE {where_sql}
          AND tarih >= addDays({anchor_date}, -({safe_days} * 2))
          AND tarih <= {anchor_date}
        GROUP BY sku
    )
    SELECT
        sku,
        product_name,
        sektor_kodu,
        sektor_adi,
        current_sales,
        last_sales,
        growth_pct,
        forecast_period AS forecast
    FROM base
    WHERE {where_growth_sql}
    ORDER BY {order_sql}
    LIMIT 100
    """
    
    rows = client.query(query).result_rows
    
    products = []
    for sku, name, sektor_kodu, sektor_adi, current, last, growth, forecast in rows:
        products.append({
            "id": str(sku),
            "name": name,
            "growth": round(growth or 0, 1),
            "type": type_,
            "category": str(sektor_adi or sektor_kodu or "Diger"),
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
    days: int = 30,
    table_name="demoVerileri"
):
    """
    Inventory KPI hesaplama (ClickHouse uyumlu)
    """
    raw_table_name = table_name
    table_name = _compat_table(table_name)
    anchor_date = _anchor_date_expr(raw_table_name)

    safe_days = max(1, int(days))
    # Risk horizon follows selected period instead of fixed 3 days.
    risk_days = max(1, int(round(safe_days / 4)))

    where = ["1=1"]

    if region_ids:
        region_list = ", ".join(f"'{str(r).lower()}'" for r in region_ids)
        where.append(f"lower(cografi_bolge) IN ({region_list})")

    normalized_store_ids = _normalize_filter_ids(store_ids)
    if normalized_store_ids:
        store_sql = ", ".join(f"'{store_id}'" for store_id in normalized_store_ids)
        where.append(f"toString(magazakodu) IN ({store_sql})")

    normalized_category_ids = _normalize_filter_ids(category_ids)
    if normalized_category_ids:
        category_sql = ", ".join(f"'{category_id}'" for category_id in normalized_category_ids)
        where.append(f"toString(reyonkodu) IN ({category_sql})")

    normalized_product_ids = _normalize_filter_ids(product_ids)
    if normalized_product_ids:
        product_sql = ", ".join(f"'{product_id}'" for product_id in normalized_product_ids)
        where.append(f"toString(urunkodu) IN ({product_sql})")

    where_sql = " AND ".join(where)

    query = f"""
    WITH latest_store_product AS (
        -- Match `/api/inventory/items` snapshot logic exactly (ORDER BY tarih DESC LIMIT 1 BY ...).
        SELECT
            toString(urunkodu)                           AS sku,
            toString(urunismi)                           AS product_name,
            if(length(trim(toString(hier2_ad))) > 0, toString(hier2_ad), toString(reyonkodu)) AS category,
            toString(magazakodu)                         AS store,
            greatest(toFloat64(stok), 0)                 AS stock_level,
            greatest(toFloat64(degerlenmisstok), 0)      AS stock_value,
            greatest(toFloat64(roll_mean_7), 0)          AS forecast_daily
        FROM {table_name}
        WHERE {where_sql}
        ORDER BY tarih DESC
        LIMIT 1 BY urunkodu, reyonkodu, magazakodu
    ),
    sales_period AS (
        SELECT
            toString(urunkodu)                           AS sku,
            if(length(trim(toString(hier2_ad))) > 0, toString(hier2_ad), toString(reyonkodu)) AS category,
            toString(magazakodu)                         AS store,
            sumIf(
                satismiktari,
                tarih >= addDays({anchor_date}, -{safe_days} + 1) AND tarih <= {anchor_date}
            ) AS sales_period
        FROM {table_name}
        WHERE {where_sql}
        GROUP BY sku, category, store
    ),
    store_status AS (
        SELECT
            l.sku                                         AS sku,
            l.store                                       AS store,
            any(l.product_name)                           AS product_name,
            sum(l.stock_level)                            AS stock_level,
            sum(l.stock_value)                            AS stock_value,
            sum(greatest(l.forecast_daily, 0))            AS forecast_daily,
            sum(coalesce(s.sales_period, 0))              AS sales_period,
            multiIf(
                sum(l.stock_level) = 0, 'Out of Stock',
                sum(greatest(l.forecast_daily, 0)) = 0, 'In Stock',
                sum(l.stock_level) < sum(greatest(l.forecast_daily, 0)) * {risk_days}, 'Low Stock',
                sum(l.stock_level) > sum(greatest(l.forecast_daily, 0)) * {safe_days}, 'Overstock',
                'In Stock'
            ) AS store_inventory_status
        FROM latest_store_product l
        LEFT JOIN sales_period s
            ON l.sku = s.sku AND l.category = s.category AND l.store = s.store
        GROUP BY l.sku, l.store
    ),
    product_status AS (
        SELECT
            sku,
            any(product_name)                             AS product_name,
            sum(stock_level)                              AS stock_level,
            sum(stock_value)                              AS stock_value,
            sum(forecast_daily)                           AS forecast_daily,
            sum(sales_period)                             AS sales_period,
            countIf(store_inventory_status = 'Out of Stock') AS out_of_stock_store_count,
            countIf(store_inventory_status = 'Low Stock') AS low_stock_store_count,
            countIf(store_inventory_status = 'Overstock') AS overstock_store_count,
            count()                                       AS store_count,
            multiIf(
                countIf(store_inventory_status = 'Out of Stock') = count() AND count() > 0, 'Out of Stock',
                (countIf(store_inventory_status = 'Out of Stock') > 0 OR countIf(store_inventory_status = 'Low Stock') > 0), 'Low Stock',
                countIf(store_inventory_status = 'Overstock') > 0, 'Overstock',
                'In Stock'
            ) AS inventory_status
        FROM store_status
        GROUP BY sku
    )
    SELECT
        sum(stock_value)                                                       AS totalStockValue,
        count()                                                                AS totalInventoryItems,

        if(
            sum(forecast_daily) > 0,
            toInt32(sum(stock_level) / sum(forecast_daily)),
            0
        )                                                                       AS stockCoverageDays,

        countIf(inventory_status = 'Overstock')                                AS excessInventoryItems,
        sumIf(stock_value, inventory_status = 'Overstock')
                                                                                AS excessInventoryValue,

        countIf(inventory_status IN ('Out of Stock', 'Low Stock'))             AS stockOutRiskItems,
        sumIf(stock_value, inventory_status IN ('Out of Stock', 'Low Stock'))
                                                                                AS stockOutRiskValue,

        countIf(sales_period = 0)                                              AS neverSoldItems,
        sumIf(stock_value, sales_period = 0)                                   AS neverSoldValue,

        round(
            countIf(inventory_status = 'Overstock')
            / nullIf(count(), 0) * 100,
            1
        )                                                                       AS overstockPercentage,

        countIf(inventory_status = 'Low Stock')                                AS reorderNeededItems
    FROM product_status
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

    debug_risk_query = f"""
    WITH latest_store_product AS (
        SELECT
            toString(urunkodu)                           AS sku,
            toString(urunismi)                           AS product_name,
            if(length(trim(toString(hier2_ad))) > 0, toString(hier2_ad), toString(reyonkodu)) AS category,
            toString(magazakodu)                         AS store,
            greatest(toFloat64(stok), 0)                 AS stock_level,
            greatest(toFloat64(degerlenmisstok), 0)      AS stock_value,
            greatest(toFloat64(roll_mean_7), 0)          AS forecast_daily
        FROM {table_name}
        WHERE {where_sql}
        ORDER BY tarih DESC
        LIMIT 1 BY urunkodu, reyonkodu, magazakodu
    ),
    sales_period AS (
        SELECT
            toString(urunkodu)                           AS sku,
            if(length(trim(toString(hier2_ad))) > 0, toString(hier2_ad), toString(reyonkodu)) AS category,
            toString(magazakodu)                         AS store,
            sumIf(
                satismiktari,
                tarih >= addDays({anchor_date}, -{safe_days} + 1) AND tarih <= {anchor_date}
            ) AS sales_period
        FROM {table_name}
        WHERE {where_sql}
        GROUP BY sku, category, store
    ),
    store_status AS (
        SELECT
            l.sku                                         AS sku,
            l.store                                       AS store,
            any(l.product_name)                           AS product_name,
            sum(l.stock_level)                            AS stock_level,
            sum(l.stock_value)                            AS stock_value,
            sum(greatest(l.forecast_daily, 0))            AS forecast_daily,
            sum(coalesce(s.sales_period, 0))              AS sales_period,
            multiIf(
                sum(l.stock_level) = 0, 'Out of Stock',
                sum(greatest(l.forecast_daily, 0)) = 0, 'In Stock',
                sum(l.stock_level) < sum(greatest(l.forecast_daily, 0)) * {risk_days}, 'Low Stock',
                sum(l.stock_level) > sum(greatest(l.forecast_daily, 0)) * {safe_days}, 'Overstock',
                'In Stock'
            ) AS store_inventory_status
        FROM latest_store_product l
        LEFT JOIN sales_period s
            ON l.sku = s.sku AND l.category = s.category AND l.store = s.store
        GROUP BY l.sku, l.store
    ),
    product_status AS (
        SELECT
            sku,
            any(product_name)                             AS product_name,
            sum(stock_level)                              AS stock_level,
            sum(stock_value)                              AS stock_value,
            sum(forecast_daily)                           AS forecast_daily,
            sum(sales_period)                             AS sales_period,
            multiIf(
                countIf(store_inventory_status = 'Out of Stock') = count() AND count() > 0, 'Out of Stock',
                (countIf(store_inventory_status = 'Out of Stock') > 0 OR countIf(store_inventory_status = 'Low Stock') > 0), 'Low Stock',
                countIf(store_inventory_status = 'Overstock') > 0, 'Overstock',
                'In Stock'
            ) AS inventory_status
        FROM store_status
        GROUP BY sku
    )
    SELECT
        sku,
        product_name,
        stock_level,
        forecast_daily,
        sales_period,
        inventory_status
    FROM product_status
    WHERE inventory_status IN ('Out of Stock', 'Low Stock')
    ORDER BY inventory_status ASC, stock_level ASC, sku ASC
    LIMIT 50
    """

    try:
        risk_rows = client.query(debug_risk_query).result_rows
        print(
            f"[inventory-kpis] stockOutRiskItems={int(stockOutRiskItems or 0)} "
            f"stockOutRiskValue={int(stockOutRiskValue or 0)} "
            f"riskRows={len(risk_rows)}"
        )
        for sku, product_name, stock_level, forecast_daily, sales_period, inventory_status in risk_rows:
            print(
                "[inventory-kpis] risk_item "
                f"sku={sku} "
                f"product={product_name} "
                f"stock={int(stock_level or 0)} "
                f"forecast_daily={float(forecast_daily or 0):.2f} "
                f"sales_period={int(sales_period or 0)} "
                f"status={inventory_status}"
            )
    except Exception as debug_exc:
        print(f"[inventory-kpis] risk debug query failed: {debug_exc}")

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
    store_ids: list[str] | None = None,
    region_ids: list[str] | None = None,
    category_ids: list[str] | None = None,
    limit: int = 5
) -> dict:
    """
    GET /api/forecast/similar-campaigns
    """
    table_name = _compat_table(table_name)

    where_clauses = [
        "toString(aktifPromosyonKodu) NOT IN ('', '0')",
        "aktifPromosyonAdi != 'Promosyon Yok'"
    ]

    if promotion_type:
        where_clauses.append(f"promo_type = '{_escape_sql_string(promotion_type)}'")

    if product_ids:
        where_clauses.append(
            "urunkodu IN (" + ",".join([f"'{p}'" for p in product_ids]) + ")"
        )

    if store_ids:
        where_clauses.append(
            "toString(magazakodu) IN (" + ",".join([f"'{s}'" for s in store_ids]) + ")"
        )

    if region_ids:
        where_clauses.append(
            "lowerUTF8(cografi_bolge) IN (" + _quote_sql(region_ids, lower=True) + ")"
        )

    if category_ids:
        where_clauses.append(
            "toString(reyonkodu) IN (" + _quote_sql(category_ids) + ")"
        )

    where_sql = "WHERE " + " AND ".join(where_clauses)

    query = f"""
    WITH campaign_stats AS (
        SELECT
            aktifPromosyonKodu                         AS campaign_id,
            any(aktifPromosyonAdi)                     AS name,
            min(tarih)                                 AS start_date,
            max(tarih)                                 AS end_date,

            any(promo_type) AS type,

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
    region_ids: Optional[List[str]] = None,
    category_ids: Optional[List[str]] = None,
    month: int = None,
    year: int = None,
    include_future: bool = False,
    future_count: int = 10,
) -> dict:
    """
    GET /api/forecast/calendar
    """
    raw_table_name = table_name
    table_name = _compat_table(table_name)
    anchor_date = _anchor_date_expr(raw_table_name)

    if month is None or year is None:
        raise ValueError("month ve year zorunludur")

    where_clauses = [
        "aktifPromosyonKodu IS NOT NULL"
    ]

    # 🔴 FIX: magazakodu UInt → toString + lower
    if store_ids:
        store_list = _quote_sql(store_ids, lower=True)
        where_clauses.append(
            f"lower(toString(magazakodu)) IN ({store_list})"
        )

    if region_ids:
        region_list = _quote_sql(region_ids, lower=True)
        where_clauses.append(
            f"lowerUTF8(cografi_bolge) IN ({region_list})"
        )

    if category_ids:
        category_list = _quote_sql(category_ids)
        where_clauses.append(
            f"toString(reyonkodu) IN ({category_list})"
        )

    where_clauses.append(f"toYear(tarih) = {year}")
    where_clauses.append(f"toMonth(tarih) = {month}")

    where_sql = " AND ".join(where_clauses)

    query = f"""
        SELECT
            toDate(tarih) AS event_date,
            toString(aktifPromosyonKodu) AS promo_id,
            any(aktifPromosyonAdi) AS promo_name,
            any(promo_type) AS promo_type,
            round(any(indirimYuzdesi), 0) AS discount
        FROM {table_name}
        WHERE {where_sql}
        GROUP BY
            event_date,
            promo_id
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

    if include_future and future_count > 0:
        future_where = [
            "aktifPromosyonKodu IS NOT NULL",
            f"toDate(tarih) >= {anchor_date}",
            f"toDate(tarih) <= addDays({anchor_date}, {int(future_count) - 1})",
        ]

        if store_ids:
            store_list = ", ".join(f"'{s.lower()}'" for s in store_ids)
            future_where.append(f"lower(toString(magazakodu)) IN ({store_list})")

        if region_ids:
            region_list = ", ".join(f"'{r.lower()}'" for r in region_ids)
            future_where.append(f"lowerUTF8(cografi_bolge) IN ({region_list})")

        if category_ids:
            category_list = ", ".join(f"'{c}'" for c in category_ids)
            future_where.append(f"toString(reyonkodu) IN ({category_list})")

        future_query = f"""
            SELECT
                toDate(tarih) AS event_date,
                toString(aktifPromosyonKodu) AS promo_id,
                any(aktifPromosyonAdi) AS promo_name,
                any(promo_type) AS promo_type,
                round(any(indirimYuzdesi), 0) AS discount
            FROM {table_name}
            WHERE {" AND ".join(future_where)}
            GROUP BY
                event_date,
                promo_id
            ORDER BY event_date ASC
        """

        future_rows = client.query(future_query).result_rows

        for event_date, promo_id, promo_name, promo_type, discount in future_rows:
            date_key = event_date.isoformat()
            existing_promos = calendar_map.setdefault(date_key, [])
            if not any(str(p.get("id")) == str(promo_id) for p in existing_promos):
                existing_promos.append({
                    "id": str(promo_id),
                    "name": promo_name,
                    "type": promo_type,
                    "discount": int(discount) if discount is not None else None
                })

        # If real forward data does not exist, synthesize upcoming promotions
        # using recent templates from the same filtered scope (V5-style fallback).
        anchor_row = client.query(
            f"SELECT max(toDate(tarih)) FROM {raw_table_name}"
        ).first_row
        today_date = anchor_row[0] if anchor_row and anchor_row[0] else date.today()
        has_upcoming = any(date.fromisoformat(d) >= today_date for d in calendar_map.keys())

        if not has_upcoming:
            template_where = ["aktifPromosyonKodu IS NOT NULL"]
            if store_ids:
                store_list = ", ".join(f"'{s.lower()}'" for s in store_ids)
                template_where.append(f"lower(toString(magazakodu)) IN ({store_list})")
            if region_ids:
                region_list = ", ".join(f"'{r.lower()}'" for r in region_ids)
                template_where.append(f"lowerUTF8(cografi_bolge) IN ({region_list})")
            if category_ids:
                category_list = ", ".join(f"'{c}'" for c in category_ids)
                template_where.append(f"toString(reyonkodu) IN ({category_list})")

            template_query = f"""
                SELECT
                    toString(aktifPromosyonKodu) AS promo_id,
                    any(aktifPromosyonAdi) AS promo_name,
                    any(promo_type) AS promo_type,
                    round(avg(indirimYuzdesi), 0) AS avg_discount,
                    count() AS cnt
                FROM {table_name}
                WHERE {" AND ".join(template_where)}
                GROUP BY promo_id
                ORDER BY cnt DESC
                LIMIT 12
            """

            template_rows = client.query(template_query).result_rows

            templates = []
            for promo_id, promo_name, promo_type, avg_discount, _cnt in template_rows:
                promo_id_text = str(promo_id)
                promo_name_text = str(promo_name or "").strip()
                # skip no-promo / undefined labels
                if promo_id_text == "17":
                    continue
                if promo_name_text.lower() in {"", "tayin edilmedi"}:
                    continue
                templates.append({
                    "id": promo_id_text,
                    "name": promo_name_text,
                    "type": str(promo_type or "Diğer"),
                    "discount": int(avg_discount) if avg_discount is not None else None,
                })

            if not templates:
                templates = [
                    {"id": "6", "name": "GAZETE ILANI", "type": "Gazete İlanı", "discount": 15},
                    {"id": "10", "name": "KATALOG", "type": "Katalog", "discount": 8},
                    {"id": "12", "name": "Mağ.İçi Akt-FMCG", "type": "Diğer", "discount": 10},
                    {"id": "16", "name": "ZKAE", "type": "Diğer", "discount": 6},
                ]

            seed_src = f"{month}-{year}-{store_ids}-{region_ids}-{category_ids}-{future_count}"
            seed_val = int(hashlib.md5(seed_src.encode("utf-8")).hexdigest()[:8], 16)
            rng = random.Random(seed_val)

            campaign_count = min(max(4, int(future_count) // 2), 12)
            horizon_last = today_date + timedelta(days=int(future_count) - 1)

            for _ in range(campaign_count):
                tpl = templates[rng.randrange(len(templates))]
                start_offset = rng.randint(0, max(0, int(future_count) - 1))
                duration = rng.randint(1, min(7, int(future_count)))
                start_day = today_date + timedelta(days=start_offset)

                for step in range(duration):
                    day = start_day + timedelta(days=step)
                    if day > horizon_last:
                        break
                    date_key = day.isoformat()
                    existing_promos = calendar_map.setdefault(date_key, [])
                    if not any(str(p.get("id")) == tpl["id"] for p in existing_promos):
                        existing_promos.append({
                            "id": tpl["id"],
                            "name": tpl["name"],
                            "type": tpl["type"],
                            "discount": tpl["discount"],
                        })

    return {
        "events": [
            {"date": d, "promotions": promos}
            for d, promos in sorted(calendar_map.items(), key=lambda item: item[0])
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
    search: Optional[str] = None,
    status: Optional[str] = None,   # In Stock | Low Stock | Out of Stock | Overstock
    performance: Optional[str] = None,  # fast | slow
    days: int = 30,
    page: int = 1,
    limit: int = 25,
    sort_by: str = "stockValue",
    sort_order: str = "desc",
) -> dict:
    """
    GET /api/inventory/items
    """
    raw_table_name = table_name
    table_name = _compat_table(table_name)
    anchor_date = _anchor_date_expr(raw_table_name)
    safe_days = max(1, int(days))

    offset = (page - 1) * limit
    sort_order = "ASC" if sort_order.lower() == "asc" else "DESC"
    allowed_sort_fields = {
        "stockValue",
        "stockLevel",
        "forecastedDemand",
        "daysOfCoverage",
        "price",
        "todaysSales",
    }
    if sort_by not in allowed_sort_fields:
        sort_by = "stockValue"

    where_clauses = ["1 = 1"]

    if region_ids:
        regions = ", ".join(f"'{str(r).lower()}'" for r in region_ids)
        where_clauses.append(f"lower(cografi_bolge) IN ({regions})")

    normalized_store_ids = _normalize_filter_ids(store_ids)
    if normalized_store_ids:
        stores = ", ".join(f"'{s}'" for s in normalized_store_ids)
        where_clauses.append(f"toString(magazakodu) IN ({stores})")

    normalized_category_ids = _normalize_filter_ids(category_ids)
    if normalized_category_ids:
        cats = ", ".join(f"'{c}'" for c in normalized_category_ids)
        where_clauses.append(f"toString(reyonkodu) IN ({cats})")

    normalized_product_ids = _normalize_filter_ids(product_ids)
    if normalized_product_ids:
        prods = ", ".join(f"'{p}'" for p in normalized_product_ids)
        where_clauses.append(f"toString(urunkodu) IN ({prods})")

    if search:
        safe_search = str(search).lower().replace("'", "''")
        where_clauses.append(
            f"(lowerUTF8(toString(urunismi)) LIKE '%{safe_search}%' OR lowerUTF8(toString(urunkodu)) LIKE '%{safe_search}%')"
        )

    where_sql = " AND ".join(where_clauses)
    status_filter_sql = ""
    if status in {"Out of Stock", "Low Stock", "Overstock", "In Stock"}:
        status_filter_sql = f"HAVING status = '{status}'"

    performance_filter_sql = ""
    if performance == "fast":
        performance_filter_sql = "HAVING performanceCategory = 'fast'"
    elif performance == "slow":
        performance_filter_sql = "HAVING performanceCategory = 'slow'"
    elif performance == "none":
        performance_filter_sql = "HAVING performanceCategory = 'none'"

    aggregate_by_store = bool(normalized_product_ids) and normalized_store_ids and len(normalized_store_ids) == 1

    base_snapshot = f"""
        SELECT
            l.sku                     AS sku,
            l.category                AS category,
            l.categoryCode            AS categoryCode,
            l.store                   AS store,
            l.stockLevel              AS stockLevel,
            l.forecastDaily           AS forecastDaily,
            l.stockValue              AS stockValue,
            l.price                   AS price,
            l.productName             AS productName,
            a.todaysSales             AS todaysSales,
            a.salesPeriod             AS salesPeriod,
            a.lastRestockDate         AS lastRestockDate
        FROM (
            SELECT
                toString(urunkodu)     AS sku,
                if(length(trim(toString(hier2_ad))) > 0, toString(hier2_ad), toString(reyonkodu)) AS category,
                toString(reyonkodu)    AS categoryCode,
                toString(magazakodu)   AS store,
                greatest(toFloat64(stok), 0)            AS stockLevel,
                greatest(toFloat64(roll_mean_7), 0)     AS forecastDaily,
                greatest(toFloat64(degerlenmisstok), 0) AS stockValue,
                greatest(toFloat64(satisFiyati), 0)     AS price,
                urunismi               AS productName
            FROM {table_name}
            WHERE {where_sql}
            ORDER BY tarih DESC
            LIMIT 1 BY urunkodu, reyonkodu, magazakodu
        ) AS l
        LEFT JOIN (
            SELECT
                toString(urunkodu)     AS sku,
                toString(reyonkodu)    AS categoryCode,
                toString(magazakodu)   AS store,
                greatest(sumIf(satismiktari, tarih = {anchor_date}), 0) AS todaysSales,
                greatest(sumIf(satismiktari, tarih >= addDays({anchor_date}, -{safe_days} + 1) AND tarih <= {anchor_date}), 0) AS salesPeriod,
                maxIf(tarih, stok > 0) AS lastRestockDate
            FROM {table_name}
            WHERE {where_sql}
            GROUP BY urunkodu, reyonkodu, magazakodu
        ) AS a
        ON l.sku = a.sku AND l.categoryCode = a.categoryCode AND l.store = a.store
    """

    if aggregate_by_store:
        filtered_query = f"""
            SELECT
                sku                                                   AS id,
                sku                                                   AS sku,
                productName                                           AS productName,
                category                                              AS category,
                concat(store, '_', category, '_', sku)                AS productKey,

                stockLevel                                            AS stockLevel,
                round(forecastDaily * {safe_days}, 0)                 AS minStockLevel,
                round(forecastDaily * {int(days)}, 0)                 AS maxStockLevel,
                round(forecastDaily * 7, 0)                           AS reorderPoint,
                round(forecastDaily * {safe_days}, 0)                 AS forecastedDemand,

                stockValue                                            AS stockValue,
                round(stockLevel / nullIf(forecastDaily, 0), 1)       AS daysOfCoverage,

                multiIf(
                    stockLevel = 0, 'Out of Stock',
                    stockLevel < forecastDaily * {safe_days}, 'Low Stock',
                    stockLevel > forecastDaily * {int(days)}, 'Overstock',
                    'In Stock'
                )                                                     AS status,

                round(
                    (salesPeriod / {safe_days}) / nullIf(stockLevel, 0),
                    4
                )                                                     AS turnoverRate,

                lastRestockDate                                       AS lastRestockDate,
                5                                                     AS leadTimeDays,
                0                                                     AS quantityOnOrder,
                todaysSales                                           AS todaysSales,
                round(price, 2)                                       AS price,
                salesPeriod                                           AS periodSales,
                
                multiIf(
                    salesPeriod = 0, 'none',
                    (salesPeriod / {safe_days}) >= 5 OR ((salesPeriod / {safe_days}) / nullIf(stockLevel, 0)) >= 0.15, 'fast',
                    (salesPeriod / {safe_days}) <= 1.5 AND ((salesPeriod / {safe_days}) / nullIf(stockLevel, 0)) <= 0.03, 'slow',
                    'average'
                )                                                     AS performanceCategory
            FROM (
                {base_snapshot}
            )
            {status_filter_sql}
            {performance_filter_sql}
        """
        query = f"""
            {filtered_query}
            ORDER BY {sort_by} {sort_order}
            LIMIT {limit} OFFSET {offset}
        """
    else:
        filtered_query = f"""
            SELECT
                sku                                                   AS id,
                sku                                                   AS sku,
                productName                                           AS productName,
                category                                              AS category,
                sku                                                   AS productKey,

                stockLevelSum                                         AS stockLevel,
                round(fdDailySum * {safe_days}, 0)                    AS minStockLevel,
                round(fdDailySum * {int(days)}, 0)                    AS maxStockLevel,
                round(fdDailySum * 7, 0)                              AS reorderPoint,
                round(fdDailySum * {safe_days}, 0)                    AS forecastedDemand,

                stockValueSum                                         AS stockValue,
                round(stockLevelSum / nullIf(fdDailySum, 0), 1)       AS daysOfCoverage,

                multiIf(
                    stockLevelSum = 0, 'Out of Stock',
                    stockLevelSum < fdDailySum * {safe_days}, 'Low Stock',
                    stockLevelSum > fdDailySum * {int(days)}, 'Overstock',
                    'In Stock'
                )                                                     AS status,

                round(
                    (salesPeriodSum / {safe_days}) / nullIf(stockLevelSum, 0),
                    4
                )                                                     AS turnoverRate,

                lastRestockDateMax                                    AS lastRestockDate,
                5                                                     AS leadTimeDays,
                0                                                     AS quantityOnOrder,
                todaysSalesSum                                        AS todaysSales,
                round(priceAvg, 2)                                    AS price,
                salesPeriodSum                                        AS periodSales,
                
                multiIf(
                    salesPeriodSum = 0, 'none',
                    (salesPeriodSum / {safe_days}) >= 5 OR ((salesPeriodSum / {safe_days}) / nullIf(stockLevelSum, 0)) >= 0.15, 'fast',
                    (salesPeriodSum / {safe_days}) <= 1.5 AND ((salesPeriodSum / {safe_days}) / nullIf(stockLevelSum, 0)) <= 0.03, 'slow',
                    'average'
                )                                                     AS performanceCategory
            FROM (
                SELECT
                    sku,
                    any(productName)                                  AS productName,
                    any(category)                                     AS category,
                    sum(stockLevel)                                   AS stockLevelSum,
                    sum(stockValue)                                   AS stockValueSum,
                    sum(todaysSales)                                  AS todaysSalesSum,
                    sum(salesPeriod)                                  AS salesPeriodSum,
                    max(lastRestockDate)                              AS lastRestockDateMax,
                    avg(price)                                        AS priceAvg,
                    sum(toFloat64(forecastDaily))                     AS fdDailySum,
                    count()                                           AS storeCount,
                    countIf(stockLevel = 0)                           AS outStoreCount,
                    countIf(stockLevel > 0 AND forecastDaily > 0 AND stockLevel < forecastDaily * {safe_days}) AS lowStoreCount,
                    countIf(forecastDaily > 0 AND stockLevel > forecastDaily * {safe_days}) AS overStoreCount
                FROM (
                    {base_snapshot}
                )
                GROUP BY sku
            )
            {status_filter_sql}
            {performance_filter_sql}
        """
        query = f"""
            {filtered_query}
            ORDER BY {sort_by} {sort_order}
            LIMIT {limit} OFFSET {offset}
        """

    items = client.query(query).result_rows

    count_query = f"""
        SELECT countDistinct(sku)
        FROM (
            {filtered_query}
        )
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
                "stockLevel": max(0, int(r[5] or 0)),
                "minStockLevel": max(0, int(r[6] or 0)),
                "maxStockLevel": max(0, int(r[7] or 0)),
                "reorderPoint": max(0, int(r[8] or 0)),
                "forecastedDemand": max(0, int(r[9] or 0)),
                "stockValue": max(0, int(r[10] or 0)),
                "daysOfCoverage": max(0.0, float(r[11] or 0)),
                "status": r[12],
                "turnoverRate": max(0.0, float(r[13] or 0)),
                "lastRestockDate": r[14].isoformat() if r[14] else None,
                "leadTimeDays": r[15],
                "quantityOnOrder": r[16],
                "todaysSales": max(0, int(r[17] or 0)),
                "price": max(0.0, float(r[18] or 0)),
                "periodSales": max(0, int(r[19] or 0)),
                "performanceCategory": r[20] if len(r) > 20 else "average",
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
    include_future: bool = False,
    future_days: int = 0,
    daily_replenishment: int = 0,
) -> dict:
    """
    GET /api/inventory/stock-trends
    """
    raw_table_name = table_name
    table_name = _compat_table(table_name)
    anchor_date = _anchor_date_expr(raw_table_name)

    where_clauses = [
        f"tarih >= addDays({anchor_date}, -{int(days)} + 1)",
        f"tarih <= {anchor_date}",
    ]

    if region_ids:
        regions = ", ".join(f"'{str(r).lower()}'" for r in region_ids)
        where_clauses.append(f"lower(cografi_bolge) IN ({regions})")

    normalized_store_ids = _normalize_filter_ids(store_ids)
    if normalized_store_ids:
        stores = ", ".join(f"'{s}'" for s in normalized_store_ids)
        where_clauses.append(f"toString(magazakodu) IN ({stores})")

    normalized_category_ids = _normalize_filter_ids(category_ids)
    if normalized_category_ids:
        cats = ", ".join(f"'{c}'" for c in normalized_category_ids)
        where_clauses.append(f"toString(reyonkodu) IN ({cats})")

    normalized_product_ids = _normalize_filter_ids(product_ids)
    if normalized_product_ids:
        prods = ", ".join(f"'{p}'" for p in normalized_product_ids)
        where_clauses.append(f"toString(urunkodu) IN ({prods})")

    where_sql = " AND ".join(where_clauses)

    query = f"""
        SELECT
            toDate(tarih)                              AS date,
            sum(greatest(toFloat64(stok), 0))          AS actualStock,
            round(sum(greatest(toFloat64(roll_mean_7), 0)), 0)                 AS forecastDemand,
            round(sum(greatest(toFloat64(roll_mean_7), 0)) * {int(days)}, 0)   AS safetyStock
        FROM {table_name}
        WHERE {where_sql}
        GROUP BY date
        ORDER BY date ASC
    """

    rows = client.query(query).result_rows

    trends = [
        {
            "date": r[0].isoformat(),
            "actualStock": max(0, int(r[1] or 0)),
            "forecastDemand": max(0, int(r[2] or 0)),
            "safetyStock": max(0, int(r[3] or 0)),
            "isProjected": False,
        }
        for r in rows
    ]

    if include_future and future_days > 0:
        if trends:
            last_date = date.fromisoformat(trends[-1]["date"])
            projected_stock = trends[-1]["actualStock"]
            recent = trends[-7:] if len(trends) >= 7 else trends
            avg_forecast = int(
                round(sum(item["forecastDemand"] for item in recent) / max(len(recent), 1))
            )
        else:
            anchor_row = client.query(
                f"SELECT max(toDate(tarih)) FROM {raw_table_name}"
            ).first_row
            last_date = anchor_row[0] if anchor_row and anchor_row[0] else date.today()
            projected_stock = 0
            avg_forecast = 0

        projected_daily_demand = max(0, avg_forecast)
        replenishment = max(0, int(daily_replenishment))

        for i in range(1, int(future_days) + 1):
            next_date = last_date + timedelta(days=i)
            projected_stock = max(0, projected_stock + replenishment - projected_daily_demand)
            trends.append(
                {
                    "date": next_date.isoformat(),
                    "actualStock": max(0, int(projected_stock)),
                    "forecastDemand": max(0, int(projected_daily_demand)),
                    "safetyStock": max(0, int(round(projected_daily_demand * int(days)))),
                    "isProjected": True,
                }
            )

    return {"trends": trends}


from typing import List, Optional


def get_inventory_store_performance(
    client,
    table_name: str = "demoVerileri",
    region_ids: Optional[List[str]] = None,
    store_ids: Optional[List[str]] = None,
    category_ids: Optional[List[str]] = None,
    product_ids: Optional[List[str]] = None,
    days: int = 30,
) -> dict:
    """
    GET /api/inventory/store-performance
    """
    raw_table_name = table_name
    table_name = _compat_table(table_name)
    anchor_date = _anchor_date_expr(raw_table_name)

    where_clauses = ["1 = 1"]

    if region_ids:
        regions = ", ".join(f"'{str(r).lower()}'" for r in region_ids)
        where_clauses.append(f"lower(cografi_bolge) IN ({regions})")

    normalized_store_ids = _normalize_filter_ids(store_ids)
    if normalized_store_ids:
        stores = ", ".join(f"'{s}'" for s in normalized_store_ids)
        where_clauses.append(f"toString(magazakodu) IN ({stores})")

    normalized_category_ids = _normalize_filter_ids(category_ids)
    if normalized_category_ids:
        cats = ", ".join(f"'{c}'" for c in normalized_category_ids)
        where_clauses.append(f"toString(reyonkodu) IN ({cats})")

    normalized_product_ids = _normalize_filter_ids(product_ids)
    if normalized_product_ids:
        prods = ", ".join(f"'{p}'" for p in normalized_product_ids)
        where_clauses.append(f"toString(urunkodu) IN ({prods})")

    where_sql = " AND ".join(where_clauses)

    query = f"""
        WITH filtered AS (
            SELECT *
            FROM {table_name}
            WHERE {where_sql}
        ),
        store_meta AS (
            SELECT
                magazakodu,
                argMax(bulundugusehir, tarih) AS city_name,
                argMax(ilce, tarih) AS district
            FROM filtered
            GROUP BY magazakodu
        ),
        store_stock AS (
            SELECT
                magazakodu,
                sum(stock_latest) AS stockLevel
            FROM (
                SELECT
                    magazakodu,
                    urunkodu,
                    greatest(toFloat64(argMax(stok, tarih)), 0) AS stock_latest
                FROM filtered
                GROUP BY magazakodu, urunkodu
            )
            GROUP BY magazakodu
        ),
        store_sales AS (
            SELECT
                magazakodu,
                greatest(
                    sumIf(
                        satismiktari,
                        tarih >= addDays({anchor_date}, -{int(days)} + 1) AND tarih <= {anchor_date}
                    ),
                    0
                ) AS sales_period,
                countDistinctIf(
                    toDate(tarih),
                    tarih >= addDays({anchor_date}, -{int(days)} + 1) AND tarih <= {anchor_date}
                ) AS days_period
            FROM filtered
            GROUP BY magazakodu
        )

        SELECT
            toString(m.magazakodu)                                          AS storeId,
            if(
                lengthUTF8(trim(BOTH ' ' FROM coalesce(m.district, ''))) = 0,
                coalesce(m.city_name, toString(m.magazakodu)),
                concat(coalesce(m.city_name, toString(m.magazakodu)), ' - ', m.district)
            )                                                               AS storeName,
            s.stockLevel                                                    AS stockLevel,
            round(
                100 * coalesce(sa.sales_period, 0) /
                nullIf(coalesce(sa.sales_period, 0) + s.stockLevel, 0),
                2
            )                                                               AS sellThroughRate,
            round(
                coalesce(sa.sales_period, 0) / nullIf(coalesce(sa.days_period, 0), 0),
                0
            )                                                               AS dailySales,
            round(
                s.stockLevel /
                nullIf(
                    coalesce(sa.sales_period, 0) / nullIf(coalesce(sa.days_period, 0), 0),
                    0
                ),
                0
            )                                                               AS daysOfInventory,
            round(
                0.5 * (
                    100 * coalesce(sa.sales_period, 0) /
                    nullIf(coalesce(sa.sales_period, 0) + s.stockLevel, 0)
                )
                +
                0.5 * greatest(0, 100 - abs(
                    (
                        s.stockLevel /
                        nullIf(
                            coalesce(sa.sales_period, 0) / nullIf(coalesce(sa.days_period, 0), 0),
                            0
                        )
                    ) - {int(days)}
                )),
                2
            )                                                               AS storeEfficiency

        FROM store_meta m
        LEFT JOIN store_stock s USING (magazakodu)
        LEFT JOIN store_sales sa USING (magazakodu)
        WHERE s.stockLevel IS NOT NULL
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
