import type { DevDailyCall } from "@/types/crm";
import type { CallEvent } from "@/types/crm";
import {
  expandOccurrences,
  type DevDailyCallRecord,
} from "@/lib/dev-daily-call-recurrence";

export interface ExpandedDailyEvent {
  id: string;
  dailyCallId: string;
  title: string;
  description: string | null | undefined;
  callStartedAt: string;
  callEndedAt: string | null;
  callLink: string | null | undefined;
  caller?: DevDailyCall["caller"];
  callerId: string;
  recurrenceType: DevDailyCall["recurrenceType"];
  isDailyCall: true;
}

/**
 * Expand DevDailyCall records into individual event occurrences
 * for calendar and table display within [viewStart, viewEnd].
 */
export function expandDailyCallsForView(
  dailyCalls: DevDailyCall[],
  viewStart: Date,
  viewEnd: Date,
): ExpandedDailyEvent[] {
  const results: ExpandedDailyEvent[] = [];

  for (const dc of dailyCalls) {
    const record: DevDailyCallRecord = {
      id: dc.id,
      title: dc.title,
      callStartedAt: new Date(dc.callStartedAt),
      callEndedAt: dc.callEndedAt ? new Date(dc.callEndedAt) : null,
      recurrenceType: dc.recurrenceType,
      recurrenceEndDate: dc.recurrenceEndDate ? new Date(dc.recurrenceEndDate) : null,
      isActive: dc.isActive,
    };

    const occurrences = expandOccurrences(record, viewStart, viewEnd);
    occurrences.forEach((occ, idx) =>
      results.push(makeExpandedEvent(dc, occ.start, occ.end, idx)),
    );
  }

  return results;
}

function makeExpandedEvent(
  dc: DevDailyCall,
  start: Date,
  end: Date,
  idx: number,
): ExpandedDailyEvent {
  return {
    id: `${dc.id}_occ_${idx}`,
    dailyCallId: dc.id,
    title: dc.title,
    description: dc.description,
    callStartedAt: start.toISOString(),
    callEndedAt: end.toISOString(),
    callLink: dc.callLink,
    caller: dc.caller,
    callerId: dc.callerId,
    recurrenceType: dc.recurrenceType,
    isDailyCall: true,
  };
}

/**
 * Check if a regular CallEvent is a daily call (type guard helper for union arrays).
 */
export function isDailyCallEvent(
  event: CallEvent | ExpandedDailyEvent,
): event is ExpandedDailyEvent {
  return "isDailyCall" in event && event.isDailyCall === true;
}
