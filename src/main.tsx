import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import MissingConfig from "./components/MissingConfig.tsx";
import { isSupabaseConfigured } from "./lib/env.ts";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  isSupabaseConfigured ? <App /> : <MissingConfig />
);
