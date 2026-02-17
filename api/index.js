const axios = require('axios');

export default async function handler(req, res) {
    const { BOT_TOKEN, OPENROUTER_KEY, ADMIN_ID } = process.env;

    // CORS настройки для фронтенда
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        // 1. Синхронизация данных (GET запрос из твоего HTML)
        if (req.method === 'GET') {
            const { id } = req.query;
            return res.status(200).json({
                id: id,
                credits: 50,
                last_model: 'gpt4',
                achievements: '["boot"]'
            });
        }

        // 2. Основная логика Telegram (POST запрос)
        if (req.method === 'POST') {
            const update = req.body;

            if (update.message) {
                const { chat, from, text, web_app_data } = update.message;

                // Приветствие /start
                if (text === '/start') {
                    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                        chat_id: chat.id,
                        text: "💠 **MIRA CORE v5.0**\nИнициализация на серверах Vercel завершена.\n\nДоступно 15 нейронных узлов.",
                        reply_markup: {
                            inline_keyboard: [[{ 
                                text: "🖥 ОТКРЫТЬ ТЕРМИНАЛ", 
                                web_app: { url: "https://major-woolfi.github.io/Project_Mira/" } 
                            }]]
                        }
                    });
                }

                // Данные из твоего Web App (ИИ и Платежи)
                if (web_app_data) {
                    const data = JSON.parse(web_app_data.data);

                    if (data.action === 'generate') {
                        // Запрос к OpenRouter
                        const aiRes = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
                            model: mapModel(data.model),
                            messages: [{ role: 'user', content: data.prompt }]
                        }, {
                            headers: { 'Authorization': `Bearer ${OPENROUTER_KEY}` }
                        });

                        const answer = aiRes.data.choices[0].message.content;
                        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                            chat_id: chat.id,
                            text: `🤖 [${data.model.toUpperCase()}]\n\n${answer}`
                        });
                    }

                    if (data.action === 'pay') {
                        // Запрос админу на оплату
                        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                            chat_id: ADMIN_ID,
                            text: `💰 **ЗАПРОС ОПЛАТЫ**\nID: ${from.id}\nЮзер: @${from.username}\nМетод: ${data.method}`,
                            reply_markup: {
                                inline_keyboard: [[
                                    { text: "✅ ПОДТВЕРДИТЬ", callback_data: `ok:${from.id}` },
                                    { text: "❌ ОТКЛОНИТЬ", callback_data: `no` }
                                ]]
                            }
                        });
                        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                            chat_id: chat.id,
                            text: "⏳ Запрос отправлен. Ожидайте подтверждения админом."
                        });
                    }
                }
            }
            return res.status(200).send('OK');
        }
    } catch (err) {
        return res.status(500).send(err.message);
    }
}

function mapModel(id) {
    const m = { 
        'gpt4': 'openai/gpt-4o', 
        'claude': 'anthropic/claude-3.5-sonnet',
        'gemini': 'google/gemini-pro-1.5',
        'flux': 'black-forest-labs/flux-schnell' 
    };
    return m[id] || 'openai/gpt-4o-mini';
}
