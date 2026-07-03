import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [index("./pages/HomePage.tsx"), route("*?", "catchall.tsx")] satisfies RouteConfig;
