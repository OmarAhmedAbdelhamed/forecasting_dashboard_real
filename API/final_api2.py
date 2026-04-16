import importlib

import AUSTA_Func_Class
importlib.reload(AUSTA_Func_Class)
from AUSTA_Func_Class import AUSTA_Func_Class
au_instance = AUSTA_Func_Class()

from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import pandas as pd
import numpy as np
import pickle
import warnings
from typing import List, Optional
from datetime import date

warnings.filterwarnings("ignore", category=DeprecationWarning)
warnings.filterwarnings("ignore", category=FutureWarning)
pd.options.mode.chained_assignment = None
pd.set_option('display.max_columns',None);
pd.set_option("display.max_rows",None);

import clickhouse_connect
from dataclasses import dataclass
from typing import Optional
from datetime import datetime

from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class RequestModel(BaseModel):
    magazaKodu: int
    urunKodu: int
    tarihBaslangic: str
    tarihBitis: str
    ozelgunsayisi: int | None = None
    istenenIndirim: float | None = None
    istenenMarj: float | None = None
    istenenFiyat: float | None = None
    aktifPromosyonKodu: int | None = None


# ==================== functions ====================
def veri_cekme():
    client = clickhouse_connect.get_client(    
    host='omc970lbmm.germanywestcentral.azure.clickhouse.cloud',     
    port=8443,
    user='default',   
    password='Wp.77xy9ICM3H',
    secure=True)

    table_name = 'gokkusagi'

    # Tüm sütunları seçmek için SELECT * kullanıyoruz
    query = f"SELECT * FROM {table_name}"
    df_veri = client.query_df(query)

    dosya_yolu = r"veriler/satis_birlesikV7.parquet"
    df_veri = pd.read_parquet(dosya_yolu)

    return df_veri



def normalize_optional(x):
    if x is None:
        return None
    if isinstance(x, str) and x.strip().lower() in {"", "na", "nan", "null"}:
        return None
    return x



def row_request(req: RequestModel):
    row = {
        "magazaKodu": req.magazaKodu,
        "urunKodu": req.urunKodu,
        "tarihBaslangic": req.tarihBaslangic,
        "tarihBitis": req.tarihBitis,
        "ozelgunsayisi": normalize_optional(req.ozelgunsayisi),
        "istenenIndirim": normalize_optional(req.istenenIndirim),
        "istenenMarj": normalize_optional(req.istenenMarj),
        "istenenFiyat": normalize_optional(req.istenenFiyat),
        "aktifPromosyonKodu": normalize_optional(req.aktifPromosyonKodu)
    }
    return pd.DataFrame([row]).replace({None: np.nan})



def fiyat_hesapla(df_input, df_veri):
    df_input    = df_input.copy()
    row         = df_input.iloc[0]

    mk = row["magazaKodu"]
    uk = row["urunKodu"]
    t0 = pd.to_datetime(row["tarihBaslangic"])

    df_veri = df_veri.copy()
    df_veri["tarih"] = pd.to_datetime(df_veri["tarih"])

    sub = df_veri[(df_veri["magazakodu"] == mk) & (df_veri["urunkodu"] == uk)]
    idx = (sub["tarih"] - t0).abs().idxmin()

    base_fiyat      = sub.loc[idx, "satisFiyati"]
    ham_fiyat       = sub.loc[idx, "maliyetFiyati"]

    df_input["hamFiyat"] = ham_fiyat
    hedef_fiyat     = row["istenenFiyat"]
    hedef_indirim   = row["istenenIndirim"]
    hedef_marj      = row["istenenMarj"]

    if pd.notna(hedef_fiyat):
        df_input.at[0, "istenenFiyat"]      = hedef_fiyat
        df_input.at[0, "istenenIndirim"]    = (1 - (hedef_fiyat / base_fiyat)) * 100
        df_input.at[0, "istenenMarj"]       = hedef_fiyat - ham_fiyat
        return df_input

    if pd.notna(hedef_indirim):
        hedef_fiyat = base_fiyat * (1 - hedef_indirim / 100)
        df_input.at[0, "istenenFiyat"]      = hedef_fiyat
        df_input.at[0, "istenenIndirim"]    = hedef_indirim
        df_input.at[0, "istenenMarj"]       = hedef_fiyat - ham_fiyat
        return df_input

    if pd.notna(hedef_marj):
        hedef_fiyat = ham_fiyat + hedef_marj
        df_input.at[0, "istenenFiyat"] = hedef_fiyat
        df_input.at[0, "istenenIndirim"] = (1 - (hedef_fiyat / base_fiyat)) * 100
        df_input.at[0, "istenenMarj"] = hedef_marj
        return df_input

    return df_input



