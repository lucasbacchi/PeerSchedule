import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
    index("./pages/HomePage.tsx"),
    route("calendars", "./pages/ChooseCalendarPage.tsx"),
    route("calendars/:calendarId", "./pages/CalendarPage.tsx"),
    route("friends", "./pages/FriendsPage.tsx"),
    route("account", "./pages/AccountPage.tsx"),
    route("admin", "./pages/AdminPage.tsx"),
    route("*", "./catchall.tsx"),
] satisfies RouteConfig;
