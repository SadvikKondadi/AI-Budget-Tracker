import { useState } from "react";
import axios from "axios";
import "./App.css";

const API_BASE = "https://ai-budget-tracker-backend.onrender.com";

function Auth({ setIsLoggedIn }) {
  const [isRegister, setIsRegister] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async () => {
    try {
      if (isRegister) {
        const res = await axios.post(`${API_BASE}/register`, {
          name,
          email,
          password,
        });

        alert(res.data.message);
        setIsRegister(false);
      } else {
        const res = await axios.post(`${API_BASE}/login`, {
          email,
          password,
        });

        if (res.data.message === "Login successful") {
          localStorage.setItem("user", JSON.stringify(res.data.user));
          setIsLoggedIn(true);
        } else {
          alert(res.data.message);
        }
      }
    } catch (error) {
      alert("Authentication failed");
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <h1>AI Budget Tracker</h1>
        <p>
          Track expenses, predict spending, manage budgets, and get AI-powered
          financial insights.
        </p>
      </div>

      <div className="auth-card">
        <h2>{isRegister ? "Create Account" : "Welcome Back"}</h2>
        <p>
          {isRegister
            ? "Register to start managing your finance."
            : "Login to continue to your dashboard."}
        </p>

        {isRegister && (
          <input
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        )}

        <input
          type="email"
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button onClick={handleSubmit}>
          {isRegister ? "Register" : "Login"}
        </button>

        <p className="switch-auth">
          {isRegister ? "Already have an account?" : "Don't have an account?"}
          <span onClick={() => setIsRegister(!isRegister)}>
            {isRegister ? " Login" : " Register"}
          </span>
        </p>
      </div>
    </div>
  );
}

export default Auth;