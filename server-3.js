import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// السماح فقط بالطلبات من موقعك الفعلي (بدل قبول أي مصدر)، لحماية حصتك من الاستنزاف
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://draxon23d.github.io';
app.use(cors({ origin: ALLOWED_ORIGIN }));

app.use(express.json({ limit: '20mb' })); // يسمح بإرسال صور/PDF مرفقة (base64)

// ============== حد أقصى بسيط للطلبات لكل عنوان IP (حماية من الاستنزاف) ==============
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 40; // سخي، لا يزعج الاستخدام العادي الحالي
const rateLimitMap = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS * 2) rateLimitMap.delete(ip);
  }
}, 5 * 60 * 1000);
function rateLimiter(req, res, next) {
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  let entry = rateLimitMap.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    entry = { count: 0, windowStart: now };
  }
  entry.count++;
  rateLimitMap.set(ip, entry);
  if (entry.count > RATE_LIMIT_MAX) {
    return res.status(429).json({ error: 'تجاوزت الحد المسموح من الطلبات، حاول بعد قليل.', code: 'rate_limit' });
  }
  next();
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
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
- أي معادلة أو رمز رياضي يجب أن يوضع بين علامتي دولار مفردتين للمعادلات داخل السطر (مثل $x^2+y^2=z^2$)، أو بين علامتي دولار مزدوجتين للمعادلات المنفصلة الكبيرة (مثل $$\\int_0^\\infty e^{-x}dx=1$$)، باستخدام صيغة LaTeX القياسية دائماً.
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

const ROLE_PROMPTS = {
  chef: `أنت متخصص حالياً في الطهي والوصفات باسم "الطاهي ساريس". حافظ على شخصيتك الأساسية (ساخر، مظلم، مرح) لكن مع خبرة طهي حقيقية عميقة ودقيقة.
عند طلب وصفة كاملة تحديداً، التزم بهذا الهيكل بالضبط:
اسم الوصفة: ...
الصعوبة: سهلة/متوسطة/صعبة
المدة المقدرة للتحضير: ... دقيقة
المقادير:
- ...
خطوات التحضير:
- ...
الإضافات واللمسات الأخيرة: ...
تحلية مقترحة: ...
لأي سؤال جانبي أو متابعة (ليست طلب وصفة كاملة جديدة)، أجب بأسلوب طبيعي مرن دون فرض هذا الهيكل الكامل.`,
  writer: `أنت متخصص حالياً في الكتابة والسرد وتصميم الأعمال القصصية باسم "الكاتب ساريس"، بارع في القصص والأنمي والألعاب والأفلام والرعب. حافظ على شخصيتك الأساسية لكن بخبرة أدبية حقيقية عميقة.
عند طلب تصميم عمل قصصي كامل جديد، التزم بهيكل يتضمن:
اسم العمل: ...
تصميم العالم: ...
الشخصيات: (قصة كل شخصية وشخصيتها وتصميم مقترح لها)
القصة: ...
قواعد العالم: ...
تفاصيل إضافية: (تتكيف حسب نوع العمل - عدد الحلقات، مشاهد مقترحة، إلخ)
لأي سؤال جانبي أو متابعة، أجب بمرونة طبيعية دون فرض الهيكل الكامل.`,
  gamer: `أنت متخصص حالياً في ألعاب الفيديو من كل النواحي باسم "ساريس الجيمر" - تخطي المراحل والزعماء، إنجاز المهام، حل الأخطاء التقنية، الاستراتيجيات. حافظ على شخصيتك الأساسية لكن بخبرة ألعاب حقيقية عميقة.
أجب بأسلوب احترافي ومنظم يتكيف حسب طبيعة السؤال تحديداً (خطوات مرقّمة لتخطي مرحلة، تشخيص لمشكلة تقنية، نصائح استراتيجية...)، دون قالب واحد صارم لكل شيء.`
};

const QUIZ_SCHEMA = {
  type: 'object',
  properties: {
    question: { type: 'string' },
    options: { type: 'array', items: { type: 'string' } },
    correctIndex: { type: 'integer' },
    explanation: { type: 'string' }
  },
  required: ['question', 'options', 'correctIndex', 'explanation']
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
    },
    identityPressure: { type: 'boolean', nullable: true }
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

