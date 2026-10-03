import { describe, expect, it } from "vitest";
import { classifyRail, isServiceAlert, incidentPosts } from "./rail";
const H = 3600e3;
describe("classifyRail", () => {
  it("same day", () => expect(classifyRail("รถไฟฟ้าล่าช้า", "2026-10-04T03:00:00Z", "2026-10-04T04:00:00Z", H).status).toBe("counted"));
  it("posted 23:30 seen 01:00 with 3h gap → counted on arrival day", () => {
    const r = classifyRail("ขบวนรถขัดข้อง", "2026-10-03T16:30:00Z", "2026-10-03T18:00:00Z", 3 * H);
    expect(r).toMatchObject({ status: "counted", day: "2026-10-04" });
  });
  it("old alert → counted on arrival, retaining actual posted day", () => expect(classifyRail("หยุดให้บริการ", "2026-10-01T05:00:00Z", "2026-10-03T18:00:00Z", 3 * H)).toMatchObject({ status: "counted", day: "2026-10-04" }));
  it("context", () => expect(classifyRail("ปิดทางเข้า 2", "2026-10-04T03:00:00Z", "2026-10-04T03:00:00Z", H).status).toBe("context"));
  it("resolution mentions a disruption but is not a new alert", () => expect(isServiceAlert("เหตุขัดข้องแก้ไขแล้ว กลับมาให้บริการตามปกติ")).toBe(false));
  it("backup train notice counts", () => expect(isServiceAlert("จัดขบวนรถสำรองเพื่อทดแทนขบวนที่มีปัญหา")).toBe(true));
  it("follow-up posts within two hours count once per operator", () => {
    const posts = [0, 30, 90, 121].map((m) => ({ source: "BTS (X)", posted_at: new Date(Date.parse("2026-10-04T02:00:00Z") + m * 60000).toISOString() }));
    expect(incidentPosts(posts)).toHaveLength(2);
  });
});
