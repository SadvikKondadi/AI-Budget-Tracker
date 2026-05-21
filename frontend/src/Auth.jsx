import { useState } from "react";
import axios from "axios";
import "./App.css";

const API_BASE = "https://ai-budget-tracker-backend.onrender.com";

function Auth({ setIsLoggedIn }) {
  const [isRegister, setIsRegister] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const handleSubmit = async () => {
    try {
      if (isRegister) {
        const res = await axios.post(`${API_BASE}/register`, {
          name,
          email,
          password,
        });

        alert(res.data.message);

        if (res.data.message === "User registered successfully") {
          setIsRegister(false);
        }
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

  const sendOTP = async () => {
    if (!email) {
      alert("Enter your email first");
      return;
    }

    try {
      const res = await axios.post(`${API_BASE}/send-otp`, {
        email,
      });

      alert(res.data.message);

      if (res.data.message === "OTP sent successfully") {
        setOtpSent(true);
      }
    } catch (error) {
      alert("Failed to send OTP");
    }
  };

  const resetPasswordWithOTP = async () => {
    if (!email || !otp || !newPassword) {
      alert("Enter email, OTP, and new password");
      return;
    }

    try {
      const res = await axios.post(`${API_BASE}/verify-otp-reset-password`, {
        email,
        otp,
        new_password: newPassword,
      });

      alert(res.data.message);

      if (res.data.message === "Password reset successful") {
        setShowForgotPassword(false);
        setOtpSent(false);
        setOtp("");
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
    setOtpSent(false);
    setOtp("");
    setNewPassword("");
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

            <p>Enter your email, receive OTP, and create a new password.</p>

            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            {!otpSent ? (
              <button onClick={sendOTP}>Send OTP</button>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="Enter OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
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

                <button onClick={resetPasswordWithOTP}>
                  Reset Password
                </button>
              </>
            )}

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