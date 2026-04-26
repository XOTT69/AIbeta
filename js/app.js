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

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // 4. Читаємо потокову відповідь (Streaming) з правильним парсингом
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let aiFullText = "";
        let buffer = ""; // Буфер для збирання розірваних шматків даних

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            // Додаємо нові дані до буфера
            buffer += decoder.decode(value, { stream: true });
            
            // Розбиваємо буфер на окремі рядки
            const lines = buffer.split('\n');
            
            // Останній рядок може бути неповним, тому залишаємо його в буфері
            buffer = lines.pop() || "";
            
            for (const line of lines) {
                const trimmedLine = line.trim();
                if (!trimmedLine || trimmedLine === 'data: [DONE]') continue;
                
                if (trimmedLine.startsWith('data: ')) {
                    try {
                        const jsonStr = trimmedLine.slice(6);
                        const data = JSON.parse(jsonStr);
                        
                        // NVIDIA/OpenAI формат: шматочок тексту лежить у delta.content
                        if (data.choices && data.choices[0].delta && data.choices[0].delta.content) {
                            aiFullText += data.choices[0].delta.content;
                            contentDiv.innerHTML = formatText(aiFullText); // Просте форматування
                            chatBox.scrollTop = chatBox.scrollHeight;
                        }
                    } catch (e) {
                        console.warn("Помилка парсингу чанка:", e, "Рядок:", trimmedLine);
                        // Пропускаємо зламаний шматок, щоб не ламати весь чат
                    }
                }
            }
        }
        
        // Зберігаємо повну відповідь AI в історію чату
        chatHistory.push({ role: 'assistant', content: aiFullText });

    } catch (error) {
        contentDiv.innerHTML = `<span class="text-red-400">Помилка з'єднання з API: ${error.message}</span>`;
        console.error(error);
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
    // Просте форматування: замінюємо теги, щоб не ламався HTML
    return text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

sendBtn.addEventListener('click', sendMessage);

msgInput.addEventListener('keypress', (e) => {
    // Відправляємо по Enter, якщо не затиснутий Shift (Shift+Enter = новий рядок)
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});
