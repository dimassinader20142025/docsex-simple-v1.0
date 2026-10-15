const state = {
  lang: "fr",
  view: "home",
  topicId: null,
  articleId: null,
  forumFilter: "recent",
  forumQuery: "",
  resourceQuery: "",
  sourceArticles: [],
  sourceArticlesStatus: "idle",
  chatOpen: false,
  messages: [],
  articles: [],
  articlesStatus: "idle",
  progress: {
    readArticles: new Set(JSON.parse(localStorage.getItem("dx_read_articles") || "[]")),
    savedQuestions: JSON.parse(localStorage.getItem("dx_saved_questions") || "[]")
  }
};

const i18n = {
  fr: {
    dir: "ltr",
    nav: { home: "Accueil", topics: "Themes", forum: "Forum", resources: "Ressources", profile: "Profil" },
    kicker: "Education sante sexuelle Tunisie",
    title: "Docsexprime, plus clair, plus sur, vraiment utile.",
    subtitle: "Un espace trilingue pour apprendre, poser des questions, trouver des ressources locales et parler avec un assistant IA encadre.",
    askAi: "Parler a l'assistant",
    explore: "Explorer les themes",
    stats: ["6 themes", "3 langues", "Mode anonyme"],
    topicsTitle: "Parcours educatifs",
    topicsIntro: "Chaque theme contient des articles courts, des points de vigilance et des sources a verifier avant publication.",
    forumTitle: "Questions de la communaute",
    forumIntro: "Recherche et filtre les questions. La publication reelle devra passer par moderation humaine.",
    resourcesTitle: "Aide et ressources locales",
    resourcesIntro: "Numeros et services a verifier regulierement avant mise en production.",
    profileTitle: "Espace prive",
    search: "Rechercher...",
    read: "Lire",
    minutes: "min",
    recent: "Recent",
    popular: "Populaire",
    solved: "Resolu",
    answers: "reponses",
    emergency: "Urgence medicale",
    emergencyDesc: "En cas de danger immediat, appelle les services d'urgence locaux.",
    sourceNote: "Contenu educatif. Ne remplace pas une consultation medicale.",
    chatTitle: "Assistant IA encadre",
    chatStatusLocal: "mode local",
    chatStatusLive: "LLM connecte",
    chatPlaceholder: "Pose ta question en toute simplicite...",
    send: "Envoyer",
    clear: "Effacer",
    assistantIntro: "Bonjour. Je peux t'aider a comprendre un sujet, preparer une question pour un medecin, ou trouver une ressource. Je ne pose pas de diagnostic.",
    blocked: "Je ne peux pas aider avec ce contenu tel quel. Reformule avec une question de sante ou de securite.",
    llmFail: "Le serveur IA n'est pas disponible. Je passe en mode local avec une reponse prudente.",
    back: "Retour",
    progress: "Progression",
    anonymous: "Anonyme",
    privacy: "Aucune donnee sensible n'est envoyee sans action explicite. Pour la vraie IA, utilise le proxy serveur.",
    brandSubtitle: "Education a la sante par IA",
    languageLabel: "Langue",
    primaryNavLabel: "Navigation principale",
    topicsCount: "themes",
    articlesCount: "articles",
    languagesCount: "langues",
    loadingTopics: "Chargement des themes...",
    loadingArticles: "Chargement des articles...",
    noArticles: "Aucun article dans ce theme.",
    articleWarning: "Avant publication, remplace ce texte provisoire par un contenu medical relu et des references datees.",
    resourceWarning: "Verifie les numeros, horaires et services avant la mise en production.",
    sourceTitle: "Sources Onsexprime",
    sourceIntro: "Articles importes dans la base locale, avec lien vers la source originale.",
    loadingSources: "Chargement des sources...",
    sourcesUnavailable: "Demarre le serveur FastAPI pour charger les sources.",
    openSource: "Ouvrir la source",
    saved: "enregistrees",
    noResults: "Aucun resultat.",
    close: "Fermer"
  },
  ar: {
    dir: "rtl",
    nav: { home: "الرئيسية", topics: "المواضيع", forum: "المنتدى", resources: "الموارد", profile: "الملف" },
    kicker: "تثقيف صحي جنسي في تونس",
    title: "Docsexprime اوضح، اكثر امانا، واقرب للشباب.",
    subtitle: "فضاء بثلاث لغات للتعلم، طرح الاسئلة، ايجاد موارد محلية والتحدث مع مساعد ذكي مضبوط.",
    askAi: "تحدث مع المساعد",
    explore: "استكشف المواضيع",
    stats: ["6 مواضيع", "3 لغات", "وضع مجهول"],
    topicsTitle: "مسارات تعليمية",
    topicsIntro: "كل موضوع يحتوي مقالات قصيرة ونقاط انتباه ومصادر يجب التثبت منها قبل النشر.",
    forumTitle: "اسئلة المجتمع",
    forumIntro: "ابحث وصف الاسئلة. النشر الحقيقي يحتاج مراجعة بشرية.",
    resourcesTitle: "مساعدة وموارد محلية",
    resourcesIntro: "ارقام وخدمات يجب التثبت منها بانتظام قبل الاطلاق.",
    profileTitle: "مساحة خاصة",
    search: "بحث...",
    read: "اقرأ",
    minutes: "دق",
    recent: "حديث",
    popular: "شائع",
    solved: "تم الحل",
    answers: "اجابات",
    emergency: "حالة طبية طارئة",
    emergencyDesc: "عند وجود خطر مباشر اتصل بخدمات الطوارئ المحلية.",
    sourceNote: "محتوى تثقيفي ولا يعوض استشارة الطبيب.",
    chatTitle: "مساعد ذكي مضبوط",
    chatStatusLocal: "وضع محلي",
    chatStatusLive: "متصل بنموذج",
    chatPlaceholder: "اكتب سؤالك ببساطة...",
    send: "ارسال",
    clear: "مسح",
    assistantIntro: "مرحبا. يمكنني مساعدتك على فهم موضوع او تحضير سؤال للطبيب او ايجاد مورد. لا اقدم تشخيصا.",
    blocked: "لا استطيع المساعدة بهذا المحتوى. اعد صياغته كسؤال صحي او سؤال سلامة.",
    llmFail: "خادم الذكاء الاصطناعي غير متاح. ساقدم جوابا محليا حذرا.",
    back: "رجوع",
    progress: "التقدم",
    anonymous: "مجهول",
    privacy: "لا ترسل بيانات حساسة دون فعل واضح. للذكاء الاصطناعي الحقيقي استعمل خادم البروكسي."
  },
  en: {
    dir: "ltr",
    nav: { home: "Home", topics: "Topics", forum: "Forum", resources: "Resources", profile: "Profile" },
    kicker: "Sexual health education Tunisia",
    title: "Docsexprime, clearer, safer, genuinely useful.",
    subtitle: "A trilingual space to learn, ask questions, find local resources, and talk with a guarded AI assistant.",
    askAi: "Talk to assistant",
    explore: "Explore topics",
    stats: ["6 topics", "3 languages", "Anonymous mode"],
    topicsTitle: "Learning pathways",
    topicsIntro: "Each topic has short articles, safety points, and sources to verify before publication.",
    forumTitle: "Community questions",
    forumIntro: "Search and filter questions. Real posting should go through human moderation.",
    resourcesTitle: "Help and local resources",
    resourcesIntro: "Numbers and services should be verified regularly before production.",
    profileTitle: "Private space",
    search: "Search...",
    read: "Read",
    minutes: "min",
    recent: "Recent",
    popular: "Popular",
    solved: "Solved",
    answers: "answers",
    emergency: "Medical emergency",
    emergencyDesc: "If there is immediate danger, call local emergency services.",
    sourceNote: "Educational content. It does not replace medical consultation.",
    chatTitle: "Guarded AI assistant",
    chatStatusLocal: "local mode",
    chatStatusLive: "LLM connected",
    chatPlaceholder: "Ask your question simply...",
    send: "Send",
    clear: "Clear",
    assistantIntro: "Hello. I can help you understand a topic, prepare a question for a clinician, or find a resource. I do not diagnose.",
    blocked: "I cannot help with that as written. Please rephrase as a health or safety question.",
    llmFail: "The AI server is unavailable. I am switching to a cautious local answer.",
    back: "Back",
    progress: "Progress",
    anonymous: "Anonymous",
    privacy: "No sensitive data is sent without a clear action. For real AI, use the server proxy.",
    brandSubtitle: "AI health education",
    languageLabel: "Language",
    primaryNavLabel: "Primary navigation",
    topicsCount: "topics",
    articlesCount: "articles",
    languagesCount: "languages",
    loadingTopics: "Loading topics...",
    loadingArticles: "Loading articles...",
    noArticles: "No articles in this topic yet.",
    articleWarning: "Before publication, replace this draft text with medically reviewed content and dated references.",
    resourceWarning: "Verify phone numbers, hours, and service scope before production use.",
    sourceTitle: "Onsexprime sources",
    sourceIntro: "Articles imported into the local database, with a link to the original source.",
    loadingSources: "Loading sources...",
    sourcesUnavailable: "Start the FastAPI server to load sources.",
    openSource: "Open source",
    saved: "saved",
    noResults: "No results yet.",
    close: "Close"
  }
};

