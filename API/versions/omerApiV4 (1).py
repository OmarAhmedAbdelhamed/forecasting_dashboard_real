


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
        # categoryId format: {storeValue}_{categoryValue}
        category_filters = []
        for cid in category_ids:
            store_val, category_val = cid.split("_", 1)
            category_filters.append(
                f"(toString(magazakodu) = '{store_val}' AND toString(sektorkodu) = '{category_val}')"
            )
        where_clauses.append("(" + " OR ".join(category_filters) + ")")

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





# ---------  overview

def get_dashboard_metrics(
    client,
    table_name: str = "demoVerileri",
    region_ids: list[str] | None = None,
    store_ids: list[str] | None = None,
    category_ids: list[str] | None = None
) -> dict:
    """
    Dashboard metrics
    Forecast = last 14 days mean (roll_mean_14)
    """

    where_clauses = ["tarih >= today() - 27"]

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
    WITH
    current_14 AS (
        SELECT
            avg(roll_mean_14)      AS forecast_unit,
            avg(roll_mean_14) * 14 AS forecast_value,
            sum(satismiktari)      AS actual_value
        FROM {table_name}
        WHERE {where_sql}
          AND tarih >= today() - 13
    ),
    previous_14 AS (
        SELECT
            avg(roll_mean_14) AS prev_forecast
        FROM {table_name}
        WHERE {where_sql}
          AND tarih BETWEEN today() - 27 AND today() - 14
    )
    SELECT
        round(
            (1 - abs(forecast_value - actual_value)
            / nullIf(actual_value, 0)) * 100, 1
        ) AS accuracy,

        round(
            (forecast_value - actual_value)
            / nullIf(actual_value, 0) * 100, 1
        ) AS gapToSales,

        forecast_value,
        forecast_unit,

        round(
            (forecast_unit - prev_forecast)
            / nullIf(prev_forecast, 0) * 100, 1
        ) AS forecastChange,

        actual_value
    FROM current_14
    CROSS JOIN previous_14
    """

    row = client.query(query).first_row

    if row is None:
        return {
            "accuracy": 0,
            "accuracyChange": 0,
            "forecastValue": 0,
            "forecastUnit": 0,
            "forecastChange": 0,
            "ytdValue": 0,
            "ytdChange": 0,
            "gapToSales": 0,
            "gapToSalesChange": 0
        }

    (
        accuracy,
        gap_to_sales,
        forecast_value,
        forecast_unit,
        forecast_change,
        actual_value
    ) = row

    return {
        "accuracy": float(accuracy or 0),
        "accuracyChange": 0.0,
        "forecastValue": int(forecast_value or 0),
        "forecastUnit": int(forecast_unit or 0),
        "forecastChange": float(forecast_change or 0),
        "ytdValue": int(actual_value or 0),
        "ytdChange": 0.0,
        "gapToSales": float(gap_to_sales or 0),
        "gapToSalesChange": 0.0
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
        avg(roll_mean_14) * 7                              AS plan
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
    weeks: int = 6
) -> dict:
    """
    Last N weeks historical comparison (aligned)
    """

    where_clauses = [f"tarih >= today() - {weeks * 7 + 7}"]

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
        dateDiff('week', toStartOfWeek(tarih), toStartOfWeek(today())) AS week_index,
        year(tarih)                                                    AS year,
        sum(satistutarikdvsiz)                                         AS revenue
    FROM {table_name}
    WHERE {where_sql}
    GROUP BY week_index, year
    HAVING week_index BETWEEN 0 AND {weeks - 1}
    ORDER BY week_index, year
    """

    rows = client.query(query).result_set

    weekly = {}

    for week_index, year, revenue in rows:
        label = f"hafta {-week_index}"
        weekly.setdefault(label, {"week": label})
        weekly[label][f"y{year}"] = int(revenue or 0)

    # sıralı döndür
    data = [weekly[k] for k in sorted(
        weekly.keys(),
        key=lambda x: int(x.split()[1])
    )]

    return {"data": data}

