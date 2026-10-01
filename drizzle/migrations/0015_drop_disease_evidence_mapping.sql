CREATE OR REPLACE FUNCTION public.family_evidence_source(_family text)
 RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO 'public'
AS $function$
  select case _family
    when 'weather' then 'กรมอุตุฯ%' when 'air' then 'Open-Meteo%' when 'oil' then 'PTT%'
    when 'fx' then 'ExchangeRate%' when 'gold' then 'สมาคมค้าทองคำ%' when 'water' then 'ThaiWater%'
    when 'food' then 'CheckRaka%' when 'farm' then 'RakaKaset%' when 'traffic' then 'Longdo%'
    when 'lottery' then 'สำนักงานสลาก%' when 'govdata' then 'ข้อมูลเปิดภาครัฐ%' when 'gov' then 'เว็บไซต์หน่วยงานรัฐ%'
    else null end
$function$;