const topics = [
  {
    id: "puberty",
    icon: "self_improvement",
    color: "#2657d8",
    titles: { fr: "Puberte et corps", ar: "البلوغ والجسم", en: "Puberty and body" },
    desc: {
      fr: "Comprendre les changements physiques et emotionnels sans honte.",
      ar: "فهم التغيرات الجسدية والعاطفية دون خجل.",
      en: "Understand physical and emotional changes without shame."
    }
  },
  {
    id: "consent",
    icon: "verified_user",
    color: "#0e9f8f",
    titles: { fr: "Consentement", ar: "الموافقة", en: "Consent" },
    desc: {
      fr: "Des limites claires, libres, reversibles et respectees.",
      ar: "حدود واضحة وحرة وقابلة للتراجع ومحترمة.",
      en: "Clear, free, reversible, and respected boundaries."
    }
  },
  {
    id: "contraception",
    icon: "health_and_safety",
    color: "#be185d",
    titles: { fr: "Contraception", ar: "منع الحمل", en: "Contraception" },
    desc: {
      fr: "Comparer les methodes, leur usage et les questions a poser.",
      ar: "مقارنة الطرق واستعمالها والاسئلة التي يجب طرحها.",
      en: "Compare methods, use, and questions to ask."
    }
  },
  {
    id: "sti",
    icon: "science",
    color: "#d97706",
    titles: { fr: "IST et depistage", ar: "الامراض المنقولة جنسيا والفحص", en: "STIs and testing" },
    desc: {
      fr: "Prevention, signes d'alerte et lieux de depistage.",
      ar: "الوقاية وعلامات الانتباه واماكن الفحص.",
      en: "Prevention, warning signs, and testing options."
    }
  },
  {
    id: "rights",
    icon: "gavel",
    color: "#475467",
    titles: { fr: "Droits et confidentialite", ar: "الحقوق والسرية", en: "Rights and privacy" },
    desc: {
      fr: "Secret medical, respect, information claire et non-discrimination.",
      ar: "السر الطبي والاحترام والمعلومة الواضحة وعدم التمييز.",
      en: "Medical confidentiality, respect, clear information, and non-discrimination."
    }
  },
  {
    id: "wellbeing",
    icon: "favorite",
    color: "#7c3aed",
    titles: { fr: "Bien-etre relationnel", ar: "العلاقات السليمة", en: "Relationship wellbeing" },
    desc: {
      fr: "Communication, pression sociale, confiance et aide.",
      ar: "التواصل والضغط الاجتماعي والثقة وطلب المساعدة.",
      en: "Communication, social pressure, trust, and support."
    }
  }
];

