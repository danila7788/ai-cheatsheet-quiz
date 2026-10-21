// src/app/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PRESETS = [
  { title: "Замыкания в JavaScript", query: "Замыкания в JavaScript" },
  { title: "Docker Compose", query: "Как работает Docker Compose" },
  { title: "Git: топ-10 команд", query: "Git: топ-10 команд" },
  { title: "Основы REST API", query: "Основы REST API" },
];

export default function HomePage() {
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (query: string) => {
    const finalQuery = query.trim() || topic.trim();
    if (!finalQuery) {
      setError("Введите тему");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: finalQuery }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Ошибка генерации");
      }

      // Сохраняем результат в sessionStorage и переходим на страницу результата
      sessionStorage.setItem("generatedData", JSON.stringify(data));
      sessionStorage.setItem("topic", finalQuery);
      router.push("/result");
    } catch (err: any) {
      setError(err.message || "Произошла ошибка. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  };

  const handlePresetClick = (query: string) => {
    setTopic(query);
    handleSubmit(query);
  };

  return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white flex flex-col items-center justify-center p-4">
        <div className="max-w-2xl w-full space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              AI CheatSheet & Quiz
            </h1>
            <p className="text-slate-300">
              Введите тему — получите интерактивную шпаргалку и мини-тест.
            </p>
          </div>

          <div className="space-y-4">
            <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit("")}
                placeholder="Например: async/await в JavaScript"
                className="w-full px-6 py-4 rounded-xl bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 backdrop-blur"
                disabled={loading}
            />

            <button
                onClick={() => handleSubmit("")}
                disabled={loading}
                className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:cursor-not-allowed font-semibold text-lg transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                  <>
                    <svg
                        className="animate-spin h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                      <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                      />
                      <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Генерация...
                  </>
              ) : (
                  "Сгенерировать шпаргалку"
              )}
            </button>

            {error && (
                <p className="text-red-400 text-center bg-red-900/30 py-2 rounded-lg">
                  {error}
                </p>
            )}
          </div>

          <div className="space-y-3">
            <p className="text-slate-400 text-sm text-center">Быстрый старт</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PRESETS.map((preset) => (
                  <button
                      key={preset.title}
                      onClick={() => handlePresetClick(preset.query)}
                      disabled={loading}
                      className="p-4 rounded-xl bg-slate-700/30 border border-slate-600 hover:bg-slate-700/60 transition-all text-left disabled:opacity-50"
                  >
                    <span className="font-medium">{preset.title}</span>
                  </button>
              ))}
            </div>
          </div>
        </div>
      </main>
  );
}