export const config = {
    runtime: 'edge'
};

export default async function handler(req) {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

    try {
        const { messages, model } = await req.json();
        const apiKey = process.env.NVIDIA_API_KEY;

        // Запит до NVIDIA API (формат OpenAI)
        const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: model || "meta/llama3-70b-instruct",
                messages: messages,
                temperature: 0.7,
                max_tokens: 2048,
                stream: true // Потокова віддача тексту
            })
        });

        // Повертаємо потік даних прямо на клієнт
        return new Response(response.body, {
            headers: { "Content-Type": "text/event-stream" }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
