


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
