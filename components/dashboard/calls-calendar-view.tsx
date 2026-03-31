"use client";

import { useMemo, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import ukLocale from "@fullcalendar/core/locales/uk";
import type {
  CalendarOptions,
  EventClickArg,
  EventContentArg,
  EventInput,
  EventMountArg,
} from "@fullcalendar/core";
import { CRM_TIMEZONE } from "@/lib/date-kyiv";
import { kyivIntlTimezonePlugin } from "@/lib/fullcalendar-named-timezone";
import type { CallEvent } from "@/types/crm";
import { assigneeFieldLabelEn } from "@/lib/roles";

const DEFAULT_DURATION_MS = 60 * 60 * 1000;

const callTypeShort: Record<string, string> = {
  HR: "HR",
  TECH: "Tech",
  CLIENT: "Client",
  PM: "PM",
  CLIENT_TECH: "Cl/Tech",
};

/** Стабільна палітра фону для сейлів без бейдж-кольору в CRM. */
const SALES_FALLBACK_BG: ReadonlyArray<string> = [
  "#2563eb",
  "#16a34a",
  "#c026d3",
  "#ea580c",
  "#0891b2",
  "#ca8a04",
  "#4f46e5",
  "#be123c",
  "#0d9488",
  "#9333ea",
  "#b45309",
  "#1d4ed8",
];

function hashId(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i) | 0;
  return Math.abs(h);
}

function salesBackgroundFallback(createdById: string): string {
  const i = hashId(createdById) % SALES_FALLBACK_BG.length;
  return SALES_FALLBACK_BG[i]!;
}

/** Колір фону події за сейлом; колір тексту задається в CSS і не залежить від сейла. */
function getSalesBackgroundColor(call: CallEvent): string {
  const bg = call.createdBy?.badgeBgColor?.trim();
  if (bg) return bg;
  if (call.createdById) return salesBackgroundFallback(call.createdById);
  return "var(--muted-foreground)";
}

function salesShortLabel(call: CallEvent): string | null {
  if (!call.createdBy) return null;
  const { firstName, lastName } = call.createdBy;
  const f = firstName.trim();
  const l = lastName.trim();
  if (!f && !l) return null;
  if (!l) return f;
  return `${f} ${l.charAt(0)}.`;
}

function devShortLabel(call: CallEvent): string | null {
  if (!call.caller) return null;
  const f = call.caller.firstName.trim();
  const l = call.caller.lastName.trim();
  if (!f && !l) return null;
  if (!l) return f;
  return `${f} ${l.charAt(0)}.`;
}

function buildEventTitle(call: CallEvent): string {
  const typeLabel = callTypeShort[call.callType] ?? call.callType;
  const sales = salesShortLabel(call);
  const dev = devShortLabel(call);
  const parts = [call.company, typeLabel];
  if (sales) parts.push(sales);
  if (dev) parts.push(`${assigneeFieldLabelEn(call.caller?.role)}: ${dev}`);
  return parts.join(" · ");
}

function toEvent(call: CallEvent): EventInput {
  const start = new Date(call.callStartedAt);
  const end = call.callEndedAt
    ? new Date(call.callEndedAt)
    : new Date(start.getTime() + DEFAULT_DURATION_MS);

  return {
    id: call.id,
    title: buildEventTitle(call),
    start,
    end: end > start ? end : new Date(start.getTime() + DEFAULT_DURATION_MS),
    backgroundColor: getSalesBackgroundColor(call),
    borderColor: "transparent",
    extendedProps: { call },
  };
}

function eventClassNames(arg: EventContentArg): string[] {
  const call = arg.event.extendedProps.call as CallEvent | undefined;
  if (!call) return [];
  if (call.status === "CANCELLED") return ["fc-call-cancelled"];
  if (call.status === "COMPLETED") return ["fc-call-completed"];
  return [];
}

