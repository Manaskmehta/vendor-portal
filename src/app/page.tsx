"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { User, Lock, ArrowRight, Eye, EyeOff } from "lucide-react";
import { API_URL, TOKEN_KEY, USER_KEY } from "@/lib/config";

export default function VendorLoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/vendor/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Invalid credentials. Please verify your identity.");
      }

      localStorage.setItem(TOKEN_KEY, data.access_token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.vendor));

      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Security verification failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6 selection:bg-black selection:text-white">
      <div className="w-full max-w-md space-y-8 animate-in fade-in duration-700">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center mb-1">
            <Image
              src="/macanx-logo.png"
              alt="MacanX"
              width={420}
              height={140}
              className="h-[120px] w-auto object-contain"
              priority
            />
          </div>
          <h1 className="text-lg font-black tracking-tighter text-black uppercase">
            Vendor <span className="font-light">Portal</span>
          </h1>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl shadow-gray-50">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="p-4 bg-black text-white text-xs font-bold rounded-xl animate-in slide-in-from-top-2 duration-300">
                {error.toUpperCase()}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
                Email or Phone
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-400 group-focus-within:text-black transition-colors">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  autoFocus
                  className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-black focus:bg-white transition-all outline-none"
                  placeholder="email or phone number"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
                Security Key
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-400 group-focus-within:text-black transition-colors">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className="w-full pl-11 pr-12 py-3.5 bg-gray-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-black focus:bg-white transition-all outline-none"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-black transition-colors"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white py-4 rounded-2xl font-bold text-sm tracking-widest uppercase flex items-center justify-center gap-2 hover:bg-gray-900 active:scale-[0.98] transition-all shadow-lg shadow-gray-200 disabled:opacity-50"
            >
              {loading ? (
                <Image src="/ring.png" alt="" width={32} height={32} className="h-8 w-8 animate-spin" unoptimized />
              ) : (
                <>
                  Initialize Session <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-[10px] font-bold text-gray-300 uppercase tracking-widest">
          &copy; 2026 MACANX. ALL RIGHTS RESERVED.
        </p>
      </div>
    </div>
  );
}
