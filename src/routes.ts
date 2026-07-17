import {
    type RouteConfig,
    index,
    route,
} from "@react-router/dev/routes";

export default [
    // Main landing page: /
    index("./pages/LandingPage.tsx"),

    // App home page after login: /home
    route("home", "./pages/HomePage.tsx"),

    // Choose or create a calendar: /calendars
    route("calendars", "./pages/ChoosePage.tsx"),

    // View a particular calendar: /calendars/:calendarId
    route(
        "calendars/:calendarId",
        "./pages/CalendarPage.tsx",
    ),

    // Account management: /account
    route("account", "./pages/AccountPage.tsx"),

    // Friend list: /friends
    route("friends", "./pages/FriendsPage.tsx"),

    // Any invalid URL
    route("*", "./catchall.tsx"),
] satisfies RouteConfig;