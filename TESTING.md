# PeerSchedule Testing

## Automated checks

```bash
npm run typecheck
npm run lint
npm run check
npm run test:rules
npm run build
```

The Firestore Rules suite uses the Firebase Emulator and covers signed-out access, calendar membership,
event creation, RSVP isolation, admin-only reads, and limited user-directory searches.

## Required multi-account walkthrough

Use two normal Google accounts and one admin account.

1. Sign in with a new account and confirm one `users/{uid}` document is created.
2. Sign out and back in; confirm the same document is reused and has `searchTokens`.
3. Create, rename, open, and delete a calendar.
4. Add the second account as a member, then confirm it can open and leave the calendar.
5. Confirm an unrelated account cannot open the calendar URL.
6. Create each event type. Confirm participants start empty until explicitly selected.
7. Respond to a meeting invitation from the second account; confirm it cannot alter another response.
8. Create `busy_only` blocked time and confirm nonparticipants see only “Busy.”
9. Join and leave an open event.
10. Create a recurring event with an end date and test all three deletion scopes.
11. Search users by display-name and email fragments; confirm results are capped.
12. Send, accept, decline, cancel, and remove friend relationships.
13. Confirm a normal user cannot load `/admin`; confirm an admin can moderate content.
14. Test the navbar, calendar grid, forms, and dialogs at mobile and desktop widths.
15. Verify dialogs trap focus, close with Escape, and restore focus to the opening control.