def haftalari_bulma(tarihBaslangic, tarihBitis):
    start   = pd.to_datetime(tarihBaslangic).normalize()
    end     = pd.to_datetime(tarihBitis).normalize()

    df      = pd.DataFrame({"tarih": pd.date_range(start, end, freq="D")})

    iso = df["tarih"].dt.isocalendar()
    df["year"] = iso.year
    df["week"] = iso.week

    # ISO week_start (Pazartesi)
    df["week_start"] = pd.to_datetime(df["year"].astype(str) + df["week"].astype(str).str.zfill(2) + "1",format="%G%V%u")

    counts = df["week_start"].value_counts().sort_index()
    return {d.strftime("%Y-%m-%d"): int(c) for d, c in counts.items()}



def farkli_haftalar(df_input, haftalar_dict):
    rows = []
    for ws, gun_sayisi in haftalar_dict.items():
        r = df_input.copy()
        r["week_start"] = pd.to_datetime(ws)

        iso = r["week_start"].dt.isocalendar()
        r["year"] = iso.year
        r["week"] = iso.week

        r["tahmin_gun_sayisi"] = gun_sayisi
        rows.append(r)
    df_input_days = pd.concat(rows, ignore_index=True)
    df_input_days.drop(columns=["tarihBaslangic","tarihBitis"], inplace=True)
    df_input_days.rename(columns={"ozelgunsayisi": "ozelgun_sum", "istenenIndirim": "indirimYuzdesi_mean", "istenenFiyat": "satisFiyati_mean"}, inplace=True)
    return df_input_days



