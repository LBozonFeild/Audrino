import { useEffect, useState } from "react";
import { App } from "./App";
import { Home } from "./home/Home";
import { routeFromHash, type Route } from "./nav";

/** Top-level switch between the home page and the workbench editor. */
export function Root() {
  const [route, setRoute] = useState<Route>(() => routeFromHash(window.location.hash));
  useEffect(() => {
    const onHash = () => setRoute(routeFromHash(window.location.hash));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return route === "editor" ? <App /> : <Home />;
}
