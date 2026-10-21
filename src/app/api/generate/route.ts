// src/app/api/generate/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// Инициализация клиента (ключ только на сервере)
const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
});

// Схема ответа (можно использовать zod, но для примера — простая валидация)
interface QuizQuestion {
    question: string;
    options: string[]; // массив из 3 вариантов (A, B, C)
    correctIndex: number; // 0, 1 или 2
}

interface GenerateResponse {
    cheatsheet: string;
    quiz: QuizQuestion[];
}

export async function POST(req: NextRequest) {
    try {
        const { topic } = await req.json();

        if (!topic || typeof topic !== "string" || topic.trim().length < 2) {
            return NextResponse.json(
                { error: "Пожалуйста, введите тему (минимум 2 символа)." },
                { status: 400 }
            );
        }

        // Формируем запрос к LLM с требованием строгого JSON
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini", // или другая доступная модель
            messages: [
                {
                    role: "system",
                    content: `Ты — экспертный технический автор. Пользователь даёт тему. Ты должен вернуть СТРОГО валидный JSON без markdown-обёрток, без пояснений, только объект.
Формат JSON:
{
  "cheatsheet": "строка в формате Markdown (заголовки, списки, блоки кода с указанием языка)",
  "quiz": [
    {
      "question": "текст вопроса",
      "options": ["вариант A", "вариант B", "вариант C"],
      "correctIndex": 0
    }
  ]
}
Требования:
- cheatsheet: подробная, структурированная шпаргалка по теме, с примерами кода (если тема техническая). Используй заголовки ##, списки, блоки \`\`\`язык.
- quiz: ровно 3 вопроса с 3 вариантами ответов каждый. correctIndex — индекс правильного ответа (0, 1 или 2).
- Верни ТОЛЬКО JSON, без обрамляющих \`\`\`json и без текста до/после.`,
                },
                {
                    role: "user",
                    content: `Тема: ${topic}`,
                },
            ],
            temperature: 0.7,
            // Если провайдер поддерживает response_format:
            // response_format: { type: "json_object" },
        });

        const rawContent = completion.choices[0]?.message?.content;
        if (!rawContent) {
            throw new Error("Пустой ответ от LLM");
        }

        // Очищаем возможные markdown-обёртки (на случай, если модель добавила ```json)
        let cleaned = rawContent.trim();
        if (cleaned.startsWith("```json")) {
            cleaned = cleaned.slice(7);
        }
        if (cleaned.startsWith("```")) {
            cleaned = cleaned.slice(3);
        }
        if (cleaned.endsWith("```")) {
            cleaned = cleaned.slice(0, -3);
        }
        cleaned = cleaned.trim();

        let parsed: GenerateResponse;
        try {
            parsed = JSON.parse(cleaned);
        } catch {
            throw new Error("Невалидный JSON от LLM");
        }

        // Валидация структуры
        if (typeof parsed.cheatsheet !== "string" || !Array.isArray(parsed.quiz)) {
            throw new Error("Неверная структура ответа");
        }
        if (parsed.quiz.length !== 3) {
            throw new Error("Ожидалось ровно 3 вопроса");
        }
        for (const q of parsed.quiz) {
            if (
                typeof q.question !== "string" ||
                !Array.isArray(q.options) ||
                q.options.length !== 3 ||
                typeof q.correctIndex !== "number" ||
                q.correctIndex < 0 ||
                q.correctIndex > 2
            ) {
                throw new Error("Неверный формат вопроса");
            }
        }

        return NextResponse.json(parsed);
    } catch (error) {
        console.error("Ошибка генерации:", error);
        return NextResponse.json(
            { error: "Произошла ошибка при генерации. Пожалуйста, попробуйте ещё раз." },
            { status: 500 }
        );
    }
}