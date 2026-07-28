import type { Timestamp } from "firebase/firestore";

export type UserRole = "user" | "admin";

export interface User {
    uid: string;
    displayName: string;
    displayNameLower: string;
    email: string;
    emailLower: string;
    searchTokens?: string[];
    photoURL?: string;
    role: UserRole;
    /** Legacy field retained for compatibility. Accepted friend requests are authoritative. */
    friendIds: string[];
    createdAt: Timestamp;
    updatedAt?: Timestamp;
}

export interface Group {
    id: string;
    name: string;
    description?: string;
    color?: string;
    ownerId: string;
    memberIds: string[];
    allowMembersToEditEvents: boolean;
    isPersonal: boolean;
    createdAt: Timestamp;
    updatedAt?: Timestamp;
}

export type EventType = "meeting" | "open_event" | "blocked_time";
export type Visibility = "full_details" | "friends_only" | "busy_only";
export type ParticipantStatus = "accepted" | "pending" | "declined";

export interface CalendarEvent {
    id: string;
    title: string;
    description: string;
    location?: string;
    startTime: Timestamp;
    endTime: Timestamp;
    type: EventType;
    calendarId: string | null;
    creatorId: string;
    visibility: Visibility;
    participants: Record<string, ParticipantStatus>;
    participantIds: string[];
    isRecurring: boolean;
    recurrenceRule?: string;
    recurrenceUntil?: Timestamp;
    recurrenceSeriesId?: string;
    createdAt: Timestamp;
    updatedAt?: Timestamp;
    /** Set by the service layer; not stored in the public event document. */
    detailsAvailable?: boolean;
    /** UIDs allowed to read restricted details, primarily for friends-only events. */
    detailViewerIds?: string[];
}

export type FriendRequestStatus = "pending" | "accepted" | "declined";

export interface FriendRequest {
    id: string;
    senderId: string;
    receiverId: string;
    status: FriendRequestStatus;
    createdAt: Timestamp;
    respondedAt?: Timestamp;
}