def weekly_lag(df_veri):
    df = df_veri.copy()
    df["tarih"] = pd.to_datetime(df["tarih"])
    iso         = df["tarih"].dt.isocalendar()
    df["year"]  = iso.year
    df["week"]  = iso.week
    df["week_start"] = pd.to_datetime(df["year"].astype(str) + df["week"].astype(str).str.zfill(2) + "1",format="%G%V%u")


    hava_map = {"clear-day": 0, "partly-cloudy-day": 1, "cloudy": 2, "rain": 3, "snow": 4}
    df["iconkod"] = df["icon"].map(hava_map)
    df["ozelgun"] = (df["ozel_gun_kodu"] != 0).astype(int)


    weekly = df.groupby(
        ["year", "week", "magazakodu", "urunkodu"],
        as_index=False
    ).agg(
        satisMiktari_sum    =("satismiktari", "sum"),
        satisMiktari_max    =("satismiktari", "max"),
        satisMiktari_min    =("satismiktari", "min"),
        markaAdi            =('markaAdi', 'last'),

        hier1_kod           =('hier1_kod', 'last'),
        hier2_kod           =('hier2_kod', 'last'),
        hier3_kod           =('hier3_kod', 'last'),

        aktifPromosyonKodu  =('aktifPromosyonKodu', 'max'),
        promotion_sum       =('indirimVar', 'sum'),
        il                  =('il', 'last'),
        ilce                =('ilce', 'last'),
        magazaAdi           =('magazaAdi', 'last'),

        ozelgun_sum         =('ozelgun', 'sum'),
        temperature_mean    =('temp', 'mean'),
        iconkod_mean        =('iconkod', 'mean'),

        satisKdvsiz_mean    =('satistutarikdvsiz', 'mean'),
        satisFiyati_mean    =('satisFiyati', 'mean'),
        maliyetFiyati_mean  =('maliyetFiyati', 'mean'),
        indirimYuzdesi_mean =('indirimYuzdesi', 'mean'),
        tufe_mean           =('tufe', 'mean'),

        week_start          =("week_start", "last")
    ).sort_values(["magazakodu","urunkodu","year","week"])



    cat_columns     = ['magazakodu', 'magazaAdi', 'il', 'ilce', 'urunkodu', 'urunAdi', 'markaAdi', 'aktifPromosyonKodu',
                    'hier1_kod', 'hier1_ad', 'hier2_kod', 'hier2_ad', 'hier3_kod', 'hier3_ad', 'ozel_gun_kodu', 'icon']
    
    for col in cat_columns:
        if col in weekly.columns:  
            weekly[col] = weekly[col].astype(str).astype('object')

    group_cols = ["magazakodu","urunkodu"]

    weekly["satisMiktari_sum_lag_1w"] = weekly.groupby(group_cols)["satisMiktari_sum"].shift(1)
    weekly["satisMiktari_sum_lag_2w"] = weekly.groupby(group_cols)["satisMiktari_sum"].shift(2)
    weekly["satisMiktari_max_lag_1w"] = weekly.groupby(group_cols)["satisMiktari_max"].shift(1)
    weekly["satisMiktari_max_lag_2w"] = weekly.groupby(group_cols)["satisMiktari_max"].shift(2)
    weekly["satisMiktari_min_lag_1w"] = weekly.groupby(group_cols)["satisMiktari_min"].shift(1)
    weekly["satisMiktari_min_lag_2w"] = weekly.groupby(group_cols)["satisMiktari_min"].shift(2)
    weekly["satisFiyati_mean_lag_1w"] = weekly.groupby(group_cols)["satisFiyati_mean"].shift(1)
    weekly["satisFiyati_mean_lag_2w"] = weekly.groupby(group_cols)["satisFiyati_mean"].shift(2)

    # past target encoding
    te_cols     = ['urunkodu', 'magazakodu','markaAdi', 'hier1_kod', 'hier2_kod', 'hier3_kod']
    target_col  = "satisMiktari_sum"
    date_col    = "week_start"

    for col in te_cols:
        keys = list(dict.fromkeys(["magazakodu", col]))
        group_cols = keys + [date_col]

        tmp = (weekly.groupby(keys + [date_col], as_index=False).agg(cat_week_target=(target_col, "mean")).sort_values(keys + [date_col]))

        g = tmp.groupby(keys)["cat_week_target"]
        tmp["_cum_sum"] = g.cumsum()
        tmp["_cum_cnt"] = g.cumcount()
        tmp[f"{col}_te_all"] = (tmp["_cum_sum"] - tmp["cat_week_target"]) / tmp["_cum_cnt"].replace(0, np.nan)
        tmp.drop(columns=["_cum_sum","_cum_cnt"], inplace=True)

        tmp[f"{col}_te_1w"] = g.shift(1)

        weekly = weekly.merge(
            tmp[keys + [date_col, f"{col}_te_all", f"{col}_te_1w"]],
            on=keys + [date_col],
            how="left")

    df_weekly = weekly.copy()
    return df_weekly



def inputu_doldurma(df_input_days, df_weekly):
    with open("Pickles/columns_dict.pkl", "rb") as file:
        columns_dict = pickle.load(file)
    columns = columns_dict["train1"]

    df_input_days["magazaKodu"] = df_input_days["magazaKodu"].astype(str).astype('object')
    df_input_days["urunKodu"]   = df_input_days["urunKodu"].astype(str).astype('object')


    df_out = pd.DataFrame(columns=columns, index=range(len(df_input_days)))
    df_out[df_input_days.columns] = df_input_days.values
    df_veri = df_weekly.copy()

    # tarih kolonlarını datetime yap
    df_veri["tarih"]        = pd.to_datetime(df_veri["week_start"])
    df_out["week_start"]    = pd.to_datetime(df_out["week_start"])
    df_out["istenenMarj"]   = df_out["satisFiyati_mean"] - df_out["hamFiyat"]

    df_out.loc[df_out["aktifPromosyonKodu"] != 0, "promotion_sum"] = df_out["tahmin_gun_sayisi"]
    df_out.loc[df_out["aktifPromosyonKodu"] == 0, "promotion_sum"] = 0


    # df_veri’de olan ve df_out’ta da bulunan kolonları hedefle
    common_cols = [c for c in df_out.columns if c in df_veri.columns]

    for i, row in df_out.iterrows():
        mk = row["magazaKodu"]
        uk = row["urunKodu"]
        t0 = row["week_start"]

        sub = df_veri[(df_veri["magazakodu"] == mk) & (df_veri["urunkodu"] == uk)]
        if sub.empty:
            print(f"Uyarı: magazaKodu={mk} ve urunKodu={uk} için veri bulunamadı. Bu satır atlanacak.")
            continue

        sub = sub.dropna(subset=["tarih"])
        if sub.empty:
            print(f"Uyarı: magazaKodu={mk} ve urunKodu={uk} için tarih bilgisi eksik. Bu satır atlanacak.")
            continue

        idx = (sub["tarih"] - t0).abs().idxmin()

        for col in common_cols:
            if pd.isna(row[col]):
                df_out.at[i, col] = sub.loc[idx, col]

    df_out["istenenMarj"] = df_out["satisFiyati_mean"] - df_out["hamFiyat"]
    return df_out