const questions = [
  { id: 1, tag: "contraception", status: "solved", answers: 12, popularity: 96, date: "2026-06-10", title: { fr: "Comment parler de contraception avec mon partenaire ?", ar: "كيف اتحدث عن منع الحمل مع شريكي؟", en: "How do I talk about contraception with my partner?" } },
  { id: 2, tag: "sti", status: "recent", answers: 8, popularity: 82, date: "2026-06-12", title: { fr: "Ou faire un test VIH gratuit a Tunis ?", ar: "اين اجري فحص فيروس نقص المناعة مجانا في تونس؟", en: "Where can I get free HIV testing in Tunis?" } },
  { id: 3, tag: "consent", status: "popular", answers: 16, popularity: 99, date: "2026-06-08", title: { fr: "Est-ce normal de changer d'avis pendant une relation ?", ar: "هل من الطبيعي تغيير الراي اثناء العلاقة؟", en: "Is it normal to change my mind during intimacy?" } },
  { id: 4, tag: "puberty", status: "recent", answers: 5, popularity: 58, date: "2026-06-14", title: { fr: "La puberte peut-elle commencer plus tot que mes amis ?", ar: "هل يمكن ان يبدأ البلوغ قبل اصدقائي؟", en: "Can puberty start earlier than my friends?" } }
];

const resources = [
  { id: 1, type: "urgent", name: "SAMU Tunisie", phone: "190", city: "Tunisie", hours: "24/7", note: { fr: "Urgence medicale", ar: "حالة طبية طارئة", en: "Medical emergency" } },
  { id: 2, type: "clinic", name: "ONFP - Office National de la Famille et de la Population", phone: "71 789 900", city: "Tunis", hours: "Lun-Ven 8h-17h", note: { fr: "Planning familial et information", ar: "تنظيم الاسرة والمعلومة", en: "Family planning and information" } },
  { id: 3, type: "support", name: "Ligne ecoute jeunes", phone: "80 100 100", city: "Numero vert", hours: "A verifier", note: { fr: "Ecoute et orientation", ar: "استماع وتوجيه", en: "Listening and orientation" } }
];

function getFallbackArticles() {
  return [
    {
      id: "consent-basics",
      topic: "consent",
      minutes: 5,
      title: { fr: "Le consentement en mots simples", ar: "الموافقة بكلمات بسيطة", en: "Consent in simple words" },
      excerpt: {
        fr: "Un oui doit etre libre, informe et possible a retirer.",
        ar: "نعم يجب ان تكون حرة ومفهومة ويمكن التراجع عنها.",
        en: "A yes must be freely given, informed, and reversible."
      },
      body: {
        fr: ["Le consentement n'est pas un silence, une pression ou une peur de decevoir.", "Une personne peut changer d'avis a tout moment. Respecter ce changement fait partie d'une relation saine.", "Si tu te sens oblige, isole ou menace, cherche l'aide d'un adulte de confiance ou d'un service de sante."],
        ar: ["الموافقة ليست صمتا ولا ضغطا ولا خوفا من ازعاج الاخر.", "يمكن للشخص تغيير رأيه في اي وقت. احترام ذلك جزء من علاقة سليمة.", "اذا شعرت بضغط او تهديد، اطلب مساعدة شخص موثوق او خدمة صحية."],
        en: ["Consent is not silence, pressure, or fear of disappointing someone.", "A person can change their mind at any time. Respecting that is part of a healthy relationship.", "If you feel pressured, isolated, or threatened, seek help from a trusted adult or health service."]
      }
    },
    {
      id: "contraception-questions",
      topic: "contraception",
      minutes: 6,
      title: { fr: "Questions a poser sur la contraception", ar: "اسئلة حول منع الحمل", en: "Questions to ask about contraception" },
      excerpt: {
        fr: "Efficacite, effets secondaires, confidentialite et disponibilite.",
        ar: "الفعالية والاثار الجانبية والسرية والتوفر.",
        en: "Effectiveness, side effects, privacy, and availability."
      },
      body: {
        fr: ["Aucune methode ne convient a tout le monde. Le bon choix depend de ta sante, ton confort et tes besoins.", "Prepare tes questions: comment l'utiliser, que faire en cas d'oubli, quels effets surveiller, ou consulter.", "Le preservatif aide aussi a reduire le risque d'IST quand il est bien utilise."],
        ar: ["لا توجد طريقة تناسب الجميع. الاختيار يعتمد على الصحة والراحة والحاجة.", "حضّر اسئلتك: كيف تستعمل، ماذا تفعل عند النسيان، ما الاثار التي يجب مراقبتها، واين تستشير.", "الواقي يساعد كذلك على تقليل خطر الامراض المنقولة جنسيا عند استعماله جيدا."],
        en: ["No method fits everyone. The right choice depends on health, comfort, and needs.", "Prepare questions: how to use it, what to do if forgotten, what side effects to watch, and where to consult.", "Condoms can also reduce STI risk when used correctly."]
      }
    },
    {
      id: "testing-sti",
      topic: "sti",
      minutes: 7,
      title: { fr: "Quand demander un depistage IST", ar: "متى تطلب فحص الامراض المنقولة جنسيا", en: "When to ask for STI testing" },
      excerpt: {
        fr: "Le depistage peut etre utile meme sans symptomes.",
        ar: "الفحص قد يكون مفيدا حتى دون اعراض.",
        en: "Testing can be useful even without symptoms."
      },
      body: {
        fr: ["Beaucoup d'IST peuvent rester silencieuses. Demander un depistage est un geste de prevention, pas une honte.", "Consulte rapidement en cas de douleur, brulure, plaie, ecoulement, fievre ou rapport force.", "Demande au service de sante quelles analyses sont adaptees et quand refaire un test."],
        ar: ["كثير من الامراض المنقولة جنسيا قد لا تظهر اعراضا. طلب الفحص وقاية وليس عيبا.", "استشر بسرعة عند وجود الم، حرقان، جرح، افرازات، حمى او علاقة قسرية.", "اسأل خدمة الصحة عن التحاليل المناسبة ومتى يجب اعادة الفحص."],
        en: ["Many STIs can be silent. Asking for testing is prevention, not shame.", "Seek care quickly for pain, burning, sores, discharge, fever, or forced sex.", "Ask the health service which tests fit your situation and when to repeat them."]
      }
    },
    {
      id: "privacy-care",
      topic: "rights",
      minutes: 4,
      title: { fr: "Confidentialite chez le soignant", ar: "السرية عند مقدم الرعاية", en: "Privacy with a clinician" },
      excerpt: {
        fr: "Tu peux demander comment tes informations seront protegees.",
        ar: "يمكنك السؤال كيف سيتم حماية معلوماتك.",
        en: "You can ask how your information will be protected."
      },
      body: {
        fr: ["Avant une consultation, tu peux demander qui aura acces a tes informations.", "Note tes questions a l'avance si le sujet te stresse.", "Si tu ne te sens pas respecte, tu peux demander un autre professionnel ou revenir avec une personne de confiance."],
        ar: ["قبل الاستشارة يمكنك السؤال من سيطلع على معلوماتك.", "اكتب اسئلتك مسبقا اذا كان الموضوع يسبب لك توترا.", "اذا لم تشعر بالاحترام يمكنك طلب مهني اخر او الحضور مع شخص موثوق."],
        en: ["Before a visit, you can ask who will access your information.", "Write questions in advance if the topic feels stressful.", "If you do not feel respected, you can ask for another professional or return with someone you trust."]
      }
    }
  ];
}

