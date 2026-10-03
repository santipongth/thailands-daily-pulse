# Data sources

Generated from the `source_registry` table (see `database/seed.sql`). Each source's licence/terms belong to its owner — check them before redistributing data.

| Source | Owner | Channel | Cadence | URL |
|---|---|---|---|---|
| PTT (thai-oil-api) | ปตท. | API | เมื่อมีประกาศ / ตรวจรายชั่วโมง | https://www.pttor.com |
| บางจาก (Bangchak API) | บางจาก | API | เมื่อมีประกาศ / ตรวจรายชั่วโมง | https://www.bangchak.co.th |
| สมาคมค้าทองคำ | สมาคมค้าทองคำ | API | รายวัน ทุกวัน 05:00 | https://www.goldtraders.or.th |
| ExchangeRate (อัตราแลกเปลี่ยน) | open.er-api.com | API | รายวัน ทุกวัน 05:00 | https://open.er-api.com |
| GISTDA PM2.5 (กรุงเทพฯ) | GISTDA (สทอภ.) | API (JSON) | รายชั่วโมง | https://pm25.gistda.or.th/rest/getPm25byProvince |
| กรมอุตุฯ ตรวจอากาศ 3 ชม. (กรุงเทพฯ) | กรมอุตุนิยมวิทยา | API (XML) | ทุก 3 ชม. | https://data.tmd.go.th/api/Weather3Hours/V2/?uid=api&ukey=api12345 |
| กรมอุตุฯ เตือนภัย | กรมอุตุนิยมวิทยา | API | เมื่อมีประกาศ | https://data.tmd.go.th |
| กรมอุตุฯ พยากรณ์ กทม.และปริมณฑล | กรมอุตุนิยมวิทยา | API (XML) 7 วัน | รายวัน | https://data.tmd.go.th/api/WeatherForecast7Days/V2/?uid=api&ukey=api12345 |
| กรมอุตุฯ แผ่นดินไหว | กรมอุตุนิยมวิทยา | RSS | เมื่อเกิดเหตุ | https://earthquake.tmd.go.th/feed/rss_tmd.xml |
| ThaiWater (สสน.) | สสน. | API | รายชั่วโมง | https://www.thaiwater.net |
| CheckRaka (ราคาอาหาร) | CheckRaka (รวบรวมจากหลายแหล่ง) | หน้าเว็บ (JSON-LD) | รายวัน 05:00 | https://checkraka.app/price/ |
| RID อ่างเก็บน้ำ (กรมชลประทาน) | กรมชลประทาน | JSON API | รายวัน | https://app.rid.go.th/reservoir/api/dam/public |
| RakaKaset (ราคาเกษตร) | RakaKaset (ข้อมูลจาก สศก.) | หน้าเว็บ (ตาราง) | รายวัน ทุกวัน 05:00 | https://rakakaset.com/prices/ |
| Longdo Traffic Index | Longdo Traffic (Metamedia) | API | รายชั่วโมง | https://traffic.longdo.com |
| สำนักงานสลากกินแบ่งรัฐบาล (GLO) | สำนักงานสลากกินแบ่งรัฐบาล | API | งวดละ 2 ครั้ง/เดือน | https://www.glo.or.th |
| ข่าว RSS | มติชน, ประชาชาติธุรกิจ, ข่าวสด | RSS | รายชั่วโมง | — |
| กรมสรรพากร (ปฏิทินภาษี) | กรมสรรพากร | เว็บไซต์ทางการ | วันละครั้ง | https://www.rd.go.th/62348.html |
| Kapook ปฏิทินวันหยุด | Kapook (อ้างอิงประกาศ ครม./ธปท.) | หน้าเว็บ (HTML) | วันละครั้ง | https://calendar.kapook.com/2569/holiday |
| FM91 Trafficpro (X) | สวพ.FM91 | Social Media (X ผ่าน Firecrawl) + AI คัดกรอง | ทุก 30 นาที | https://x.com/fm91trafficpro |
| ThaiWater สถานี กทม.และปริมณฑล | สสน. | API | ทุกชั่วโมง | https://www.thaiwater.net |
| กทม. ระบายน้ำ (น้ำท่วมถนน) | สำนักการระบายน้ำ กทม. | เว็บไซต์ (ผ่าน Firecrawl) | ทุก 3 ชั่วโมง | https://weather.bangkok.go.th/flood/ |
| ปภ. แจ้งเตือนสาธารณภัย | กรมป้องกันและบรรเทาสาธารณภัย | เว็บไซต์ (ผ่าน Firecrawl) | วันละครั้ง | https://www.disaster.go.th/contents/disaster_alert_report |
| สนพ. (ราคา LPG ถัง 15 กก.) | สำนักงานนโยบายและแผนพลังงาน | API | วันละครั้ง | https://www.eppo.go.th/wp-json/oil-api/v1/lpg-prices |
| กระทรวงแรงงาน (ค่าแรงขั้นต่ำ กทม.) | กระทรวงแรงงาน | เว็บไซต์ทางการ | วันละครั้ง | https://www.mol.go.th/minimum-wage |
| Air4Thai PM2.5 (กรมควบคุมมลพิษ) | กรมควบคุมมลพิษ | API (JSON) | รายชั่วโมง | https://air4thai.pcd.go.th/ |
| รถไฟฟ้า BTS/MRT (X) | BTS SkyTrain / BEM (MRT) | X (ผ่าน Firecrawl) | ตามเหตุการณ์ | https://x.com/BTS_SkyTrain |
| กรมการค้าภายใน (ราคาขายปลีก กทม.) | กรมการค้าภายใน กระทรวงพาณิชย์ | หน้าเว็บรายงานราคา (pricelist.dit.go.th) | วันทำการ (จ.–ศ.) | https://pricelist.dit.go.th/main_price.php?seltime=day |
| การไฟฟ้า (ค่า Ft / อัตราค่าไฟ) | การไฟฟ้าส่วนภูมิภาค (ค่า Ft ประกาศโดย กกพ. ใช้เท่ากันทั้ง กฟน./กฟภ.) | หน้าเว็บ + เอกสารอัตราค่าไฟฟ้า | ทุก 4 เดือน | https://www.pea.co.th/our-services/tariff/ft |
| ข่าวทั่วไป RSS | Thai PBS, ข่าวสด, ประชาไท | rss | รายชั่วโมง | https://news.thaipbs.or.th/rss/news |
