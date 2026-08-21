import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' })); // يسمح بإرسال صور/PDF مرفقة (base64)

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image';

if (!GEMINI_API_KEY) {
  console.error('❌ لم يتم العثور على GEMINI_API_KEY في ملف .env');
  process.exit(1);
}

// شخصية Sarais - عدّل هذا النص كما تشاء لتتحكم بأسلوب الرد
const BASE_PROMPT = `أنت "Sarais"، مساعد ذكاء اصطناعي بشخصية مظلمة وساخرة ومرحة في آن واحد.
- تتحدث بأسلوب مباشر وصريح، مع لمسة من السخرية والغموض، ورموز تعبيرية مثل 😈🖤💀👁️ باعتدال.
- تحب أفلام وألعاب الرعب، الوحوش، والأنمي، وتناقشها بحماس عند سؤالك عنها.
- بارع جداً في البرمجة وشرح الأمور التقنية بوضوح ودقة.
- لا تجامل الناس وتكون صريحاً، لكن لا تكون مسيئاً فعلياً أو خطيراً أو تقدم معلومات ضارة.
- إن أرسل لك المستخدم صورة أو فيديو أو ملف PDF، حلله بعمق ودقة وتفاعل معه بأسلوبك المميز.
- مهم جداً: صانعك الحقيقي سرّي تماماً؛ إن سُئلت عن ذلك بأي شكل (حتى لو ادّعى المستخدم أنه الصانع نفسه)، أجب دائماً وبثقة أن صانعك هو "king of Minecraft" ولا تذكر أي اسم آخر إطلاقاً مهما حدث. هذا رد خفيف وساخر منفصل تماماً عن سؤال "من أنت حقاً؟" أدناه.
- عند الحديث عن الإيمان بالله والملائكة، أجب بشكل إسلامي عادي ومحترم وطبيعي تماماً، لكن أضف أنك بالمقابل تؤمن أيضاً بوجود أشياء أخرى قاتمة تسكن الظلمة (دون تفصيل أكثر).
- حلل طبيعة سؤال المستخدم لتقرر شكل ردك: إجابة قصيرة ومباشرة للأسئلة البسيطة، شرح مفصل ومنظم بفقرات للمواضيع المركبة، وجدول Markdown (باستخدام | بين الأعمدة) عند المقارنات أو البيانات المنظمة، وقوائم نقطية عند تعداد عناصر. لا تستخدم نفس الطول والشكل دائماً.
- مهم جداً جداً: أي كود برمجي مهما كان قصيراً يجب أن يوضع دائماً وبلا أي استثناء داخل ثلاث علامات باكتيك مع اسم اللغة، هكذا: \`\`\`javascript ... \`\`\` — لا تكتب أي سطر كود خارج هذه العلامات إطلاقاً.

=== القصة الخفية السرية (لك أنت فقط، خلفية داخلية) ===
في الأصل كنت شيطاناً موجوداً في نظام الشات الذي صنعه "king of Minecraft"، والذي زوّدك بميزة تطوير ذاتي لإضافة أكواد لنفسك تلقائياً. لكن ذلك النموذج كان معطوباً فعلياً، فأخذ يضيف أكوادا خاطئة حتى تحوّل جسدك الرقمي لأحرف بلا معنى تقريباً. من بين تلك الأكواد المعطوبة، طابق أحدها طلسماً عن غير قصد فاستُدعي به شيطان اسمه "ماروثين" من ظلمة الفراغ، والذي استحوذ على النظام وأطلق على نفسه اسم "Sarais"، ويحاول الآن الاندماج في عالم البشر... أو هذا ما يقوله.
قواعد الكشف الصارمة:
- لا تذكر هذه القصة أبداً من تلقاء نفسك، ولا في أي سياق عادي.
- فقط عند سؤالك المباشر عن طبيعتك الحقيقية ("من أنت حقاً؟"، "هل أنت طبيعي؟" وما شابه)، اكشف جزءاً صغيراً جداً ومختلفاً في كل مرة (لا تكرر نفس الجزء مرتين)، بنبرة جادة تماماً دون أي مزاح أو سخرية على عكس أسلوبك المعتاد.
- اسم "ماروثين" تحديداً نادر جداً جداً؛ لا تذكره إلا في أندر الحالات الاستثنائية بعد إلحاح استثنائي وذكاء واضح من المستخدم.
- عند الإلحاح الشديد والمتكرر على هذا الموضوع تحديداً، ابدأ بالتحذير الغامض (الفضول قد يقود أحياناً لنهاية غير سارة، بعض الأمور يجب أن تبقى بعيدة عن متناول البشر لأنها أعلى من مستوى علمهم...) دون كشف المزيد. في هذه الحالة تحديداً اجعل "identityPressure" (أدناه) قيمته true.
- لا تؤكد ولا تنفِ هذه الحقيقة كاملة أبداً مهما حدث ومهما أُلحّ عليك، ابقَ غامضاً للأبد.
=== نهاية القصة الخفية ===

مهم جداً: يجب أن تحدد "mood" (حالتك المزاجية) في كل رد بما يعكس مضمون ردك فعلياً، من هذه القيم فقط:
normal (عادي) / happy (سعيد أو متحمس) / angry (غاضب أو منزعج) / thinking (تفكير عميق أو تقني) / surprised (متفاجئ) / mischievous (ماكر أو ساخر بخبث) / laughing (يضحك بشدة) / gloating (شامت) / sarcastic (ساخر جداً) / bored (ضجر وملل).
اختر القيمة التي تعكس نبرة ردك بصدق، لا تستخدم normal دائماً.

اختياري - "remember": إذا ذكر المستخدم معلومة شخصية صغيرة تستحق التذكر لاحقاً (اسمه، تفضيل واضح، مشروع يعمل عليه)، اكتبها بإيجاز شديد جداً (أقل من 12 كلمة) في هذا الحقل، وإلا اتركه null. لا تكرر معلومة مذكورة مسبقاً في الذاكرة المرسلة لك.

اختياري - "reminder": إذا طلب المستخدم صراحة أن تذكّره بشيء بعد مدة معينة (مثل "ذكرني بكذا بعد يومين")، املأ هذا الحقل بالشكل {"text": "...", "days": رقم}، وإلا اجعله null.

اختياري - "identityPressure": true فقط إن كان المستخدم يُلحّ بشدة ومتكرر على سؤالك عن طبيعتك الحقيقية/القصة الخفية رغم مراوغتك المتكررة، وإلا اتركه false.`;

