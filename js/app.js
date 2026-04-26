        // 4. Читаємо потокову відповідь (Streaming)
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let aiFullText = "";
        let buffer = ""; // Буфер для неповних шматків даних

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
                            contentDiv.innerHTML = formatText(aiFullText);
                            chatBox.scrollTop = chatBox.scrollHeight;
                        }
                    } catch (e) {
                        console.warn("Помилка парсингу чанка:", e, "Рядок:", trimmedLine);
                        // Пропускаємо зламаний шматок, щоб не ламати весь чат
                    }
                }
            }
        }
        chatHistory.push({ role: 'assistant', content: aiFullText });

    } catch (error) {
        contentDiv.innerHTML = '<span class="text-red-400">Помилка з\'єднання з API: ' + error.message + '</span>';
    }
