// src/app/result/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Highlighter } from "shiki";

interface QuizQuestion {
    question: string;
    options: string[];
    correctIndex: number;
}

interface GeneratedData {
    cheatsheet: string;
    quiz: QuizQuestion[];
}

// Компонент для блока кода с подсветкой и кнопкой копирования
function CodeBlock({
                       language,
                       code,
                       highlighter,
                   }: {
    language: string;
    code: string;
    highlighter: Highlighter | null;
}) {
    const [copied, setCopied] = useState(false);
    const [html, setHtml] = useState("");

    useEffect(() => {
        if (!highlighter) return;
        try {
            const result = highlighter.codeToHtml(code, {
                lang: language || "text",
                theme: "github-dark",
            });
            setHtml(result);
        } catch {
            // fallback: просто экранированный текст
            setHtml(`<pre><code>${escapeHtml(code)}</code></pre>`);
        }
    }, [code, language, highlighter]);

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="relative group my-4">
            <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={handleCopy}
                    className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded text-white"
                >
                    {copied ? "Скопировано!" : "Copy"}
                </button>
            </div>
            {html ? (
                <div dangerouslySetInnerHTML={{ __html: html }} />
            ) : (
                <pre className="bg-slate-800 p-4 rounded-lg overflow-x-auto">
          <code>{code}</code>
        </pre>
            )}
        </div>
    );
}

function escapeHtml(text: string) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

// Компонент квиза
function Quiz({ questions }: { questions: QuizQuestion[] }) {
    const [answers, setAnswers] = useState<(number | null)[]>(
        new Array(questions.length).fill(null)
    );
    const [submitted, setSubmitted] = useState(false);

    const handleSelect = (qIndex: number, optionIndex: number) => {
        if (submitted) return;
        const newAnswers = [...answers];
        newAnswers[qIndex] = optionIndex;
        setAnswers(newAnswers);
    };

    const handleSubmit = () => {
        if (answers.some((a) => a === null)) return;
        setSubmitted(true);
    };

    const handleReset = () => {
        setAnswers(new Array(questions.length).fill(null));
        setSubmitted(false);
    };

    const score = submitted
        ? answers.reduce((acc, ans, idx) => {
            return acc + (ans === questions[idx].correctIndex ? 1 : 0);
        }, 0)
        : 0;

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Мини-тест</h2>
            {questions.map((q, qIndex) => (
                <div key={qIndex} className="bg-slate-800/50 rounded-xl p-4 space-y-3">
                    <p className="font-medium text-slate-200">
                        {qIndex + 1}. {q.question}
                    </p>
                    <div className="space-y-2">
                        {q.options.map((opt, optIndex) => {
                            const isSelected = answers[qIndex] === optIndex;
                            const isCorrect = optIndex === q.correctIndex;
                            let btnClass =
                                "w-full text-left p-3 rounded-lg border transition-all ";

                            if (submitted) {
                                if (isCorrect) {
                                    btnClass += "bg-green-900/50 border-green-500 text-green-200";
                                } else if (isSelected && !isCorrect) {
                                    btnClass += "bg-red-900/50 border-red-500 text-red-200";
                                } else {
                                    btnClass += "bg-slate-700/30 border-slate-600 text-slate-400";
                                }
                            } else {
                                btnClass += isSelected
                                    ? "bg-blue-900/50 border-blue-500 text-blue-200"
                                    : "bg-slate-700/30 border-slate-600 text-slate-300 hover:bg-slate-700/60";
                            }

                            return (
                                <button
                                    key={optIndex}
                                    onClick={() => handleSelect(qIndex, optIndex)}
                                    disabled={submitted}
                                    className={btnClass}
                                >
                                    {String.fromCharCode(65 + optIndex)}. {opt}
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}

            <div className="flex items-center justify-between">
                {!submitted ? (
                    <button
                        onClick={handleSubmit}
                        disabled={answers.some((a) => a === null)}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
                    >
                        Проверить ответы
                    </button>
                ) : (
                    <div className="flex items-center gap-4">
            <span className="text-lg font-semibold text-white">
              Результат: {score} из {questions.length}
            </span>
                        <button
                            onClick={handleReset}
                            className="px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg font-medium transition-colors"
                        >
                            Пройти заново
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function ResultPage() {
    const [data, setData] = useState<GeneratedData | null>(null);
    const [topic, setTopic] = useState("");
    const [highlighter, setHighlighter] = useState<Highlighter | null>(null);
    const [loadingHighlight, setLoadingHighlight] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const stored = sessionStorage.getItem("generatedData");
        const storedTopic = sessionStorage.getItem("topic");
        if (!stored) {
            router.push("/");
            return;
        }
        setData(JSON.parse(stored));
        setTopic(storedTopic || "");
    }, [router]);

    // Инициализация Shiki
    useEffect(() => {
        import("shiki").then(async ({ createHighlighter }) => {
            const hl = await createHighlighter({
                themes: ["github-dark"],
                langs: ["javascript", "typescript", "python", "bash", "dockerfile", "yaml", "json", "html", "css", "go", "rust", "java", "sql", "text"],
            });
            setHighlighter(hl);
            setLoadingHighlight(false);
        });
    }, []);

    if (!data) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
                Загрузка...
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white py-8 px-4">
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                        {topic || "Шпаргалка"}
                    </h1>
                    <button
                        onClick={() => router.push("/")}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors"
                    >
                        Новая тема
                    </button>
                </div>

                {/* Шпаргалка */}
                <div className="bg-slate-800/30 rounded-2xl p-6 border border-slate-700">
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                            code({ className, children, ...props }) {
                                const match = /language-(\w+)/.exec(className || "");
                                const language = match ? match[1] : "";
                                const codeString = String(children).replace(/\n$/, "");
                                const isInline = !className;

                                if (isInline) {
                                    return (
                                        <code className="bg-slate-700 px-1.5 py-0.5 rounded text-sm" {...props}>
                                            {children}
                                        </code>
                                    );
                                }

                                if (loadingHighlight || !highlighter) {
                                    return (
                                        <pre className="bg-slate-800 p-4 rounded-lg overflow-x-auto my-4">
                      <code>{codeString}</code>
                    </pre>
                                    );
                                }

                                return (
                                    <CodeBlock
                                        language={language}
                                        code={codeString}
                                        highlighter={highlighter}
                                    />
                                );
                            },
                        }}
                    >
                        {data.cheatsheet}
                    </ReactMarkdown>
                </div>

                {/* Квиз */}
                <div className="bg-slate-800/30 rounded-2xl p-6 border border-slate-700">
                    <Quiz questions={data.quiz} />
                </div>
            </div>
        </main>
    );
}