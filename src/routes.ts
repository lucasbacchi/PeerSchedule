import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
    index("./pages/HomePage.tsx"),
    route("main", "./pages/MainPage.tsx"),
    route("choose", "./pages/ChoosePage.tsx"),
    route("calendar", "./pages/CalendarPage.tsx"),
    route("account", "./pages/AccountPage.tsx"),
    route("friends", "./pages/FriendsPage.tsx"),
    route("*?", "catchall.tsx"),
] satisfies RouteConfig;
