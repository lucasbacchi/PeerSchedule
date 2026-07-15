import { Timestamp } from "firebase/firestore";

export type UserRole = "user" | "admin";

export interface User {
    uid: string; // Stored as the document ID, but helpful to keep in the object
    displayName: string;
    email: string;
    role: UserRole;
    friendIds: string[];
    createdAt: Timestamp;
}

export interface Group {
    id: string; // Auto-generated Firestore ID
    name: string;
    ownerId: string;
    memberIds: string[];
    createdAt: Timestamp;
}

export type EventType = "meeting" | "open_event" | "blocked_time";
export type Visibility = "full_details" | "friends_only" | "busy_only";
export type ParticipantStatus = "accepted" | "pending" | "declined";

export interface CalendarEvent  {
    id: string;
    title: string;
    description: string;
    startTime: Timestamp;
    endTime: Timestamp;
    type: EventType;
    calendarId: string | null; // null if a personal event
    creatorId: string;
    visibility: Visibility;

    // Record mapping a user's UID to their RSVP status
    participants: Record<string, ParticipantStatus>;

    isRecurring: boolean;
    recurrenceRule?: string; // Optional, only present if isRecurring is true
}