def get_product_promotions(
    client,
    magaza_kodu: int,
    urun_kodu: int,
    table_name: str = "demoVerileri"
) -> dict:
    """
    Detects promotions based on:
    - promosyonVar = 1
    - aktifPromosyonAdi
    - continuous date ranges
    """

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
        WHERE
            magazakodu = {magaza_kodu}
            AND urunkodu = {urun_kodu}
            AND promosyonVar = 1
            AND aktifPromosyonAdi IS NOT NULL
            AND aktifPromosyonAdi != 'Tayin edilmedi'
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
#---------------------

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


## 3. Forecasting Section (Pricing & Promotion Analysis)
from datetime import date

def get_forecast_promotion_history(
    client,
    product_ids: list[int],
    store_ids: list[int] | None = None,
    table_name: str = "demoVerileri"
) -> dict:

    if not product_ids:
        return {"history": []}

    where_clauses = [
        f"urunkodu IN ({', '.join(map(str, product_ids))})"
    ]

    if store_ids:
        where_clauses.append(
            f"magazakodu IN ({', '.join(map(str, store_ids))})"
        )

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
    GROUP BY
        urunkodu,
        magazakodu,
        promo_block_id
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

        net_profit = promo_revenue - total_cost
        margin_pct = (net_profit / promo_revenue * 100) if promo_revenue else 0

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
            "status": "Tamamlandi" if end_d < today else "Aktif"
        })

    return {"history": history}

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
    store_id: int,
    product_id: int,
    table_name: str = "demoVerileri"
) -> dict:

    query = f"""
    SELECT
        toWeek(tarih) AS week_no,
        concat('hafta ', toString(week_no)) AS week,

        sumIf(satistutarikdvsiz, yil = 2024) AS y2024,
        sumIf(satistutarikdvsiz, yil = 2025) AS y2025,
        sumIf(satistutarikdvsiz, yil = 2026) AS y2026

    FROM {table_name}
    WHERE
        magazakodu = {store_id}
        AND urunkodu = {product_id}
        AND yil IN (2024, 2025, 2026)

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
    store_id: int,
    product_id: int,
    table_name: str = "demoVerileri"
) -> dict:

    query = f"""
    SELECT
        ay,
        avg(roll_mean_21) AS forecast,
        avg(satismiktari) AS actual
    FROM {table_name}
    WHERE
        magazakodu = {store_id}
        AND urunkodu = {product_id}
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

    today = date.today()
    last_30_start = today - timedelta(days=30)
    prev_30_start = today - timedelta(days=60)
    prev_30_end   = today - timedelta(days=31)

    store_ids_sql = ",".join(map(str, store_ids))

    growth_filter = (
        f"growth >= {growth_threshold}"
        if type_ == "high"
        else f"growth <= -{growth_threshold}"
    )

    query = f"""
    WITH base AS (
        SELECT
            urunkodu,
            any(urunismi) AS product_name,
            magazakodu,
            any(reyonkodu) AS reyonkodu,
            sumIf(satismiktari, tarih >= toDate('{last_30_start}')) AS actual_sales,
            sumIf(
                satismiktari,
                tarih BETWEEN toDate('{prev_30_start}') AND toDate('{prev_30_end}')
            ) AS last_month_sales,
            avgIf(roll_mean_21, tarih >= toDate('{last_30_start}')) AS forecast
        FROM {table_name}
        WHERE magazakodu IN ({store_ids_sql})
        GROUP BY urunkodu, magazakodu
    ),
    calc AS (
        SELECT *,
            if(
                last_month_sales > 0,
                (actual_sales - last_month_sales) / last_month_sales * 100,
                0
            ) AS growth
        FROM base
    )
    SELECT
        urunkodu,
        product_name,
        magazakodu,
        reyonkodu,
        actual_sales,
        last_month_sales,
        forecast,
        growth
    FROM calc
    WHERE {growth_filter}
    ORDER BY growth DESC
    """

    rows = client.query(query).result_set

    products = []
    for (
        urunkodu,
        product_name,
        magazakodu,
        reyonkodu,
        actual_sales,
        last_month_sales,
        forecast,
        growth
    ) in rows:

        products.append({
            "id": str(urunkodu),
            "name": product_name,
            "growth": round(growth, 1),
            "type": "high" if growth >= 0 else "low",
            "category": category_map.get(int(reyonkodu), "DIGER"),
            "forecast": int(forecast or 0),
            "actualSales": int(actual_sales or 0),
            "lastMonthSales": int(last_month_sales or 0),
            "store": str(magazakodu)
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
    Inventory KPI hesaplama (ClickHouse uyumlu)
    """

    where = ["1=1"]

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

def get_inventory_stock_trends(
    client,
    region_ids=None,
    store_ids=None,
    category_ids=None,
    product_ids=None,
    days: int = 30,
    table_name: str = "demoVerileri"
) -> dict:
    """
    Aggregated stock trends endpoint.

    - actualStock      : sum(stok)
    - forecastDemand   : sum(roll_mean_21)  (21 günlük mean forecast)
    - safetyStock      : forecastDemand * 7  (7 günlük güvenlik stoğu – operasyonel varsayım)
    """

    where = ["1=1"]

    if region_ids:
        where.append(f"cografi_bolge IN ({','.join(map(str, region_ids))})")
    if store_ids:
        where.append(f"magazakodu IN ({','.join(map(str, store_ids))})")
    if category_ids:
        where.append(f"reyonkodu IN ({','.join(map(str, category_ids))})")
    if product_ids:
        where.append(f"urunkodu IN ({','.join(map(str, product_ids))})")

    where_sql = " AND ".join(where)

    query = f"""
    SELECT
        tarih                                                AS date,
        sum(stok)                                            AS actualStock,
        sum(roll_mean_21)                                    AS forecastDemand,
        sum(roll_mean_21) * 7                                AS safetyStock
    FROM {table_name}
    WHERE {where_sql}
      AND tarih >= today() - {days}
    GROUP BY tarih
    ORDER BY tarih
    """

    rows = client.query(query).result_set

    trends = []
    for date_, actual_stock, forecast_demand, safety_stock in rows:
        trends.append({
            "date": date_.strftime("%Y-%m-%d"),
            "actualStock": int(actual_stock or 0),
            "forecastDemand": int(forecast_demand or 0),
            "safetyStock": int(safety_stock or 0)
        })

    return {"trends": trends}

def get_inventory_store_performance(
    client,
    region_ids=None,
    store_ids=None,
    category_ids=None,
    product_ids=None,
    table_name: str = "demoVerileri"
) -> dict:
    """
    Store-level inventory performance metrics

    Metrics:
    - stockLevel        : sum(stok)
    - dailySales        : avg(satismiktari)
    - sellThroughRate   : sold_units / (sold_units + avg_stock)
    - daysOfInventory   : stockLevel / dailySales
    - storeEfficiency   : composite score (sellThroughRate * 0.6 + stock_turnover * 0.4)
    """

    where = ["1=1"]

    if region_ids:
        where.append(f"cografi_bolge IN ({','.join(map(str, region_ids))})")
    if store_ids:
        where.append(f"magazakodu IN ({','.join(map(str, store_ids))})")
    if category_ids:
        where.append(f"reyonkodu IN ({','.join(map(str, category_ids))})")
    if product_ids:
        where.append(f"urunkodu IN ({','.join(map(str, product_ids))})")

    where_sql = " AND ".join(where)

    query = f"""
    WITH base AS (
        SELECT
            magazakodu,
            any(bulundugusehir)                      AS city,
            sum(stok)                                AS stock_level,
            sum(satismiktari)                        AS sold_units,
            avg(satismiktari)                        AS daily_sales
        FROM {table_name}
        WHERE {where_sql}
        GROUP BY magazakodu
    )
    SELECT
        magazakodu,
        city,
        stock_level,
        sold_units,
        daily_sales,
        if(stock_level + sold_units > 0,
           (sold_units / (stock_level + sold_units)) * 100,
           0)                                       AS sell_through_rate,
        if(daily_sales > 0,
           stock_level / daily_sales,
           0)                                       AS days_of_inventory
    FROM base
    ORDER BY magazakodu
    """

    rows = client.query(query).result_set

    stores = []

    for (
        store_id,
        city,
        stock_level,
        sold_units,
        daily_sales,
        sell_through_rate,
        days_of_inventory
    ) in rows:

        # store efficiency (normalized heuristic score)
        stock_turnover = 1 / days_of_inventory if days_of_inventory > 0 else 0
        efficiency = (sell_through_rate * 0.6) + (stock_turnover * 40)

        stores.append({
            "storeId": str(store_id),
            "storeName": f"{city} - {store_id}",
            "stockLevel": int(stock_level or 0),
            "sellThroughRate": round(sell_through_rate or 0, 1),
            "dailySales": int(daily_sales or 0),
            "daysOfInventory": int(days_of_inventory or 0),
            "storeEfficiency": round(min(efficiency, 100), 1)
        })

    return {"stores": stores}

def get_inventory_alerts(
    client,
    region_ids=None,
    store_ids=None,
    severity: str | None = None,
    type_: str | None = None,
    table_name: str = "demoVerileri"
) -> dict:
    """
    Inventory alerts based on latest available day per product-store
    """

    where = ["1=1"]

    if region_ids:
        region_list = ",".join(f"'{r}'" for r in region_ids)
        where.append(f"cografi_bolge IN ({region_list})")
    if store_ids:
        where.append(f"magazakodu IN ({','.join(map(str, store_ids))})")

    where_sql = " AND ".join(where)

    query = f"""
    WITH latest AS (
        SELECT
            magazakodu,
            urunkodu,
            max(tarih) AS max_tarih
        FROM {table_name}
        WHERE {where_sql}
        GROUP BY magazakodu, urunkodu
    )
    SELECT
        d.tarih,
        d.magazakodu,
        d.urunkodu,
        d.urunismi,
        d.bulundugusehir,
        d.stok,
        d.satismiktari,
        d.roll_mean_21
    FROM {table_name} d
    INNER JOIN latest l
        ON d.magazakodu = l.magazakodu
       AND d.urunkodu = l.urunkodu
       AND d.tarih = l.max_tarih
    """

    rows = client.query(query).result_set

    alerts = []
    alert_id = 1

    for (
        tarih,
        magazakodu,
        urunkodu,
        urunismi,
        city,
        stok,
        satismiktari,
        roll_mean_21
    ) in rows:

        daily_sales = satismiktari or 0
        forecast = roll_mean_21 or 0

        alert_type = None
        alert_severity = None
        message = None
        recommendation = None
        action_type = None

        if stok <= 0:
            alert_type = "stockout"
            alert_severity = "high"
            message = "Stok tükendi. Acil tedarik gerekiyor."
            recommendation = "Yakın mağazalardan transfer veya acil sipariş önerilir."
            action_type = "reorder"

        elif daily_sales == 0:
            alert_type = "deadstock"
            alert_severity = "medium"
            message = "Ürün hiç satmıyor."
            recommendation = "Promosyon veya ürün revizyonu önerilir."
            action_type = "promotion"

        elif stok > daily_sales * 45 and daily_sales > 0:
            alert_type = "overstock"
            alert_severity = "medium"
            message = "Aşırı stok tespit edildi."
            recommendation = "Stok transferi veya kampanya önerilir."
            action_type = "transfer"

        elif stok <= daily_sales * 14 and daily_sales > 0:
            alert_type = "reorder"
            alert_severity = "low"
            message = "Yeniden sipariş seviyesi."
            recommendation = "Planlı sipariş oluşturulmalı."
            action_type = "reorder"

        elif forecast > 0 and daily_sales > forecast * 1.8:
            alert_type = "surge"
            alert_severity = "high"
            message = "Talep patlaması tespit edildi."
            recommendation = "Ek stok ve fiyat optimizasyonu önerilir."
            action_type = "review"

        if alert_type is None:
            continue

        if type_ and alert_type != type_:
            continue
        if severity and alert_severity != severity:
            continue

        alerts.append({
            "id": f"alert-INV-{alert_id:04d}",
            "type": alert_type,
            "sku": str(urunkodu),
            "productName": urunismi,
            "storeName": f"{city} - {magazakodu}",
            "message": message,
            "date": tarih.strftime("%b %d"),
            "severity": alert_severity,
            "metrics": {
                "currentStock": int(stok or 0),
                "threshold": int(daily_sales * 14) if daily_sales else 0,
                "forecastedDemand": int(forecast),
                "transferSourceStore": None,
                "transferQuantity": int(forecast * 0.5) if forecast else 0
            },
            "recommendation": recommendation,
            "actionType": action_type
        })

        alert_id += 1

    return {"alerts": alerts}

def get_alerts_summary(
    client,
    region_ids=None,
    store_ids=None,
    category_ids=None,
    growth_threshold=10,
    forecast_error_threshold=0.20
):
    where = ["1 = 1"]

    if region_ids:
        region_list = ",".join(f"'{r}'" for r in region_ids)
        where.append(f"cografi_bolge IN ({region_list})")

    if store_ids:
        store_list = ",".join(map(str, store_ids))
        where.append(f"magazakodu IN ({store_list})")

    if category_ids:
        category_list = ",".join(map(str, category_ids))
        where.append(f"kategori IN ({category_list})")

    where_clause = " AND ".join(where)

    query = f"""
    WITH base AS (
        SELECT
            urunkodu,
            magazakodu,
            sum(satismiktari) AS actual_sales,
            sum(roll_mean_21) AS forecast_sales,
            avg(stok) AS avg_stock
        FROM demoVerileri
        WHERE tarih >= today() - 30
          AND {where_clause}
        GROUP BY urunkodu, magazakodu
    ),
    metrics AS (
        SELECT
            *,
            if(actual_sales > 0,
               (actual_sales - forecast_sales) / actual_sales * 100,
               0) AS growth,
            if(actual_sales > 0,
               abs(actual_sales - forecast_sales) / actual_sales,
               0) AS forecast_error,
            if(actual_sales > 0,
               actual_sales / 30,
               0) AS daily_sales
        FROM base
    )
    SELECT
        countIf(growth <= -{growth_threshold})                       AS low_growth,
        countIf(growth >= {growth_threshold})                        AS high_growth,
        countIf(forecast_error >= {forecast_error_threshold})        AS forecast_errors,
        countIf(forecast_error >= {forecast_error_threshold} * 2)    AS critical_forecast_errors,

        countIf(avg_stock = 0)                                        AS stockout,
        countIf(avg_stock > daily_sales * 45 AND daily_sales > 0)    AS overstock,
        countIf(avg_stock <= daily_sales * 14 AND daily_sales > 0)   AS reorder
    FROM metrics
    """

    row = client.query(query).first_row

    (
        low_growth,
        high_growth,
        forecast_errors,
        critical_forecast_errors,
        stockout,
        overstock,
        reorder
    ) = row

    inventory_total = stockout + overstock + reorder
    total_alerts = (
        low_growth +
        high_growth +
        forecast_errors +
        inventory_total
    )

    return {
        "summary": {
            "lowGrowth": {
                "count": low_growth,
                "severity": "medium" if low_growth > 0 else "info"
            },
            "highGrowth": {
                "count": high_growth,
                "severity": "info"
            },
            "forecastErrors": {
                "count": forecast_errors,
                "criticalCount": critical_forecast_errors,
                "severity": "high" if critical_forecast_errors > 0 else "medium"
            },
            "inventory": {
                "count": inventory_total,
                "stockout": stockout,
                "overstock": overstock,
                "reorder": reorder,
                "severity": "high" if stockout > 0 else "medium"
            }
        },
        "totalAlerts": total_alerts
    }

def get_alerts_growth_products(
    client,
    type_: str,                     # "high" | "low"
    store_ids: list[int] | None = None,
    search: str | None = None,
    table_name: str = "demoVerileri",
    growth_threshold: float = 10.0
) -> dict:

    today = date.today()
    this_month_start = today.replace(day=1)
    last_month_start = (this_month_start - timedelta(days=1)).replace(day=1)

    where = ["1 = 1"]

    if store_ids:
        where.append(f"magazakodu IN ({','.join(str(s) for s in store_ids)})")

    if search:
        where.append(f"lower(urunismi) LIKE '%{search.lower()}%'")

    where_sql = " AND ".join(where)

    growth_filter = (
        f"growth >= {growth_threshold}"
        if type_ == "high"
        else f"growth <= -{growth_threshold}"
    )

    query = f"""
    WITH base AS (
        SELECT
            urunkodu,
            magazakodu,
            any(urunismi) AS product_name,
            any(ailekodu) AS category_code,
            sumIf(satismiktari, tarih >= toDate('{this_month_start}')) AS this_month_sales,
            sumIf(satismiktari,
                  tarih >= toDate('{last_month_start}')
              AND tarih <  toDate('{this_month_start}')) AS last_month_sales,
            avg(roll_mean_21) AS forecast
        FROM {table_name}
        WHERE {where_sql}
        GROUP BY urunkodu, magazakodu
    )
    SELECT
        urunkodu,
        product_name,
        category_code,
        forecast,
        this_month_sales,
        last_month_sales,
        if(last_month_sales > 0,
           (this_month_sales - last_month_sales) / last_month_sales * 100,
           0) AS growth,
        magazakodu
    FROM base
    WHERE {growth_filter}
    ORDER BY growth DESC
    """

    rows = client.query(query).result_set

    products = []

    for (
        urunkodu,
        product_name,
        category_code,
        forecast,
        this_month_sales,
        last_month_sales,
        growth,
        magazakodu
    ) in rows:

        products.append({
            "id": str(urunkodu),
            "name": product_name,
            "growth": round(growth, 1),
            "type": type_,
            "category": category_map.get(category_code, "DİĞER"),
            "forecast": int(forecast or 0),
            "actualSales": int(this_month_sales or 0),
            "lastMonthSales": int(last_month_sales or 0),
            "store": str(magazakodu)
        })

    return {"products": products}

from typing import List
from datetime import date, timedelta

def get_forecast_errors(
    client,
    store_ids: List[int] | None = None,
    search: str | None = None,
    severity: str | None = None,
    table_name: str = "demoVerileri"
) -> dict:

    today = date.today()
    past_30_days = today - timedelta(days=30)

    where = [f"tarih >= toDate('{past_30_days}')"]

    if store_ids:
        where.append(f"magazakodu IN ({','.join(str(s) for s in store_ids)})")

    if search:
        where.append(f"lower(urunismi) LIKE '%{search.lower()}%'")

    where_sql = " AND ".join(where)

    query = f"""
    SELECT
        urunkodu,
        any(urunismi) AS product_name,
        magazakodu,
        avg(roll_mean_21) AS forecast,
        sum(satismiktari) AS actual
    FROM {table_name}
    WHERE {where_sql}
    GROUP BY urunkodu, magazakodu
    """

    rows = client.query(query).result_set

    products = []

    for urunkodu, product_name, magazakodu, forecast, actual in rows:
        forecast = float(forecast or 0)
        actual = float(actual or 0)
        error = abs(forecast - actual)
        accuracy = max(0, 100 - (error / forecast * 100)) if forecast else 0
        bias = ((actual - forecast) / forecast * 100) if forecast else 0

        # Basit severity ataması
        if error > 50:
            sev = "critical"
        elif error > 30:
            sev = "high"
        elif error > 15:
            sev = "medium"
        else:
            sev = "low"

        # Filter by severity parametre gelirse
        if severity and sev != severity:
            continue

        products.append({
            "id": str(urunkodu),
            "name": product_name,
            "forecast": int(forecast),
            "actual": int(actual),
            "error": round(error, 1),
            "accuracy": round(accuracy, 1),
            "bias": round(bias, 1),
            "action": "review",
            "storeCode": str(magazakodu),
            "severity": sev
        })

    return {"products": products}



from typing import List
from datetime import date

def get_inventory_alerts(
    client,
    region_ids: List[str] | None = None,
    store_ids: List[int] | None = None,
    search: str | None = None,
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
