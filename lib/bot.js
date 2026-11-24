const { Bot, InlineKeyboard, InputFile } = require('grammy');
const { getSupabase } = require('./supabase');
const { makePng, COLORS } = require('./qr');

let bot;
const labels = {
  ar: {
    welcome: 'أهلاً بك في NEXORA QR STUDIO ✨\nأنشئ أكواد QR مخصصة بسهولة.',
    create: 'أرسل الرابط أو النص الذي تريد تحويله إلى QR.',
    choose: 'اختر لون رمز QR:',
    saved: 'تم إنشاء رمز QR وحفظه بنجاح ✅',
    failed: 'حدث خطأ أثناء إنشاء الرمز. حاول مرة أخرى لاحقاً.',
    cancelled: 'تم إلغاء العملية.',
    history: 'آخر أكواد QR الخاصة بك:',
    empty: 'ما عندك أكواد محفوظة حتى الآن. استخدم /create للبدء.',
    language: 'تم تغيير اللغة إلى العربية 🇸🇦',
    help: 'الأوامر المتاحة:\n/create إنشاء QR\n/myqrs عرض آخر الأكواد\n/language تغيير اللغة\n/cancel إلغاء العملية',
    invalid: 'النص طويل جداً. الحد الأقصى 2000 حرف. أرسل /create للمحاولة مجدداً.'
  },
  en: {
    welcome: 'Welcome to NEXORA QR STUDIO ✨\nCreate custom QR codes in seconds.',
    create: 'Send the URL or text you want to turn into a QR code.',
    choose: 'Choose your QR color:',
    saved: 'Your QR code was created and saved successfully ✅',
    failed: 'Something went wrong while creating your QR code. Please try again.',
    cancelled: 'Operation cancelled.',
    history: 'Your latest QR codes:',
    empty: 'No saved QR codes yet. Use /create to get started.',
    language: 'Language changed to English 🇬🇧',
    help: 'Available commands:\n/create create a QR\n/myqrs show recent QR codes\n/language switch language\n/cancel cancel current operation',
    invalid: 'That text is too long. Maximum length is 2000 characters. Send /create to try again.'
  }
};

function getBot() {
  if (bot) return bot;
  if (!process.env.BOT_TOKEN) throw new Error('BOT_TOKEN is not configured.');
  bot = new Bot(process.env.BOT_TOKEN);

  async function getLang(userId) {
    const db = getSupabase();
    const { data } = await db.from('qr_users').select('language').eq('telegram_id', String(userId)).maybeSingle();
    return data?.language === 'en' ? 'en' : 'ar';
  }
  async function ensureUser(ctx) {
    const u = ctx.from;
    const db = getSupabase();
    await db.from('qr_users').upsert({
      telegram_id: String(u.id), username: u.username || null,
      first_name: u.first_name || null, updated_at: new Date().toISOString()
    }, { onConflict: 'telegram_id' });
  }
  async function setSession(userId, state) {
    const db = getSupabase();
    await db.from('qr_sessions').upsert({ telegram_id: String(userId), state, updated_at: new Date().toISOString() }, { onConflict: 'telegram_id' });
  }
  async function getSession(userId) {
    const db = getSupabase();
    const { data } = await db.from('qr_sessions').select('state').eq('telegram_id', String(userId)).maybeSingle();
    return data?.state || null;
  }
  async function clearSession(userId) {
    const db = getSupabase();
    await db.from('qr_sessions').delete().eq('telegram_id', String(userId));
  }

  bot.use(async (ctx, next) => {
    if (ctx.from) await ensureUser(ctx);
    await next();
  });

  bot.command('start', async ctx => {
    const lang = await getLang(ctx.from.id);
    const kb = new InlineKeyboard().text('🇸🇦 العربية', 'lang:ar').text('🇬🇧 English', 'lang:en');
    await ctx.reply(labels[lang].welcome, { reply_markup: kb });
  });
  bot.command('help', async ctx => ctx.reply(labels[await getLang(ctx.from.id)].help));
  bot.command('create', async ctx => {
    const lang = await getLang(ctx.from.id);
    await setSession(ctx.from.id, { step: 'content' });
    await ctx.reply(labels[lang].create);
  });
  bot.command('cancel', async ctx => {
    await clearSession(ctx.from.id);
    await ctx.reply(labels[await getLang(ctx.from.id)].cancelled);
  });
  bot.command('language', async ctx => {
    const kb = new InlineKeyboard().text('🇸🇦 العربية', 'lang:ar').text('🇬🇧 English', 'lang:en');
    await ctx.reply('Choose language / اختر اللغة:', { reply_markup: kb });
  });
  bot.command('myqrs', async ctx => {
    const lang = await getLang(ctx.from.id);
    const db = getSupabase();
    const { data, error } = await db.from('qr_codes').select('id,content,color,created_at').eq('telegram_id', String(ctx.from.id)).order('created_at', { ascending: false }).limit(8);
    if (error) throw error;
    if (!data?.length) return ctx.reply(labels[lang].empty);
    const lines = data.map((r, i) => `${i + 1}. ${r.content.slice(0, 65)}${r.content.length > 65 ? '…' : ''} · ${r.color}`);
    await ctx.reply(`${labels[lang].history}\n\n${lines.join('\n')}`);
  });

  bot.callbackQuery(/^lang:(ar|en)$/, async ctx => {
    const language = ctx.match[1];
    const db = getSupabase();
    await db.from('qr_users').upsert({ telegram_id: String(ctx.from.id), language, updated_at: new Date().toISOString() }, { onConflict: 'telegram_id' });
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(labels[language].language);
  });
  bot.callbackQuery(/^color:(blue|black|purple|green|red)$/, async ctx => {
    const color = ctx.match[1];
    const lang = await getLang(ctx.from.id);
    const session = await getSession(ctx.from.id);
    if (!session || session.step !== 'color' || !session.content) {
      await ctx.answerCallbackQuery({ text: 'Session expired. Send /create.' });
      return;
    }
    await ctx.answerCallbackQuery();
    try {
      const png = await makePng(session.content, color);
      const db = getSupabase();
      const { error } = await db.from('qr_codes').insert({
        telegram_id: String(ctx.from.id), content: session.content,
        color, format: 'png'
      });
      if (error) throw error;
      await clearSession(ctx.from.id);
      await ctx.replyWithPhoto(new InputFile(png, 'nexora-qr.png'), { caption: labels[lang].saved });
    } catch (err) {
      console.error('QR generation failed:', err);
      await ctx.reply(labels[lang].failed);
    }
  });

  bot.on('message:text', async ctx => {
    const session = await getSession(ctx.from.id);
    if (!session || session.step !== 'content' || ctx.message.text.startsWith('/')) return;
    const lang = await getLang(ctx.from.id);
    const content = ctx.message.text.trim();
    if (!content || content.length > 2000) return ctx.reply(labels[lang].invalid);
    await setSession(ctx.from.id, { step: 'color', content });
    const kb = new InlineKeyboard()
      .text('🔵 Blue', 'color:blue').text('⚫ Black', 'color:black').row()
      .text('🟣 Purple', 'color:purple').text('🟢 Green', 'color:green').row()
      .text('🔴 Red', 'color:red');
    await ctx.reply(labels[lang].choose, { reply_markup: kb });
  });

  bot.catch(err => console.error('Telegram bot error:', err));
  return bot;
}

module.exports = { getBot };