function t() {
  return i18n[state.lang];
}

function label(key) {
  return t()[key] || i18n.fr[key] || "";
}

function tr(value) {
  return typeof value === "string" ? value : value[state.lang] || value.fr || value.en || "";
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Pick the localized string AND html-escape it. Use this whenever a piece of
// admin-supplied or user-supplied content is about to be inlined into
// innerHTML. The hardcoded i18n strings are trusted — keep those plain.
function trEsc(value) {
  return escapeHtml(tr(value));
}

function icon(name) {
  return `<span class="material-icons" aria-hidden="true">${name}</span>`;
}

function saveProgress() {
  localStorage.setItem("dx_read_articles", JSON.stringify([...state.progress.readArticles]));
  localStorage.setItem("dx_saved_questions", JSON.stringify(state.progress.savedQuestions));
}

function setView(view, payload = {}) {
  state.view = view;
  state.topicId = payload.topicId || null;
  state.articleId = payload.articleId || null;
  render();
}

function setLang(lang) {
  if (!Object.hasOwn(i18n, lang)) return;
  state.lang = lang;
  render();
}

function getTopic(id) {
  return topics.find((topic) => topic.id === id);
}

function getArticle(id) {
  if (!id) return null;
  return state.articles.find(article => article.id === id);
}

function getTopicArticles(topicId) {
  if (!topicId) return [];
  return state.articles.filter(article => article.topic === topicId);
}

async function loadArticles(topicId = null) {
  if (state.articlesStatus === "loading") {
    console.warn("⚠️ Articles already loading, ignoring duplicate request");
    return;
  }
  
  state.articlesStatus = "loading";
  render();
  
  try {
    let url = "/api/articles";
    if (topicId) {
      if (typeof topicId !== 'string' || topicId.length > 50) {
        throw new Error("Invalid topic ID");
      }
      url += `?topic=${encodeURIComponent(topicId)}`;
    }
    
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.items || !Array.isArray(data.items)) {
      console.warn("⚠️ Invalid API response format:", data);
      throw new Error("Invalid response format from API");
    }
    
    if (data.items.length === 0) {
      console.warn("⚠️ No articles returned from API");
    }
    
    state.articles = data.items;
    state.articlesStatus = "ready";
    console.log(`✅ Loaded ${state.articles.length} articles${topicId ? ` for topic=${topicId}` : ''}`);
    
  } catch (error) {
    console.error("❌ Error loading articles from API:", error.message);
    console.warn("⚠️ Switching to fallback articles");
    
    state.articles = getFallbackArticles();
    state.articlesStatus = "fallback";
  }
  
  render();
}

function render() {
  document.documentElement.lang = state.lang;
  document.documentElement.dir = t().dir;
  const app = document.getElementById("app");
  app.innerHTML = `
    <div class="shell">
      ${renderSidebar()}
      <main class="main">
        ${renderTopbar()}
        ${renderMain()}
      </main>
      <aside class="right-panel ${state.chatOpen ? "open" : ""}" id="assistantPanel">
        ${renderAssistant()}
      </aside>
      <button class="mobile-chat-toggle" type="button" data-action="toggle-chat" aria-label="${t().chatTitle}">
        ${icon(state.chatOpen ? "close" : "smart_toy")}
      </button>
      ${renderMobileTabs()}
    </div>
  `;
  bindEvents(app);
  scrollMessages();
}