def prediction_pipeline(df_input_days_hedef):
    def pickle_loading():
        # Kaydedilmiş modellerin yüklenmesi
        models_dict = {}
        with open("Pickles/catboost_trained_model.pkl", "rb") as file:
            models_dict["catboost"] = pickle.load(file)

        with open("Pickles/lightgbm_trained_model.pkl", "rb") as file:
            models_dict["lightgbm"] = pickle.load(file)

        with open("Pickles/columns_dict.pkl", "rb") as file:
            columns_dict    = pickle.load(file)

        with open("Pickles/train_num_data.pkl", "rb") as file:
            train_num_data  = pickle.load(file)

        return models_dict, columns_dict, train_num_data


    def catboost_regression_model_test(X, catboost_model):
        # Tahmin yap
        predictions = catboost_model.predict(X)

        # Tahminleri test setine ekle
        test_indices = X.index.tolist()
        X["AI Prediction CatBoost"] = np.nan
        X.loc[test_indices, "AI Prediction CatBoost"] = predictions

        return X['AI Prediction CatBoost']


    def lightgbm_regression_model_test(X, lightgbm_model):
        # Tahmin yapma
        predictions = lightgbm_model.predict(X)

        # Tahmin sonu?lar?n? test setine ekle
        test_indices = X.index.tolist()
        X["AI Prediction LightGBM"] = np.nan  
        X.loc[test_indices, "AI Prediction LightGBM"] = predictions

        return X['AI Prediction LightGBM']


    def supervised_model_test(train_num_data, df_test_verisi, models_dict, columns_dict):
        df_test         = df_test_verisi.copy()
        df_handled      = df_test.copy()

        df_handled      = df_handled[columns_dict["train1"]]

        numeric_cols    = df_handled.select_dtypes(include=['number']).columns
        for col in numeric_cols:
            if 'float' in str(df_handled[col].dtype):
                df_handled[col] = df_handled[col].astype('float32')
            elif 'int' in str(df_handled[col].dtype):
                df_handled[col] = df_handled[col].astype('int32')

        numeric_df                  = df_handled.select_dtypes(include=['float32', 'int32', 'bool'])
        datetime_df                 = df_handled.select_dtypes(include=['datetime64'])
        categoric_df                = df_handled.select_dtypes(include=['object','category'])

        # Ensure categorical columns have string categories for CatBoost
        for col in categoric_df.columns:
            if categoric_df[col].dtype.name == 'category':
                categoric_df[col] = categoric_df[col].astype(str).astype('category')


        # cat boşları doldurdum
        try:
            categoric_df= categoric_df.fillna("yok")
            categoric_df= categoric_df.astype("category")
        except:
            categoric_df= categoric_df.astype("category")

        # Datetime extract yaptım
        test_datetime_df            = datetime_df.copy()
        test_date_col               = test_datetime_df.columns
        datetime_extracted          = au_instance.extract_datetime_features(test_datetime_df)
        datetime_processed          = datetime_extracted.drop(columns=test_date_col)

        # numeric boşları doldurdum
        supervised_processed_cat    = pd.concat([numeric_df,datetime_processed,categoric_df], axis=1)
        try:
            supervised_processed_cat    = au_instance.numeric_filling(supervised_processed_cat,train_num_data)
        except:
            pass


        Supervised_df_cat           = supervised_processed_cat.copy()
        print("shape of supervised_cat", Supervised_df_cat.shape, "\n")

        light_df    = Supervised_df_cat.copy()
        catboost_df = Supervised_df_cat.copy()

        lightgbm_result = lightgbm_regression_model_test(light_df, models_dict["lightgbm"])
        catboost_result = catboost_regression_model_test(catboost_df, models_dict["catboost"])

        supervised_final_df = pd.concat([df_test, lightgbm_result, catboost_result], axis=1)
        return  supervised_final_df
    

    df_request = df_input_days_hedef 
    models_dict, columns_dict, train_num_data = pickle_loading()

    dtypes = columns_dict.get("dtypes", {})
    for col, dtype in dtypes.items():
        if col in df_request.columns:
            if str(dtype).startswith("datetime"):
                df_request[col] = pd.to_datetime(df_request[col], errors="coerce")
            else:
                df_request[col] = df_request[col].astype(dtype, errors="ignore")
    
    df_request  = df_request.reset_index(drop=True)    
    df_request  = au_instance.eng_char(df_request.copy())
    df_sonuc1   = supervised_model_test(train_num_data ,df_request, models_dict, columns_dict)

    return df_sonuc1



