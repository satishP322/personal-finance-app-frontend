"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  // Redirect to dashboard if already logged in
  useEffect(() => {
    const token = localStorage.getItem("idToken");
    if (token) {
      router.replace("/dashboard");
    }
  }, [router]);

  // Handle login
  const handleLogin = async (email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        // Store tokens & userId in localStorage
        localStorage.setItem("idToken", data.idToken);
        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("refreshToken", data.refreshToken);
        localStorage.setItem("userId", data.userId);

        // Redirect to dashboard
        router.replace("/dashboard");
      } else {
        setError(data.error || "Login failed");
      }
    } catch (err) {
      console.error(err);
      setError("Login failed. Try again.");
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#f0f4f8] overflow-hidden">
      {/* App name at top-left */}
      <div className="absolute top-6 left-6 text-2xl font-bold text-blue-600">
        Finlumo
      </div>

      {/* Background shapes */}
      <div className="absolute shape one w-[200px] h-[200px] bg-[#6a11cb] top-[-50px] left-[-50px] rounded-full opacity-20"></div>
      <div className="absolute shape two w-[300px] h-[300px] bg-[#2575fc] bottom-[-100px] right-[-100px] rounded-full opacity-20"></div>

      {/* Centered login box */}
      <div className="relative z-10 login-box bg-white p-10 rounded-[15px] shadow-[0_10px_30px_rgba(0,0,0,0.1)] w-[390px] text-center">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">Login</h1>

        {error && <p className="text-red-500 mb-4">{error}</p>}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleLogin(email, password);
          }}
          className="flex flex-col"
        >
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mb-3 p-3 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-blue-400"
          />

          {/* Password with toggle */}
          <div className="relative mb-3">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full p-3 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-blue-400"
            />

            {password.length > 0 && (
              <span
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 cursor-pointer text-gray-600"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </span>
            )}
          </div>

          <button
            type="submit"
            className="mt-2 p-3 rounded-lg bg-gradient-to-r from-[#6a11cb] to-[#2575fc] text-white font-semibold hover:opacity-90 transition"
          >
            Login
          </button>
        </form>

        <p className="mt-6 text-gray-600">
          Don't have an account?{" "}
          <a
            href="/signup"
            className="text-blue-600 font-semibold hover:underline"
          >
            Sign Up
          </a>
        </p>
      </div>
    </div>
  );
}