async function loadSourceArticles() {
  if (state.sourceArticlesStatus !== "idle") {
    console.warn("⚠️ Source articles already loading");
    return;
  }
  
  state.sourceArticlesStatus = "loading";
  try {
    const response = await fetch("/api/source-articles?limit=120", {
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      console.warn(`⚠️ Source database unavailable (${response.status})`);
      throw new Error("Source database unavailable");
    }
    
    const data = await response.json();
    
    if (!Array.isArray(data.items)) {
      console.warn("⚠️ Invalid source articles format");
      throw new Error("Invalid format");
    }
    
    state.sourceArticles = data.items;
    state.sourceArticlesStatus = "ready";
    console.log(`✅ Loaded ${state.sourceArticles.length} source articles`);
  } catch (error) {
    console.warn("⚠️ Could not load source articles:", error.message);
    state.sourceArticles = [];
    state.sourceArticlesStatus = "error";
  }
  render();
}

function renderSidebar() {
  const navItems = [
    ["home", "home", t().nav.home],
    ["topics", "apps", t().nav.topics],
    ["forum", "forum", t().nav.forum],
    ["resources", "location_on", t().nav.resources],
    ["profile", "person", t().nav.profile]
  ];
  return `
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark">${icon("favorite")}</div>
        <div>
          <div class="brand-title">docsexprime.tn</div>
          <div class="brand-subtitle">${label("brandSubtitle")}</div>
        </div>
      </div>
      <nav class="nav" aria-label="${label("primaryNavLabel")}">
        ${navItems.map(([view, navIcon, label]) => `
          <button class="nav-button ${state.view === view ? "active" : ""}" type="button" data-view="${view}">
            ${icon(navIcon)}
            <span>${label}</span>
            <span class="nav-count">${view === "topics" ? topics.length : ""}</span>
          </button>
        `).join("")}
      </nav>
      <div class="sidebar-note">${t().privacy}</div>
    </aside>
  `;
}

function renderTopbar() {
  return `
    <div class="topbar">
      <div>
        <div class="page-kicker">${t().kicker}</div>
        <h1 class="page-title">${getPageTitle()}</h1>
      </div>
      <div class="language-selector" aria-label="${label("languageLabel")}">
        ${["fr", "ar", "en"].map((lang) => `
          <button class="lang-button ${state.lang === lang ? "active" : ""}" type="button" data-lang="${lang}">
            ${lang === "ar" ? "عربي" : lang.toUpperCase()}
          </button>
        `).join("")}
      </div>
    </div>
  `;
}

function getPageTitle() {
  if (state.view === "topics") return t().topicsTitle;
  if (state.view === "forum") return t().forumTitle;
  if (state.view === "resources") return t().resourcesTitle;
  if (state.view === "profile") return t().profileTitle;
  if (state.view === "topic") return tr(getTopic(state.topicId)?.titles || "");
  if (state.view === "article") return tr(getArticle(state.articleId)?.title || "");
  return t().title;
}

function renderMain() {
  if (state.view === "topics") return renderTopics();
  if (state.view === "topic") return renderTopicDetail();
  if (state.view === "article") return renderArticle();
  if (state.view === "forum") return renderForum();
  if (state.view === "resources") return renderResources();
  if (state.view === "profile") return renderProfile();
  return renderHome();
}

function renderHome() {
  const articleCount = state.articlesStatus === "ready" ? state.articles.length : topics.length * 2;
  
  return `
    <section class="hero">
      <div class="hero-content">
        <h1>${t().title}</h1>
        <p>${t().subtitle}</p>
        <div class="hero-actions">
          <button class="primary-button" type="button" data-action="open-chat">${icon("smart_toy")}${t().askAi}</button>
          <button class="secondary-button" type="button" data-view="topics">${icon("apps")}${t().explore}</button>
        </div>
        <div class="stats">
          <div class="stat"><strong>${topics.length}</strong><span>${label("topicsCount")}</span></div>
          <div class="stat"><strong>${articleCount}</strong><span>${label("articlesCount")}</span></div>
          <div class="stat"><strong>3</strong><span>${label("languagesCount")}</span></div>
        </div>
      </div>
    </section>
    <section class="section">
      <div class="section-header">
        <div>
          <h2>${t().topicsTitle}</h2>
          <p>${t().topicsIntro}</p>
        </div>
      </div>
      ${renderTopicGrid(topics.slice(0, 6))}
    </section>
  `;
}

function renderTopics() {
  if (state.articlesStatus === "loading") {
    return `
      <section class="section">
        <p>${t().topicsIntro}</p>
        <div class="empty">${label("loadingTopics")}</div>
      </section>
    `;
  }
  
  return `
    <section class="section">
      <p>${t().topicsIntro}</p>
      ${renderTopicGrid(topics)}
    </section>
  `;
}

function renderTopicGrid(list) {
  return `
    <div class="grid">
      ${list.map((topic) => `
        <button class="card topic-card" type="button" data-topic="${escapeHtml(topic.id)}" style="--topic-color: ${topic.color}">
          ${icon(topic.icon)}
          <h3>${trEsc(topic.titles)}</h3>
          <p>${trEsc(topic.desc)}</p>
          <div class="meta-row">
            <span class="badge">${getTopicArticles(topic.id).length} ${label("articlesCount")}</span>
          </div>
        </button>
      `).join("")}
    </div>
  `;
}

function renderTopicDetail() {
  const topic = getTopic(state.topicId);
  if (!topic) return renderEmpty();
  
  if (state.articlesStatus === "loading") {
    return `
      <section class="section">
        <button class="chip" type="button" data-view="topics">${icon("arrow_back")}${t().back}</button>
        <div class="empty">${label("loadingArticles")}</div>
      </section>
    `;
  }
  
  const topicArticles = getTopicArticles(topic.id);
  
  return `
    <section class="section">
      <button class="chip" type="button" data-view="topics">${icon("arrow_back")}${t().back}</button>
      <p>${trEsc(topic.desc)}</p>
      <div class="article-list">
        ${topicArticles.length > 0 
          ? topicArticles.map(renderArticleCard).join("") 
          : `<div class="empty">${label("noArticles")}</div>`
        }
      </div>
    </section>
  `;
}

function renderArticleCard(article) {
  const topic = getTopic(article.topic);
  const media = normalizeArticleMedia(article.media);
  return `
    <button class="card article-card" type="button" data-article="${escapeHtml(article.id)}">
      ${media.hero ? `<img class="article-card-image" src="${escapeHtml(media.hero)}" alt="">` : ""}
      <span class="badge">${icon(topic.icon)}${trEsc(topic.titles)}</span>
      <h3>${trEsc(article.title)}</h3>
      <p>${trEsc(article.excerpt)}</p>
      <div class="meta-row">
        <span>${icon("schedule")}${article.minutes} ${t().minutes}</span>
        <span>${state.progress.readArticles.has(article.id) ? icon("done") + t().read : ""}</span>
      </div>
    </button>
  `;
}

function renderArticle() {
  const article = getArticle(state.articleId);
  if (!article) return renderEmpty();
  
  const topic = getTopic(article.topic);
  const media = normalizeArticleMedia(article.media);
  state.progress.readArticles.add(article.id);
  saveProgress();
  
  return `
    <article class="article-body">
      <button class="chip" type="button" data-topic="${escapeHtml(topic.id)}">${icon("arrow_back")}${t().back}</button>
      <span class="badge">${icon(topic.icon)}${trEsc(topic.titles)}</span>
      <h2>${trEsc(article.title)}</h2>
      <p class="excerpt">${trEsc(article.excerpt)}</p>
      ${renderArticleMedia(media)}
      ${article.body[state.lang].map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
      <div class="note">${t().sourceNote}</div>
      <div class="note warning">${label("articleWarning")}</div>
    </article>
  `;
}

function normalizeArticleMedia(media) {
  if (Array.isArray(media)) {
    return { hero: "", gallery: media, videos: [], documents: [] };
  }
  return {
    hero: media?.hero || "",
    gallery: Array.isArray(media?.gallery) ? media.gallery : [],
    videos: Array.isArray(media?.videos) ? media.videos : [],
    documents: Array.isArray(media?.documents) ? media.documents : []
  };
}

function renderArticleMedia(media) {
  const blocks = [];
  if (media.hero) {
    blocks.push(`<img class="article-hero-media" src="${media.hero}" alt="">`);
  }
  if (media.gallery.length) {
    blocks.push(`
      <div class="article-media-grid">
        ${media.gallery.map((url) => `<a href="${url}" target="_blank"><img src="${url}" alt=""></a>`).join("")}
      </div>
    `);
  }
  if (media.videos.length) {
    blocks.push(`
      <div class="article-video-list">
        ${media.videos.map((url) => `<video src="${url}" controls></video>`).join("")}
      </div>
    `);
  }
  if (media.documents.length) {
    blocks.push(`
      <div class="article-documents">
        ${media.documents.map((url) => `<a class="resource-action" href="${url}" target="_blank">${url.split("/").pop()}</a>`).join("")}
      </div>
    `);
  }
  return blocks.join("");
}

function renderForum() {
  const labels = { recent: t().recent, popular: t().popular, solved: t().solved };
  const query = state.forumQuery.trim().toLowerCase();
  let list = [...questions];
  if (state.forumFilter === "popular") list.sort((a, b) => b.popularity - a.popularity);
  if (state.forumFilter === "recent") list.sort((a, b) => b.date.localeCompare(a.date));
  if (state.forumFilter === "solved") list = list.filter((item) => item.status === "solved");
  if (query) list = list.filter((item) => `${tr(item.title)} ${item.tag}`.toLowerCase().includes(query));

  return `
    <section class="section">
      <p>${t().forumIntro}</p>
      <div class="controls">
        <label class="search">${icon("search")}<input id="forumSearch" value="${state.forumQuery}" placeholder="${t().search}" /></label>
        ${Object.entries(labels).map(([key, label]) => `<button class="chip ${state.forumFilter === key ? "active" : ""}" type="button" data-forum-filter="${key}">${label}</button>`).join("")}
      </div>
      <div class="question-list">
        ${list.map((q) => `
          <article class="card question-card">
            <span class="badge">${trEsc(getTopic(q.tag)?.titles || q.tag)}</span>
            <h3>${trEsc(q.title)}</h3>
            <div class="meta-row">
              <span>${icon("forum")}${q.answers} ${t().answers}</span>
              <span>${q.date}</span>
            </div>
          </article>
        `).join("") || renderEmpty()}
      </div>
    </section>
  `;
}

function renderResources() {
  const query = state.resourceQuery.trim().toLowerCase();
  const list = resources.filter((resource) => `${resource.name} ${resource.city} ${tr(resource.note)}`.toLowerCase().includes(query));
  const sourceList = state.sourceArticles.filter((article) => {
    const haystack = `${article.title} ${article.description} ${article.section} ${article.excerpt}`.toLowerCase();
    return !query || haystack.includes(query);
  });
  return `
    <section class="section">
      <div class="emergency-strip">
        ${icon("emergency")}
        <div><strong>190</strong><div>${t().emergency}: ${t().emergencyDesc}</div></div>
      </div>
      <p>${t().resourcesIntro}</p>
      <div class="controls">
        <label class="search">${icon("search")}<input id="resourceSearch" value="${state.resourceQuery}" placeholder="${t().search}" /></label>
      </div>
      <div class="resource-list">
        ${list.map((resource) => `
          <article class="card resource-card">
            <span class="badge">${escapeHtml(resource.type)}</span>
            <h3>${escapeHtml(resource.name)}</h3>
            <div class="meta-row"><span>${icon("call")}${escapeHtml(resource.phone)}</span><span>${icon("location_on")}${escapeHtml(resource.city)}</span><span>${icon("schedule")}${escapeHtml(resource.hours)}</span></div>
            <p>${trEsc(resource.note)}</p>
            <a class="resource-action" href="tel:${resource.phone.replace(/\s/g, "")}">${icon("call")} ${escapeHtml(resource.phone)}</a>
          </article>
        `).join("") || renderEmpty()}
      </div>
      <div class="note warning">${label("resourceWarning")}</div>
      <div class="section-header source-header">
        <div>
          <h2>${label("sourceTitle")}</h2>
          <p>${label("sourceIntro")}</p>
        </div>
        <span class="badge">${state.sourceArticlesStatus === "ready" ? sourceList.length : state.sourceArticlesStatus}</span>
      </div>
      <div class="article-list source-list">
        ${renderSourceArticles(sourceList)}
      </div>
    </section>
  `;
}

function renderSourceArticles(list) {
  if (state.sourceArticlesStatus === "loading" || state.sourceArticlesStatus === "idle") {
    return `<div class="empty">${label("loadingSources")}</div>`;
  }
  if (state.sourceArticlesStatus === "error") {
    return `<div class="empty">${label("sourcesUnavailable")}</div>`;
  }
  return list.map((article) => `
    <article class="card article-card source-card">
      <span class="badge">${escapeHtml(article.section || "source")}</span>
      <h3>${escapeHtml(article.title)}</h3>
      <p>${escapeHtml(article.description || article.excerpt)}</p>
      <div class="meta-row">
        <span>${icon("public")}${escapeHtml(article.source || "onsexprime.fr")}</span>
        <a class="resource-action" href="${escapeHtml(article.url)}" target="_blank" rel="noopener noreferrer">${icon("open_in_new")}${label("openSource")}</a>
      </div>
    </article>
  `).join("") || renderEmpty();
}

function renderProfile() {
  const totalArticles = state.articles.length > 0 ? state.articles.length : getFallbackArticles().length;
  const readCount = state.progress.readArticles.size;
  const percent = totalArticles > 0 ? Math.min(100, Math.round((readCount / totalArticles) * 100)) : 0;
  
  return `
    <section class="section">
      <div class="card article-card">
        <span class="badge">${icon("visibility_off")}${t().anonymous}</span>
        <h3>${t().progress}</h3>
        <p>${t().privacy}</p>
        <div class="stats">
          <div class="stat"><strong>${readCount}</strong><span>/${totalArticles} ${label("articlesCount")}</span></div>
          <div class="stat"><strong>${percent}%</strong><span>${t().progress}</span></div>
          <div class="stat"><strong>${state.progress.savedQuestions.length}</strong><span>${label("saved")}</span></div>
        </div>
      </div>
    </section>
  `;
}

function renderAssistant() {
  if (!state.messages.length) {
    state.messages.push({ role: "assistant", text: t().assistantIntro, mode: "local" });
  }
  return `
    <section class="assistant">
      <header class="assistant-header">
        <div>
          <strong>${t().chatTitle}</strong>
          <div class="assistant-status"><span class="status-dot"></span><span id="assistantMode">${t().chatStatusLocal}</span></div>
        </div>
        <button class="icon-button" type="button" data-action="toggle-chat" aria-label="${label("close")}">${icon("close")}</button>
      </header>
      <div class="messages" id="messages">
        ${state.messages.map((message) => `
          <div class="message ${message.role === "user" ? "user" : "assistant"}">
            <div class="bubble">${escapeHtml(message.text)}</div>
            <small>${message.mode === "live" ? t().chatStatusLive : t().chatStatusLocal}</small>
          </div>
        `).join("")}
      </div>
      <form class="assistant-form" id="chatForm">
        <textarea id="chatInput" placeholder="${t().chatPlaceholder}"></textarea>
        <div class="form-actions">
          <button class="primary-button" type="submit">${icon("send")}${t().send}</button>
          <button class="icon-button" type="button" data-action="clear-chat" aria-label="${t().clear}">${icon("delete")}</button>
        </div>
      </form>
    </section>
  `;
}

function renderMobileTabs() {
  const items = [
    ["home", "home", t().nav.home],
    ["topics", "apps", t().nav.topics],
    ["forum", "forum", t().nav.forum],
    ["resources", "location_on", t().nav.resources],
    ["profile", "person", t().nav.profile]
  ];
  return `<nav class="mobile-tabs">${items.map(([view, tabIcon, label]) => `<button class="${state.view === view ? "active" : ""}" type="button" data-view="${view}">${icon(tabIcon)}<span>${label}</span></button>`).join("")}</nav>`;
}

function renderEmpty() {
  return `<div class="empty">${label("noResults")}</div>`;
}

function bindEvents(root) {
  root.querySelectorAll("[data-view]").forEach((node) => {
    node.addEventListener("click", () => setView(node.dataset.view));
  });
  root.querySelectorAll("[data-lang]").forEach((node) => {
    node.addEventListener("click", () => setLang(node.dataset.lang));
  });
  root.querySelectorAll("[data-topic]").forEach((node) => {
    node.addEventListener("click", () => setView("topic", { topicId: node.dataset.topic }));
  });
  root.querySelectorAll("[data-article]").forEach((node) => {
    node.addEventListener("click", () => setView("article", { articleId: node.dataset.article }));
  });
  root.querySelectorAll("[data-action='open-chat']").forEach((node) => {
    node.addEventListener("click", () => {
      state.chatOpen = true;
      render();
    });
  });
  root.querySelectorAll("[data-action='toggle-chat']").forEach((node) => {
    node.addEventListener("click", () => {
      state.chatOpen = !state.chatOpen;
      render();
    });
  });
  root.querySelectorAll("[data-action='clear-chat']").forEach((node) => {
    node.addEventListener("click", () => {
      state.messages = [{ role: "assistant", text: t().assistantIntro, mode: "local" }];
      render();
    });
  });
  root.querySelectorAll("[data-forum-filter]").forEach((node) => {
    node.addEventListener("click", () => {
      state.forumFilter = node.dataset.forumFilter;
      render();
    });
  });
  const forumSearch = root.querySelector("#forumSearch");
  if (forumSearch) {
    forumSearch.addEventListener("input", (event) => {
      // Save caret before the re-render rebuilds the input, then restore it
      // on the freshly created input so the user can keep typing in place.
      const input = event.target;
      state.forumQuery = input.value;
      const caret = input.selectionStart;
      render();
      const next = document.querySelector("#forumSearch");
      if (next) {
        next.focus();
        if (typeof caret === "number") {
          next.setSelectionRange(caret, caret);
        }
      }
    });
  }
  const resourceSearch = root.querySelector("#resourceSearch");
  if (resourceSearch) {
    resourceSearch.addEventListener("input", (event) => {
      const input = event.target;
      state.resourceQuery = input.value;
      const caret = input.selectionStart;
      render();
      const next = document.querySelector("#resourceSearch");
      if (next) {
        next.focus();
        if (typeof caret === "number") {
          next.setSelectionRange(caret, caret);
        }
      }
    });
  }
  const form = root.querySelector("#chatForm");
  if (form) {
    form.addEventListener("submit", submitChat);
  }
}

async function submitChat(event) {
  event.preventDefault();
  const input = document.querySelector("#chatInput");
  const text = input.value.trim();

  if (!text) {
    console.warn("⚠️ Empty chat message ignored");
    return;
  }

  if (text.length > 2000) {
    alert("Message too long (max 2000 characters)");
    return;
  }

  input.value = "";
  const userMessage = {
    id: messageId(),
    role: "user",
    text,
    mode: "local",
    timestamp: new Date().toISOString()
  };
  state.messages.push(userMessage);
  render();

  if (!isAllowed(text)) {
    const blockedMsg = t().blocked;
    console.warn("⚠️ Message blocked by safety filter");
    state.messages.push({
      id: messageId(),
      role: "assistant",
      text: blockedMsg,
      mode: "local",
      timestamp: new Date().toISOString()
    });
    render();
    return;
  }

  // Pending placeholder keyed by id so concurrent submits don't clobber each other.
  const pendingId = messageId();
  state.messages.push({
    id: pendingId,
    role: "assistant",
    text: "...",
    mode: "loading",
    timestamp: new Date().toISOString()
  });
  render();

  const replacePending = (replacement) => {
    const idx = state.messages.findIndex((m) => m.id === pendingId);
    if (idx >= 0) state.messages[idx] = replacement;
  };

  try {
    const reqBody = {
      lang: state.lang,
      message: text,
      context: {
        topics: topics.map((topic) => tr(topic.titles)).filter(t => t),
        resources: resources.map((resource) => `${resource.name} ${resource.phone}`).filter(r => r),
        sourceArticles: state.sourceArticles.slice(0, 30).map((article) => `${article.title || ''} ${article.url || ''}`).filter(a => a.trim())
      }
    };

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reqBody),
      signal: AbortSignal.timeout(60000) // 60 second timeout
    });

    if (response.status === 503) {
      console.warn("⚠️ LLM not configured, using local fallback");
      replacePending({
        id: pendingId,
        role: "assistant",
        text: `${t().llmFail}\n\n${localReply(text)}`,
        mode: "local",
        timestamp: new Date().toISOString()
      });
      render();
      return;
    }

    if (!response.ok) {
      console.error(`❌ Chat API error ${response.status}: ${response.statusText}`);
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data.reply || typeof data.reply !== 'string') {
      console.warn("⚠️ Invalid reply format, using fallback");
      throw new Error("Invalid response format");
    }

    replacePending({
      id: pendingId,
      role: "assistant",
      text: data.reply,
      mode: "live",
      timestamp: new Date().toISOString()
    });
    console.log("✅ Chat response received");
  } catch (error) {
    console.error("❌ Chat error:", error.message);
    replacePending({
      id: pendingId,
      role: "assistant",
      text: `${t().llmFail}\n\n${localReply(text)}`,
      mode: "local",
      timestamp: new Date().toISOString()
    });
  }
  render();
}

