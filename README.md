# منصة إدارة الاشتراكات (Subman)

تطبيق React + Vite لإدارة اشتراكات الخدمات الرقمية مع تسجيل دخول Supabase، دعم Google OAuth، لوحات تحليلية، وتصدير Excel.

## المزايا

- تسجيل دخول بالبريد وكلمة المرور أو بواسطة Google.
- صلاحيات `admin` و `user` مع حالة اعتماد `pending / approved / rejected`.
- إدارة المشتركين، التجديد السريع، التصفية، والبحث.
- لوحة تحليلات ورسوم بيانية.
- مركز تنبيهات وإعداد رسالة واتساب الافتراضية.
- تصدير البيانات إلى ملف `.xlsx`.

## التقنيات

- `React 19`
- `TypeScript`
- `Vite`
- `Supabase`
- `Recharts`
- `xlsx`

## التشغيل المحلي

1. ثبّت الحزم:

```bash
npm install
```

2. أنشئ ملف `.env.local` من `.env.example` وأضف القيم التالية:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_SUPABASE_AUTH_REDIRECT_URL=http://localhost:5173
```

3. شغّل المشروع:

```bash
npm run dev
```

4. للبناء أو الفحص:

```bash
npm run build
npm run lint
```

## إعداد Supabase

التطبيق يعتمد على الجداول التالية في `public`:

- `profiles`
- `subscriptions`
- `settings`
- `notifications`

ويفترض وجود الحقول المستخدمة داخل الواجهة مثل:

- `profiles`: `id`, `username`, `role`, `status`
- `subscriptions`: `id`, `user_id`, `service`, `category`, `duration`, `name`, `email`, `facebook`, `countryCode`, `whatsapp`, `startDate`, `endDate`, `payment`, `workspace`, `createdAt`
- `settings`: `id`, `value`
- `notifications`: `id`, `user_id`, `message`, `type`, `createdAt`

## تهيئة أول مدير

كل مستخدم جديد يُنشأ كـ `user` وبحالة `pending`، لذلك يجب ترقية أول مستخدم يدوياً من داخل Supabase:

```sql
update profiles
set role = 'admin', status = 'approved'
where id = '<user_uuid>';
```

## Google OAuth

- أضف `Client ID` و `Client Secret` داخل مزود Google في لوحة Supabase Auth.
- أضف رابط الموقع المحلي أو الإنتاجي ضمن `Redirect URLs` في Supabase.
- لا تضع `service role`, `access token`, أو `Google client secret` داخل كود الواجهة أو متغيرات `VITE_`.

## ملاحظات أمان

- استخدم فقط `anon key` في الواجهة الأمامية.
- احتفظ بالمفاتيح الحساسة في لوحة Supabase أو متغيرات خادمية فقط.
- تأكد من إعداد RLS وسياسات الجداول قبل الاستخدام الإنتاجي.
