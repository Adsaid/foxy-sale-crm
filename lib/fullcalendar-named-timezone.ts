import { createPlugin } from "@fullcalendar/core";
import { NamedTimeZoneImpl } from "@fullcalendar/core/internal";
import { TZDate, tzOffset } from "@date-fns/tz";

/**
 * Реалізація IANA для FullCalendar: без цього `timeZone="Europe/Kyiv"`
 * не підключає `namedTimeZonedImpl`, і події відображаються на сітці як UTC
 * (зсув на 2–3 год відносно київського часу).
 */
export class IntlNamedTimeZoneImpl extends NamedTimeZoneImpl {
  override offsetForArray(a: number[]): number {
    const d = new Date(Date.UTC(a[0], a[1], a[2], a[3], a[4], a[5], a[6] || 0));
    return tzOffset(this.timeZoneName, d);
  }

  override timestampToArray(ms: number): number[] {
    const z = TZDate.tz(this.timeZoneName, ms);
    return [
      z.getFullYear(),
      z.getMonth(),
      z.getDate(),
      z.getHours(),
      z.getMinutes(),
      z.getSeconds(),
      z.getMilliseconds(),
    ];
  }
}

/**
 * FullCalendar бере `namedTimeZonedImpl` лише з плагіна (`buildDateEnv` у core),
 * а не з опцій календаря — тому передача класу в `namedTimeZoneImpl` у пропсах не працювала.
 */
export const kyivIntlTimezonePlugin = createPlugin({
  name: "intlKyivTz",
  namedTimeZonedImpl: IntlNamedTimeZoneImpl,
});