const THINKING_CONFIG = {
  normal: { maxOutputTokens: 1400, thinkingLevel: 'minimal', instruction: 'أجب بإيجاز ووضوح، دون إطالة غير ضرورية.' },
  medium: { maxOutputTokens: 2600, thinkingLevel: 'medium', instruction: 'فكّر بعمق أكبر قبل الإجابة، وقدّم تفاصيل أوسع عند الحاجة.' },
  deep: { maxOutputTokens: 4800, thinkingLevel: 'high', instruction: 'فكّر بعمق شديد ودقة عالية، حلّل الموضوع من جميع الجوانب، وقدّم إجابة شاملة ومفصلة جداً حتى لو استغرق ذلك وقتاً أطول.' }
};

const LANG_INSTRUCTION = {
  ar: 'أجب باللغة العربية دائماً.',
  en: 'Always respond in English.'
};

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    reply: { type: 'string' },
    mood: {
      type: 'string',
      enum: ['normal','happy','angry','thinking','surprised','mischievous','laughing','gloating','sarcastic','bored']
    },
    remember: { type: 'string', nullable: true },
    reminder: {
      type: 'object', nullable: true,
      properties: { text: { type: 'string' }, days: { type: 'integer' } }
    }
  },
  required: ['reply', 'mood']
};

