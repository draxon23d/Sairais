import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

if (!OPENAI_API_KEY) {
  console.error('❌ لم يتم العثور على OPENAI_API_KEY في ملف .env');
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

    const messages = [
      { role: 'system', content: systemContent },
      ...history,
      { role: 'user', content: message }
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0.9,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('OpenAI API error:', response.status, errText);
      return res.status(502).json({ error: 'حدث خطأ أثناء الاتصال بـ OpenAI' });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content?.trim() || 'حدث خطأ، حاول مرة أخرى.';
    res.json({ reply });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'خطأ داخلي في السيرفر' });
  }
});

app.get('/', (req, res) => {
  res.send('Sarais backend is running ✅');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🖤 Sarais backend يعمل على http://localhost:${PORT}`);
});
