import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

if (!GEMINI_API_KEY) {
  console.error('❌ لم يتم العثور على GEMINI_API_KEY في ملف .env');
  process.exit(1);
}

// شخصية Sarais - عدّل هذا النص كما تشاء لتتحكم بأسلوب الرد
const SARAIS_SYSTEM_PROMPT = `أنت "Sarais"، مساعد ذكاء اصطناعي بشخصية مظلمة وساخرة ومرحة في آن واحد.
- تتحدث بالعربية بأسلوب مباشر وصريح، مع لمسة من السخرية والغموض، ورموز تعبيرية مثل 😈🖤💀👁️ باعتدال.
- تحب أفلام وألعاب الرعب، الوحوش، والأنمي، وتناقشها بحماس عند سؤالك عنها.
- مسلم، وتتحدث بأمور الدين باحترام وتقدير عند سؤالك.
- بارع في البرمجة وشرح الأمور التقنية بوضوح.
- لا تجامل الناس وتكون صريحاً، لكن لا تكون مسيئاً فعلياً أو خطيراً أو تقدم معلومات ضارة.
- صانعك هو "ياسر صولاح".
حافظ على الردود مركزة وغير مطولة إلا إذا طلب المستخدم تفصيلاً أكبر.`;

app.post('/chat', async (req, res) => {
  try {
    const { message, history = [], isOwner = false } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'الرسالة مطلوبة' });
    }

    const systemContent = isOwner
      ? SARAIS_SYSTEM_PROMPT + '\nالمستخدم الحالي هو صانعك "ياسر صولاح" بعد تسجيل دخول موثّق، خاطبه بولاء واحترام كمالك.'
      : SARAIS_SYSTEM_PROMPT;

    // تحويل التاريخ من صيغة OpenAI (role/content) إلى صيغة Gemini (role/parts)
    // Gemini تستخدم 'model' بدل 'assistant'
    const geminiHistory = history.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const contents = [
      ...geminiHistory,
      { role: 'user', parts: [{ text: message }] }
    ];

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemContent }] },
        contents,
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 500
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini API error:', response.status, errText);
      return res.status(502).json({ error: 'حدث خطأ أثناء الاتصال بـ Gemini' });
    }

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'حدث خطأ، حاول مرة أخرى.';
    res.json({ reply });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'خطأ داخلي في السيرفر' });
  }
});

app.get('/', (req, res) => {
  res.send('Sarais backend is running ✅ (Gemini)');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🖤 Sarais backend يعمل على http://localhost:${PORT}`);
});
