import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import Auth from "./Auth";
import "./App.css";

function Root() {
  const [isLoggedIn, setIsLoggedIn] = useState(
    !!localStorage.getItem("user")
  );

  return isLoggedIn ? (
    <App setIsLoggedIn={setIsLoggedIn} />
  ) : (
    <Auth setIsLoggedIn={setIsLoggedIn} />
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);