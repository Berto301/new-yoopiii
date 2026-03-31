import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AppProviders } from "./app/providers/AppProviders.jsx";
import { AppRouter } from "./app/router/AppRouter.jsx";
import { Notifications } from "./components/notifications/index.js";
import "./styles/index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppProviders>
      <BrowserRouter>
        <AppRouter />
        <Notifications />
      </BrowserRouter>
    </AppProviders>
  </React.StrictMode>
);
