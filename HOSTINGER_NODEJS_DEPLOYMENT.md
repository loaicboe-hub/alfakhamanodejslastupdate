# 🚀 دليل تشغيل ونشر تطبيق الفخامة (Node.js) على Hostinger

تطبيق **شركة الفخامة (هارف فرايز)** أصبح الآن مبنياً بالكامل باستخدام **Node.js (Express.js)** مع قاعدة بيانات **MySQL** لضمان أعلى أداء وسرعة في استقبال طلبات عروض الأسعار والتصدير وإدارتها.

---

## 📁 الهيكل المعتمد للنشر (Deployment Architecture)

```text
├── server.js              # السيرفر الرئيسي (Express API + Static Files)
├── package.json           # الحزم والمكتبات ونقطة البداية (npm start)
├── .env.example           # نموذج متغيرات البيئة
├── .env                   # إعدادات قاعدة البيانات والـ Secret Key (لا يُرفع على Git)
├── index.html             # الواجهة الرئيسية للموقع
├── admin/                 # لوحة التحكم الشاملة
│   ├── index.html
│   ├── admin.js
│   └── admin.css
├── js/                    # ملفات الجافاسكريبت والـ RFQ
├── css/                   # التنسيقات والتصميم
├── assets/                # الصور والوسائط
└── database/
    └── schema.sql         # جداول الداتابيز
```

---

## 🛠️ الخطوات في لوحة تحكم Hostinger (hPanel)

### 1. إنشاء قاعدة بيانات MySQL
1. من لوحة **Hostinger hPanel**، ادخل على **Databases** -> **Management**.
2. أنشئ قاعدة بيانات جديدة باسم مثلاً: `u128613351_alfakhama`.
3. أنشئ مستخدم للقاعدة وكلمة مرور قوية واحفظهم.
4. ادخل على **phpMyAdmin**، واضغط **Import** ثم ارفع ملف [`database/schema.sql`](file:///d:/PROJECTS/alfakhama%20node.js%20last%20update/alfakhama%20node%20js%20last%20update/database/schema.sql) لإنشاء الجداول.

---

### 2. إعداد تطبيق Node.js في Hostinger
*(سواء من خلال **Node.js Selector** في Web Hosting أو **Hostinger Cloud / VPS** أو **Git Auto-Deploy**)*

1. في **hPanel**، ابحث عن **Node.js** أو **Web Apps**.
2. اختر إعدادات التطبيق كالتالي:
   - **Node.js Version**: `18.x` أو `20.x` (LTS).
   - **Application Mode**: `Production`.
   - **Application Root**: مجلد المشروع (مثلاً `public_html` أو اسم المجلد).
   - **Application Startup File**: `server.js`
3. اضغط **Save / Create**.

---

### 3. إعداد متغيرات البيئة (Environment Variables / `.env`)
أنشئ ملف `.env` داخل مجلد التطبيق في السيرفر وضع فيه:

```env
PORT=3000
NODE_ENV=production

# بيانات قاعدة بيانات Hostinger
DB_HOST=localhost
DB_PORT=3306
DB_USER=اسم_المستخدم_من_لوحة_هوستنجر
DB_PASSWORD=كلمة_المرور_الخاصة_بالداتابيز
DB_NAME=اسم_قاعدة_البيانات

# مفتاح الدخول للوحة التحكم
ADMIN_SECRET_KEY=Alfakhama2026@GoldFries

# إيميل استقبال إشعارات طلبات التسعير
NOTIFICATION_EMAIL=info@alfakhamafactory.com

# اختياري: إعدادات إرسال الإيميلات عبر Hostinger Webmail SMTP
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=info@alfakhamafactory.com
SMTP_PASS=كلمة_مرور_الإيميل_في_هوستنجر
```

---

### 4. تثبيت المكتبات والتشغيل (NPM Install & Start)
من خلال **Terminal / SSH** في هوستنجر (أو زر `Run NPM Install` في لوحة Node.js):

```bash
# تثبيت الحزم
npm install --production

# تشغيل أو إعادة تشغيل السيرفر
npm start
```

---

### 5. تفعيل Git Auto-Deployment مع GitHub
1. في **Hostinger hPanel** -> **Advanced** -> **Git**.
2. ضع رابط المستودع الجديد:
   `https://github.com/loaicboe-hub/alfakhamanodejslastupdate.git`
3. حدد الفرع: `main`.
4. انسخ رابط الـ **Webhook URL** من هوستنجر.
5. ادخل على إعدادات الـ Repo في GitHub -> **Settings** -> **Webhooks** -> **Add webhook** وضع الرابط هناك.
6. الآن، مع كل `git push` إلى الـ `main`، سيقوم هوستنجر بالتحديث تلقائياً وبدون أي مشاكل!

---

## 🛡️ نقاط فحص وتشخيص السيرفر (API Health & Diagnostic)

- فحص حالة السيرفر: `GET /api/health`
- استقبال طلبات الأسعار: `POST /api/rfq/submit`
- لوحة إدارة الطلبات: `GET & POST /api/admin/quotes`
- تصدير شيت إكسيل للطلبات: `GET /api/admin/quotes?export=csv`