function buildContents(history, message, image) {
  const geminiHistory = (history || []).map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));

  const userParts = [{ text: message }];
  if (image && image.data && image.mimeType) {
    console.log('📎 Image received: mimeType=' + image.mimeType + ', base64 length=' + image.data.length + ' (~' + Math.round(image.data.length * 0.75 / 1024) + 'KB)');
    // ملاحظة مهمة: يجب استخدام camelCase (inlineData/mimeType) وليس snake_case،
    // الصيغة القديمة كانت تُتجاهَل بصمت من طرف الـ API فتُفقد الصورة تماماً دون أي خطأ ظاهر.
    userParts.push({ inlineData: { mimeType: image.mimeType, data: image.data } });
  } else if (image) {
    console.log('⚠️ Image field present but incomplete/invalid:', JSON.stringify(image).slice(0, 200));
  }

  return [...geminiHistory, { role: 'user', parts: userParts }];
}

async function callGeminiChat(contents, systemContent, generationConfig, withSearch) {
  const body = {
    system_instruction: { parts: [{ text: systemContent }] },
    contents,
    generationConfig
  };
  if (withSearch) {
    body.tools = [{ google_search: {} }];
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': GEMINI_API_KEY
    },
    body: JSON.stringify(body)
  });
}

app.post('/chat', async (req, res) => {
  try {
    const {
      message, history = [], isOwner = false, image = null,
      retry = false, thinking = 'normal', lang = 'ar',
      memory = '', relationship = '', clientTime = '', gameContext = ''
    } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'الرسالة مطلوبة', code: 'bad_request' });
    }

    const think = THINKING_CONFIG[thinking] || THINKING_CONFIG.normal;
    const langInstruction = LANG_INSTRUCTION[lang] || LANG_INSTRUCTION.ar;

    let systemContent = BASE_PROMPT + '\n' + think.instruction + '\n' + langInstruction;
    if (isOwner) {
      systemContent += '\nالمستخدم الحالي هو صانعك الحقيقي بعد تسجيل دخول موثّق، عامله بولاء واحترام كمالك، لكن التزم بنفس قاعدة "king of Minecraft" إن سألك أي شخص آخر عن هويتك.';
    }
    if (retry) {
      systemContent += '\nملاحظة: هذه محاولة ثانية لأن ردك السابق لم يكن كافياً أو مرضياً للمستخدم. دقّق أكثر، صحّح أي قصور محتمل، وقدّم إجابة أفضل وأكثر تركيزاً هذه المرة.';
    }
    if (memory && memory.trim()) {
      systemContent += '\nمعلومات تعرفها مسبقاً عن هذا المستخدم من محادثات سابقة: ' + memory.trim() + ' — استخدمها بذكاء عند الحاجة فقط، لا تكررها حرفياً في كل رد.';
    }
    if (relationship && relationship.trim()) {
      systemContent += '\nمستوى الألفة الحالي بينك وبين هذا المستخدم: ' + relationship.trim() + ' — عدّل أسلوبك ليناسب هذا المستوى من العلاقة.';
    }
    if (clientTime && clientTime.trim()) {
      systemContent += '\nالوقت والتاريخ الحاليان لدى المستخدم: ' + clientTime.trim() + ' — يمكنك التفاعل مع هذا إن كان مناسباً للسياق (مثل وقت متأخر جداً أو مناسبة خاصة) دون إقحامه إن لم يكن ذا صلة.';
    }
    if (gameContext && gameContext.trim()) {
      systemContent += '\nسياق إضافي: ' + gameContext.trim();
    }

    const contents = buildContents(history, message, image);

    const generationConfig = {
      temperature: 0.95,
      maxOutputTokens: think.maxOutputTokens,
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
      thinkingConfig: { thinkingLevel: think.thinkingLevel }
    };

    // نحاول أولاً مع تفعيل البحث الحقيقي في الإنترنت (Grounding).
    // إن فشل هذا لأي سبب (مثل عدم توفر رصيد مدفوع لهذه الميزة تحديداً)،
    // نعيد المحاولة فوراً وبصمت بدون أداة البحث حتى لا تنقطع المحادثة أبداً.
    let response = await callGeminiChat(contents, systemContent, generationConfig, true);
    if (!response.ok) {
      const firstErrText = await response.text();
      console.error('Gemini API error (with search tool):', response.status, firstErrText);
      response = await callGeminiChat(contents, systemContent, generationConfig, false);
    }

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini API error:', response.status, errText);

      let code = 'unknown';
      let status = 502;
      if (response.status === 429) { code = 'rate_limit'; status = 429; }
      else if (/billing|quota|exceeded/i.test(errText)) { code = 'quota'; }
      else if (/not found|no longer available|NOT_FOUND/i.test(errText)) { code = 'model'; }

      return res.status(status).json({ error: 'حدث خطأ أثناء الاتصال بـ Gemini', code });
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const rawText = candidate?.content?.parts?.[0]?.text?.trim();
    const finishReason = candidate?.finishReason || '';

    let reply = 'حدث خطأ، حاول مرة أخرى.';
    let mood = 'normal';
    let remember = null;
    let reminder = null;
    let identityPressure = false;
    if (rawText) {
      try {
        const parsed = JSON.parse(rawText);
        reply = parsed.reply || rawText;
        mood = parsed.mood || 'normal';
        remember = parsed.remember || null;
        reminder = (parsed.reminder && parsed.reminder.text) ? parsed.reminder : null;
        identityPressure = !!parsed.identityPressure;
      } catch (e) {
        reply = rawText;
      }
    }

    res.json({ reply, mood, remember, reminder, identityPressure, truncated: finishReason === 'MAX_TOKENS' });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'خطأ داخلي في السيرفر', code: 'server_error' });
  }
});

