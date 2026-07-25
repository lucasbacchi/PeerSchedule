# PeerSchedule

PeerSchedule is a peer-to-peer shared calendar web application built for COMP4650 Web Development. Users sign in with Google, create or join calendars, manage events, connect with friends, invite participants, and share availability.

## Team

- Zane Costello — Project management and UI/UX design
- Dominic Avellani — Frontend development and technical lead
- Lucas Bacchi — Firebase Authentication, Firestore, and backend services

## Technology Stack

- React 19 and TypeScript
- React Router Framework Mode
- Tailwind CSS 4
- Firebase Authentication with Google
- Cloud Firestore
- Firebase Hosting
- ESLint and Prettier

## Implemented Features

- Google sign-in and first-time Firestore profile creation
- Protected application pages and sign-out
- Create, list, edit, open, and delete shared calendars
- Calendar ownership and member management
- Responsive month calendar
- Create, view, edit, and delete events
- Meeting, open-event, and blocked-time event types
- Full-details, friends-only, and busy-only UI visibility
- Participant invitation and accepted/pending/declined responses
- Open-event join and leave controls
- Friend search, requests, accept/decline, cancellation, and removal
- Account management and display-name editing
- Role-protected admin dashboard
- Loading, empty, success, error, and confirmation states
- Firestore Security Rules and index configuration

## Project Setup

1. Install Node.js 22.22.0 or newer (required by the current React Router version).
2. Clone or extract the project.
3. Install dependencies:

```bash
npm install
```

4. Confirm the Firebase web configuration in `src/lib/firebase.ts` points to the correct Firebase project.
5. In Firebase Console, enable Google as an Authentication provider.
6. Create a Cloud Firestore database.
7. Deploy the included rules and indexes:

```bash
npx firebase-tools deploy --only firestore:rules,firestore:indexes
```

8. Start the development server:

```bash
npm run dev
```

## Available Scripts

```bash
npm run dev       # Development server
npm run build     # Production build
npm run typecheck # React Router type generation and TypeScript checks
npm run lint      # ESLint
npm run format    # Prettier formatting
npm run check     # Prettier validation
```

## Main Routes

- `/` — Public home and Google sign-in
- `/calendars` — Calendar selection and management
- `/calendars/:calendarId` — Calendar, events, and membership
- `/friends` — Friend management
- `/account` — Account management
- `/admin` — Administrator-only dashboard

## Firestore Collections

- `users`
- `groups`
- `events` (public schedule blocks)
- `eventDetails` (protected titles, descriptions, and locations)
- `friendRequests`

User documents use the Firebase Authentication UID as the Firestore document ID. Existing early-development user documents with generated IDs are migrated when the user signs in.

## Administrator Setup

New accounts receive the `user` role. To create an administrator for development, update the account's `users/{uid}.role` value to `admin` using the Firebase Console. Do not add a client-side control that allows users to promote themselves.

## Testing

Test with at least two Google accounts. See `TESTING.md` for the required manual test scenarios.

## Known Limitations

- Recurrence rules are stored but repeated event instances are not expanded into future dates yet.
- Restricted event details are stored separately from public busy blocks. Friends-only viewer access is captured when the event is created or edited, so editing an older event refreshes its eligible friend list.
- Adding calendar members currently uses an exact PeerSchedule email address.
- Google Contacts and Google Calendar imports require separate OAuth scopes and are not part of the core project.

## Security

Do not commit private service-account files, passwords, or `.env` files. Firebase web configuration identifies the Firebase project but does not replace Firestore Security Rules. The included rules enforce authentication, calendar membership, ownership, RSVP restrictions, and admin permissions.

## Academic Integrity and Credits

Document external libraries, tutorials, templates, snippets, and AI-assisted work used by the group. Team members are responsible for understanding and being able to explain all submitted code.
