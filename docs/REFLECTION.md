# Team Reflection

PeerSchedule demonstrates a complete authenticated scheduling workflow built with React, TypeScript, and
Firebase. The team separated UI pages from typed service modules and used Firestore Rules as an independent
authorization layer.

The most challenging areas were private availability, recurring-series consistency, and shared-calendar
permissions. Private event text was separated from public schedule blocks so busy-only access does not depend
on client-side filtering. Recurring instances share a series identifier and support scoped deletion. Security
rules and emulator tests cover membership, event creation, RSVP ownership, administrative access, and limited
directory search.

Further work could include a common-time finder, invitation notifications, conflict detection, iCalendar
export, and broader browser automation. Each team member should add their individual contribution and lessons
learned before final submission.
