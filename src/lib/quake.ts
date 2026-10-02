// Pure parser for TMD earthquake RSS (https://earthquake.tmd.go.th/feed/rss_tmd.xml).
export type Quake = { place: string; magnitude: number; depthKm: number; lat: number; lon: number; timeUtc: string; dateBkk: string; inThailand: boolean; link: string };

const tag = (b: string, t: string) => b.match(new RegExp(`<${t}>([^<]*)</${t}>`))?.[1]?.trim() ?? "";

export function parseQuakeRss(xml: string): Quake[] {
  return xml.split("<item>").slice(1).map((b) => {
    const place = tag(b, "title");
    const t = tag(b, "tmd:time").replace(" UTC", "Z").replace(" ", "T");
    const ms = Date.parse(t);
    return {
      place,
      magnitude: Number(tag(b, "tmd:magnitude")) || 0,
      depthKm: Number(tag(b, "tmd:depth")) || 0,
      lat: Number(tag(b, "geo:lat")),
      lon: Number(tag(b, "geo:long")),
      timeUtc: Number.isFinite(ms) ? new Date(ms).toISOString() : "",
      dateBkk: Number.isFinite(ms) ? new Date(ms + 7 * 3600e3).toISOString().slice(0, 10) : "",
      // Thai epicentres are named by province (จ.); foreign ones by "ประเทศ…"/region.
      inThailand: /จ\.\s*\S/.test(place) && !place.includes("ประเทศ"),
      link: tag(b, "link"),
    };
  });
}
