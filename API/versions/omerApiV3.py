


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





# ---------  ikinci bolum

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