/** Інлайн закреслення: базові стилі посилань / FC часто глушать CSS text-decoration. */
function eventDidMountStrikethroughIfCancelled(info: EventMountArg) {
  const call = info.event.extendedProps.call as CallEvent | undefined;
  if (call?.status !== "CANCELLED") return;
  const root = info.el;
  const selectors = [
    null,
    ".fc-event-main",
    ".fc-event-main-frame",
    ".fc-event-time",
    ".fc-event-title-container",
    ".fc-event-title",
  ];
  for (const sel of selectors) {
    const el = sel ? root.querySelector(sel) : root;
    if (el instanceof HTMLElement) {
      el.style.setProperty("text-decoration", "line-through", "important");
    }
  }
}

interface SalesLegendItem {
  key: string;
  name: string;
  swatch: string;
}

function buildSalesLegend(calls: CallEvent[]): SalesLegendItem[] {
  const map = new Map<string, SalesLegendItem>();
  for (const call of calls) {
    const id = call.createdById ?? "__none__";
    if (map.has(id)) continue;
    const name = call.createdBy
      ? `${call.createdBy.firstName} ${call.createdBy.lastName}`.trim()
      : "Без сейла";
    map.set(id, {
      key: id,
      name: name || "Без сейла",
      swatch: getSalesBackgroundColor(call),
    });
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "uk"));
}

interface CallsCalendarViewProps {
  calls: CallEvent[];
  onEventClick: (call: CallEvent) => void;
}

export function CallsCalendarView({ calls, onEventClick }: CallsCalendarViewProps) {
  const events = useMemo(() => calls.map(toEvent), [calls]);
  const legend = useMemo(() => buildSalesLegend(calls), [calls]);

  const handleEventClick = useCallback(
    (info: EventClickArg) => {
      const call = info.event.extendedProps.call as CallEvent;
      if (call) onEventClick(call);
    },
    [onEventClick],
  );

  const handleEventDidMount = useCallback((info: EventMountArg) => {
    eventDidMountStrikethroughIfCancelled(info);
  }, []);

  const calendarOptions = useMemo(
    () =>
      ({
        plugins: [kyivIntlTimezonePlugin, dayGridPlugin, timeGridPlugin],
        locale: ukLocale,
        timeZone: CRM_TIMEZONE,
        initialView: "timeGridWeek",
        headerToolbar: {
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        },
        buttonText: {
          today: "Сьогодні",
          month: "Місяць",
          week: "Тиждень",
          day: "День",
        },
        events,
        eventClick: handleEventClick,
        eventDidMount: handleEventDidMount,
        eventClassNames: eventClassNames,
        eventDisplay: "block" as const,
        views: {
          dayGridMonth: {
            eventDisplay: "block",
          },
        },
        height: "auto",
        allDaySlot: false,
        slotMinTime: "00:00:00",
        slotMaxTime: "24:00:00",
        scrollTime: "06:00:00",
        nowIndicator: true,
        dayMaxEvents: 8,
        weekends: true,
        expandRows: true,
        stickyHeaderDates: true,
        displayEventTime: true,
        eventTimeFormat: {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          meridiem: false,
        },
      }) as unknown as CalendarOptions,
    [events, handleEventClick, handleEventDidMount],
  );

  return (
    <div className="space-y-3">
      {legend.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Сейл:</span>
          {legend.map((item) => (
            <span key={item.key} className="inline-flex items-center gap-1.5">
              <span
                className="size-3 shrink-0 rounded-sm ring-1 ring-border/60"
                style={{ backgroundColor: item.swatch }}
                title={item.name}
                aria-hidden
              />
              <span className="text-foreground">{item.name}</span>
            </span>
          ))}
        </div>
      )}

      <div className="fc-crm-wrapper">
        {/* kyivIntlTimezonePlugin реєструє namedTimeZonedImpl у FullCalendar (опція в пропсах не діє) */}
        <FullCalendar {...calendarOptions} />
      </div>
    </div>
  );
}