function messageId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `m_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function isAllowed(text) {
  const blocked = /(suicide|kill myself|abus sexuel|viol|اغتصاب|انتحار|exploitation|minor explicit|pedo)/i;
  if (!blocked.test(text)) return true;
  return /help|aide|مساعدة|urgent|danger|safe|سلامة/i.test(text);
}

function localReply(text) {
  const lower = text.toLowerCase();
  const lang = state.lang;
  const emergency = {
    fr: "Si tu es en danger immediat ou si une personne t'a force, cherche un lieu sur et contacte les urgences locales. Tu peux aussi preparer une phrase simple pour un soignant: \"J'ai besoin d'aide et de confidentialite.\"",
    ar: "اذا كنت في خطر مباشر او تعرضت لاكراه، اذهب الى مكان آمن واتصل بالطوارئ المحلية. يمكنك قول جملة بسيطة لمقدم الرعاية: احتاج مساعدة وسرية.",
    en: "If you are in immediate danger or someone forced you, get to a safe place and contact local emergency services. You can tell a clinician: \"I need help and privacy.\""
  };
  if (/urgent|danger|force|viol|اغتصاب|خطر|emergency/i.test(text)) return emergency[lang];
  if (/contrace|pill|preserv|condom|منع|واقي/i.test(lower)) return getFallbackArticles().find((a) => a.id === "contraception-questions")?.body[lang].join("\n\n") || "";
  if (/ist|vih|sida|hiv|depist|test|فحص|مرض/i.test(lower)) return getFallbackArticles().find((a) => a.id === "testing-sti")?.body[lang].join("\n\n") || "";
  if (/consent|accord|موافقة|حدود/i.test(lower)) return getFallbackArticles().find((a) => a.id === "consent-basics")?.body[lang].join("\n\n") || "";
  return t().assistantIntro + "\n\n" + t().sourceNote;
}

function scrollMessages() {
  const box = document.querySelector("#messages");
  if (box) box.scrollTop = box.scrollHeight;
}

async function init() {
  render();
  await loadArticles();
  await loadSourceArticles();
  render();
}

init();
