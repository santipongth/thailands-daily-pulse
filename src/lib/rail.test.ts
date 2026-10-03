import { describe, expect, it } from "vitest";
import { classifyRail } from "./rail";
const H = 3600e3;
describe("classifyRail", () => {
  it("same day", () => expect(classifyRail("รถไฟฟ้าล่าช้า", "2026-10-04T03:00:00Z", "2026-10-04T04:00:00Z", H).status).toBe("counted"));
  it("posted 23:30 seen 01:00 with 3h gap → counted on arrival day", () => {
    const r = classifyRail("ขบวนรถขัดข้อง", "2026-10-03T16:30:00Z", "2026-10-03T18:00:00Z", 3 * H);
    expect(r).toMatchObject({ status: "counted", day: "2026-10-04" });
  });
  it("old alert → late, kept", () => expect(classifyRail("หยุดให้บริการ", "2026-10-01T05:00:00Z", "2026-10-03T18:00:00Z", 3 * H).status).toBe("late"));
  it("context", () => expect(classifyRail("ปิดทางเข้า 2", "2026-10-04T03:00:00Z", "2026-10-04T03:00:00Z", H).status).toBe("context"));
});