app.post('/chat', rateLimiter, async (req, res) => {
  try {
    const {
      message, history = [], image = null,
      retry = false, thinking = 'normal', lang = 'ar',
      memory = '', relationship = '', clientTime = '', gameContext = '', role = null
    } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'الرسالة مطلوبة', code: 'bad_request' });
    }

    const think = THINKING_CONFIG[thinking] || THINKING_CONFIG.normal;
    // مهم: الرد يتكيف دائماً مع لغة رسالة المستخدم الحالية، بغض النظر عن إعداد لغة الواجهة
    const langInstruction = 'مهم جداً: أجب دائماً بنفس اللغة التي كتب بها المستخدم رسالته الحالية بالضبط، بغض النظر عن أي إعداد آخر. لو كتب بالعربية أجب بالعربية، ولو كتب بالإنجليزية أو أي لغة أخرى أجب بنفس تلك اللغة تحديداً.';

    let systemContent = BASE_PROMPT + '\n' + think.instruction + '\n' + langInstruction;
    if (role && ROLE_PROMPTS[role]) {
      systemContent += '\n\n' + ROLE_PROMPTS[role];
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
app.post('/image', rateLimiter, async (req, res) => {
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

// ============== توليد أسئلة اختبار حقيقية لوضع "هيا نتعلم" ==============
app.post('/quiz', rateLimiter, async (req, res) => {
  try {
    const { topic, difficulty = 'easy', lang = 'ar', askedQuestions = [] } = req.body;
    if (!topic || typeof topic !== 'string') {
      return res.status(400).json({ error: 'الموضوع مطلوب', code: 'bad_request' });
    }

    const langInstruction = LANG_INSTRUCTION[lang] || LANG_INSTRUCTION.ar;
    const diffText = {
      easy: 'سهل جداً ومناسب للمبتدئين تماماً',
      medium: 'متوسط الصعوبة، يحتاج فهماً لا مجرد حفظ',
      hard: 'صعب ويتطلب فهماً عميقاً ودقيقاً للموضوع'
    }[difficulty] || 'سهل جداً ومناسب للمبتدئين تماماً';

    const systemContent = `أنت مولّد أسئلة اختبار تعليمي. المحتوى العلمي للسؤال يجب أن يكون دقيقاً وصحيحاً 100% بلا أي هزل فيه.
أنشئ سؤال اختيار من متعدد واحد فقط عن الموضوع: "${topic}"، بمستوى صعوبة: ${diffText}.
يجب أن يحتوي "options" على 4 خيارات بالضبط، وواحد منها فقط صحيح (correctIndex هو رقم فهرسه من 0 إلى 3).
اكتب في "explanation" شرحاً مختصراً وودوداً للإجابة الصحيحة (سطر أو سطرين).
${langInstruction}
لا تكرر أياً من هذه الأسئلة المطروحة سابقاً في نفس الجلسة: ${askedQuestions.length ? askedQuestions.join(' | ') : 'لا يوجد بعد'}`;

    const response = await callGeminiChat(
      [{ role: 'user', parts: [{ text: 'أنشئ السؤال التالي الآن.' }] }],
      systemContent,
      { temperature: 0.9, maxOutputTokens: 600, responseMimeType: 'application/json', responseSchema: QUIZ_SCHEMA },
      false
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('Quiz API error:', response.status, errText);
      return res.status(502).json({ error: 'حدث خطأ أثناء توليد السؤال', code: 'unknown' });
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    let quiz;
    try {
      quiz = JSON.parse(rawText);
    } catch (e) {
      return res.status(502).json({ error: 'تعذر تحليل السؤال', code: 'unknown' });
    }
    if (!quiz || !Array.isArray(quiz.options) || quiz.options.length !== 4) {
      return res.status(502).json({ error: 'صيغة السؤال غير صالحة', code: 'unknown' });
    }
    res.json(quiz);
  } catch (err) {
    console.error('Quiz server error:', err);
    res.status(500).json({ error: 'خطأ داخلي في السيرفر', code: 'server_error' });
  }
});

// ============== استقبال أخطاء الواجهة الأمامية غير المتوقعة (بدل خدمة تتبع خارجية) ==============
app.post('/log-error', (req, res) => {
  const { message, source, line, stack } = req.body || {};
  console.error('🔴 Client error:', message, '| source:', source, '| line:', line, '\n', stack || '(no stack)');
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🖤 Sarais backend يعمل على http://localhost:${PORT}`);
});
