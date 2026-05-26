import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { DesktopApp } from "./app/app";
import "../../web/app/globals.css";
import "./app/styles.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Desktop root element is missing.");
}

createRoot(root).render(
  <StrictMode>
    <DesktopApp />
  </StrictMode>,
);
