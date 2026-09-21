import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { BugBoundary } from "./BugBoundary";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BugBoundary>
      <App />
    </BugBoundary>
  </StrictMode>
);