def format_düzenleme(df):
    df_sonuc    = df.copy()
    df_out      = df_sonuc.copy()

    # tahminleri round int
    cols = ["AI Prediction LightGBM", "AI Prediction CatBoost", "tahmin_gun_sayisi"]
    for c in cols:
        if c in df_out.columns:
            df_out[c] = pd.to_numeric(df_out[c], errors="coerce")

    df_out["AI Prediction LightGBM"] = (df_out["AI Prediction LightGBM"]/7*df_out["tahmin_gun_sayisi"]).round(0).astype(int)
    df_out["AI Prediction CatBoost"] = (df_out["AI Prediction CatBoost"]/7*df_out["tahmin_gun_sayisi"]).round(0).astype(int)

    # isimleri JSON’a yakın olacak şekilde değiştir
    df_out = df_out.rename(columns={
        "AI Prediction LightGBM": "AI Tahmin",
        "magazaKodu": "magazaKodu",
        "urunKodu": "urunKodu",
        "week_start": "haftaBaslangicTarihi",
        "hamFiyat": "hamFiyat",
        'aktifPromosyonKodu': "aktifPromosyonKodu",
        "tahmin_gun_sayisi": "promosyonGunSayisi",
        "indirimYuzdesi_mean": "hedef_indirimYuzdesi",
        "satisFiyati_mean": "hedef_satisFiyati",
        "istenenMarj": "hedef_marj",
        "ozelgun_sum": "ozelGunSayisi"
    })

    # JSON benzeri çıktı
    result = df_out[[
        "magazaKodu", "urunKodu", "haftaBaslangicTarihi", "aktifPromosyonKodu", "promosyonGunSayisi", "AI Tahmin",
        "hedef_satisFiyati", "hedef_indirimYuzdesi", "hedef_marj", "hamFiyat", 
        "ozelGunSayisi", "iconkod_mean", "tufe_mean"
    ]].to_dict(orient="records")

    return result



@app.post("/predict")
def predict(req: RequestModel):
    df_veri             = veri_cekme()
    df_input            = row_request(req)
    df_input_hedef      = fiyat_hesapla(df_input, df_veri)
    haftalar            = haftalari_bulma(req.tarihBaslangic, req.tarihBitis)
    df_input_days       = farkli_haftalar(df_input_hedef, haftalar)
    df_weekly           = weekly_lag(df_veri)
    df_input_days_hedef = inputu_doldurma(df_input_days, df_weekly)
    df_sonuc            = prediction_pipeline(df_input_days_hedef)    
    df_sonuc_f          = format_düzenleme(df_sonuc)
    print(df_sonuc_f)
    return




if __name__ == "__main__":
    class Dummy:
        magazaKodu = 1
        urunKodu = 6461
        tarihBaslangic = "2026-01-12"
        tarihBitis = "2026-01-23"
        ozelgunsayisi = None
        istenenIndirim = None
        istenenMarj = None
        istenenFiyat = 65
        aktifPromosyonKodu = None

    req = Dummy()
    out = predict(req)
