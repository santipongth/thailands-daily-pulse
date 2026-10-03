"""Read-only check of TMD Weather3Hours: is the file complete, and what do Bangkok-area stations say?
Run: python3 scripts/tmd3h_bkk.py"""
import html, math, re, urllib.request

URL = "https://data.tmd.go.th/api/Weather3Hours/V2/?uid=api&ukey=api12345"
BKK = (13.7563, 100.5018)
AREA = {"กรุงเทพมหานคร", "นนทบุรี", "ปทุมธานี", "สมุทรปราการ", "สมุทรสาคร", "นครปฐม"}

raw = urllib.request.urlopen(urllib.request.Request(URL, headers={"User-Agent": "Mozilla/5.0"}), timeout=60).read().decode("utf-8")
xml = html.unescape(raw)
stations = re.findall(r"<Station>(.*?)</Station>", xml, re.S)
tag = lambda b, t: (re.search(rf"<{t}[^>]*>([^<]*)</{t}>", b) or [None, ""])[1].strip()
print(f"ขนาดไฟล์ {len(raw):,} ไบต์, {len(stations)} สถานี -> {'ครบ' if len(stations) >= 100 else 'ไม่ครบ (กรมอุตุฯ กำลังสร้างไฟล์)'}")
rows = []
for b in stations:
    lat, lon = float(tag(b, "Latitude") or 0), float(tag(b, "Longitude") or 0)
    km = 6371 * 2 * math.asin(math.sqrt(math.sin(math.radians(lat - BKK[0]) / 2) ** 2 + math.cos(math.radians(lat)) * math.cos(math.radians(BKK[0])) * math.sin(math.radians(lon - BKK[1]) / 2) ** 2))
    if tag(b, "Province") in AREA or km < 40:
        rows.append((km, tag(b, "WmoStationNumber"), tag(b, "StationNameEnglish"), tag(b, "Province"), tag(b, "DateTime"), tag(b, "AirTemperature"), tag(b, "Rainfall24Hr")))
for r in sorted(rows):
    print(f"{r[0]:5.1f} km  {r[1]}  {r[2]:<28} {r[3]:<14} {r[4]}  {r[5]}°C  ฝน24ชม. {r[6]} mm")
print("48455 BANGKOK METROPOLIS:", "พบ" if any(r[1] == "48455" for r in rows) else "ไม่พบ")
