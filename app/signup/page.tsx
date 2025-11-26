"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        router.replace("/login");
      } else {
        setError(data.error || "Could not create account");
      }
    } catch {
      setError("Something went wrong");
    }
  };

  const passwordsMismatch =
    confirmPassword.length > 0 && password !== confirmPassword;

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-gray-200 via-gray-300 to-gray-400">
      {/* App name */}
      <div className="absolute top-6 left-6 text-2xl font-bold text-violet-1200">
        Finlumo
      </div>

      {/* Decorative shapes */}
      <div className="absolute -top-32 -left-32 w-60 h-60 bg-yellow-200/50 rounded-full filter blur-2xl animate-spin-slow"></div>
      <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-purple-300/30 rounded-full filter blur-3xl animate-spin-slow-reverse"></div>

      {/* Signup Card */}
      <div className="relative z-10 bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl max-w-md w-full p-12">
        <h2 className="text-4xl font-bold text-gray-800 mb-8 text-center tracking-wide">
          Create Account
        </h2>

        {error && <p className="text-red-500 text-center mb-4">{error}</p>}

        <form className="space-y-6" onSubmit={handleSignup}>
          {/* Email */}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-400 shadow-sm transition hover:scale-[1.02] duration-300"
            required
          />

          {/* Password */}
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-400 shadow-sm transition hover:scale-[1.02] duration-300"
              required
            />
            {password.length > 0 && (
              <span
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-4 cursor-pointer text-gray-600"
              >
                {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
              </span>
            )}
          </div>

          {/* Confirm Password */}
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Re-enter Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`w-full p-4 rounded-xl border ${
                passwordsMismatch ? "border-red-500" : "border-gray-300"
              } focus:outline-none focus:ring-2 focus:ring-green-400 shadow-sm transition hover:scale-[1.02] duration-300`}
              required
            />
            {confirmPassword.length > 0 && (
              <span
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-4 cursor-pointer text-gray-600"
              >
                {showConfirmPassword ? <EyeOff size={22} /> : <Eye size={22} />}
              </span>
            )}
          </div>

          {/* Live mismatch error */}
          {passwordsMismatch && (
            <p className="text-red-500 -mt-4 text-sm text-center">
              Passwords do not match
            </p>
          )}

          {/* Submit */}
          <button className="w-full py-4 bg-gradient-to-r from-green-400 via-green-500 to-teal-400 text-white font-semibold rounded-xl shadow-lg hover:scale-105 transition duration-300">
            Sign Up
          </button>
        </form>

        <p className="mt-6 text-center text-gray-600">
          Already have an account?{" "}
          <a href="/login" className="text-green-600 font-semibold hover:underline">
            Login
          </a>
        </p>
      </div>
    </div>
  );
}
