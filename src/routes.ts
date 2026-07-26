import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
    index("./pages/HomePage.tsx"),
    route("plans", "./pages/PlansPage.tsx"),
    route("groups", "./pages/ChooseCalendarPage.tsx"),
    route("groups/:calendarId", "./pages/CalendarPage.tsx"),
    route("friends", "./pages/FriendsPage.tsx"),
    route("account", "./pages/AccountPage.tsx"),
    route("admin", "./pages/AdminPage.tsx"),
    route("*", "./catchall.tsx"),
] satisfies RouteConfig;
