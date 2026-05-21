import { useState } from "react";
import axios from "axios";
import "./App.css";

const API_BASE = "https://ai-budget-tracker-backend.onrender.com";

function Auth({ setIsLoggedIn }) {
  const [isRegister, setIsRegister] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [newPassword, setNewPassword] = useState("");

  const handleSubmit = async () => {
    try {
      if (isRegister) {
        const response = await axios.post(`${API_BASE}/register`, {
          name,
          email,
          password,
        });

        alert(response.data.message);

        if (response.data.message === "User registered successfully") {
          setIsRegister(false);
        }
      } else {
        const response = await axios.post(`${API_BASE}/login`, {
          email,
          password,
        });

        if (response.data.message === "Login successful") {
          localStorage.setItem("user", JSON.stringify(response.data.user));
          setIsLoggedIn(true);
        } else {
          alert(response.data.message);
        }
      }
    } catch (error) {
      alert("Authentication failed");
    }
  };

  const resetPassword = async () => {
    if (!email || !newPassword) {
      alert("Please enter email and new password");
      return;
    }

    try {
      const response = await axios.post(`${API_BASE}/reset-password`, {
        email,
        new_password: newPassword,
      });

      alert(response.data.message);

      if (response.data.message === "Password reset successful") {
        setShowForgotPassword(false);
        setNewPassword("");
        setPassword("");
        setIsRegister(false);
      }
    } catch (error) {
      alert("Password reset failed");
    }
  };

  const backToLogin = () => {
    setShowForgotPassword(false);
    setNewPassword("");
    setPassword("");
    setIsRegister(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <h1>AI Budget Tracker</h1>

        <p>
          Manage expenses, upload bank statements, track spending trends, and
          get AI-powered financial insights.
        </p>
      </div>

      <div className="auth-card">
        {!showForgotPassword ? (
          <>
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

            <div className="password-box">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <span
                className="eye-icon"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "🙈" : "👁"}
              </span>
            </div>

            <button onClick={handleSubmit}>
              {isRegister ? "Register" : "Login"}
            </button>

            {!isRegister && (
              <p
                className="forgot-password"
                onClick={() => setShowForgotPassword(true)}
              >
                Forgot Password?
              </p>
            )}

            <p className="switch-auth">
              {isRegister
                ? "Already have an account?"
                : "Don't have an account?"}

              <span onClick={() => setIsRegister(!isRegister)}>
                {isRegister ? " Login" : " Register"}
              </span>
            </p>
          </>
        ) : (
          <>
            <h2>Reset Password</h2>

            <p>Enter your email and create a new password.</p>

            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <div className="password-box">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />

              <span
                className="eye-icon"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "🙈" : "👁"}
              </span>
            </div>

            <button onClick={resetPassword}>Reset Password</button>

            <button className="back-login-btn" onClick={backToLogin}>
              ← Back to Login
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default Auth;