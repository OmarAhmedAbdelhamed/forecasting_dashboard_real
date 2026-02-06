import pandas as pd
import numpy as np
import math
from datetime import datetime, timedelta

class InventoryAnalytics:
    def __init__(self, client, table_name="demoVerileri"):
        self.client = client
        self.table_name = table_name



    def yillik_satis_getir_urun_bazli(self, magazakodu, urunkodu):
        """
        Belirli bir mağaza ve ürün için yıllara göre günlük satış verilerini getirir.
        
        Args:
            magazakodu (str veya int): Mağaza kodu
            urunkodu (str veya int): Ürün kodu
            
        Returns:
            dict: {yil: pd.Series(tarih-indexli günlük satış)}
        """
        
        query = f"""
        SELECT 
            yil,
            tarih,
            satismiktari
        FROM {self.table_name}
        WHERE 
            magazakodu = '{magazakodu}'
            AND urunkodu = '{urunkodu}'
        ORDER BY 
            yil, tarih
        """
        
        df = self.client.query_df(query)
        
        daily_sales_by_year = {}
        for year, group in df.groupby('yil'):
            daily_sales_by_year[year] = pd.Series(data=group['satismiktari'].values, index=group['tarih'])
        
        return daily_sales_by_year
    
    
    def satis_payi_hiyerarsi(self,magazakodu, urunkodu, 
                             level="malgrubukodu", freq="D"):
        """
        Ürünün satış miktarı ve satistutarikdvsiz değerini hiyerarşi seviyelerinde
        ve farklı zaman periyotlarında getirir.
        
        Args:
            magazakodu (str veya int): Mağaza kodu
            urunkodu (str veya int): Ürün kodu
            level (str): "sektor", "reyonkodu", "ailekodu", "altailekodu", "malgrubukodu"
            freq (str): Zaman periyodu: 'D' = gün, 'W' = hafta, 'M' = ay, 'Y' = yıl
        
        Returns:
            pd.DataFrame: Tarih-indexli, aşağıdaki kolonları içerir:
                - satismiktari: ürünün satış miktarı
                - satismiktari_pct: ürünün satış miktarının yüzdesi
                - satistutarikdvsiz: ürünün satistutarikdvsiz değeri
                - satistutarikdvsiz_pct: ürünün satistutarikdvsiz değerinin yüzdesi
        """
        
        # 1️⃣ Ürünün bilgilerini çek
        product_info_query = f"""
        SELECT DISTINCT  reyonkodu, ailekodu, altailekodu, malgrubukodu
        FROM {self.table_name}
        WHERE magazakodu = '{magazakodu}' AND urunkodu = '{urunkodu}'
        """
        info_df = self.client.query_df(product_info_query)
        if info_df.empty:
            raise ValueError("Ürün bulunamadı!")
        info = info_df.iloc[0].to_dict()
        
        # 2️⃣ Filtreleme: aynı mağaza ve aynı seçilen hiyerarşi seviyesindeki grup
        level_value = info.get(level)
        if level_value is None:
            raise ValueError(f"Seçilen seviye '{level}' info içinde yok.")
        
        sales_query = f"""
        SELECT tarih, urunkodu, satismiktari, satistutarikdvsiz, reyonkodu, ailekodu, altailekodu, malgrubukodu
        FROM {self.table_name}
        WHERE magazakodu = '{magazakodu}' AND {level} = '{level_value}'
        ORDER BY tarih
        """
        df = self.client.query_df(sales_query)
        if df.empty:
            return pd.DataFrame()
        
        # 3️⃣ Tip uyumu
        df['urunkodu'] = df['urunkodu'].astype(int)
        urunkodu = int(urunkodu)
        
        # 4️⃣ Tarih sütunu datetime ve index
        df['tarih'] = pd.to_datetime(df['tarih'])
        df.set_index('tarih', inplace=True)
        
        # 5️⃣ Resample / zaman periyodu
        if freq in ['D', 'W', 'M', 'Y']:
            # Günlük/haftalık/aylık/yıllık toplamlar
            total_miktar = df['satismiktari'].resample(freq).sum()
            total_tutar = df['satistutarikdvsiz'].resample(freq).sum()
            
            # Ürün bazlı toplamlar
            product_miktar = df[df['urunkodu'] == urunkodu]['satismiktari'].resample(freq).sum()
            product_tutar = df[df['urunkodu'] == urunkodu]['satistutarikdvsiz'].resample(freq).sum()
        else:
            raise ValueError("freq parametresi: 'D', 'W', 'M', 'Y' olmalı")
        
        # 6️⃣ Yüzdelik hesaplama
        df_result = pd.DataFrame({
            'satismiktari': product_miktar,
            'satismiktari_pct': (product_miktar / total_miktar * 100).fillna(0),
            'satistutarikdvsiz': product_tutar,
            'satistutarikdvsiz_pct': (product_tutar / total_tutar * 100).fillna(0)
        })
        
        return df_result
    
    
    def hic_satmayan_urunler_sql(self, magazakodu,periods=None, freq="D"):
        """
        Reyon -> aile -> altaile -> malgrup -> urun bazında
        seçilen tarih aralığında hiç satmamış ürünleri zaman kırılımına göre getirir.
        
        Args:
            magazakodu (str/int)
            periods (list of tuples): [(start_date, end_date), ...], default: son 1, 2, 3 ve 4 haftalar
            freq (str): 'D','W','M','Y' → zaman kırılımı
        
        Returns:
            pd.DataFrame: Tarih ve hiyerarşi kırılımında hiç satmamış ürünler
        """
        
        # Default olarak son 1,2,3,4 hafta
        if periods is None:
            today = datetime.today()
            periods = [
                (today - timedelta(weeks=1), today),   # son 1 hafta
                (today - timedelta(weeks=2), today),   # son 2 hafta
                (today - timedelta(weeks=3), today),   # son 3 hafta
                (today - timedelta(weeks=4), today),   # son 4 hafta
            ]
        
        all_dfs = []
        
        for start_date, end_date in periods:
            start_date = pd.to_datetime(start_date)
            end_date = pd.to_datetime(end_date)
            
            start_str = start_date.strftime('%Y-%m-%d')
            end_str = end_date.strftime('%Y-%m-%d')
            
            query = f"""
            SELECT tarih, reyonkodu, ailekodu, altailekodu, malgrubukodu, urunkodu,
                   sum(satismiktari) AS toplam_miktar,
                   sum(satistutarikdvsiz) AS toplam_tutar
            FROM {self.table_name}
            WHERE magazakodu = '{magazakodu}'
              AND tarih >= '{start_str}'
              AND tarih <= '{end_str}'
            GROUP BY tarih, reyonkodu, ailekodu, altailekodu, malgrubukodu, urunkodu
            HAVING toplam_miktar = 0
            ORDER BY tarih, reyonkodu, ailekodu, altailekodu, malgrubukodu, urunkodu
            """
            
            df = self.client.query_df(query)
            if df.empty:
                continue
            
            df['tarih'] = pd.to_datetime(df['tarih'])
            df.set_index('tarih', inplace=True)
            
            levels = ["reyonkodu", "ailekodu", "altailekodu", "malgrubukodu", "urunkodu"]
            df_resampled = df.groupby(levels + [pd.Grouper(freq=freq)]).sum()[['toplam_miktar','toplam_tutar']].reset_index()
            
            # Hangi periyot olduğunu belirtmek için kolon ekle (sadece sayı)
            df_resampled['period'] = (end_date - start_date).days
            
            all_dfs.append(df_resampled)
        
        if all_dfs:
            return pd.concat(all_dfs).reset_index(drop=True)
        else:
            return pd.DataFrame()
    
    
    def stok_durumlari( self,magazakodu,stok_col="stok", periods=None, freq="D",
                       threshold_low=0, threshold_high=1000):
        """
        Reyon -> aile -> altaile -> malgrup -> urun bazında
        seçilen tarih aralığında düşük ve over stoklu ürünleri zaman kırılımına göre getirir.
        Sadece 'low' ve 'over' stokları döndürür.
        
        Args:
            magazakodu (str/int)
            stok_col (str): stok kolonu, default 'stok'
            periods (list of tuples): [(start_date, end_date), ...], default: son 1,2,3,4 haftalar
            freq (str): 'D','W','M','Y' → zaman kırılımı
            threshold_low (float): düşük stok eşik değeri (≤)
            threshold_high (float): overstok eşik değeri (≥)
        
        Returns:
            pd.DataFrame: Tarih ve hiyerarşi kırılımında düşük/over stoklu ürünler
        """
        
        # Default olarak son 1,2,3,4 hafta
        if periods is None:
            today = datetime.today()
            periods = [
                (today - timedelta(weeks=1), today),
                (today - timedelta(weeks=2), today),
                (today - timedelta(weeks=3), today),
                (today - timedelta(weeks=4), today),
            ]
        
        all_dfs = []
        levels = ["reyonkodu", "ailekodu", "altailekodu", "malgrubukodu", "urunkodu"]
        
        for start_date, end_date in periods:
            start_date = pd.to_datetime(start_date)
            end_date = pd.to_datetime(end_date)
            
            start_str = start_date.strftime('%Y-%m-%d')
            end_str = end_date.strftime('%Y-%m-%d')
            
            query = f"""
            SELECT tarih, reyonkodu, ailekodu, altailekodu, malgrubukodu, urunkodu,
                   sum({stok_col}) AS toplam_stok
            FROM {self.table_name}
            WHERE magazakodu = '{magazakodu}'
              AND tarih >= '{start_str}'
              AND tarih <= '{end_str}'
            GROUP BY tarih, reyonkodu, ailekodu, altailekodu, malgrubukodu, urunkodu
            ORDER BY tarih, reyonkodu, ailekodu, altailekodu, malgrubukodu, urunkodu
            """
            
            df = self.client.query_df(query)
            if df.empty:
                continue
            
            df['tarih'] = pd.to_datetime(df['tarih'])
            df.set_index('tarih', inplace=True)
            
            # Zaman kırılımı
            df_resampled = df.groupby(levels + [pd.Grouper(freq=freq)]).sum()[['toplam_stok']].reset_index()
            
            # Stok durumunu belirle
            conditions = [
                df_resampled['toplam_stok'] <= threshold_low,
                df_resampled['toplam_stok'] >= threshold_high
            ]
            choices = ['low', 'over']
            df_resampled['stok_durumu'] = np.select(conditions, choices, default='normal')
            
            # Sadece low ve over olanları filtrele
            df_resampled = df_resampled[df_resampled['stok_durumu'].isin(['low','over'])]
            
            # Hangi periyot olduğunu belirtmek için kolon ekle (sadece sayı)
            df_resampled['period'] = (end_date - start_date).days
            
            all_dfs.append(df_resampled)
        
        if all_dfs:
            return pd.concat(all_dfs).reset_index(drop=True)
        else:
            return pd.DataFrame()
    

    def satis_trendi(self,magazakodu,start_date=None, end_date=None, freq="D"):
        """
        Reyon -> aile -> altaile -> malgrup -> urun bazında
        seçilen tarih aralığında satış trendini verir.
        
        Args:
            magazakodu (str/int)
            start_date (str/datetime), default: 30 gün önce
            end_date (str/datetime), default: bugün
            freq (str): 'D','W','M','Y' → zaman kırılımı
        
        Returns:
            pd.DataFrame: Tarih ve hiyerarşi kırılımında toplam satış miktarı ve tutarı
        """
        
        if end_date is None:
            end_date = datetime.today()
        if start_date is None:
            start_date = end_date - timedelta(days=30)
        
        start_date = pd.to_datetime(start_date)
        end_date = pd.to_datetime(end_date)
        
        start_str = start_date.strftime('%Y-%m-%d')
        end_str = end_date.strftime('%Y-%m-%d')
        
        query = f"""
        SELECT tarih, reyonkodu, ailekodu, altailekodu, malgrubukodu, urunkodu,
               sum(satismiktari) AS toplam_miktar,
               sum(satistutarikdvsiz) AS toplam_tutar
        FROM {self.table_name}
        WHERE magazakodu = '{magazakodu}'
          AND tarih >= '{start_str}'
          AND tarih <= '{end_str}'
        GROUP BY tarih, reyonkodu, ailekodu, altailekodu, malgrubukodu, urunkodu
        ORDER BY tarih, reyonkodu, ailekodu, altailekodu, malgrubukodu, urunkodu
        """
        
        df = self.client.query_df(query)
        if df.empty:
            return pd.DataFrame()
        
        df['tarih'] = pd.to_datetime(df['tarih'])
        df.set_index('tarih', inplace=True)
        
        levels = ["reyonkodu", "ailekodu", "altailekodu", "malgrubukodu", "urunkodu"]
        
        df_trend = df.groupby(levels + [pd.Grouper(freq=freq)]).sum()[['toplam_miktar','toplam_tutar']].reset_index()
        
        return df_trend
    
    
    def satis_trend_safe(self,magazakodu, periods=['1W','2W','3W','4W'], short_days=2):
        """
        Hiyerarşi kırılımında kısa (n gün) ve uzun (periyot) trendleri hesaplar.
        Çalışması için veri yoksa atlar, boş DataFrame döndürmez.
        """
        
        query = f"""
        SELECT tarih, reyonkodu, ailekodu, altailekodu, malgrubukodu, urunkodu, satismiktari
        FROM {self.table_name}
        WHERE magazakodu = '{magazakodu}'
        ORDER BY urunkodu, tarih
        """
        df = self.client.query_df(query)
        if df.empty:
            print("ClickHouse'dan veri gelmedi.")
            return pd.DataFrame()
        
        df['tarih'] = pd.to_datetime(df['tarih'])
        
        results = []
        
        grouped = df.groupby(['reyonkodu','ailekodu','altailekodu','malgrubukodu','urunkodu'])
        
        for (reyon, aile, altaile, malgrup, urun), group in grouped:
            group = group.sort_values('tarih').set_index('tarih')
            
            # kısa dönem
            short_trend = None
            last_n = group['satismiktari'].tail(short_days)
            if len(last_n) == short_days:
                diffs = last_n.diff().iloc[1:]
                if (diffs > 0).all():
                    short_trend = 'artan'
                elif (diffs < 0).all():
                    short_trend = 'azalan'
            
            # uzun dönem
            total_sales_list = []
            for p in periods:
                # güvenli resample
                try:
                    total_sales = group['satismiktari'].resample(p).sum().sum()
                except:
                    total_sales = 0
                total_sales_list.append(total_sales)
            
            diffs_long = pd.Series(total_sales_list).diff().iloc[1:]
            long_trend = None
            if len(diffs_long) > 0:
                if (diffs_long > 0).all():
                    long_trend = 'artan'
                elif (diffs_long < 0).all():
                    long_trend = 'azalan'
            
            if short_trend or long_trend:
                results.append({
                    'reyonkodu': reyon,
                    'ailekodu': aile,
                    'altailekodu': altaile,
                    'malgrubukodu': malgrup,
                    'urunkodu': urun,
                    'short_trend_days': short_trend,
                    'long_trend_periods': long_trend,
                    'total_sales_per_period': total_sales_list
                })
        
        if results:
            return pd.DataFrame(results)
        else:
            print("Hiç trendli ürün bulunamadı (veri yetersiz olabilir).")
            return pd.DataFrame()
    
    
    def urun_bazli_gecmis_veri(self,magazakodu, urunkodu):
        """
        ClickHouse üzerinden belirli bir mağaza ve ürün için seçili kolonları getirir.
        
        Args:
            magazakodu (str/int)
            urunkodu (str/int)
        
        Returns:
            pd.DataFrame: Tarih-indexli, seçili kolonlar
        """
        
        # İstediğimiz kolonlar
        cols = [
            'tarih', 'satismiktari', 'satistutarikdvsiz', 'stok', 'degerlenmisstok',
            'satisFiyati', 'indirimYuzdesi', 'enflasyon', 'stok_out', 'stok_out_gun_sayisi',
            'ozelgun', 'ilce', 'avmcadde', 'cluster', 'cografi_bolge', 'sezon',
            'aktifPromosyonAdi', 'aktifPromosyonKodu', 'iconkod', 'temp',
            'lag_1','lag_7','roll_mean_7','roll_mean_14','roll_std_7','roll_std_14',
            'roll_median_7','roll_median_14','roll_min_7','roll_min_14','roll_max_7','roll_max_14'
        ]
        
        # ClickHouse sorgusu
        cols_str = ", ".join([c for c in cols if c != 'tarih']) + ", tarih"
        
        query = f"""
        SELECT {cols_str}
        FROM {self.table_name}
        WHERE magazakodu = '{magazakodu}' AND urunkodu = '{urunkodu}'
        ORDER BY tarih
        """
        
        df = self.client.query_df(query)
        
        if df.empty:
            print(f"Ürün {urunkodu} için veri yok.")
            return pd.DataFrame()
        
        # Tarih datetime ve index
        df['tarih'] = pd.to_datetime(df['tarih'])
        df.set_index('tarih', inplace=True)
        
        return df
    
    
    def urun_promosyon_aylari(self,magazakodu, urunkodu,
                              start_date=None, end_date=None,
                              aktifPromosyonAdi=None):
        """
        Ürün bazında verilen tarih aralığında yapılan promosyonların yıl/ay bazında listesini getirir.
        - AktifPromosyonKodu = 17 hariç tutulur
        - aktifPromosyonAdi verilirse sadece o promosyon filtrelenir
        
        Args:
            magazakodu (str/int)
            urunkodu (str/int)
            start_date (str/datetime | None): Başlangıç tarihi
            end_date (str/datetime | None): Bitiş tarihi
            aktifPromosyonAdi (str | None): Sadece bu promosyon
        
        Returns:
            pd.DataFrame
        """
    
        date_filter = ""
        if start_date is not None:
            start_str = pd.to_datetime(start_date).strftime('%Y-%m-%d')
            date_filter += f" AND tarih >= '{start_str}'"
        if end_date is not None:
            end_str = pd.to_datetime(end_date).strftime('%Y-%m-%d')
            date_filter += f" AND tarih <= '{end_str}'"
    
        promo_filter = ""
        if aktifPromosyonAdi is not None:
            promo_filter = f" AND aktifPromosyonAdi = '{aktifPromosyonAdi}'"
    
        query = f"""
        SELECT 
            toYear(tarih)  AS yil,
            toMonth(tarih) AS ay,
            aktifPromosyonAdi,
            aktifPromosyonKodu
        FROM {self.table_name}
        WHERE magazakodu = '{magazakodu}'
          AND urunkodu = '{urunkodu}'
          AND aktifPromosyonAdi != ''
          AND aktifPromosyonKodu != '17'
          {date_filter}
          {promo_filter}
        GROUP BY yil, ay, aktifPromosyonAdi, aktifPromosyonKodu
        ORDER BY yil, ay
        """
    
        df = self.lient.query_df(query)
    
        if df.empty:
            print("Seçilen tarih aralığında promosyon bulunamadı.")
            return pd.DataFrame()
    
        return df.reset_index(drop=True)
    
    
    def dusuk_satis_orani_urunler_periodik(
        self,
        magazakodu,
        periods=["1W", "2W", "3W", "4W"],
        min_ratio=0.01,
        stok_col="stok"
    ):
        """
        Geriye dönük periyotlara (1W,2W,3W,4W) göre
        satış / stok oranı düşük olan ürünleri getirir.
        
        satış_oranı = toplam_satış / ortalama_stok
        """
    
        today = pd.Timestamp.today().normalize()
        results = []
    
        for p in periods:
            # 🔹 periyodu güne çevir
            if p.endswith("W"):
                days = int(p.replace("W", "")) * 7
            elif p.endswith("D"):
                days = int(p.replace("D", ""))
            else:
                raise ValueError("Periyot formatı: '1W','2W','3W' olmalı")
    
            start_date = today - pd.Timedelta(days=days)
            start_str = start_date.strftime('%Y-%m-%d')
            end_str = today.strftime('%Y-%m-%d')
    
            query = f"""
            SELECT
                reyonkodu,
                ailekodu,
                altailekodu,
                malgrubukodu,
                urunkodu,
                sum(satismiktari) AS toplam_satis,
                avg({stok_col}) AS ortalama_stok,
                sum({stok_col}) AS toplam_stok
            FROM {self.table_name}
            WHERE magazakodu = '{magazakodu}'
              AND tarih >= '{start_str}'
              AND tarih <= '{end_str}'
            GROUP BY
                reyonkodu,
                ailekodu,
                altailekodu,
                malgrubukodu,
                urunkodu
            HAVING ortalama_stok > 0
            """
    
            df = self.client.query_df(query)
            if df.empty:
                continue
    
            df['satis_orani'] = df['toplam_satis'] / df['ortalama_stok']
            df['satis_orani_pct'] = df['satis_orani'] * 100
    
            df = df[df['satis_orani'] < min_ratio]
    
            if df.empty:
                continue
    
            df['period'] = p
            results.append(df)
    
        if results:
            return pd.concat(results).reset_index(drop=True)
        else:
            print("Belirtilen periyotlarda düşük satış oranlı ürün bulunamadı.")
            return pd.DataFrame()
    
    
    def en_cok_kar_100_urun(self,magazakodu, weeks=[1,2,3,4], top_n=100):
        """
        Belirli bir mağaza için ürün bazında haftalık net karı hesaplar ve
        en çok kar getiren ilk top_n ürünü listeler.
        
        Args:
            magazakodu (str/int): Mağaza kodu
            weeks (list): Haftalık dönemler [1,2,3,4]
            top_n (int): En çok kar getiren ürün sayısı
        
        Returns:
            pd.DataFrame: Hiyerarşik bazda en çok kar getiren ürünler
        """
        
        # 1️⃣ Veriyi çek
        query = f"""
        SELECT 
            tarih,
            reyonkodu,
            ailekodu,
            altailekodu,
            malgrubukodu,
            urunkodu,
            satismiktari,
            satistutarikdvsiz,
            stok,
            degerlenmisstok
        FROM `{self.table_name}`
        WHERE magazakodu = '{magazakodu}'
        """
        
        df = self.client.query_df(query)
        
        if df.empty:
            return pd.DataFrame()
        
        # 2️⃣ Ham fiyat ve net kar
        df['hamfiyat'] = df['degerlenmisstok'] / df['stok'].replace(0,1)
        df['netkar'] = (df['satistutarikdvsiz'] - df['hamfiyat']) * df['satismiktari']
        
        # 3️⃣ Tarihi datetime
        df['tarih'] = pd.to_datetime(df['tarih'])
        df = df.sort_values('tarih')
        
        # 4️⃣ Ürün bazında haftalık rolling kar hesapla
        result_rows = []
        for (reyon, aile, altaile, malgrubu, urun), group in df.groupby(['reyonkodu','ailekodu','altailekodu','malgrubukodu','urunkodu']):
            group = group.set_index('tarih').sort_index()
            week_kar = {}
            for w in weeks:
                week_kar[f'{w}W'] = group['netkar'].rolling(window=w*7, min_periods=1).sum().max()  # max kar
            result_rows.append({
                'reyon': reyon,
                'aile': aile,
                'altaile': altaile,
                'malgrubu': malgrubu,
                'urunkodu': urun,
                'max_kar_1W': week_kar['1W'],
                'max_kar_2W': week_kar['2W'],
                'max_kar_3W': week_kar['3W'],
                'max_kar_4W': week_kar['4W'],
                'top_kar': max(week_kar.values())  # toplam en yüksek kar
            })
        
        result_df = pd.DataFrame(result_rows)
        
        # 5️⃣ En çok kar getiren 100 ürün
        top_df = result_df.sort_values('top_kar', ascending=False).head(top_n)
        
        # 6️⃣ Hiyerarşik sıralama
        top_df = top_df.sort_values(['reyon','aile','altaile','malgrubu','urunkodu'])
        
        return top_df
    
    
    def en_az_kar_100_urun(self,magazakodu, weeks=[1,2,3,4], bottom_n=100):
        """
        Belirli bir mağaza için ürün bazında haftalık net karı hesaplar ve
        en az kar getiren (hatta zarar eden) ilk bottom_n ürünü listeler.
        """
        
        # 1️⃣ Veriyi çek
        query = f"""
        SELECT 
            tarih,
            reyonkodu,
            ailekodu,
            altailekodu,
            malgrubukodu,
            urunkodu,
            satismiktari,
            satistutarikdvsiz,
            stok,
            degerlenmisstok
        FROM `{self.table_name}`
        WHERE magazakodu = '{magazakodu}'
        """
        
        df = self.client.query_df(query)
        if df.empty:
            return pd.DataFrame()
    
        # 2️⃣ Ham fiyat & net kar
        df['hamfiyat'] = df['degerlenmisstok'] / df['stok'].replace(0, 1)
        df['netkar'] = (df['satistutarikdvsiz'] - df['hamfiyat']) * df['satismiktari']
    
        # 3️⃣ Tarih düzeni
        df['tarih'] = pd.to_datetime(df['tarih'])
        df = df.sort_values('tarih')
    
        # 4️⃣ Ürün bazında haftalık kar (min)
        result_rows = []
        for (reyon, aile, altaile, malgrubu, urun), group in df.groupby(
            ['reyonkodu','ailekodu','altailekodu','malgrubukodu','urunkodu']
        ):
            group = group.set_index('tarih').sort_index()
            week_kar = {}
    
            for w in weeks:
                week_kar[f'{w}W'] = (
                    group['netkar']
                    .rolling(window=w*7, min_periods=1)
                    .sum()
                    .min()      # 🔻 EN DÜŞÜK
                )
    
            result_rows.append({
                'reyon': reyon,
                'aile': aile,
                'altaile': altaile,
                'malgrubu': malgrubu,
                'urunkodu': urun,
                'min_kar_1W': week_kar['1W'],
                'min_kar_2W': week_kar['2W'],
                'min_kar_3W': week_kar['3W'],
                'min_kar_4W': week_kar['4W'],
                'bottom_kar': min(week_kar.values())  # en kötü dönem
            })
    
        result_df = pd.DataFrame(result_rows)
    
        # 5️⃣ En az kar eden / zarar eden 100 ürün
        bottom_df = result_df.sort_values('bottom_kar', ascending=True).head(bottom_n)
    
        # 6️⃣ Hiyerarşik sıralama
        bottom_df = bottom_df.sort_values(['reyon','aile','altaile','malgrubu','urunkodu'])
    
        return bottom_df
    
    
    def gunluk_stok_kar_ozeti(
        self,
        magazakodu,
        tarih                   # 'YYYY-MM-DD'
    ):
        """
        Verilen tarihte (tek gün snapshot):
        - stok < 0 olan ürün sayısı
        - stok > 0 olan ürün sayısı
        - TOPLAM ham maliyet (stok * hamfiyat)
        - TOPLAM net kar (SADECE satistutarikdvsiz > 0 olanlar)
        """
    
        query = f"""
        SELECT
            tarih,
            reyonkodu,
            ailekodu,
            altailekodu,
            malgrubukodu,
            urunkodu,
            stok,
            degerlenmisstok,
            satistutarikdvsiz
        FROM `{self.table_name}`
        WHERE magazakodu = '{magazakodu}'
          AND tarih = toDate('{tarih}')
        """
    
        df = self.client.query_df(query)
    
        if df.empty:
            return {}, pd.DataFrame()
    
        # Ürün sayıları
        stok_negatif = df[df['stok'] < 0]['urunkodu'].nunique()
        stok_pozitif = df[df['stok'] > 0]['urunkodu'].nunique()
    
        # Sadece stok > 0
        stoklu_df = df[df['stok'] > 0].copy()
    
        # Birim hamfiyat
        stoklu_df['hamfiyat'] = stoklu_df['degerlenmisstok'] / stoklu_df['stok']
    
        # TOPLAM ham maliyet (her zaman)
        stoklu_df['toplam_ham_maliyet'] = stoklu_df['hamfiyat'] * stoklu_df['stok']
    
        # 🔴 Net kâr SADECE satış varsa
        satisli_df = stoklu_df[stoklu_df['satistutarikdvsiz'] > 0].copy()
        # satisli_df['toplam_netkar'] = satisli_df['satistutarikdvsiz'].sum()
    
        satisli_df['toplam_netkar'] = (
            (satisli_df['satistutarikdvsiz'] - satisli_df['hamfiyat'])
            * satisli_df['stok']
        )
    
        # Özet
        ozet = {
            "tarih": tarih,
            "stok_0dan_kucuk_urun_sayisi": int(stok_negatif),
            "stok_0dan_buyuk_urun_sayisi": int(stok_pozitif),
            "toplam_urun_sayisi": int(df['urunkodu'].nunique()),
            "toplam_ham_maliyet": float(stoklu_df['toplam_ham_maliyet'].sum()),
            "toplam_netkar": float(satisli_df['toplam_netkar'].sum()) # hatali bunu cikart
        }
    
        # Detay tablo
        detay_df = stoklu_df[[
            'reyonkodu',
            'ailekodu',
            'altailekodu',
            'malgrubukodu',
            'urunkodu',
            'stok',
            'hamfiyat',
            'toplam_ham_maliyet'
        ]].sort_values(
            ['reyonkodu','ailekodu','altailekodu','malgrubukodu','urunkodu']
        )
    
        return ozet, detay_df
    
    
    def azalan_trend_yuksek_stok_urunler(
        self,
        tarih,
        kisa_ma=7,
        uzun_ma=30,
        stok_limit_gun=14,
        trend_esik=0.9
    ):
        """
        Satışı azalan + stoğu yüksek + değerlenmiş stok yükü olan ürünler
        Toplam değerlenmiş stok tutarını da döner
        """
    
        query = f"""
        SELECT
            tarih,
            urunkodu,
            reyonkodu,
            ailekodu,
            altailekodu,
            malgrubukodu,
            satismiktari,
            stok,
            degerlenmisstok
        FROM {self.table_name}
        WHERE tarih <= toDate('{tarih}')
        """
    
        df = self.client.query_df(query)
    
        if df.empty:
            return df, 0
    
        df = df.sort_values(["urunkodu", "tarih"])
    
        result = []
    
        min_kisa = max(1, kisa_ma // 3)
        min_uzun = max(3, uzun_ma // 3)
    
        for urun, g in df.groupby("urunkodu"):
            g = g.copy()
    
            g["ma_kisa"] = g["satismiktari"].rolling(
                window=kisa_ma,
                min_periods=min_kisa
            ).mean()
    
            g["ma_uzun"] = g["satismiktari"].rolling(
                window=uzun_ma,
                min_periods=min_uzun
            ).mean()
    
            son = g.iloc[-1]
    
            if (
                pd.isna(son["ma_kisa"]) or
                pd.isna(son["ma_uzun"]) or
                son["ma_kisa"] <= 0
            ):
                continue
    
            trend_orani = son["ma_kisa"] / son["ma_uzun"]
            stok_gun = son["stok"] / son["ma_kisa"]
    
            if trend_orani < trend_esik and stok_gun > stok_limit_gun:
                result.append({
                    "urunkodu": urun,
                    "reyonkodu": son["reyonkodu"],
                    "ailekodu": son["ailekodu"],
                    "altailekodu": son["altailekodu"],
                    "malgrubukodu": son["malgrubukodu"],
                    "mevcut_stok": son["stok"],
                    "toplam_degerlenmis_stok": son["degerlenmisstok"],
                    "ma_kisa": round(son["ma_kisa"], 2),
                    "ma_uzun": round(son["ma_uzun"], 2),
                    "trend_orani": round(trend_orani, 2),
                    "stok_kac_gun_yeter": round(stok_gun, 1),
                    "stok_gun_deger_yuku": round(
                        son["degerlenmisstok"] * stok_gun, 2
                    )
                })
    
        result_df = pd.DataFrame(result)
    
        if result_df.empty:
            return result_df, 0
    
        toplam_degerlenmis_stok = result_df["toplam_degerlenmis_stok"].sum()
    
        result_df = result_df.sort_values(
            ["stok_gun_deger_yuku", "trend_orani"],
            ascending=[False, True]
        )
    
        return result_df, round(toplam_degerlenmis_stok, 2)
    
    
    def stok_fazlasi_ve_stokout_riski_urunler(
        self,
        tarih,
        kisa_ma=7,
        uzun_ma=30,
        stok_fazla_limit_gun=14,
        stokout_limit_gun=3,
        trend_esik=0.9
    ):
        """
        - Satışı azalan + yüksek stok
        - Stok-out riski olan ürünler
        Her iki grup için degerlenmisstok ve toplamlarını döner
        """
    
        query = f"""
        SELECT
            tarih,
            urunkodu,
            reyonkodu,
            ailekodu,
            altailekodu,
            malgrubukodu,
            satismiktari,
            stok,
            degerlenmisstok
        FROM {self.table_name}
        WHERE tarih <= toDate('{tarih}')
        """
    
        df = self.client.query_df(query)
    
        if df.empty:
            return {}, {}
    
        df = df.sort_values(["urunkodu", "tarih"])
    
        fazla_list = []
        stokout_list = []
    
        min_kisa = max(1, kisa_ma // 3)
        min_uzun = max(3, uzun_ma // 3)
    
        for urun, g in df.groupby("urunkodu"):
            g = g.copy()
    
            g["ma_kisa"] = g["satismiktari"].rolling(
                window=kisa_ma,
                min_periods=min_kisa
            ).mean()
    
            g["ma_uzun"] = g["satismiktari"].rolling(
                window=uzun_ma,
                min_periods=min_uzun
            ).mean()
    
            son = g.iloc[-1]
    
            if pd.isna(son["ma_kisa"]) or son["ma_kisa"] <= 0:
                continue
    
            stok_gun = son["stok"] / son["ma_kisa"]
            trend_orani = (
                son["ma_kisa"] / son["ma_uzun"]
                if pd.notna(son["ma_uzun"]) and son["ma_uzun"] > 0
                else None
            )
    
            # 🔻 STOK FAZLASI + SATIŞ DÜŞÜŞÜ
            if (
                trend_orani is not None and
                trend_orani < trend_esik and
                stok_gun > stok_fazla_limit_gun
            ):
                fazla_list.append({
                    "urunkodu": urun,
                    "reyonkodu": son["reyonkodu"],
                    "ailekodu": son["ailekodu"],
                    "altailekodu": son["altailekodu"],
                    "malgrubukodu": son["malgrubukodu"],
                    "mevcut_stok": son["stok"],
                    "stok_kac_gun_yeter": round(stok_gun, 1),
                    "trend_orani": round(trend_orani, 2),
                    "degerlenmisstok": son["degerlenmisstok"]
                })
    
            # 🔺 STOK-OUT RİSKİ
            if (
                stok_gun < stokout_limit_gun and
                son["stok"] > 0 and
                son["degerlenmisstok"] > 0
            ):
                stokout_list.append({
                    "urunkodu": urun,
                    "reyonkodu": son["reyonkodu"],
                    "ailekodu": son["ailekodu"],
                    "altailekodu": son["altailekodu"],
                    "malgrubukodu": son["malgrubukodu"],
                    "mevcut_stok": son["stok"],
                    "stok_kac_gun_yeter": round(stok_gun, 1),
                    "gunluk_ortalama_satis": round(son["ma_kisa"], 2),
                    "degerlenmisstok": son["degerlenmisstok"]
                })
    
    
        df_fazla = pd.DataFrame(fazla_list)
        df_stokout = pd.DataFrame(stokout_list)
    
        sonuc = {
            "stok_fazlasi": {
                "detay": df_fazla.sort_values("stok_kac_gun_yeter", ascending=False)
                if not df_fazla.empty else df_fazla,
                "toplam_degerlenmisstok": round(
                    df_fazla["degerlenmisstok"].sum(), 2
                ) if not df_fazla.empty else 0
            },
            "stokout_riski": {
                "detay": df_stokout.sort_values("stok_kac_gun_yeter")
                if not df_stokout.empty else df_stokout,
                "toplam_degerlenmisstok": round(
                    df_stokout["degerlenmisstok"].sum(), 2
                ) if not df_stokout.empty else 0
            }
        }
    
        return sonuc
    
    
    def urun_moving_speed_classification(
        self,
        tarih,
        moving_avg_gun=7
    ):
        """
        Tüm ürünleri hızlarına göre sınıflandırır:
        Fast, Moderate, Slow Moving
        - Fast Moving: en hızlı satandan en yavaş satana
        - Slow Moving: stok > 0 olanları en yavaş satandan hızlıya
        """
    
        query = f"""
        SELECT
            tarih,
            urunkodu,
            reyonkodu,
            ailekodu,
            altailekodu,
            malgrubukodu,
            satismiktari,
            stok,
            degerlenmisstok
        FROM {self.table_name}
        WHERE tarih <= toDate('{tarih}')
        """
    
        df = self.client.query_df(query)
    
        if df.empty:
            return pd.DataFrame()
    
        df = df.sort_values(["urunkodu", "tarih"])
        result = []
        min_periods = max(1, moving_avg_gun // 3)
    
        for urun, g in df.groupby("urunkodu"):
            g = g.copy()
            g["ma_satis"] = g["satismiktari"].rolling(
                window=moving_avg_gun,
                min_periods=min_periods
            ).mean()
            son = g.iloc[-1]
    
            if pd.isna(son["ma_satis"]) or son["ma_satis"] <= 0:
                speed_class = "Slow Moving"
                stok_gun = None
            else:
                stok_gun = son["stok"] / son["ma_satis"]
                if stok_gun < 30:
                    speed_class = "Fast Moving"
                elif 30 <= stok_gun <= 90:
                    speed_class = "Moderate Moving"
                else:
                    speed_class = "Slow Moving"
    
            result.append({
                "urunkodu": urun,
                "reyonkodu": son["reyonkodu"],
                "ailekodu": son["ailekodu"],
                "altailekodu": son["altailekodu"],
                "malgrubukodu": son["malgrubukodu"],
                "mevcut_stok": son["stok"],
                "degerlenmisstok": son["degerlenmisstok"],
                "gunluk_ortalama_satis": round(son["ma_satis"] if pd.notna(son["ma_satis"]) else 0, 2),
                "stok_kac_gun_yeter": round(stok_gun, 1) if stok_gun is not None else None,
                "moving_speed_class": speed_class
            })
    
        result_df = pd.DataFrame(result)
    
        if result_df.empty:
            return result_df
    
        # 🔹 Sınıflara göre filtreleme ve sıralama
        fast = result_df[result_df["moving_speed_class"]=="Fast Moving"].sort_values(
            "gunluk_ortalama_satis", ascending=False
        )
        moderate = result_df[result_df["moving_speed_class"]=="Moderate Moving"].sort_values(
            "gunluk_ortalama_satis", ascending=False
        )
        # Slow Moving -> stok > 0
        slow = result_df[(result_df["moving_speed_class"]=="Slow Moving") & (result_df["mevcut_stok"] > 0)].sort_values(
            "gunluk_ortalama_satis", ascending=True
        )
    
        # 🔹 Tek DataFrame olarak birleştir
        final_df = pd.concat([fast, moderate, slow], ignore_index=True)
    
        return final_df
    
    def most_urgent_order_requirements(
        self,
        tarih,
        moving_avg_gun=7,
        stokout_limit_gun=3,
        fast_moving_limit_gun=10,
        only_positive_stock=True,
        order_horizon_gun=7
    ):
        """
        Most urgent order requirements listesi:
        - Stok-Out riski olan ürünler
        - Fast Moving ürünlerde kritik stoklar
        - order_qty_suggested: order_horizon_gun kadar gün için
        - only_positive_stock: stok > 0 filtrele
        """
    
        query = f"""
        SELECT
            tarih,
            urunkodu,
            reyonkodu,
            ailekodu,
            altailekodu,
            malgrubukodu,
            satismiktari,
            stok,
            degerlenmisstok
        FROM {self.table_name}
        WHERE tarih <= toDate('{tarih}')
        """
    
        df = self.client.query_df(query)
        if df.empty:
            return pd.DataFrame()
    
        df = df.sort_values(["urunkodu", "tarih"])
        result = []
        min_periods = max(1, moving_avg_gun // 3)
    
        for urun, g in df.groupby("urunkodu"):
            g = g.copy()
            g["ma_satis"] = g["satismiktari"].rolling(
                window=moving_avg_gun,
                min_periods=min_periods
            ).mean()
            son = g.iloc[-1]
    
            if pd.isna(son["ma_satis"]) or son["ma_satis"] <= 0:
                continue  # satış yok → acil sipariş yok
    
            stok_gun = son["stok"] / son["ma_satis"]
    
            # Stok filtresi
            if only_positive_stock and son["stok"] <= 0:
                continue
    
            # 🔹 Sipariş miktarı hesaplama
            if stok_gun < order_horizon_gun:
                order_qty = math.ceil((order_horizon_gun - stok_gun) * son["ma_satis"])
            else:
                order_qty = 0
    
            # 🔹 Reason
            if stok_gun < stokout_limit_gun:
                reason = "Stok-Out Risk"
            elif stok_gun < fast_moving_limit_gun:
                reason = "Fast Moving Critical Stock"
            else:
                continue  # diğerleri acil değil
    
            result.append({
                "urunkodu": urun,
                "reyonkodu": son["reyonkodu"],
                "ailekodu": son["ailekodu"],
                "altailekodu": son["altailekodu"],
                "malgrubukodu": son["malgrubukodu"],
                "mevcut_stok": son["stok"],
                "degerlenmisstok": son["degerlenmisstok"],
                "gunluk_ortalama_satis": round(son["ma_satis"], 2),
                "stok_kac_gun_yeter": round(stok_gun, 1),
                "order_qty_suggested": order_qty,
                "reason": reason
            })
    
        result_df = pd.DataFrame(result)
        if result_df.empty:
            return result_df
    
        # Öncelik sırası: stok-out risk > fast moving kritik stok
        result_df = result_df.sort_values(
            ["reason", "stok_kac_gun_yeter"], ascending=[True, True]
        )
    
        return result_df
