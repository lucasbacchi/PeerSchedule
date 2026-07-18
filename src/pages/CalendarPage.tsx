import { useState } from "react";

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  color?: string;
}

function isSameMonth(dateLeft: Date, dateRight: Date) {
  return dateLeft.getFullYear() === dateRight.getFullYear() && dateLeft.getMonth() === dateRight.getMonth();
}

function isSameDay(dateLeft: Date, dateRight: Date) {
  return (
    dateLeft.getFullYear() === dateRight.getFullYear() &&
    dateLeft.getMonth() === dateRight.getMonth() &&
    dateLeft.getDate() === dateRight.getDate()
  );
}

function isToday(date: Date) {
  return isSameDay(date, new Date());
}

function padStart(value: number) {
  return String(value).padStart(2, "0");
}

function formatDate(date: Date, pattern: string) {
  const day = String(date.getDate());
  const month = String(date.getMonth() + 1);
  const year = String(date.getFullYear());
  const weekday = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][date.getDay()];
  const monthName = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ][date.getMonth()];

  return pattern.replace(/EEEE|MMMM|MMM|MM|M|yyyy|yy|d/g, (token) => {
    switch (token) {
      case "EEEE":
        return weekday;
      case "MMMM":
        return monthName;
      case "MMM":
        return monthName.slice(0, 3);
      case "MM":
        return padStart(Number(month));
      case "M":
        return month;
      case "yyyy":
        return year;
      case "yy":
        return year.slice(-2);
      case "d":
        return day;
      default:
        return token;
    }
  });
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function addMonths(date: Date, amount: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + amount);
  return next;
}

function subMonths(date: Date, amount: number) {
  return addMonths(date, -amount);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function startOfWeek(date: Date) {
  const day = date.getDay();
  return addDays(date, -day);
}

function endOfWeek(date: Date) {
  const day = date.getDay();
  return addDays(date, 6 - day);
}

function DayCell({
  date,
  currentMonth,
  events,
  selected,
  onSelect,
}: {
  date: Date;
  currentMonth: Date;
  events: CalendarEvent[];
  selected: boolean;
  onSelect: (d: Date) => void;
}) {
  const inMonth = isSameMonth(date, currentMonth);
  const today = isToday(date);

  return (
    <button
      type="button"
      onClick={() => onSelect(date)}
      className={[
        "flex flex-col gap-1 p-2 rounded-lg text-left transition-all min-h-[90px] border",
        inMonth ? "bg-white" : "bg-[#f8fafc]",
        selected
          ? "border-[#2563eb] ring-1 ring-[#2563eb]"
          : "border-[#e2e8f0] hover:border-[#2563eb]/40",
      ].join(" ")}
    >
      <span
        className={[
          "w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium font-['Inter',sans-serif]",
          today ? "bg-[#2563eb] text-white" : inMonth ? "text-[#0f172a]" : "text-[#cbd5e1]",
        ].join(" ")}
      >
        {formatDate(date, "d")}
      </span>
      <div className="flex flex-col gap-0.5 w-full overflow-hidden">
        {events.slice(0, 3).map((ev) => (
          <span
            key={ev.id}
            className={`text-xs font-['Inter',sans-serif] font-medium px-1.5 py-0.5 rounded truncate text-white ${ev.color ?? "bg-[#2563eb]"}`}
          >
            {ev.title}
          </span>
        ))}
        {events.length > 3 && (
          <span className="text-xs text-[#64748b] font-['Inter',sans-serif] pl-1">
            +{events.length - 3} more
          </span>
        )}
      </div>
    </button>
  );
}

export default function CalendarPage() {
  const [month, setMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const events: CalendarEvent[] = [];

  const start = startOfWeek(startOfMonth(month));
  const end = endOfWeek(endOfMonth(month));
  const days: Date[] = [];
  let cur = start;
  while (cur <= end) {
    days.push(cur);
    cur = addDays(cur, 1);
  }

  const eventsOn = (d: Date) => events.filter((ev) => isSameDay(ev.date, d));
  const selectedEvents = eventsOn(selectedDate);

  return (
    <main className="min-h-screen flex-1 flex flex-col gap-5 px-10 py-6 bg-[#f8fafc]">
      <title>Calendar | PeerSchedule</title>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-bold font-['Inter',sans-serif] text-[#0f172a]">
            Calendar Name
          </h1>
          <div className="w-px h-6 bg-[#e2e8f0]" />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMonth((m) => subMonths(m, 1))}
              aria-label="Previous month"
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#e2e8f0] bg-white hover:bg-[#f1f5f9] text-[#0f172a] text-lg transition-colors"
            >
              ‹
            </button>
            <h2 className="w-44 text-center text-lg font-bold font-['Inter',sans-serif] text-[#0f172a]">
              {formatDate(month, "MMMM yyyy")}
            </h2>
            <button
              type="button"
              onClick={() => setMonth((m) => addMonths(m, 1))}
              aria-label="Next month"
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#e2e8f0] bg-white hover:bg-[#f1f5f9] text-[#0f172a] text-lg transition-colors"
            >
              ›
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setMonth(new Date());
            setSelectedDate(new Date());
          }}
          className="text-sm font-medium font-['Inter',sans-serif] text-[#2563eb] border border-[#2563eb] px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
        >
          Today
        </button>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 flex flex-col gap-1">
          <div className="grid grid-cols-7">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="py-2 text-center text-xs font-medium font-['Inter',sans-serif] text-[#64748b]">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => (
              <DayCell
                key={day.toISOString()}
                date={day}
                currentMonth={month}
                events={eventsOn(day)}
                selected={isSameDay(day, selectedDate)}
                onSelect={setSelectedDate}
              />
            ))}
          </div>
        </div>

        <aside className="w-56 shrink-0">
          <div className="bg-white border border-[#e2e8f0] rounded-xl p-4 flex flex-col gap-3">
            <p className="text-sm font-semibold font-['Inter',sans-serif] text-[#0f172a]">
              {formatDate(selectedDate, "EEEE, MMMM d")}
            </p>
            <div className="h-px bg-[#e2e8f0]" />

            {selectedEvents.length === 0 ? (
              <p className="text-xs text-[#64748b] font-['Inter',sans-serif]">No events.</p>
            ) : (
              selectedEvents.map((ev) => (
                <div key={ev.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-blue-50">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${ev.color ?? "bg-[#2563eb]"}`} />
                  <span className="text-xs font-medium font-['Inter',sans-serif] text-[#0f172a] truncate">
                    {ev.title}
                  </span>
                </div>
              ))
            )}

            <button className="mt-1 w-full text-xs font-medium font-['Inter',sans-serif] text-[#2563eb] border border-[#2563eb] rounded-lg py-1.5 hover:bg-blue-50 transition-colors">
              + Add Event
            </button>
          </div>
        </aside>
      </div>
    </main>
  );
}
