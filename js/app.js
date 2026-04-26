const chatBox = document.getElementById('chatBox');
const msgInput = document.getElementById('msgInput');
const sendBtn = document.getElementById('sendBtn');
const modelSelect = document.getElementById('modelSelect');

let chatHistory = [];

// Автоматична зміна висоти поля вводу
msgInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
});

async function sendMessage() {
    const text = msgInput.value.trim();
    if (!text) return;

    // 1. Додаємо повідомлення юзера в UI
    appendMessage('User', text, 'bg-blue-600');
    chatHistory.push({ role: 'user', content: text });
    msgInput.value = '';
    msgInput.style.height = 'auto';

    // 2. Створюємо пусте повідомлення для AI
    const aiMessageEl = appendMessage('AI', '...', 'bg-gray-800');
    const contentDiv = aiMessageEl.querySelector('.message-content');
    contentDiv.innerHTML = ''; 

    try {
        // 3. Відправляємо запит на наш безпечний Vercel бекенд
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: modelSelect.value,
                messages: chatHistory
            })
        });

        // 4. Читаємо потокову відповідь (Streaming)
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let aiFullText = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.trim() !== '');
            
            for (const line of lines) {
                if (line === 'data: [DONE]') continue;
                if (line.startsWith('data: ')) {
                    const data = JSON.parse(line.slice(6));
                    if (data.choices[0].delta.content) {
                        aiFullText += data.choices[0].delta.content;
                        contentDiv.innerHTML = formatText(aiFullText); // Просте форматування
                        chatBox.scrollTop = chatBox.scrollHeight;
                    }
                }
            }
        }
        chatHistory.push({ role: 'assistant', content: aiFullText });

    } catch (error) {
        contentDiv.innerHTML = '<span class="text-red-400">Помилка з\'єднання з API</span>';
    }
}

function appendMessage(sender, text, bgColorClass) {
    const div = document.createElement('div');
    div.className = 'flex gap-4 mb-4';
    div.innerHTML = `
        <div class="w-8 h-8 rounded-full ${bgColorClass} flex items-center justify-center shrink-0 text-white text-sm font-bold">
            ${sender === 'User' ? 'U' : 'AI'}
        </div>
        <div class="bg-gray-800 p-4 rounded-xl ${sender === 'User' ? 'rounded-tr-none ml-auto' : 'rounded-tl-none'} max-w-3xl border border-gray-700">
            <div class="message-content text-gray-100 whitespace-pre-wrap">${text}</div>
        </div>
    `;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
    return div;
}

function formatText(text) {
    return text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

sendBtn.addEventListener('click', sendMessage);
msgInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});
