export interface StoredCalendar {
  id: string;
  name: string;
  description: string;
}

export interface StoredEvent {
  id: string;
  calendarId: string;
  title: string;
  date: string;
  start: string;
  end: string;
}

export interface StoredFriend {
  id: string;
  name: string;
  email: string;
}

const CALENDARS = "peerschedule.calendars";
const EVENTS = "peerschedule.events";
const FRIENDS = "peerschedule.friends";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("peerschedule:change"));
}

export const scheduleStore = {
  calendars: () => read<StoredCalendar[]>(CALENDARS, []),
  saveCalendars: (items: StoredCalendar[]) => write(CALENDARS, items),
  events: () => read<StoredEvent[]>(EVENTS, []),
  saveEvents: (items: StoredEvent[]) => write(EVENTS, items),
  friends: () => read<StoredFriend[]>(FRIENDS, []),
  saveFriends: (items: StoredFriend[]) => write(FRIENDS, items),
  id: () => crypto.randomUUID(),
};
