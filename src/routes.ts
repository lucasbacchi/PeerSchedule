import {
    type RouteConfig,
    index,
    route,
} from "@react-router/dev/routes";

export default [
    // Main login/landing page: /
    index("./pages/HomePage.tsx"),

    // Choose or create a calendar: /calendars
    route("calendars", "./pages/ChooseCalendarPage.tsx"),

    // View and manage one calendar: /calendars/abc123
    route("calendars/:calendarId", "./pages/CalendarPage.tsx"),

    // Account management: /account
    route("account", "./pages/AccountPage.tsx"),

    // Friend management: /friends
    route("friends", "./pages/FriendManagementPage.tsx"),

    // Any URL that does not match the routes above
    route("*", "./catchall.tsx"),
] satisfies RouteConfig;