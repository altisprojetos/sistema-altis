"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { AltisLogoMark } from "@/components/ui/AltisLogo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("E-mail ou senha incorretos.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: "var(--ink-900)" }}
    >
      {/* Watermark A */}
      <div
        className="absolute pointer-events-none select-none"
        style={{ bottom: -60, right: -40, opacity: 0.04 }}
        aria-hidden="true"
      >
        <AltisLogoMark size={340} onDark />
      </div>

      <div className="w-full max-w-sm px-6 relative z-10">
        {/* Logo / Marca */}
        <div className="mb-10 flex flex-col items-center gap-4">
          <Image
            src="/logo-dark.png"
            alt="ALTIS"
            width={200}
            height={70}
            priority
          />
          <div
            className="font-mono uppercase"
            style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.25em" }}
          >
            Sistema de Gestão
          </div>
          {/* traço laranja */}
          <div
            className="h-0.5 w-10"
            style={{ background: "var(--signal-500)" }}
          />
        </div>

        {/* Card */}
        <div
          className="facet-tl p-8"
          style={{ background: "var(--paper-0)" }}
        >
          <h1
            className="font-display text-2xl font-bold mb-6"
            style={{ color: "var(--ink-900)" }}
          >
            Entrar
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold uppercase tracking-wider mb-1"
                style={{ color: "var(--steel-400)" }}
              >
                E-mail
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border outline-none transition-colors"
                style={{
                  borderColor: "var(--steel-200)",
                  background: "var(--paper-50)",
                  color: "var(--ink-900)",
                }}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold uppercase tracking-wider mb-1"
                style={{ color: "var(--steel-400)" }}
              >
                Senha
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border outline-none"
                style={{
                  borderColor: "var(--steel-200)",
                  background: "var(--paper-50)",
                  color: "var(--ink-900)",
                }}
              />
            </div>

            {error && (
              <p
                className="text-xs font-medium"
                style={{ color: "var(--signal-500)" }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="facet-br w-full py-3 text-sm font-bold uppercase tracking-widest transition-opacity disabled:opacity-60 cursor-pointer mt-2"
              style={{
                background: "var(--signal-500)",
                color: "white",
              }}
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </div>

        <p
          className="text-center text-xs mt-6"
          style={{ color: "var(--steel-400)" }}
        >
          © {new Date().getFullYear()} ALTIS. Acesso restrito.
        </p>
      </div>
    </main>
  );
}