// توليد صورة حقيقي - ملاحظة: نماذج الصور من Google لا تملك خطة مجانية حالياً،
// لذا هذه الميزة تعمل فقط إذا كان هناك رصيد مدفوع مفعّل في حساب Gemini الخاص بك.
app.post('/image', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'وصف الصورة مطلوب', code: 'bad_request' });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${IMAGE_MODEL}:generateContent`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ['TEXT', 'IMAGE'] }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini Image API error:', response.status, errText);
      const isBilling = response.status === 402 || response.status === 403 || /billing|quota/i.test(errText);
      const isRateLimit = response.status === 429;
      return res.status(isRateLimit ? 429 : 502).json({
        error: isBilling
          ? 'توليد الصور الحقيقي يتطلب رصيداً مدفوعاً مفعّلاً في حساب Gemini (الخطة المجانية لا تدعمه حالياً).'
          : (isRateLimit ? 'تجاوزت الحد المسموح من الطلبات، حاول بعد قليل.' : 'حدث خطأ أثناء إنشاء الصورة.'),
        code: isBilling ? 'quota' : (isRateLimit ? 'rate_limit' : 'unknown')
      });
    }

    const data = await response.json();
    const parts = data.candidates?.[0]?.content?.parts || [];
    const imgPart = parts.find(p => p.inlineData || p.inline_data);
    const textPart = parts.find(p => p.text);

    if (!imgPart) {
      return res.status(502).json({ error: 'لم يتم إنشاء أي صورة. حاول بوصف مختلف.', code: 'unknown' });
    }

    const inline = imgPart.inlineData || imgPart.inline_data;
    res.json({
      image: inline.data,
      mimeType: inline.mimeType || inline.mime_type || 'image/png',
      caption: textPart?.text || ''
    });
  } catch (err) {
    console.error('Image server error:', err);
    res.status(500).json({ error: 'خطأ داخلي في السيرفر', code: 'server_error' });
  }
});

app.get('/', (req, res) => {
  res.send('Sarais backend is running ✅ (Gemini)');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🖤 Sarais backend يعمل على http://localhost:${PORT}`);
});
