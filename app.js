(() => {
  "use strict";

  /* ========================================================================
     1. Constants & Storage Configuration
     ======================================================================== */
  const STORAGE_KEY = "lexicon_vocab_app_v1";
  const RAW_SUPABASE_URL = "https://stibdufkgmiyyvhynpqa.supabase.co/rest/v1/";
  const SUPABASE_URL = RAW_SUPABASE_URL.replace(/\/rest\/v1\/?$/i, "").replace(
    /\/+$/,
    "",
  );
  const SUPABASE_ANON_KEY = "sb_publishable_0pzgMO21KhgQeSFIDzkNYg_u3mL69dn";
  const CLOUD_EMAIL_DOMAIN = "lexicon.app";
  const CLOUD_PROGRESS_TABLE = "user_progress";
  const CLOUD_SYNC_DEBOUNCE_MS = 1500;
  const CLOUD_PULL_COOLDOWN_MS = 15000;
  const VALID_STATUSES = new Set(["new", "wrong", "hard", "good", "master"]);
  const VALID_STREAM_FILTERS = new Set([
    "smart-mix",
    "new-only",
    "review-only",
    "bookmarked",
  ]);
  const TAB_ORDER = ["all", "wrong-study", "wrong-archive"];
  const VALID_WRONG_SCOPES = new Set(["all", "focus"]);
  const FLY_OUT_DURATION_MS = 280;
  const ENTER_ANIMATION_MS = 380;
  const STREAM_BATCH_SIZE = 20;
  const STREAM_REFILL_THRESHOLD = 5;
  const WRONG_REINSERT_MIN = 5;
  const WRONG_REINSERT_MAX = 12;
  const HARD_REINSERT_MIN = 20;
  const HARD_REINSERT_MAX = 30;
  const LV1_DELAY_MIN = 40;
  const LV1_DELAY_MAX = 80;
  const LV1_SHRINK_THRESHOLD = 80;
  const LV2_DELAY_MIN = 100;
  const LV2_DELAY_MAX = 220;
  const LV2_SHRINK_THRESHOLD = 220;
  const LV2_MAX_PER_BATCH = 5;
  const FOCUS_WRONG_THRESHOLD = 3;
  const MAX_LEVEL = 3;
  const MOBILE_LAYOUT_QUERY =
    "(max-width: 720px), (max-height: 540px) and (max-width: 960px)";
  const mobileMediaQuery = window.matchMedia(MOBILE_LAYOUT_QUERY);

  // Dynamic Plugin Registry State (populated by loadDeckRegistry() at init)
  let DECKS = [];
  let DECK_MAP = new Map();
  let WORDS = [];
  let WORD_MAP = new Map();
  let RANDOM_ORDER_MAP = new Map();

  function loadDeckRegistry() {
    const rawDecks = Array.isArray(window.VOCAB_DECKS)
      ? [...window.VOCAB_DECKS]
      : [];

    // Emergency fallback if only legacy window.VOCAB_DATA is present
    if (
      rawDecks.length === 0 &&
      Array.isArray(window.VOCAB_DATA) &&
      window.VOCAB_DATA.length > 0
    ) {
      rawDecks.push({
        key: "default",
        title: "기본",
        words: window.VOCAB_DATA,
      });
    }

    const nextDecks = [];
    const nextDeckMap = new Map();
    const nextWords = [];
    const nextWordMap = new Map();
    const seenDeckKeys = new Set();
    let orderSeq = 0;

    for (const rawDeck of rawDecks) {
      if (!rawDeck || typeof rawDeck !== "object") continue;
      const key = String(rawDeck.key || "").trim();
      const title = String(rawDeck.title || key).trim();
      if (!key || seenDeckKeys.has(key) || !Array.isArray(rawDeck.words)) {
        continue;
      }
      seenDeckKeys.add(key);

      const deckWords = [];
      for (const rawWord of rawDeck.words) {
        if (!rawWord || typeof rawWord !== "object") continue;
        const localId = rawWord.id;
        if (localId === undefined || localId === null) continue;

        const uid = `${key}_${localId}`;
        if (nextWordMap.has(uid)) continue;

        const normalizedWord = {
          uid,
          id: uid,
          localId,
          deckKey: key,
          deckTitle: title,
          orderIndex: orderSeq,
          word: String(rawWord.word || ""),
          phonetic: String(rawWord.phonetic || ""),
          pos: String(rawWord.pos || ""),
          meaning: String(rawWord.meaning || ""),
          example: String(rawWord.example || ""),
          exampleKo: String(rawWord.exampleKo || ""),
        };

        orderSeq += 1;
        deckWords.push(normalizedWord);
        nextWords.push(normalizedWord);
        nextWordMap.set(uid, normalizedWord);
      }

      const deckEntry = {
        key,
        title,
        words: deckWords,
      };
      nextDecks.push(deckEntry);
      nextDeckMap.set(key, deckEntry);
    }

    DECKS = nextDecks;
    DECK_MAP = nextDeckMap;
    WORDS = nextWords;
    WORD_MAP = nextWordMap;

    // Expose integrated flat dataset globally
    window.VOCAB_DATA = WORDS;
  }

  /* ========================================================================
     2. DOM Element References
     ======================================================================== */
  const dom = {
    html: document.documentElement,
    themeColorMeta: document.querySelector('meta[name="theme-color"]'),

    // Header & Layout Containers
    headerInner: document.querySelector(".header-inner"),
    deckSelector: document.getElementById("deckSelector"),
    headerActions: document.getElementById("headerActions"),
    cloudMenuBtn: document.getElementById("cloudMenuBtn"),
    cloudHeaderStatusDot: document.getElementById("cloudHeaderStatusDot"),
    cloudHeaderLabel: document.getElementById("cloudHeaderLabel"),
    exportBtn: document.getElementById("exportBtn"),
    importBtn: document.getElementById("importBtn"),
    importFileInput: document.getElementById("importFileInput"),
    themeToggleBtn: document.getElementById("themeToggleBtn"),
    themeToggleLabel: document.getElementById("themeToggleLabel"),
    resetAllDataBtn: document.getElementById("resetAllDataBtn"),
    headerMasteryBar: document.getElementById("headerMasteryBar"),

    // Mobile Compact Header & Expandable Menu
    mobileStatusPill: document.getElementById("mobileStatusPill"),
    mobileFilterTag: document.getElementById("mobileFilterTag"),
    mobileProgressText: document.getElementById("mobileProgressText"),
    mobileMenuBtn: document.getElementById("mobileMenuBtn"),
    mobileMenuBtnText: document.getElementById("mobileMenuBtnText"),
    mobileMenuDot: document.getElementById("mobileMenuDot"),
    mobileMenuBackdrop: document.getElementById("mobileMenuBackdrop"),
    mobileMenu: document.getElementById("mobileMenu"),
    mobileMenuBody: document.querySelector("#mobileMenu .mobile-menu-body"),
    mobileMenuBackBtn: document.getElementById("mobileMenuBackBtn"),
    mobileMenuTitle: document.getElementById("mobileMenuTitle"),
    mobileMenuCloseBtn: document.getElementById("mobileMenuCloseBtn"),
    mobileCloudEntryBtn: document.getElementById("mobileCloudEntryBtn"),
    mobileCloudEntrySub: document.getElementById("mobileCloudEntrySub"),
    mobileCloudEntryBadge: document.getElementById("mobileCloudEntryBadge"),
    mobileCloudEntryBadgeText: document.getElementById(
      "mobileCloudEntryBadgeText",
    ),
    menuSlotDecks: document.getElementById("menuSlotDecks"),
    menuSlotStats: document.getElementById("menuSlotStats"),
    menuSlotStudyControls: document.getElementById("menuSlotStudyControls"),
    menuSlotStudyOrder: document.getElementById("menuSlotStudyOrder"),
    menuSlotAppActions: document.getElementById("menuSlotAppActions"),

    // Cloud Account & Supabase Sync UI
    cloudSyncBadge: document.getElementById("cloudSyncBadge"),
    cloudSyncBadgeText: document.getElementById("cloudSyncBadgeText"),
    cloudAuthLoggedOut: document.getElementById("cloudAuthLoggedOut"),
    cloudUsernameInput: document.getElementById("cloudUsernameInput"),
    cloudPasswordInput: document.getElementById("cloudPasswordInput"),
    cloudLoginBtn: document.getElementById("cloudLoginBtn"),
    cloudSignupBtn: document.getElementById("cloudSignupBtn"),
    cloudAuthMessage: document.getElementById("cloudAuthMessage"),
    cloudAuthLoggedIn: document.getElementById("cloudAuthLoggedIn"),
    cloudAvatar: document.getElementById("cloudAvatar"),
    cloudAccountName: document.getElementById("cloudAccountName"),
    cloudLastSyncText: document.getElementById("cloudLastSyncText"),
    cloudSyncNowBtn: document.getElementById("cloudSyncNowBtn"),
    cloudLogoutBtn: document.getElementById("cloudLogoutBtn"),
    cloudSyncedMessage: document.getElementById("cloudSyncedMessage"),

    // Main Containers & Stats
    appContainer: document.querySelector(".app-container"),
    statsWidget: document.getElementById("statsWidget"),
    statTodayCount: document.getElementById("statTodayCount"),
    statMasteryLabel: document.getElementById("statMasteryLabel"),
    statMasteryText: document.getElementById("statMasteryText"),
    statMasteryTrack: document.getElementById("statMasteryTrack"),
    statMasteryBar: document.getElementById("statMasteryBar"),
    statWrongCount: document.getElementById("statWrongCount"),

    // Navigation & Filter
    navigationBar: document.querySelector(".navigation-bar"),
    segmentedIndicator: document.getElementById("segmentedIndicator"),
    tabButtons: Array.from(document.querySelectorAll(".segmented-btn")),
    tabWrongStudyCount: document.getElementById("tabWrongStudyCount"),
    tabArchiveCount: document.getElementById("tabArchiveCount"),
    filterWrapper: document.getElementById("filterWrapper"),
    streamFilter: document.getElementById("streamFilter"),

    // Study View
    studyView: document.getElementById("studyView"),
    wrongStudySubnav: document.getElementById("wrongStudySubnav"),
    wrongScopeButtons: Array.from(
      document.querySelectorAll(".wrong-scope-btn"),
    ),
    wrongScopeAllCount: document.getElementById("wrongScopeAllCount"),
    wrongScopeFocusCount: document.getElementById("wrongScopeFocusCount"),
    deckMeta: document.querySelector(".deck-meta"),
    deckMetaRight: document.getElementById("deckMetaRight"),
    deckModeBadge: document.getElementById("deckModeBadge"),
    paceChip: document.getElementById("paceChip"),
    cardProgressText: document.getElementById("cardProgressText"),
    randomOrderControl: document.getElementById("randomOrderControl"),
    randomOrderToggle: document.getElementById("randomOrderToggle"),
    randomOrderHint: document.getElementById("randomOrderHint"),
    shuffleBtn: document.getElementById("shuffleBtn"),
    shuffleBtnText: document.getElementById("shuffleBtnText"),
    flashcardStage: document.getElementById("flashcardStage"),
    flashcard: document.getElementById("flashcard"),
    flashcardInner: document.querySelector("#flashcard .flashcard-inner"),

    // Flashcard Front / Back
    cardDeckBadge: document.getElementById("cardDeckBadge"),
    cardPos: document.getElementById("cardPos"),
    cardLeechBadge: document.getElementById("cardLeechBadge"),
    cardMasteryMeta: document.getElementById("cardMasteryMeta"),
    cardLevelDots: document.getElementById("cardLevelDots"),
    cardLastStudied: document.getElementById("cardLastStudied"),
    pronounceBtn: document.getElementById("pronounceBtn"),
    bookmarkBtn: document.getElementById("bookmarkBtn"),
    cardWord: document.getElementById("cardWord"),
    cardPhonetic: document.getElementById("cardPhonetic"),
    cardBackWord: document.getElementById("cardBackWord"),
    cardBackPos: document.getElementById("cardBackPos"),
    cardBackLeechBadge: document.getElementById("cardBackLeechBadge"),
    cardWrongBadge: document.getElementById("cardWrongBadge"),
    cardMeaning: document.getElementById("cardMeaning"),
    pronounceExampleBtn: document.getElementById("pronounceExampleBtn"),
    cardExample: document.getElementById("cardExample"),
    cardExampleKo: document.getElementById("cardExampleKo"),

    // Study Empty & Control Bar
    studyEmptyState: document.getElementById("studyEmptyState"),
    studyEmptyTitle: document.getElementById("studyEmptyTitle"),
    studyEmptyDesc: document.getElementById("studyEmptyDesc"),
    restartSessionBtn: document.getElementById("restartSessionBtn"),
    returnToAllBtn: document.getElementById("returnToAllBtn"),
    controlBar: document.getElementById("controlBar"),
    ratingButtons: Array.from(document.querySelectorAll(".rating-btn")),
    shortcutHintBar: document.querySelector(".shortcut-hint-bar"),

    // Archive View
    archiveView: document.getElementById("archiveView"),
    archiveSummaryText: document.getElementById("archiveSummaryText"),
    hideMeaningToggle: document.getElementById("hideMeaningToggle"),
    resetWrongBtn: document.getElementById("resetWrongBtn"),
    archiveList: document.getElementById("archiveList"),
    archiveEmptyState: document.getElementById("archiveEmptyState"),

    // Toast
    toast: document.getElementById("toast"),
  };

  /* ========================================================================
     3. Application State & Persistence
     ======================================================================== */
  function getLocalDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function createDefaultWordProgress() {
    return {
      wrongCount: 0,
      status: "new",
      bookmarked: false,
      level: 0,
      lastStudied: null,
      dueStep: null,
      sessionWrongStreak: 0,
      isLeech: false,
      leechUntil: null,
    };
  }

  function getSystemDefaultTheme() {
    if (
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
      return "dark";
    }
    return "light";
  }

  function createDefaultState() {
    return {
      version: 4,
      theme: getSystemDefaultTheme(),
      selectedDeck: "all",
      hideMeanings: false,
      randomOrder: false,
      randomSeed: null,
      deckSteps: {},
      updatedAt: null,
      todayStats: {
        date: getLocalDateKey(),
        count: 0,
        byDeck: {},
      },
      words: {},
    };
  }

  function parseTimestampMs(value) {
    if (!value) return 0;
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      return value;
    }
    const parsed = Date.parse(String(value));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }

  function normalizeIsoTimestamp(value) {
    const ms = parseTimestampMs(value);
    return ms > 0 ? new Date(ms).toISOString() : null;
  }

  function hasMeaningfulProgress(state) {
    if (!state || typeof state !== "object") return false;
    if (state.todayStats && Number(state.todayStats.count) > 0) return true;
    if (!state.words || typeof state.words !== "object") return false;
    for (const entry of Object.values(state.words)) {
      if (!entry || typeof entry !== "object") continue;
      if (
        entry.level > 0 ||
        entry.wrongCount > 0 ||
        entry.bookmarked ||
        entry.lastStudied !== null ||
        entry.status !== "new"
      ) {
        return true;
      }
    }
    return false;
  }

  function inferLegacyUpdatedAt(wordsObj, todayStats) {
    let maxMs = 0;
    let hasAnyActivity = Boolean(todayStats && Number(todayStats.count) > 0);
    if (wordsObj && typeof wordsObj === "object") {
      for (const entry of Object.values(wordsObj)) {
        if (!entry || typeof entry !== "object") continue;
        if (entry.lastStudied && entry.lastStudied > maxMs) {
          maxMs = entry.lastStudied;
        }
        if (
          entry.level > 0 ||
          entry.wrongCount > 0 ||
          entry.bookmarked ||
          entry.status !== "new"
        ) {
          hasAnyActivity = true;
        }
      }
    }
    if (maxMs > 0) return new Date(maxMs).toISOString();
    if (hasAnyActivity) return new Date(1000).toISOString();
    return null;
  }

  function sanitizeStatePayload(raw, options = {}) {
    const {
      fallbackTheme = getSystemDefaultTheme(),
      fallbackDeck = "all",
      overrideUpdatedAt = null,
    } = options;
    const state = createDefaultState();
    state.theme = fallbackTheme === "dark" ? "dark" : "light";
    state.selectedDeck =
      fallbackDeck === "all" || DECK_MAP.has(fallbackDeck)
        ? fallbackDeck
        : "all";

    if (!raw || typeof raw !== "object") return state;

    if (raw.theme === "light" || raw.theme === "dark") {
      state.theme = raw.theme;
    }
    if (
      typeof raw.selectedDeck === "string" &&
      (raw.selectedDeck === "all" || DECK_MAP.has(raw.selectedDeck))
    ) {
      state.selectedDeck = raw.selectedDeck;
    }
    state.hideMeanings = Boolean(raw.hideMeanings);
    state.randomOrder = Boolean(raw.randomOrder);
    if (
      raw.randomSeed !== undefined &&
      raw.randomSeed !== null &&
      Number.isFinite(Number(raw.randomSeed)) &&
      Number(raw.randomSeed) > 0
    ) {
      state.randomSeed = Number(raw.randomSeed) >>> 0;
    }

    const todayKey = getLocalDateKey();
    if (
      raw.todayStats &&
      typeof raw.todayStats === "object" &&
      raw.todayStats.date === todayKey
    ) {
      const safeCount = Number.isFinite(Number(raw.todayStats.count))
        ? Math.max(0, Math.floor(Number(raw.todayStats.count)))
        : 0;
      const safeByDeck = sanitizeTodayByDeck(raw.todayStats.byDeck);
      const byDeckSum = Object.values(safeByDeck).reduce((a, b) => a + b, 0);
      state.todayStats = {
        date: todayKey,
        count: Math.max(safeCount, byDeckSum),
        byDeck: safeByDeck,
      };
    }

    state.deckSteps = sanitizeDeckSteps(raw.deckSteps);

    if (
      raw.words &&
      typeof raw.words === "object" &&
      !Array.isArray(raw.words)
    ) {
      for (const [key, entry] of Object.entries(raw.words)) {
        if (key && entry && typeof entry === "object") {
          state.words[key] = sanitizeWordEntry(entry);
        }
      }
    }

    const explicitUpdated =
      normalizeIsoTimestamp(overrideUpdatedAt) ||
      normalizeIsoTimestamp(raw.updatedAt);
    state.updatedAt =
      explicitUpdated || inferLegacyUpdatedAt(state.words, state.todayStats);

    return state;
  }

  function sanitizeDeckSteps(rawSteps) {
    const clean = {};
    if (!rawSteps || typeof rawSteps !== "object") return clean;
    for (const [deckKey, rawVal] of Object.entries(rawSteps)) {
      if (!deckKey) continue;
      const num = Number(rawVal);
      if (Number.isFinite(num) && num > 0) {
        clean[deckKey] = Math.floor(num);
      }
    }
    return clean;
  }

  function sanitizeTodayByDeck(rawByDeck) {
    const clean = {};
    if (!rawByDeck || typeof rawByDeck !== "object") return clean;
    for (const [deckKey, rawVal] of Object.entries(rawByDeck)) {
      if (!deckKey) continue;
      const num = Number(rawVal);
      if (Number.isFinite(num) && num > 0) {
        clean[deckKey] = Math.floor(num);
      }
    }
    return clean;
  }

  function sanitizeWordEntry(raw) {
    if (!raw || typeof raw !== "object") {
      return createDefaultWordProgress();
    }
    const wrongCount = Number.isFinite(Number(raw.wrongCount))
      ? Math.max(0, Math.floor(Number(raw.wrongCount)))
      : 0;
    const bookmarked = Boolean(raw.bookmarked);

    let level = 0;
    if (
      raw.level !== undefined &&
      raw.level !== null &&
      Number.isFinite(Number(raw.level))
    ) {
      level = Math.min(MAX_LEVEL, Math.max(0, Math.floor(Number(raw.level))));
    } else if (raw.status === "master") {
      level = MAX_LEVEL;
    } else if (raw.status === "good") {
      level = 1;
    }

    let lastStudied = null;
    if (
      raw.lastStudied !== undefined &&
      raw.lastStudied !== null &&
      Number.isFinite(Number(raw.lastStudied)) &&
      Number(raw.lastStudied) > 0
    ) {
      lastStudied = Math.floor(Number(raw.lastStudied));
    }

    let dueStep = null;
    if (
      (level === 1 || level === 2) &&
      raw.dueStep !== undefined &&
      raw.dueStep !== null &&
      Number.isFinite(Number(raw.dueStep)) &&
      Number(raw.dueStep) >= 0
    ) {
      dueStep = Math.floor(Number(raw.dueStep));
    }

    const sessionWrongStreak = 0;
    const isLeech = level < MAX_LEVEL && wrongCount >= FOCUS_WRONG_THRESHOLD;
    const leechUntil = null;

    let status = VALID_STATUSES.has(raw.status) ? raw.status : "new";
    if (level >= MAX_LEVEL) {
      status = "master";
    } else if (status === "master") {
      status = level > 0 ? "good" : wrongCount > 0 ? "wrong" : "new";
    }

    return {
      wrongCount,
      status,
      bookmarked,
      level,
      lastStudied,
      dueStep,
      sessionWrongStreak,
      isLeech,
      leechUntil,
    };
  }

  function loadPersistedState() {
    const fallback = createDefaultState();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return fallback;

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return fallback;

      return sanitizeStatePayload(parsed);
    } catch (error) {
      console.error("Failed to load state from localStorage:", error);
      return fallback;
    }
  }

  let persistedState = createDefaultState();

  // Ephemeral UI / Session State
  const session = {
    activeDeck: "all", // 'all' | deck.key ('toeic', 'toefl', ...)
    activeTab: "all", // 'all' | 'wrong-study' | 'wrong-archive'
    wrongStudyScope: "all", // 'all' | 'focus' (오답 3회 이상 집중 암기)
    streamFilter: "smart-mix", // 'smart-mix' | 'new-only' | 'review-only' | 'bookmarked'
    queue: [],
    currentIndex: 0,
    passedInStream: new Set(),
    isFlipped: false,
    isAnimating: false,
    isMobileLayout: false,
    isMenuOpen: false,
    menuView: "main", // 'main' | 'cloud' (모바일 메뉴 하위 페이지)
    flyOutTimer: null,
    menuCloseTimer: null,
    toastTimer: null,
    enterTimer: null,
    paceBumpTimer: null,
  };

  // Cloud Sync Runtime State (Supabase)
  const cloud = {
    client: null,
    sdkReady: false,
    user: null,
    status: "local", // 'local' | 'synced' | 'syncing' | 'offline' | 'error'
    lastSyncedAt: null,
    lastPullCheckMs: 0,
    isAuthBusy: false,
    isSyncing: false,
    pendingPush: false,
    debounceTimer: null,
    activeAuthUserId: null,
  };

  function ensureTodayStats() {
    const todayKey = getLocalDateKey();
    if (
      !persistedState.todayStats ||
      persistedState.todayStats.date !== todayKey
    ) {
      persistedState.todayStats = { date: todayKey, count: 0, byDeck: {} };
    }
    if (
      !persistedState.todayStats.byDeck ||
      typeof persistedState.todayStats.byDeck !== "object"
    ) {
      persistedState.todayStats.byDeck = {};
    }
  }

  function getTodayCountForDeck(deckKey = session.activeDeck) {
    ensureTodayStats();
    if (deckKey === "all") {
      const byDeckSum = Object.values(persistedState.todayStats.byDeck).reduce(
        (sum, val) => sum + (Number.isFinite(Number(val)) ? Number(val) : 0),
        0,
      );
      return Math.max(persistedState.todayStats.count || 0, byDeckSum);
    }
    return persistedState.todayStats.byDeck[deckKey] || 0;
  }

  function getWordProgress(wordId) {
    if (!persistedState.words[wordId]) {
      persistedState.words[wordId] = createDefaultWordProgress();
    }
    return persistedState.words[wordId];
  }

  function savePersistedState(options = {}) {
    const {
      markUpdated = true,
      syncCloud = true,
      immediateCloud = false,
    } = options;

    try {
      ensureTodayStats();
      if (markUpdated) {
        persistedState.updatedAt = new Date().toISOString();
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persistedState));
    } catch (error) {
      console.error("Failed to save state to localStorage:", error);
      showToast("브라우저 저장 공간에 기록하지 못했습니다.", "error");
    }

    if (syncCloud && cloud.user && cloud.client) {
      if (immediateCloud) {
        flushCloudPush({ silent: true });
      } else {
        scheduleCloudPush();
      }
    }
  }

  /* ========================================================================
     4. Theme Management
     ======================================================================== */
  function applyTheme(theme) {
    const resolved = theme === "dark" ? "dark" : "light";
    persistedState.theme = resolved;
    dom.html.setAttribute("data-theme", resolved);
    if (dom.themeColorMeta) {
      dom.themeColorMeta.setAttribute(
        "content",
        resolved === "dark" ? "#000000" : "#F2F2F7",
      );
    }
    if (dom.themeToggleBtn) {
      dom.themeToggleBtn.setAttribute(
        "aria-pressed",
        String(resolved === "dark"),
      );
      dom.themeToggleBtn.title =
        resolved === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환";
    }
    if (dom.themeToggleLabel) {
      dom.themeToggleLabel.textContent =
        resolved === "dark" ? "라이트 모드" : "다크 모드";
    }
  }

  function toggleTheme() {
    const nextTheme = persistedState.theme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
    savePersistedState({ markUpdated: false, syncCloud: false });
    showToast(
      nextTheme === "dark"
        ? "다크 모드로 전환했습니다."
        : "라이트 모드로 전환했습니다.",
    );
  }

  /* ========================================================================
     5. Toast Feedback
     ======================================================================== */
  function showToast(message, variant = "default") {
    if (!dom.toast) return;
    if (session.toastTimer) {
      clearTimeout(session.toastTimer);
    }

    dom.toast.textContent = message;
    dom.toast.classList.remove("is-success", "is-error", "is-visible");

    if (variant === "success") dom.toast.classList.add("is-success");
    if (variant === "error") dom.toast.classList.add("is-error");

    // Force reflow so repeated toasts animate cleanly
    void dom.toast.offsetWidth;
    dom.toast.classList.add("is-visible");

    session.toastTimer = setTimeout(() => {
      dom.toast.classList.remove("is-visible");
      session.toastTimer = null;
    }, 2200);
  }

  /* ========================================================================
     6. Web Speech API (en-US TTS)
     ======================================================================== */
  let preferredVoice = null;
  let activeAudioBtn = null;

  function loadPreferredVoice() {
    if (!("speechSynthesis" in window)) return;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return;

    const usVoices = voices.filter(
      (v) => v.lang && v.lang.toLowerCase().startsWith("en-us"),
    );
    preferredVoice =
      usVoices.find((v) =>
        /samantha|alex|allison|ava|google us english|natural/i.test(v.name),
      ) ||
      usVoices[0] ||
      voices.find((v) => v.lang && v.lang.toLowerCase().startsWith("en")) ||
      null;
  }

  function clearSpeakingIndicator() {
    if (activeAudioBtn) {
      activeAudioBtn.classList.remove("is-speaking");
      activeAudioBtn = null;
    }
  }

  function speakText(text, triggerButton = null) {
    if (!text) return;
    if (!("speechSynthesis" in window)) {
      showToast("이 브라우저는 음성 발음 재생을 지원하지 않습니다.", "error");
      return;
    }

    window.speechSynthesis.cancel();
    clearSpeakingIndicator();

    if (!preferredVoice) {
      loadPreferredVoice();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.94;
    utterance.pitch = 1.0;

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    if (triggerButton) {
      activeAudioBtn = triggerButton;
      triggerButton.classList.add("is-speaking");
    }

    utterance.onend = () => clearSpeakingIndicator();
    utterance.onerror = () => clearSpeakingIndicator();

    window.speechSynthesis.speak(utterance);
  }

  if ("speechSynthesis" in window) {
    loadPreferredVoice();
    if (typeof window.speechSynthesis.onvoiceschanged !== "undefined") {
      window.speechSynthesis.onvoiceschanged = loadPreferredVoice;
    }
  }

  /* ========================================================================
     7. Data Filtering, Smart Mix, Wrong-Note Predicate & Queue Management
     ======================================================================== */
  function hasStudyHistory(progress) {
    return (
      progress.lastStudied !== null ||
      progress.level > 0 ||
      progress.wrongCount > 0 ||
      progress.status !== "new"
    );
  }

  function formatLastStudied(timestamp) {
    if (!timestamp) return "신규";
    const studiedDate = new Date(timestamp);
    if (Number.isNaN(studiedDate.getTime())) return "신규";

    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    ).getTime();
    const studiedStart = new Date(
      studiedDate.getFullYear(),
      studiedDate.getMonth(),
      studiedDate.getDate(),
    ).getTime();

    const diffDays = Math.round((todayStart - studiedStart) / 86400000);
    if (diffDays <= 0) return "오늘";
    return `${diffDays}일 전`;
  }

  function renderLevelDots(container, level) {
    if (!container) return;
    const clampedLevel = Math.min(MAX_LEVEL, Math.max(0, Number(level) || 0));
    const dots = container.querySelectorAll(".level-dot");
    dots.forEach((dot, idx) => {
      dot.classList.toggle("is-filled", idx < clampedLevel);
    });
    container.classList.toggle("is-mastered", clampedLevel >= MAX_LEVEL);
  }

  function createLevelDotsElement(level) {
    const dotsWrap = document.createElement("span");
    dotsWrap.className = "level-dots";
    dotsWrap.setAttribute("aria-hidden", "true");
    for (let i = 0; i < MAX_LEVEL; i += 1) {
      const dot = document.createElement("span");
      dot.className = "level-dot";
      dotsWrap.appendChild(dot);
    }
    renderLevelDots(dotsWrap, level);
    return dotsWrap;
  }

  // 현재 선택된 단어장(Deck)의 단어 목록 반환
  function getActiveDeckWords() {
    if (session.activeDeck === "all") return WORDS;
    const deck = DECK_MAP.get(session.activeDeck);
    return deck ? deck.words : [];
  }

  function getActiveDeckTitle() {
    if (session.activeDeck === "all") return "전체";
    const deck = DECK_MAP.get(session.activeDeck);
    return deck ? deck.title : session.activeDeck;
  }

  function createRandomSeed() {
    if (
      typeof crypto !== "undefined" &&
      typeof crypto.getRandomValues === "function"
    ) {
      const buf = new Uint32Array(1);
      crypto.getRandomValues(buf);
      return buf[0] || 1;
    }
    return (Math.floor(Math.random() * 0xfffffffe) + 1) >>> 0;
  }

  function mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Deterministic 1-to-1 bijection over all words (zero duplicates, zero omissions for every deck subset)
  function rebuildRandomOrderMap() {
    const nextMap = new Map();
    if (WORDS.length === 0) {
      RANDOM_ORDER_MAP = nextMap;
      return;
    }

    if (!persistedState.randomSeed) {
      persistedState.randomSeed = createRandomSeed();
    }

    const ids = WORDS.map((w) => w.id);
    const rng = mulberry32(persistedState.randomSeed);
    for (let i = ids.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    for (let rank = 0; rank < ids.length; rank += 1) {
      nextMap.set(ids[rank], rank);
    }
    RANDOM_ORDER_MAP = nextMap;
  }

  function getLocalDayBucket(timestamp) {
    if (!timestamp) return 0;
    const d = new Date(timestamp);
    if (Number.isNaN(d.getTime())) return 0;
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  }

  function compareWordsByOrder(a, b) {
    return (a.orderIndex ?? 0) - (b.orderIndex ?? 0);
  }

  function compareWordsByActiveOrder(a, b) {
    if (persistedState.randomOrder) {
      const ra = RANDOM_ORDER_MAP.has(a.id)
        ? RANDOM_ORDER_MAP.get(a.id)
        : (a.orderIndex ?? 0);
      const rb = RANDOM_ORDER_MAP.has(b.id)
        ? RANDOM_ORDER_MAP.get(b.id)
        : (b.orderIndex ?? 0);
      if (ra !== rb) return ra - rb;
    }
    return compareWordsByOrder(a, b);
  }

  // 신규 단어: 한 번도 학습하지 않은 단어 (lastStudied === null)
  function isNewWordProgress(progress) {
    return progress.lastStudied === null;
  }

  // 복습(레벨 1~2) 집중 대상: 한두 번 맞혔지만 아직 level 3 마스터 미만
  function isReviewLevelProgress(progress) {
    return progress.level >= 1 && progress.level < MAX_LEVEL;
  }

  // 오답 집중 공략 탭: wrongCount >= 1 이면서 아직 level < 3 인 단어
  function isWrongFocusTarget(wordId) {
    const progress = getWordProgress(wordId);
    return progress.wrongCount >= 1 && progress.level < MAX_LEVEL;
  }

  // 집중 암기 대상: wrongCount >= 3 이면서 아직 level < 3 인 단어 (표시·필터 전용, 알고리즘 동일)
  function isFocusMemorizeProgress(progress) {
    return Boolean(
      progress &&
        progress.wrongCount >= FOCUS_WRONG_THRESHOLD &&
        progress.level < MAX_LEVEL,
    );
  }

  // 오답노트 보관함 & 누적 오답: wrongCount >= 1 인 단어
  function isWrongArchiveTarget(wordId) {
    return getWordProgress(wordId).wrongCount >= 1;
  }

  function getActiveDeckWrongArchiveWords() {
    return getActiveDeckWords().filter((word) => isWrongArchiveTarget(word.id));
  }

  function getArchiveFilteredWords() {
    const words = getActiveDeckWrongArchiveWords();
    if (session.streamFilter === "bookmarked") {
      return words.filter((word) => getWordProgress(word.id).bookmarked);
    }
    return words;
  }

  function isWordEligibleForCurrentStream(word, tab = session.activeTab) {
    const p = getWordProgress(word.id);
    if (tab === "wrong-study") {
      if (!isWrongFocusTarget(word.id)) return false;
      if (
        session.wrongStudyScope === "focus" &&
        !isFocusMemorizeProgress(p)
      ) {
        return false;
      }
      if (session.streamFilter === "bookmarked") return p.bookmarked;
      return true;
    }
    if (tab === "wrong-archive") {
      if (!isWrongArchiveTarget(word.id)) return false;
      if (session.streamFilter === "bookmarked") return p.bookmarked;
      return true;
    }

    // Main study tab: 상태별 스트림 필터 적용
    if (session.streamFilter === "new-only") {
      return isNewWordProgress(p);
    }
    if (session.streamFilter === "review-only") {
      return isReviewLevelProgress(p);
    }
    if (session.streamFilter === "bookmarked") {
      return p.bookmarked;
    }
    // smart-mix (기본): 복습 필요(level 1~2 또는 오답/학습 기록) + 미학습 신규(level 0)
    return p.level < MAX_LEVEL;
  }

  function getTotalEligibleCount(tab = session.activeTab) {
    return getActiveDeckWords().filter((word) =>
      isWordEligibleForCurrentStream(word, tab),
    ).length;
  }

  function getDeckStep(deckKey) {
    if (!persistedState.deckSteps || typeof persistedState.deckSteps !== "object") {
      persistedState.deckSteps = {};
    }
    return persistedState.deckSteps[deckKey] || 0;
  }

  function incrementDeckStep(deckKey) {
    if (!deckKey) return 0;
    const nextStep = getDeckStep(deckKey) + 1;
    persistedState.deckSteps[deckKey] = nextStep;
    return nextStep;
  }

  function isScheduledReviewDue(word, progress = getWordProgress(word.id)) {
    if (!progress || (progress.level !== 1 && progress.level !== 2)) {
      return false;
    }
    if (progress.dueStep === null || progress.dueStep === undefined) {
      return true;
    }
    return getDeckStep(word.deckKey) >= progress.dueStep;
  }

  function getDeckRemainingUnmasteredCount(deckKey) {
    const deck = DECK_MAP.get(deckKey);
    const list = deck ? deck.words : getActiveDeckWords();
    let count = 0;
    for (const w of list) {
      if (getWordProgress(w.id).level < MAX_LEVEL) {
        count += 1;
      }
    }
    return count;
  }

  function computeLv1FutureDelay(remainingUnmastered) {
    if (remainingUnmastered >= LV1_SHRINK_THRESHOLD) {
      return (
        LV1_DELAY_MIN +
        Math.floor(Math.random() * (LV1_DELAY_MAX - LV1_DELAY_MIN + 1))
      );
    }
    const safeRemaining = Math.max(1, remainingUnmastered);
    const minDelay = Math.max(4, Math.floor(safeRemaining * 0.25));
    const maxDelay = Math.max(minDelay, Math.floor(safeRemaining * 0.6));
    return minDelay + Math.floor(Math.random() * (maxDelay - minDelay + 1));
  }

  function computeLv2FutureDelay(remainingUnmastered) {
    if (remainingUnmastered >= LV2_SHRINK_THRESHOLD) {
      return (
        LV2_DELAY_MIN +
        Math.floor(Math.random() * (LV2_DELAY_MAX - LV2_DELAY_MIN + 1))
      );
    }
    const safeRemaining = Math.max(1, remainingUnmastered);
    const minDelay = Math.max(6, Math.floor(safeRemaining * 0.35));
    const maxDelay = Math.max(minDelay, Math.floor(safeRemaining * 1.0));
    return minDelay + Math.floor(Math.random() * (maxDelay - minDelay + 1));
  }

  function sortByDueStep(list) {
    return list.sort((a, b) => {
      const pa = getWordProgress(a.id);
      const pb = getWordProgress(b.id);
      const aDue = pa.dueStep ?? 0;
      const bDue = pb.dueStep ?? 0;
      if (aDue !== bDue) return aDue - bDue;
      return compareWordsByActiveOrder(a, b);
    });
  }

  function sortReviewCandidates(list, preferExcludeId = null) {
    const isRandom = Boolean(persistedState.randomOrder);
    return list.sort((a, b) => {
      if (preferExcludeId !== null) {
        const aLast = a.id === preferExcludeId ? 1 : 0;
        const bLast = b.id === preferExcludeId ? 1 : 0;
        if (aLast !== bLast) return aLast - bLast;
      }
      const pa = getWordProgress(a.id);
      const pb = getWordProgress(b.id);

      // Guarantee 1-to-1 sweep without repeats before all eligible cards are seen once
      const aSeen = session.passedInStream.has(a.id) ? 1 : 0;
      const bSeen = session.passedInStream.has(b.id) ? 1 : 0;
      if (aSeen !== bSeen) return aSeen - bSeen;

      const aHasWrong = pa.wrongCount >= 1 ? 1 : 0;
      const bHasWrong = pb.wrongCount >= 1 ? 1 : 0;
      if (bHasWrong !== aHasWrong) return bHasWrong - aHasWrong;
      if (pb.wrongCount !== pa.wrongCount) return pb.wrongCount - pa.wrongCount;
      if (pa.level !== pb.level) return pa.level - pb.level;

      if (isRandom) {
        const aDay = getLocalDayBucket(pa.lastStudied);
        const bDay = getLocalDayBucket(pb.lastStudied);
        if (aDay !== bDay) return aDay - bDay;
        return compareWordsByActiveOrder(a, b);
      }

      const aTime = pa.lastStudied ?? 0;
      const bTime = pb.lastStudied ?? 0;
      if (aTime !== bTime) return aTime - bTime;
      return compareWordsByOrder(a, b);
    });
  }

  function buildNextStreamBatch(options = {}) {
    const {
      excludeIds = new Set(),
      preferExcludeId = null,
      batchSize = STREAM_BATCH_SIZE,
      tab = session.activeTab,
    } = options;

    const deckWords = getActiveDeckWords();
    const available = deckWords.filter(
      (word) =>
        !excludeIds.has(word.id) && isWordEligibleForCurrentStream(word, tab),
    );

    if (available.length === 0) return [];

    // If every available eligible card has been passed once in this sweep, start a clean next pass
    if (
      session.passedInStream.size > 0 &&
      available.every((w) => session.passedInStream.has(w.id))
    ) {
      session.passedInStream.clear();
    }

    // 오답 집중 공략 탭
    if (tab === "wrong-study") {
      return sortReviewCandidates([...available], preferExcludeId)
        .slice(0, batchSize)
        .map((w) => w.id);
    }

    // 신규 단어 집중: 미학습 단어 1:1 순서 (등록 순서 또는 결정적 랜덤 순서)
    if (session.streamFilter === "new-only") {
      return [...available]
        .sort(compareWordsByActiveOrder)
        .slice(0, batchSize)
        .map((w) => w.id);
    }

    // 북마크 스트림
    if (session.streamFilter === "bookmarked") {
      return sortReviewCandidates([...available], preferExcludeId)
        .slice(0, batchSize)
        .map((w) => w.id);
    }

    // 복습(레벨 1~2) 집중: 도래한 Lv.1~2 우선 → 미래 예약 Lv.1~2(빠른 예약순)
    if (session.streamFilter === "review-only") {
      const dueNow = [];
      const pendingScheduled = [];

      for (const word of available) {
        const p = getWordProgress(word.id);
        if (
          (p.level === 1 || p.level === 2) &&
          !isScheduledReviewDue(word, p)
        ) {
          pendingScheduled.push(word);
        } else {
          dueNow.push(word);
        }
      }

      const ordered = [
        ...sortReviewCandidates(dueNow, preferExcludeId),
        ...sortByDueStep(pendingScheduled),
      ];
      return ordered.slice(0, batchSize).map((w) => w.id);
    }

    // 스마트 믹스 v3 (점진적 확장 간격):
    // - Lv.1 (40~80장 뒤 예약), Lv.2 (100~220장 뒤 예약) 모두 dueStep 도달 전까지 숨김
    // - 도래한 Lv.2(배치당 최대 5장 우선) + 오답/도래한 Lv.1 복습 2 : 신규 1 비율 혼합
    // - 일반 풀 소진 시 후반부 Fallback(가장 빨리 도래할 예약 Lv.1/Lv.2)
    const dueLv2 = [];
    const dueLv1 = [];
    const immediateWrong = [];
    const pendingScheduled = [];
    const newTier = [];

    for (const word of available) {
      const p = getWordProgress(word.id);
      if (p.level === 2) {
        if (isScheduledReviewDue(word, p)) {
          dueLv2.push(word);
        } else {
          pendingScheduled.push(word);
        }
      } else if (p.level === 1) {
        if (isScheduledReviewDue(word, p)) {
          dueLv1.push(word);
        } else {
          pendingScheduled.push(word);
        }
      } else if (p.wrongCount >= 1 || hasStudyHistory(p)) {
        immediateWrong.push(word);
      } else {
        newTier.push(word);
      }
    }

    sortByDueStep(dueLv2);
    sortByDueStep(dueLv1);
    sortByDueStep(pendingScheduled);
    sortReviewCandidates(immediateWrong, preferExcludeId);
    newTier.sort(compareWordsByActiveOrder);

    // Combine regular due reviews (Lv.0 wrong + due Lv.1) and weave capped dueLv2 gently
    const regularReview = [...immediateWrong, ...dueLv1];
    const reviewPool = [];
    const primaryLv2Count = Math.min(dueLv2.length, LV2_MAX_PER_BATCH);
    const primaryLv2 = dueLv2.slice(0, primaryLv2Count);
    const overflowLv2 = dueLv2.slice(primaryLv2Count);

    let lv2Idx = 0;
    let regIdx = 0;
    while (lv2Idx < primaryLv2.length || regIdx < regularReview.length) {
      if (lv2Idx < primaryLv2.length) {
        reviewPool.push(primaryLv2[lv2Idx]);
        lv2Idx += 1;
      }
      for (let k = 0; k < 2 && regIdx < regularReview.length; k += 1) {
        reviewPool.push(regularReview[regIdx]);
        regIdx += 1;
      }
    }
    if (overflowLv2.length > 0) {
      reviewPool.push(...overflowLv2);
    }

    // Mix reviewPool (2) : newTier (1)
    const mixed = [];
    let r = 0;
    let n = 0;
    while (
      mixed.length < batchSize &&
      (r < reviewPool.length || n < newTier.length)
    ) {
      for (
        let k = 0;
        k < 2 && r < reviewPool.length && mixed.length < batchSize;
        k += 1
      ) {
        mixed.push(reviewPool[r].id);
        r += 1;
      }
      if (n < newTier.length && mixed.length < batchSize) {
        mixed.push(newTier[n].id);
        n += 1;
      }
    }

    // End-of-Deck Fallback: Pull earliest-due pending Lv.1/Lv.2 cards so deck never stalls
    if (mixed.length < batchSize && pendingScheduled.length > 0) {
      for (const word of pendingScheduled) {
        if (mixed.length >= batchSize) break;
        mixed.push(word.id);
      }
    }

    return mixed;
  }

  function refillStreamIfNeeded(
    justRatedId = null,
    forceExcludeRated = false,
    minQueueLength = STREAM_REFILL_THRESHOLD + 1,
  ) {
    if (session.activeTab === "wrong-archive") return;
    const requiredLength = Math.max(
      STREAM_REFILL_THRESHOLD + 1,
      Math.floor(Number(minQueueLength) || 0),
    );
    if (session.queue.length >= requiredLength) return;

    const excludeIds = new Set(session.queue);
    // 큐에 다른 카드가 남아 있거나, 방금 틀린 카드를 별도로 재삽입할 예정이면 중복 방지
    if (justRatedId !== null && (forceExcludeRated || session.queue.length > 0)) {
      excludeIds.add(justRatedId);
    }

    const batchSize = Math.max(
      STREAM_BATCH_SIZE,
      requiredLength - session.queue.length,
    );

    let nextBatch = buildNextStreamBatch({
      excludeIds,
      preferExcludeId: justRatedId,
      batchSize,
    });

    // 큐가 완전히 비었고 방금 통과한 단어가 유일한 미마스터 후보라면 자연스럽게 이어 붙임
    if (
      nextBatch.length === 0 &&
      session.queue.length === 0 &&
      !forceExcludeRated &&
      justRatedId !== null
    ) {
      nextBatch = buildNextStreamBatch({
        excludeIds: new Set(),
        preferExcludeId: justRatedId,
        batchSize: STREAM_BATCH_SIZE,
      });
    }

    if (nextBatch.length > 0) {
      session.queue.push(...nextBatch);
    }
  }

  function cancelPendingFlyOut() {
    if (session.flyOutTimer) {
      clearTimeout(session.flyOutTimer);
      session.flyOutTimer = null;
    }
    session.isAnimating = false;
  }

  function buildSessionQueue(options = {}) {
    const {
      preserveCurrentWordId = null,
      shuffle = false,
      preservePassed = false,
    } = options;
    cancelPendingFlyOut();
    if (!preservePassed) {
      session.passedInStream.clear();
    }

    let ids = buildNextStreamBatch({
      excludeIds: new Set(),
      batchSize: STREAM_BATCH_SIZE,
    });

    if (shuffle && ids.length > 1) {
      ids = fisherYatesShuffle(ids);
    }

    session.queue = ids;
    session.isFlipped = false;

    if (preserveCurrentWordId !== null) {
      const preservedIdx = ids.indexOf(preserveCurrentWordId);
      session.currentIndex = preservedIdx >= 0 ? preservedIdx : 0;
    } else {
      session.currentIndex = 0;
    }
  }

  function startMasteredFreeReview() {
    const deckWords = getActiveDeckWords();
    if (deckWords.length === 0) return;

    cancelPendingFlyOut();
    const ids = fisherYatesShuffle(deckWords.map((w) => w.id)).slice(
      0,
      STREAM_BATCH_SIZE,
    );
    session.queue = ids;
    session.currentIndex = 0;
    session.isFlipped = false;
    renderAll({ animateEnter: true });
    showToast("마스터한 단어 가볍게 복습을 시작합니다.");
  }

  function fisherYatesShuffle(list) {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function getCurrentWord() {
    if (session.queue.length === 0) return null;
    const wordId = session.queue[session.currentIndex];
    return WORD_MAP.get(wordId) || null;
  }

  function syncRandomOrderUI() {
    const isRandom = Boolean(persistedState.randomOrder);
    if (dom.randomOrderToggle) {
      dom.randomOrderToggle.checked = isRandom;
    }
    if (dom.randomOrderControl) {
      dom.randomOrderControl.classList.toggle("is-random", isRandom);
    }
    if (dom.randomOrderHint) {
      dom.randomOrderHint.textContent = isRandom
        ? "테마 전체 1:1 무작위 순서"
        : "등록 순서대로";
    }
    if (dom.shuffleBtnText) {
      dom.shuffleBtnText.textContent = isRandom ? "다시 섞기" : "셔플";
    }
    if (dom.shuffleBtn) {
      dom.shuffleBtn.title = isRandom
        ? "테마 전체를 새로운 1:1 랜덤 순서로 다시 섞기"
        : "현재 대기 카드 순서 섞기";
    }
  }

  function toggleRandomOrder(enabled) {
    const nextRandom = Boolean(enabled);
    persistedState.randomOrder = nextRandom;

    if (nextRandom) {
      if (!persistedState.randomSeed || RANDOM_ORDER_MAP.size !== WORDS.length) {
        persistedState.randomSeed = createRandomSeed();
        rebuildRandomOrderMap();
      }
    }

    savePersistedState({ markUpdated: false, syncCloud: false });
    syncRandomOrderUI();
    clearSwipeClasses();
    resetCardFlipInstant();

    if (session.activeTab !== "wrong-archive") {
      buildSessionQueue({ preservePassed: true });
    }

    renderAll({ animateEnter: session.activeTab !== "wrong-archive" });
    showToast(
      nextRandom
        ? "랜덤 순서 모드로 전환했습니다. (1:1 무작위)"
        : "등록 순서대로 모드로 전환했습니다.",
    );
  }

  function shuffleCurrentSession() {
    if (persistedState.randomOrder) {
      const totalEligible = getTotalEligibleCount();
      if (totalEligible <= 1) {
        showToast("셔플할 카드가 충분하지 않습니다.");
        return;
      }

      const prevFirstId = session.queue[0] || null;
      let attempts = 0;
      do {
        persistedState.randomSeed = createRandomSeed();
        rebuildRandomOrderMap();
        buildSessionQueue();
        attempts += 1;
      } while (
        attempts < 5 &&
        prevFirstId !== null &&
        session.queue.length > 1 &&
        session.queue[0] === prevFirstId
      );

      savePersistedState({ markUpdated: false, syncCloud: false });
      resetCardFlipInstant();
      renderCurrentCard({ animateEnter: true });
      closeMobileMenu();
      showToast("테마 전체를 새로운 랜덤 순서로 섞었습니다.");
      return;
    }

    if (session.queue.length <= 1) {
      showToast("셔플할 카드가 충분하지 않습니다.");
      return;
    }

    const currentWord = getCurrentWord();
    const shuffled = fisherYatesShuffle(session.queue);

    // Avoid keeping the exact same first card if possible
    if (currentWord && shuffled.length > 1 && shuffled[0] === currentWord.id) {
      [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
    }

    session.queue = shuffled;
    session.currentIndex = 0;
    resetCardFlipInstant();
    renderCurrentCard({ animateEnter: true });
    closeMobileMenu();
    showToast("카드 순서를 무작위로 섞었습니다.");
  }

  /* ========================================================================
     7.5. Expandable Menu Sheet (Desktop Cloud Popover & Mobile Full Sheet)
     ======================================================================== */
  function syncMenuHeaderTitle() {
    if (!dom.mobileMenuTitle) return;
    if (!session.isMobileLayout) {
      dom.mobileMenuTitle.textContent = "클라우드 계정 동기화";
      return;
    }
    dom.mobileMenuTitle.textContent =
      session.menuView === "cloud"
        ? "클라우드 계정 동기화"
        : "학습 현황 · 설정";
  }

  function setMobileMenuView(nextView = "main") {
    const isCloudPage = Boolean(session.isMobileLayout && nextView === "cloud");
    session.menuView = isCloudPage ? "cloud" : "main";

    if (dom.mobileMenu) {
      dom.mobileMenu.classList.toggle("is-cloud-page", isCloudPage);
    }
    if (dom.mobileMenuBackBtn) {
      dom.mobileMenuBackBtn.hidden = !isCloudPage;
    }
    if (dom.mobileMenuBody) {
      dom.mobileMenuBody.scrollTop = 0;
    }
    syncMenuHeaderTitle();
  }

  function openMobileMenu(options = {}) {
    if (!dom.mobileMenu) return;
    if (session.menuCloseTimer) {
      clearTimeout(session.menuCloseTimer);
      session.menuCloseTimer = null;
    }

    const initialView = options && options.view === "cloud" ? "cloud" : "main";
    setMobileMenuView(initialView);
    session.isMenuOpen = true;
    dom.mobileMenu.hidden = false;
    if (dom.mobileMenuBackdrop) {
      dom.mobileMenuBackdrop.hidden = false;
    }
    // Force reflow so transition animates cleanly after removing hidden
    void dom.mobileMenu.offsetWidth;

    dom.mobileMenu.classList.add("is-open");
    dom.mobileMenu.setAttribute("aria-hidden", "false");
    if ("inert" in dom.mobileMenu) {
      dom.mobileMenu.inert = false;
    }
    if (dom.mobileMenuBackdrop) {
      dom.mobileMenuBackdrop.classList.add("is-open");
    }
    if (dom.mobileMenuBtn) {
      dom.mobileMenuBtn.classList.add("is-open");
      dom.mobileMenuBtn.setAttribute("aria-expanded", "true");
      dom.mobileMenuBtn.setAttribute("aria-label", "통계 및 설정 메뉴 닫기");
    }
    if (dom.cloudMenuBtn) {
      dom.cloudMenuBtn.classList.add("is-open");
      dom.cloudMenuBtn.setAttribute("aria-expanded", "true");
    }
    if (dom.mobileMenuBtnText) {
      dom.mobileMenuBtnText.textContent = "닫기";
    }
  }

  function closeMobileMenu(options = {}) {
    if (!dom.mobileMenu) return;
    const immediate = Boolean(options && options.immediate === true);

    if (session.menuCloseTimer) {
      clearTimeout(session.menuCloseTimer);
      session.menuCloseTimer = null;
    }

    session.isMenuOpen = false;
    dom.mobileMenu.classList.remove("is-open");
    dom.mobileMenu.setAttribute("aria-hidden", "true");
    if ("inert" in dom.mobileMenu) {
      dom.mobileMenu.inert = true;
    }
    if (dom.mobileMenuBackdrop) {
      dom.mobileMenuBackdrop.classList.remove("is-open");
    }
    if (dom.mobileMenuBtn) {
      dom.mobileMenuBtn.classList.remove("is-open");
      dom.mobileMenuBtn.setAttribute("aria-expanded", "false");
      dom.mobileMenuBtn.setAttribute("aria-label", "통계 및 설정 메뉴 열기");
    }
    if (dom.cloudMenuBtn) {
      dom.cloudMenuBtn.classList.remove("is-open");
      dom.cloudMenuBtn.setAttribute("aria-expanded", "false");
    }
    if (dom.mobileMenuBtnText) {
      dom.mobileMenuBtnText.textContent = "메뉴";
    }

    if (immediate) {
      dom.mobileMenu.hidden = true;
      if (dom.mobileMenuBackdrop) {
        dom.mobileMenuBackdrop.hidden = true;
      }
      setMobileMenuView("main");
      return;
    }

    session.menuCloseTimer = setTimeout(() => {
      if (!session.isMenuOpen) {
        dom.mobileMenu.hidden = true;
        if (dom.mobileMenuBackdrop) {
          dom.mobileMenuBackdrop.hidden = true;
        }
        setMobileMenuView("main");
      }
      session.menuCloseTimer = null;
    }, 340);
  }

  function toggleMobileMenu() {
    if (session.isMenuOpen) {
      closeMobileMenu();
    } else {
      openMobileMenu();
    }
  }

  function syncResponsiveMenuPlacement(isMobile) {
    session.isMobileLayout = Boolean(isMobile);
    if (!session.isMobileLayout) {
      setMobileMenuView("main");
    } else {
      syncMenuHeaderTitle();
    }

    if (session.isMobileLayout) {
      if (dom.deckSelector && dom.menuSlotDecks) {
        dom.menuSlotDecks.appendChild(dom.deckSelector);
      }
      if (dom.statsWidget && dom.menuSlotStats) {
        dom.menuSlotStats.appendChild(dom.statsWidget);
      }
      if (dom.filterWrapper && dom.menuSlotStudyControls) {
        dom.menuSlotStudyControls.appendChild(dom.filterWrapper);
      }
      if (dom.shuffleBtn && dom.menuSlotStudyControls) {
        dom.menuSlotStudyControls.appendChild(dom.shuffleBtn);
      }
      if (dom.randomOrderControl && dom.menuSlotStudyOrder) {
        dom.menuSlotStudyOrder.appendChild(dom.randomOrderControl);
      }
      if (dom.headerActions && dom.menuSlotAppActions) {
        dom.menuSlotAppActions.appendChild(dom.headerActions);
      }
      if (dom.mobileMenu) {
        dom.mobileMenu.hidden = !session.isMenuOpen;
        if ("inert" in dom.mobileMenu) {
          dom.mobileMenu.inert = !session.isMenuOpen;
        }
      }
      if (dom.mobileMenuBackdrop) {
        dom.mobileMenuBackdrop.hidden = !session.isMenuOpen;
      }
    } else {
      closeMobileMenu({ immediate: true });
      if (dom.headerActions && dom.headerInner && dom.importFileInput) {
        dom.headerInner.insertBefore(dom.headerActions, dom.importFileInput);
      }
      if (dom.statsWidget && dom.appContainer && dom.navigationBar) {
        dom.appContainer.insertBefore(dom.statsWidget, dom.navigationBar);
      }
      if (dom.deckSelector && dom.appContainer && dom.statsWidget) {
        dom.appContainer.insertBefore(dom.deckSelector, dom.statsWidget);
      }
      if (dom.filterWrapper && dom.navigationBar) {
        dom.navigationBar.appendChild(dom.filterWrapper);
      }
      if (dom.deckMetaRight) {
        if (dom.randomOrderControl) {
          dom.deckMetaRight.appendChild(dom.randomOrderControl);
        }
        if (dom.shuffleBtn) {
          dom.deckMetaRight.appendChild(dom.shuffleBtn);
        }
      }
    }

    renderViewVisibility();
  }

  function renderDeckSelector() {
    if (!dom.deckSelector) return;

    const fragment = document.createDocumentFragment();
    const entries = [
      { key: "all", title: "전체", count: WORDS.length },
      ...DECKS.map((deck) => ({
        key: deck.key,
        title: deck.title,
        count: deck.words.length,
      })),
    ];

    for (const entry of entries) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "deck-pill-btn";
      btn.dataset.deck = entry.key;

      const isActive = session.activeDeck === entry.key;
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-pressed", String(isActive));

      const labelSpan = document.createElement("span");
      labelSpan.textContent = entry.title;

      const countSpan = document.createElement("span");
      countSpan.className = "deck-pill-count";
      countSpan.textContent = String(entry.count);

      btn.append(labelSpan, countSpan);
      fragment.appendChild(btn);
    }

    dom.deckSelector.innerHTML = "";
    dom.deckSelector.appendChild(fragment);
  }

  function getStreamFilterLabel(filter = session.streamFilter) {
    if (filter === "new-only") return "신규 단어 집중";
    if (filter === "review-only") return "복습(레벨 1~2) 집중";
    if (filter === "bookmarked") return "북마크 단어";
    return "스마트 믹스";
  }

  function renderStreamFilterOptions() {
    if (!dom.streamFilter) return;

    const deckWords = getActiveDeckWords();
    let smartCount = 0;
    let newCount = 0;
    let reviewCount = 0;
    let bookmarkedCount = 0;

    for (const word of deckWords) {
      const p = getWordProgress(word.id);
      if (p.level < MAX_LEVEL) smartCount += 1;
      if (isNewWordProgress(p)) newCount += 1;
      if (isReviewLevelProgress(p)) reviewCount += 1;
      if (p.bookmarked) bookmarkedCount += 1;
    }

    if (!VALID_STREAM_FILTERS.has(session.streamFilter)) {
      session.streamFilter = "smart-mix";
    }

    const options = [
      { value: "smart-mix", text: `스마트 믹스 (${smartCount})` },
      { value: "new-only", text: `신규 단어 집중 (${newCount})` },
      { value: "review-only", text: `복습(레벨 1~2) 집중 (${reviewCount})` },
      { value: "bookmarked", text: `북마크 단어 (${bookmarkedCount})` },
    ];

    const fragment = document.createDocumentFragment();
    for (const item of options) {
      const opt = document.createElement("option");
      opt.value = item.value;
      opt.textContent = item.text;
      fragment.appendChild(opt);
    }

    dom.streamFilter.innerHTML = "";
    dom.streamFilter.appendChild(fragment);
    dom.streamFilter.value = session.streamFilter;
  }

  function triggerPaceBump() {
    if (session.paceBumpTimer) {
      clearTimeout(session.paceBumpTimer);
    }
    const targets = [dom.paceChip, dom.mobileStatusPill].filter(Boolean);
    for (const el of targets) {
      el.classList.remove("is-bumping");
      void el.offsetWidth;
      el.classList.add("is-bumping");
    }
    session.paceBumpTimer = setTimeout(() => {
      for (const el of targets) {
        el.classList.remove("is-bumping");
      }
      session.paceBumpTimer = null;
    }, 340);
  }

  function renderMobileHeaderStatus() {
    if (!dom.mobileStatusPill || !dom.mobileProgressText) return;

    const todayPassed = getTodayCountForDeck(session.activeDeck);
    const isDeckFiltered = session.activeDeck !== "all";
    const isModeFiltered = session.streamFilter !== "smart-mix";
    const isRandomOrder = Boolean(persistedState.randomOrder);
    const isFocusScope =
      session.activeTab === "wrong-study" &&
      session.wrongStudyScope === "focus";
    const isMenuFiltered = isDeckFiltered || isModeFiltered || isRandomOrder;
    const isFiltered = isMenuFiltered || isFocusScope;

    dom.mobileStatusPill.classList.toggle("has-filter", isFiltered);
    dom.mobileStatusPill.classList.toggle(
      "has-pace",
      session.activeTab !== "wrong-archive" && todayPassed > 0,
    );

    if (dom.mobileFilterTag) {
      const parts = [];
      if (isDeckFiltered) {
        parts.push(getActiveDeckTitle());
      }
      if (isFocusScope) {
        parts.push("집중 암기");
      }
      if (session.streamFilter === "new-only") {
        parts.push("신규");
      } else if (session.streamFilter === "review-only") {
        parts.push("복습");
      } else if (session.streamFilter === "bookmarked") {
        parts.push("★ 북마크");
      }
      if (isRandomOrder) {
        parts.push("랜덤");
      }

      if (parts.length > 0) {
        dom.mobileFilterTag.textContent = parts.join(" ");
        dom.mobileFilterTag.hidden = false;
      } else {
        dom.mobileFilterTag.textContent = "";
        dom.mobileFilterTag.hidden = true;
      }
    }

    if (dom.mobileMenuDot) {
      dom.mobileMenuDot.hidden = !isMenuFiltered;
    }

    if (session.activeTab === "wrong-archive") {
      const count = getArchiveFilteredWords().length;
      dom.mobileProgressText.textContent = `오답 ${count}단어`;
    } else {
      dom.mobileProgressText.textContent = `오늘 +${todayPassed}`;
    }
  }

  /* ========================================================================
     8. Rendering Functions
     ======================================================================== */
  function renderStats() {
    ensureTodayStats();
    const deckWords = getActiveDeckWords();
    const totalWords = deckWords.length;
    let masteredCount = 0;
    let wrongFocusCount = 0;
    let wrongArchiveCount = 0;

    for (const word of deckWords) {
      const progress = getWordProgress(word.id);
      if (progress.level >= MAX_LEVEL) masteredCount += 1;
      if (isWrongFocusTarget(word.id)) wrongFocusCount += 1;
      if (isWrongArchiveTarget(word.id)) wrongArchiveCount += 1;
    }

    const masteryPercent =
      totalWords > 0 ? Math.round((masteredCount / totalWords) * 100) : 0;
    const todayPassed = getTodayCountForDeck(session.activeDeck);

    dom.statTodayCount.textContent = `+${todayPassed}`;
    if (dom.paceChip) {
      dom.paceChip.textContent = `오늘 +${todayPassed}`;
      dom.paceChip.classList.toggle("has-pace", todayPassed > 0);
    }
    if (dom.statMasteryLabel) {
      dom.statMasteryLabel.textContent =
        session.activeDeck === "all"
          ? "전체 마스터"
          : `${getActiveDeckTitle()} 마스터`;
    }
    dom.statMasteryText.textContent = `${masteryPercent}% (${masteredCount}/${totalWords})`;
    dom.statMasteryBar.style.width = `${masteryPercent}%`;
    if (dom.headerMasteryBar) {
      dom.headerMasteryBar.style.width = `${masteryPercent}%`;
    }
    dom.statMasteryTrack.setAttribute("aria-valuenow", String(masteryPercent));
    dom.statWrongCount.textContent = String(wrongArchiveCount);

    // Update segmented tab badges
    const updateBadge = (el, count) => {
      if (!el) return;
      el.textContent = String(count);
      el.hidden = count === 0;
    };
    updateBadge(dom.tabWrongStudyCount, wrongFocusCount);
    updateBadge(dom.tabArchiveCount, wrongArchiveCount);

    renderStreamFilterOptions();
    renderWrongStudySubnav();
    renderMobileHeaderStatus();
  }

  function renderWrongStudySubnav() {
    if (!dom.wrongStudySubnav) return;

    const isWrongStudy = session.activeTab === "wrong-study";
    dom.wrongStudySubnav.hidden = !isWrongStudy;

    const deckWords = getActiveDeckWords();
    const bookmarkedOnly = session.streamFilter === "bookmarked";
    let allWrongCount = 0;
    let focusWrongCount = 0;

    for (const word of deckWords) {
      const p = getWordProgress(word.id);
      if (bookmarkedOnly && !p.bookmarked) continue;
      if (p.wrongCount >= 1 && p.level < MAX_LEVEL) {
        allWrongCount += 1;
        if (isFocusMemorizeProgress(p)) {
          focusWrongCount += 1;
        }
      }
    }

    if (dom.wrongScopeAllCount) {
      dom.wrongScopeAllCount.textContent = String(allWrongCount);
    }
    if (dom.wrongScopeFocusCount) {
      dom.wrongScopeFocusCount.textContent = String(focusWrongCount);
    }

    dom.wrongScopeButtons.forEach((btn) => {
      const isActive = btn.dataset.wrongScope === session.wrongStudyScope;
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-pressed", String(isActive));
    });
  }

  function updateSegmentedIndicator() {
    const activeIndex = Math.max(0, TAB_ORDER.indexOf(session.activeTab));
    dom.segmentedIndicator.style.transform = `translateX(${activeIndex * 100}%)`;

    dom.tabButtons.forEach((btn) => {
      const isActive = btn.dataset.tab === session.activeTab;
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-selected", String(isActive));
    });
  }

  function renderViewVisibility() {
    const isArchive = session.activeTab === "wrong-archive";
    dom.studyView.hidden = isArchive;
    dom.archiveView.hidden = !isArchive;
    if (dom.wrongStudySubnav) {
      dom.wrongStudySubnav.hidden = session.activeTab !== "wrong-study";
    }

    if (dom.shuffleBtn) {
      dom.shuffleBtn.hidden = session.isMobileLayout && isArchive;
    }

    if (!isArchive) {
      const tabId =
        session.activeTab === "wrong-study" ? "tabWrongStudy" : "tabAll";
      dom.studyView.setAttribute("aria-labelledby", tabId);
    }
  }

  function resetCardFlipInstant() {
    session.isFlipped = false;
    if (!dom.flashcardInner) return;

    dom.flashcardInner.style.transition = "none";
    dom.flashcard.classList.remove("is-flipped");
    dom.flashcard.setAttribute("aria-pressed", "false");
    void dom.flashcardInner.offsetWidth;
    dom.flashcardInner.style.transition = "";
  }

  function clearSwipeClasses() {
    dom.flashcard.classList.remove(
      "is-dragging",
      "swiping-left",
      "swiping-right",
      "fly-out-left",
      "fly-out-right",
    );
    dom.flashcard.style.removeProperty("--swipe-x");
    dom.flashcard.style.removeProperty("--swipe-y");
    dom.flashcard.style.removeProperty("--swipe-rot");
    dom.flashcard.style.removeProperty("--swipe-tint");
  }

  function triggerCardEnterAnimation() {
    if (session.enterTimer) {
      clearTimeout(session.enterTimer);
    }
    dom.flashcard.classList.remove("is-entering");
    void dom.flashcard.offsetWidth;
    dom.flashcard.classList.add("is-entering");

    session.enterTimer = setTimeout(() => {
      dom.flashcard.classList.remove("is-entering");
      session.enterTimer = null;
    }, ENTER_ANIMATION_MS);
  }

  function renderCurrentCard(options = {}) {
    const { animateEnter = false } = options;

    const isWrongMode = session.activeTab === "wrong-study";
    const isFocusMode = isWrongMode && session.wrongStudyScope === "focus";
    const modeLabel = isWrongMode
      ? isFocusMode
        ? "오답 집중 공략 · 집중 암기"
        : "오답 집중 공략"
      : getStreamFilterLabel(session.streamFilter);
    const badgeParts = [];
    if (session.activeDeck !== "all") {
      badgeParts.push(getActiveDeckTitle());
    }
    badgeParts.push(modeLabel);
    if (persistedState.randomOrder) {
      badgeParts.push("랜덤");
    }
    dom.deckModeBadge.textContent = badgeParts.join(" · ");
    dom.deckModeBadge.classList.toggle("is-wrong-mode", isWrongMode);

    const word = getCurrentWord();
    const hasWords = Boolean(word);
    const totalEligible = getTotalEligibleCount();

    dom.flashcardStage.hidden = !hasWords;
    dom.controlBar.hidden = !hasWords;
    dom.studyEmptyState.hidden = hasWords;
    dom.shuffleBtn.disabled = session.queue.length <= 1;

    if (!hasWords) {
      const deckWords = getActiveDeckWords();
      const deckName =
        session.activeDeck === "all"
          ? "전체 단어장"
          : `${getActiveDeckTitle()} 단어장`;

      dom.cardProgressText.textContent = "남은 단어 없음";

      if (
        !isWrongMode &&
        session.streamFilter === "smart-mix" &&
        deckWords.length > 0
      ) {
        dom.studyEmptyState.classList.add("is-complete");
        dom.studyEmptyTitle.textContent = `${deckName} 마스터 완료!`;
        dom.studyEmptyDesc.textContent = `모든 단어가 Lv.3 마스터에 도달했습니다. 원할 때 마스터 단어를 가볍게 복습하거나 다른 단어장으로 이동해 보세요.`;
        if (dom.restartSessionBtn) {
          dom.restartSessionBtn.hidden = false;
          dom.restartSessionBtn.textContent = "마스터 단어 가볍게 복습";
        }
        if (session.activeDeck !== "all") {
          dom.returnToAllBtn.hidden = false;
          dom.returnToAllBtn.className = "secondary-pill-btn";
          dom.returnToAllBtn.textContent = "전체 단어장 보기";
        } else {
          dom.returnToAllBtn.hidden = true;
        }
      } else if (isFocusMode) {
        const hasAnyWrongInDeck = getActiveDeckWords().some((w) => {
          const wp = getWordProgress(w.id);
          if (session.streamFilter === "bookmarked" && !wp.bookmarked) {
            return false;
          }
          return isWrongFocusTarget(w.id);
        });
        dom.studyEmptyState.classList.add("is-complete");
        dom.studyEmptyTitle.textContent = "집중 암기 단어가 없습니다";
        dom.studyEmptyDesc.textContent =
          "3회 이상 틀린 미마스터(Lv.3 미만) 단어가 이곳에 자동으로 모입니다.";
        if (dom.restartSessionBtn) {
          dom.restartSessionBtn.hidden = true;
        }
        dom.returnToAllBtn.hidden = false;
        dom.returnToAllBtn.className = "primary-pill-btn";
        dom.returnToAllBtn.textContent = hasAnyWrongInDeck
          ? "전체 오답 보기"
          : "스마트 믹스로 이동";
      } else if (isWrongMode) {
        dom.studyEmptyState.classList.add("is-complete");
        dom.studyEmptyTitle.textContent = "공략할 오답 단어가 없습니다";
        dom.studyEmptyDesc.textContent =
          "현재 단어장에 미마스터(Lv.3 미만) 오답 단어가 없습니다. 스마트 믹스 스트림에서 학습을 이어가 보세요.";
        if (dom.restartSessionBtn) {
          dom.restartSessionBtn.hidden = true;
        }
        dom.returnToAllBtn.hidden = false;
        dom.returnToAllBtn.className = "primary-pill-btn";
        dom.returnToAllBtn.textContent = "스마트 믹스로 이동";
      } else if (session.streamFilter === "new-only") {
        dom.studyEmptyState.classList.add("is-complete");
        dom.studyEmptyTitle.textContent = "신규 단어를 모두 학습했습니다!";
        dom.studyEmptyDesc.textContent = `${deckName}의 모든 신규 단어를 한 번 이상 확인했습니다. 스마트 믹스나 복습 집중 모드로 Lv.3 마스터를 완성해 보세요.`;
        if (dom.restartSessionBtn) {
          dom.restartSessionBtn.hidden = true;
        }
        dom.returnToAllBtn.hidden = false;
        dom.returnToAllBtn.className = "primary-pill-btn";
        dom.returnToAllBtn.textContent = "스마트 믹스로 전환";
      } else if (session.streamFilter === "review-only") {
        dom.studyEmptyState.classList.remove("is-complete");
        dom.studyEmptyTitle.textContent = "복습할 레벨 1~2 단어가 없습니다";
        dom.studyEmptyDesc.textContent =
          "스마트 믹스나 신규 단어 집중 모드에서 단어를 통과시키면 레벨 1~2 복습 스트림에 자동으로 모입니다.";
        if (dom.restartSessionBtn) {
          dom.restartSessionBtn.hidden = true;
        }
        dom.returnToAllBtn.hidden = false;
        dom.returnToAllBtn.className = "primary-pill-btn";
        dom.returnToAllBtn.textContent = "스마트 믹스로 전환";
      } else if (session.streamFilter === "bookmarked") {
        dom.studyEmptyState.classList.remove("is-complete");
        dom.studyEmptyTitle.textContent = "북마크한 단어가 없습니다";
        dom.studyEmptyDesc.textContent =
          "학습 중 카드 우측 상단의 별표(B)를 눌러 중요 단어를 북마크해 보세요.";
        if (dom.restartSessionBtn) {
          dom.restartSessionBtn.hidden = true;
        }
        dom.returnToAllBtn.hidden = false;
        dom.returnToAllBtn.className = "primary-pill-btn";
        dom.returnToAllBtn.textContent = "스마트 믹스로 전환";
      } else {
        dom.studyEmptyState.classList.remove("is-complete");
        dom.studyEmptyTitle.textContent = "학습할 단어가 없습니다";
        dom.studyEmptyDesc.textContent =
          "다른 단어장이나 학습 스트림 모드를 선택해 보세요.";
        if (dom.restartSessionBtn) {
          dom.restartSessionBtn.hidden = true;
        }
        dom.returnToAllBtn.hidden = false;
        dom.returnToAllBtn.className = "primary-pill-btn";
        dom.returnToAllBtn.textContent = "스마트 믹스로 이동";
      }

      renderMobileHeaderStatus();
      return;
    }

    dom.studyEmptyState.classList.remove("is-complete");
    if (dom.restartSessionBtn) {
      dom.restartSessionBtn.hidden = true;
    }

    const progress = getWordProgress(word.id);
    const isFocusWord = isFocusMemorizeProgress(progress);

    dom.cardProgressText.textContent =
      totalEligible > 0
        ? `남은 후보 ${totalEligible}단어`
        : `자유 복습 ${session.queue.length}장`;

    // Front face
    if (dom.cardDeckBadge) {
      dom.cardDeckBadge.textContent = word.deckTitle;
    }
    dom.cardPos.textContent = word.pos;
    if (dom.cardLeechBadge) {
      dom.cardLeechBadge.hidden = !isFocusWord;
    }
    dom.cardWord.textContent = word.word;
    dom.cardPhonetic.textContent = word.phonetic;

    const lastStudiedLabel = formatLastStudied(progress.lastStudied);
    renderLevelDots(dom.cardLevelDots, progress.level);
    if (dom.cardLastStudied) {
      dom.cardLastStudied.textContent = lastStudiedLabel;
    }
    if (dom.cardMasteryMeta) {
      dom.cardMasteryMeta.setAttribute(
        "aria-label",
        `숙련도 ${progress.level}단계 / ${MAX_LEVEL}단계 · ${lastStudiedLabel}`,
      );
    }

    dom.bookmarkBtn.classList.toggle("is-bookmarked", progress.bookmarked);
    dom.bookmarkBtn.setAttribute("aria-pressed", String(progress.bookmarked));

    // Back face
    dom.cardBackWord.textContent = word.word;
    dom.cardBackPos.textContent = word.pos;
    if (dom.cardBackLeechBadge) {
      dom.cardBackLeechBadge.hidden = !isFocusWord;
    }
    dom.cardWrongBadge.textContent = `오답 ${progress.wrongCount}회`;
    dom.cardWrongBadge.classList.toggle("has-wrong", progress.wrongCount > 0);
    dom.cardMeaning.textContent = word.meaning;
    dom.cardExample.textContent = word.example;
    dom.cardExampleKo.textContent = word.exampleKo;

    renderMobileHeaderStatus();

    if (animateEnter) {
      triggerCardEnterAnimation();
    }
  }

  function renderArchive() {
    const wrongWords = getArchiveFilteredWords().sort((a, b) => {
      const pa = getWordProgress(a.id);
      const pb = getWordProgress(b.id);
      if (pb.wrongCount !== pa.wrongCount) return pb.wrongCount - pa.wrongCount;
      if (pa.level !== pb.level) return pa.level - pb.level;
      return compareWordsByOrder(a, b);
    });

    const totalWrongInDeck = getActiveDeckWrongArchiveWords().length;
    const deckPrefix =
      session.activeDeck === "all" ? "" : `${getActiveDeckTitle()} · `;
    const filterNote =
      session.streamFilter === "bookmarked" ? " (북마크 필터)" : "";

    dom.archiveSummaryText.textContent = `${deckPrefix}오답 횟수 높은 순 · 총 ${wrongWords.length}단어${filterNote}`;
    dom.hideMeaningToggle.checked = persistedState.hideMeanings;
    dom.archiveList.classList.toggle(
      "hide-meanings",
      persistedState.hideMeanings,
    );
    dom.resetWrongBtn.disabled = totalWrongInDeck === 0;

    dom.archiveList.innerHTML = "";

    const isEmpty = wrongWords.length === 0;
    dom.archiveList.hidden = isEmpty;
    dom.archiveEmptyState.hidden = !isEmpty;

    renderMobileHeaderStatus();

    if (isEmpty) return;

    const fragment = document.createDocumentFragment();

    for (const word of wrongWords) {
      const progress = getWordProgress(word.id);

      const li = document.createElement("li");
      li.className = "archive-item";
      li.dataset.wordId = String(word.id);

      // Left main content
      const mainDiv = document.createElement("div");
      mainDiv.className = "archive-item-main";

      const topDiv = document.createElement("div");
      topDiv.className = "archive-item-top";

      const wordSpan = document.createElement("span");
      wordSpan.className = "archive-word";
      wordSpan.textContent = word.word;

      const phoneticSpan = document.createElement("span");
      phoneticSpan.className = "archive-phonetic";
      phoneticSpan.textContent = word.phonetic;

      const posSpan = document.createElement("span");
      posSpan.className = "archive-pos";
      posSpan.textContent = word.pos;

      const deckSpan = document.createElement("span");
      deckSpan.className = "archive-deck";
      deckSpan.textContent = word.deckTitle;

      topDiv.append(wordSpan, phoneticSpan, posSpan, deckSpan);

      const meaningWrap = document.createElement("div");
      meaningWrap.className = "archive-meaning-wrap";

      const meaningEl = document.createElement("p");
      meaningEl.className = "archive-meaning";
      meaningEl.textContent = word.meaning;
      meaningEl.title = "뜻 가리기 모드에서 클릭하여 확인";

      const exampleEl = document.createElement("p");
      exampleEl.className = "archive-example";
      exampleEl.textContent = word.example;

      meaningWrap.append(meaningEl, exampleEl);
      mainDiv.append(topDiv, meaningWrap);

      // Right action controls (level dots + wrong count + audio/reset buttons)
      const actionsDiv = document.createElement("div");
      actionsDiv.className = "archive-item-actions";

      const badgesDiv = document.createElement("div");
      badgesDiv.className = "archive-item-badges";

      const levelBadge = document.createElement("span");
      levelBadge.className = "archive-level-badge";
      levelBadge.title = `숙련도 Lv.${progress.level}/${MAX_LEVEL}`;
      levelBadge.setAttribute(
        "aria-label",
        `숙련도 ${progress.level}단계 / ${MAX_LEVEL}단계`,
      );
      levelBadge.appendChild(createLevelDotsElement(progress.level));

      const wrongPill = document.createElement("span");
      wrongPill.className = "archive-wrong-pill";
      wrongPill.textContent = `오답 ${progress.wrongCount}회`;

      badgesDiv.append(levelBadge, wrongPill);
      if (isFocusMemorizeProgress(progress)) {
        const leechPill = document.createElement("span");
        leechPill.className = "leech-badge";
        leechPill.textContent = "집중 암기";
        leechPill.title = "오답 3회 이상 · 집중 암기";
        badgesDiv.appendChild(leechPill);
      }

      const btnsDiv = document.createElement("div");
      btnsDiv.className = "archive-item-btns";

      const audioBtn = document.createElement("button");
      audioBtn.type = "button";
      audioBtn.className = "archive-icon-btn";
      audioBtn.dataset.action = "speak";
      audioBtn.dataset.wordId = String(word.id);
      audioBtn.title = `${word.word} 발음 듣기`;
      audioBtn.setAttribute("aria-label", `${word.word} 발음 듣기`);
      audioBtn.innerHTML =
        '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>' +
        '<path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>' +
        "</svg>";

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "archive-icon-btn is-remove";
      removeBtn.dataset.action = "reset-one";
      removeBtn.dataset.wordId = String(word.id);
      removeBtn.title = "이 단어의 오답 기록 초기화";
      removeBtn.setAttribute("aria-label", `${word.word} 오답 기록 초기화`);
      removeBtn.innerHTML =
        '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<polyline points="20 6 9 17 4 12"></polyline>' +
        "</svg>";

      btnsDiv.append(audioBtn, removeBtn);
      actionsDiv.append(badgesDiv, btnsDiv);
      li.append(mainDiv, actionsDiv);
      fragment.appendChild(li);
    }

    dom.archiveList.appendChild(fragment);
  }

  function renderAll(options = {}) {
    renderStats();
    updateSegmentedIndicator();
    renderViewVisibility();

    if (session.activeTab === "wrong-archive") {
      renderArchive();
    } else {
      renderCurrentCard(options);
    }
  }

  /* ========================================================================
     9. Core Study & Wrong-Note Actions
     ======================================================================== */
  function flipCard() {
    if (session.isAnimating || session.queue.length === 0) return;
    session.isFlipped = !session.isFlipped;
    dom.flashcard.classList.toggle("is-flipped", session.isFlipped);
    dom.flashcard.setAttribute("aria-pressed", String(session.isFlipped));
  }

  function rateCurrentCard(ratingLevel, options = {}) {
    if (session.isAnimating) return;
    const word = getCurrentWord();
    if (!word) return;

    const rating = Number(ratingLevel);
    if (![1, 2, 3].includes(rating)) return;

    session.isAnimating = true;
    const progress = getWordProgress(word.id);
    const now = Date.now();
    const prevLevel = progress.level;
    const prevWrongCount = progress.wrongCount;

    const currentDeckStep = incrementDeckStep(word.deckKey);
    progress.lastStudied = now;

    let toastMsg = "";
    let toastVariant = "default";

    if (rating === 1) {
      // 1: 모름 -> Lv.0 초기화, 5~12장 뒤 재출제 (누적 오답 3회 이상은 집중 암기 배지만 표시, 알고리즘 동일)
      session.passedInStream.delete(word.id);
      progress.level = 0;
      progress.dueStep = null;
      progress.wrongCount += 1;
      progress.status = "wrong";
      progress.sessionWrongStreak = 0;
      progress.leechUntil = null;
      progress.isLeech = isFocusMemorizeProgress(progress);

      if (progress.isLeech && prevWrongCount < FOCUS_WRONG_THRESHOLD) {
        toastMsg = `"${word.word}" 집중 암기 지정 · ${WRONG_REINSERT_MIN}~${WRONG_REINSERT_MAX}장 뒤`;
      } else if (progress.isLeech) {
        toastMsg = `"${word.word}" 집중 암기 (${progress.wrongCount}회) · ${WRONG_REINSERT_MIN}~${WRONG_REINSERT_MAX}장 뒤`;
      } else {
        toastMsg = `"${word.word}" 모름 (${progress.wrongCount}회) · ${WRONG_REINSERT_MIN}~${WRONG_REINSERT_MAX}장 뒤`;
      }
      toastVariant = "error";
    } else if (rating === 2) {
      // 2: 애매함 -> 단계적 강등 (Lv.2->1, Lv.1->0, Lv.0->0), 20~30장 뒤 재출제
      session.passedInStream.delete(word.id);
      progress.level = Math.max(0, prevLevel - 1);
      progress.dueStep = null;
      progress.wrongCount += 1;
      progress.status = "hard";
      progress.leechUntil = null;
      progress.isLeech = isFocusMemorizeProgress(progress);

      if (progress.isLeech && prevWrongCount < FOCUS_WRONG_THRESHOLD) {
        toastMsg =
          prevLevel > progress.level
            ? `"${word.word}" 집중 암기 지정 (Lv.${prevLevel}→${progress.level})`
            : `"${word.word}" 집중 암기 지정 · ${HARD_REINSERT_MIN}~${HARD_REINSERT_MAX}장 뒤`;
      } else if (prevLevel > progress.level) {
        toastMsg = `"${word.word}" 애매함 (Lv.${prevLevel}→${progress.level}) · ${HARD_REINSERT_MIN}~${HARD_REINSERT_MAX}장 뒤`;
      } else {
        toastMsg = `"${word.word}" 애매함 (${progress.wrongCount}회) · ${HARD_REINSERT_MIN}~${HARD_REINSERT_MAX}장 뒤`;
      }
    } else if (rating === 3) {
      // 3: 알겠음 -> 단계별 승급 + 단기 검증(Lv.0->1) / 미래 예약(Lv.1->2) / 졸업(Lv.2->3) (집중 암기도 동일 알고리즘)
      const wasFocus = isFocusMemorizeProgress(progress);
      progress.sessionWrongStreak = 0;
      progress.leechUntil = null;

      progress.level = Math.min(MAX_LEVEL, prevLevel + 1);
      progress.status = progress.level >= MAX_LEVEL ? "master" : "good";
      progress.isLeech = isFocusMemorizeProgress(progress);

      ensureTodayStats();
      persistedState.todayStats.count += 1;
      if (word.deckKey) {
        persistedState.todayStats.byDeck[word.deckKey] =
          (persistedState.todayStats.byDeck[word.deckKey] || 0) + 1;
      }

      if (progress.level >= MAX_LEVEL) {
        // Lv.2 -> Lv.3 마스터 졸업
        progress.dueStep = null;
        session.passedInStream.add(word.id);
        toastMsg = wasFocus
          ? `"${word.word}" 집중 암기 해제 · 마스터 달성! (Lv.3)`
          : `"${word.word}" 마스터 달성! (Lv.3)`;
        toastVariant = "success";
      } else if (prevLevel === 1 && progress.level === 2) {
        // 2회 통과 (Lv.1 -> Lv.2): 미래 100~220장 뒤 예약 (잔여 220 미만 시 35~100% 동적 축소)
        const remainingUnmastered = getDeckRemainingUnmasteredCount(word.deckKey);
        const futureDelay = computeLv2FutureDelay(remainingUnmastered);
        progress.dueStep = currentDeckStep + futureDelay;
        session.passedInStream.add(word.id);
        toastMsg = `"${word.word}" Lv.2 승급 · 약 ${futureDelay}장 뒤 졸업 심사`;
      } else if (prevLevel === 0 && progress.level === 1) {
        // 1회 통과 (Lv.0 -> Lv.1): 미래 40~80장 뒤 예약 (잔여 80 미만 시 25~60% 동적 축소)
        const remainingUnmastered = getDeckRemainingUnmasteredCount(word.deckKey);
        const futureDelay = computeLv1FutureDelay(remainingUnmastered);
        progress.dueStep = currentDeckStep + futureDelay;
        session.passedInStream.add(word.id);
        toastMsg = `"${word.word}" Lv.1 승급 · 약 ${futureDelay}장 뒤 1차 복습`;
      } else {
        progress.dueStep = null;
        session.passedInStream.add(word.id);
        toastMsg = `"${word.word}" 통과! 숙련도 Lv.${progress.level}/${MAX_LEVEL}`;
      }
    }

    savePersistedState();
    renderStats();
    if (rating === 3) {
      triggerPaceBump();
    }
    if (toastMsg) {
      showToast(toastMsg, toastVariant);
    }

    // Trigger directional fly-out animation
    const flyDirection =
      options.flyDirection || (rating <= 2 ? "left" : "right");
    dom.flashcard.classList.remove(
      "is-dragging",
      "swiping-left",
      "swiping-right",
    );
    dom.flashcard.classList.add(
      flyDirection === "left" ? "fly-out-left" : "fly-out-right",
    );

    session.flyOutTimer = setTimeout(() => {
      session.flyOutTimer = null;
      const idx = session.currentIndex;
      const [ratedId] = session.queue.splice(idx, 1);

      if (ratedId !== undefined) {
        if (rating === 1) {
          // 모름: 횟수 제한 없이 5~12장 뒤로 계속 재삽입
          const wrongOffset =
            WRONG_REINSERT_MIN +
            Math.floor(
              Math.random() * (WRONG_REINSERT_MAX - WRONG_REINSERT_MIN + 1),
            );
          refillStreamIfNeeded(ratedId, true, idx + wrongOffset);
          const insertIdx = Math.min(idx + wrongOffset, session.queue.length);
          session.queue.splice(insertIdx, 0, ratedId);
          if (session.queue.length > 1 && session.queue[idx] === ratedId) {
            session.currentIndex = 0;
          } else {
            session.currentIndex = idx >= session.queue.length ? 0 : idx;
          }
        } else if (rating === 2) {
          // 애매함: 단계적 강등 후 20~30장 뒤로 재삽입
          const hardOffset =
            HARD_REINSERT_MIN +
            Math.floor(
              Math.random() * (HARD_REINSERT_MAX - HARD_REINSERT_MIN + 1),
            );
          refillStreamIfNeeded(ratedId, true, idx + hardOffset);
          const insertIdx = Math.min(idx + hardOffset, session.queue.length);
          session.queue.splice(insertIdx, 0, ratedId);
          if (session.queue.length > 1 && session.queue[idx] === ratedId) {
            session.currentIndex = 0;
          } else {
            session.currentIndex = idx >= session.queue.length ? 0 : idx;
          }
        } else if (rating === 3) {
          // Lv.1(40~80장 뒤) / Lv.2(100~220장 뒤) 미래 예약 또는 Lv.3 졸업: 큐에서 소거 후 잔여 5장 이하 시 보충
          refillStreamIfNeeded(ratedId, false);
          session.currentIndex =
            session.queue.length === 0
              ? 0
              : idx >= session.queue.length
                ? 0
                : idx;
        }
      }

      clearSwipeClasses();
      resetCardFlipInstant();
      session.isAnimating = false;
      renderAll({ animateEnter: true });
    }, FLY_OUT_DURATION_MS);
  }

  function navigateCard(delta) {
    if (session.isAnimating || session.queue.length === 0) return;

    const len = session.queue.length;
    session.currentIndex = (session.currentIndex + delta + len) % len;
    clearSwipeClasses();
    resetCardFlipInstant();
    renderCurrentCard({ animateEnter: true });
  }

  function toggleBookmark() {
    const word = getCurrentWord();
    if (!word) return;

    const progress = getWordProgress(word.id);
    progress.bookmarked = !progress.bookmarked;
    savePersistedState();
    renderStreamFilterOptions();

    // If user unbookmarks while inside the bookmarked-only stream, refresh queue
    if (session.streamFilter === "bookmarked" && !progress.bookmarked) {
      session.queue = session.queue.filter((id) => id !== word.id);
      refillStreamIfNeeded(word.id, true);
      if (session.queue.length === 0) {
        session.currentIndex = 0;
      } else if (session.currentIndex >= session.queue.length) {
        session.currentIndex = session.queue.length - 1;
      }
      resetCardFlipInstant();
      renderCurrentCard({ animateEnter: true });
    } else {
      dom.bookmarkBtn.classList.toggle("is-bookmarked", progress.bookmarked);
      dom.bookmarkBtn.setAttribute("aria-pressed", String(progress.bookmarked));
    }

    showToast(
      progress.bookmarked
        ? `"${word.word}" 북마크에 추가했습니다.`
        : `"${word.word}" 북마크를 해제했습니다.`,
    );
  }

  function resetSingleWrong(wordId) {
    const word = WORD_MAP.get(wordId);
    if (!word) return;

    const progress = getWordProgress(wordId);
    progress.wrongCount = 0;
    progress.sessionWrongStreak = 0;
    progress.isLeech = false;
    progress.leechUntil = null;
    if (progress.status === "wrong" || progress.status === "hard") {
      progress.status =
        progress.level >= MAX_LEVEL
          ? "master"
          : progress.level > 0
            ? "good"
            : "new";
    }

    savePersistedState();
    renderStats();
    renderArchive();
    showToast(`"${word.word}" 오답 기록을 초기화했습니다.`, "success");
  }

  function resetAllWrong() {
    const wrongWords = getActiveDeckWrongArchiveWords();
    if (wrongWords.length === 0) return;

    const deckScope =
      session.activeDeck === "all"
        ? "전체 단어장"
        : `${getActiveDeckTitle()} 단어장`;
    const confirmed = window.confirm(
      `${deckScope}의 누적된 오답 단어 ${wrongWords.length}개의 오답 기록을 모두 초기화할까요?`,
    );
    if (!confirmed) return;

    for (const word of wrongWords) {
      const progress = getWordProgress(word.id);
      progress.wrongCount = 0;
      progress.sessionWrongStreak = 0;
      progress.isLeech = false;
      progress.leechUntil = null;
      if (progress.status === "wrong" || progress.status === "hard") {
        progress.status =
          progress.level >= MAX_LEVEL
            ? "master"
            : progress.level > 0
              ? "good"
              : "new";
      }
    }

    savePersistedState();
    buildSessionQueue();
    renderAll();
    showToast(`${deckScope}의 오답 기록을 초기화했습니다.`, "success");
  }

  function switchDeck(nextDeckKey) {
    if (nextDeckKey !== "all" && !DECK_MAP.has(nextDeckKey)) return;
    if (session.activeDeck === nextDeckKey) {
      return;
    }

    session.activeDeck = nextDeckKey;
    persistedState.selectedDeck = nextDeckKey;
    savePersistedState({ markUpdated: false, syncCloud: false });

    renderDeckSelector();
    renderStreamFilterOptions();
    clearSwipeClasses();
    resetCardFlipInstant();

    if (session.activeTab !== "wrong-archive") {
      buildSessionQueue();
    }

    renderAll({ animateEnter: session.activeTab !== "wrong-archive" });
    showToast(
      nextDeckKey === "all"
        ? "전체 단어장으로 전환했습니다."
        : `${getActiveDeckTitle()} 단어장으로 전환했습니다.`,
    );
  }

  function switchTab(nextTab) {
    if (!TAB_ORDER.includes(nextTab)) return;
    closeMobileMenu();
    if (session.activeTab === nextTab) {
      updateSegmentedIndicator();
      return;
    }

    session.activeTab = nextTab;
    clearSwipeClasses();
    resetCardFlipInstant();

    if (nextTab !== "wrong-archive") {
      buildSessionQueue();
    }

    renderAll({ animateEnter: nextTab !== "wrong-archive" });
  }

  function switchWrongStudyScope(nextScope) {
    const resolved = VALID_WRONG_SCOPES.has(nextScope) ? nextScope : "all";
    if (session.wrongStudyScope === resolved) {
      renderWrongStudySubnav();
      return;
    }

    session.wrongStudyScope = resolved;
    clearSwipeClasses();
    resetCardFlipInstant();

    if (session.activeTab === "wrong-study") {
      buildSessionQueue();
    }

    renderAll({ animateEnter: session.activeTab === "wrong-study" });
  }

  function handleStreamFilterChange(nextFilter) {
    session.streamFilter = VALID_STREAM_FILTERS.has(nextFilter)
      ? nextFilter
      : "smart-mix";
    clearSwipeClasses();
    resetCardFlipInstant();

    if (session.activeTab !== "wrong-archive") {
      buildSessionQueue();
    }

    renderAll({ animateEnter: session.activeTab !== "wrong-archive" });
  }

  /* ========================================================================
     10. JSON Export, Import & Full Reset (Backup / Restore / Reset)
     ======================================================================== */
  function exportBackupJson() {
    ensureTodayStats();
    const payload = {
      app: "Lexicon Bridge Vocabulary",
      exportedAt: new Date().toISOString(),
      version: 3,
      data: persistedState,
    };

    try {
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `lexicon-backup-${getLocalDateKey()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      closeMobileMenu();
      showToast("학습 데이터를 JSON 파일로 백업했습니다.", "success");
    } catch (error) {
      console.error("Export failed:", error);
      showToast("데이터 백업 중 오류가 발생했습니다.", "error");
    }
  }

  function importBackupJson(file) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const source =
          parsed && typeof parsed.data === "object" ? parsed.data : parsed;

        if (
          !source ||
          typeof source !== "object" ||
          typeof source.words !== "object"
        ) {
          throw new Error("Invalid backup structure");
        }

        const nextState = createDefaultState();

        if (source.theme === "light" || source.theme === "dark") {
          nextState.theme = source.theme;
        } else {
          nextState.theme = persistedState.theme;
        }
        if (
          typeof source.selectedDeck === "string" &&
          (source.selectedDeck === "all" || DECK_MAP.has(source.selectedDeck))
        ) {
          nextState.selectedDeck = source.selectedDeck;
        } else {
          nextState.selectedDeck = session.activeDeck;
        }
        nextState.hideMeanings = Boolean(source.hideMeanings);
        nextState.randomOrder =
          typeof source.randomOrder === "boolean"
            ? source.randomOrder
            : Boolean(persistedState.randomOrder);
        if (
          source.randomSeed !== undefined &&
          source.randomSeed !== null &&
          Number.isFinite(Number(source.randomSeed)) &&
          Number(source.randomSeed) > 0
        ) {
          nextState.randomSeed = Number(source.randomSeed) >>> 0;
        } else {
          nextState.randomSeed = persistedState.randomSeed;
        }

        if (
          source.todayStats &&
          typeof source.todayStats === "object" &&
          typeof source.todayStats.date === "string"
        ) {
          const todayKey = getLocalDateKey();
          if (source.todayStats.date === todayKey) {
            const safeCount = Number.isFinite(Number(source.todayStats.count))
              ? Math.max(0, Math.floor(Number(source.todayStats.count)))
              : 0;
            const safeByDeck = sanitizeTodayByDeck(source.todayStats.byDeck);
            const byDeckSum = Object.values(safeByDeck).reduce(
              (a, b) => a + b,
              0,
            );
            nextState.todayStats = {
              date: todayKey,
              count: Math.max(safeCount, byDeckSum),
              byDeck: safeByDeck,
            };
          }
        }

        nextState.deckSteps = sanitizeDeckSteps(source.deckSteps);

        let restoredCount = 0;
        if (!Array.isArray(source.words)) {
          for (const [key, rawEntry] of Object.entries(source.words)) {
            if (key && rawEntry && typeof rawEntry === "object") {
              nextState.words[key] = sanitizeWordEntry(rawEntry);
              restoredCount += 1;
            }
          }
        }

        persistedState = nextState;
        session.activeDeck = persistedState.selectedDeck;
        applyTheme(persistedState.theme);
        rebuildRandomOrderMap();
        syncRandomOrderUI();
        savePersistedState({
          markUpdated: true,
          syncCloud: true,
          immediateCloud: true,
        });
        renderDeckSelector();
        renderStreamFilterOptions();
        buildSessionQueue();
        renderAll({ animateEnter: session.activeTab !== "wrong-archive" });
        closeMobileMenu();
        showToast(
          `학습 데이터를 복원했습니다. (${restoredCount}개 기록 반영)`,
          "success",
        );
      } catch (error) {
        console.error("Import failed:", error);
        showToast("올바른 Lexicon 백업 JSON 파일이 아닙니다.", "error");
      } finally {
        dom.importFileInput.value = "";
      }
    };

    reader.onerror = () => {
      showToast("파일을 읽는 중 오류가 발생했습니다.", "error");
      dom.importFileInput.value = "";
    };

    reader.readAsText(file, "utf-8");
  }

  function resetAllAppData() {
    const cloudNotice = cloud.user
      ? "• 로그인된 클라우드 동기화 기록도 함께 초기화됩니다.\n"
      : "";
    const firstConfirmed = window.confirm(
      "⚠️ 전체 학습 데이터를 초기화할까요?\n\n" +
        "• 모든 단어장의 숙련도·마스터 기록\n" +
        "• 누적 오답노트 및 오답 횟수\n" +
        "• 오늘 학습 통과 수 및 북마크\n" +
        cloudNotice +
        "\n초기화 후에는 복구할 수 없습니다.\n" +
        "기록을 보관하려면 먼저 [백업]으로 JSON 파일을 저장해 주세요.",
    );
    if (!firstConfirmed) return;

    const secondConfirmed = window.confirm(
      "정말로 모든 학습 기록을 영구 삭제하고 처음 상태로 초기화할까요?",
    );
    if (!secondConfirmed) return;

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      clearSpeakingIndicator();
    }

    if (session.flyOutTimer) {
      clearTimeout(session.flyOutTimer);
      session.flyOutTimer = null;
    }
    if (session.enterTimer) {
      clearTimeout(session.enterTimer);
      session.enterTimer = null;
    }
    if (session.paceBumpTimer) {
      clearTimeout(session.paceBumpTimer);
      session.paceBumpTimer = null;
    }

    const currentTheme = persistedState.theme;

    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error("Failed to remove state from localStorage:", error);
    }

    persistedState = createDefaultState();
    persistedState.theme = currentTheme;
    savePersistedState({
      markUpdated: true,
      syncCloud: true,
      immediateCloud: true,
    });

    session.activeDeck = "all";
    session.activeTab = "all";
    session.wrongStudyScope = "all";
    session.streamFilter = "smart-mix";
    session.queue = [];
    session.currentIndex = 0;
    session.passedInStream.clear();
    session.isFlipped = false;
    session.isAnimating = false;

    if (dom.hideMeaningToggle) {
      dom.hideMeaningToggle.checked = false;
    }
    if (dom.importFileInput) {
      dom.importFileInput.value = "";
    }

    clearSwipeClasses();
    resetCardFlipInstant();
    rebuildRandomOrderMap();
    syncRandomOrderUI();
    applyTheme(persistedState.theme);
    renderDeckSelector();
    renderStreamFilterOptions();
    buildSessionQueue();
    renderAll({ animateEnter: true });
    closeMobileMenu();
    showToast("모든 학습 데이터를 초기화했습니다.", "success");
  }

  /* ========================================================================
     10.5. Cloud Account & Supabase Real-Time Sync
     ======================================================================== */
  function extractDisplayUsername(user) {
    if (!user || !user.email) return "계정";
    const suffix = `@${CLOUD_EMAIL_DOMAIN}`;
    if (user.email.toLowerCase().endsWith(suffix)) {
      return user.email.slice(0, -suffix.length);
    }
    return user.email;
  }

  function normalizeUsernameToEmail(rawInput) {
    const trimmed = String(rawInput || "")
      .trim()
      .toLowerCase();
    if (!trimmed) {
      return { error: "아이디를 입력해 주세요." };
    }

    if (trimmed.includes("@")) {
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
      if (!emailOk) {
        return { error: "올바른 아이디 또는 이메일 형식이 아닙니다." };
      }
      const displayName = trimmed.endsWith(`@${CLOUD_EMAIL_DOMAIN}`)
        ? trimmed.slice(0, -(`@${CLOUD_EMAIL_DOMAIN}`).length)
        : trimmed;
      return { email: trimmed, displayName };
    }

    if (!/^[a-z0-9][a-z0-9._-]{1,31}$/.test(trimmed)) {
      return {
        error: "아이디는 영문 소문자·숫자·(._-) 조합 2~32자로 입력해 주세요.",
      };
    }

    return {
      email: `${trimmed}@${CLOUD_EMAIL_DOMAIN}`,
      displayName: trimmed,
    };
  }

  function formatLastSyncTime(isoString) {
    const ms = parseTimestampMs(isoString);
    if (!ms) return "마지막 동기화: 대기 중";

    const d = new Date(ms);
    const now = new Date();
    const isSameDay =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();

    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");

    if (isSameDay) {
      return `마지막 동기화: 오늘 ${hh}:${mm}:${ss}`;
    }
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const da = String(d.getDate()).padStart(2, "0");
    return `마지막 동기화: ${mo}/${da} ${hh}:${mm}`;
  }

  function setCloudMessage(el, text, variant = "default") {
    if (!el) return;
    if (!text) {
      el.textContent = "";
      el.hidden = true;
      el.classList.remove("is-error", "is-success");
      return;
    }
    el.textContent = text;
    el.hidden = false;
    el.classList.toggle("is-error", variant === "error");
    el.classList.toggle("is-success", variant === "success");
  }

  function clearCloudMessages() {
    setCloudMessage(dom.cloudAuthMessage, "");
    setCloudMessage(dom.cloudSyncedMessage, "");
  }

  function translateCloudError(error, context = "sync") {
    const raw = String(
      (error && (error.message || error.error_description || error.details)) ||
        "",
    );
    const lower = raw.toLowerCase();

    if (!navigator.onLine || lower.includes("failed to fetch") || lower.includes("network")) {
      return "네트워크 연결이 불안정합니다. 로컬에 안전하게 저장됩니다.";
    }
    if (lower.includes("invalid login credentials")) {
      return "아이디 또는 비밀번호가 올바르지 않습니다.";
    }
    if (lower.includes("user already registered")) {
      return "이미 가입된 아이디입니다. [로그인] 버튼을 눌러주세요.";
    }
    if (lower.includes("email not confirmed")) {
      return "이메일 인증이 켜져 있습니다. Supabase Auth 설정에서 Confirm email을 꺼주세요.";
    }
    if (lower.includes("password should be at least")) {
      return "비밀번호는 6자 이상으로 입력해 주세요.";
    }
    if (lower.includes("rate limit") || lower.includes("too many requests")) {
      return "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.";
    }
    if (
      lower.includes("relation") ||
      lower.includes("user_progress") ||
      lower.includes("row-level security") ||
      lower.includes("permission denied")
    ) {
      return "Supabase user_progress 테이블 또는 RLS 권한 설정을 확인해 주세요.";
    }
    if (context === "login") return raw || "로그인 중 오류가 발생했습니다.";
    if (context === "signup") return raw || "회원가입 중 오류가 발생했습니다.";
    return raw || "클라우드 동기화 중 오류가 발생했습니다.";
  }

  function renderCloudUI() {
    const isSignedIn = Boolean(cloud.user);
    const displayName = isSignedIn ? extractDisplayUsername(cloud.user) : "";

    // Status badges (cloud sub-page + mobile main menu entry button)
    let badgeClass = "";
    let badgeText = "로컬 저장";
    if (isSignedIn) {
      if (cloud.status === "syncing") {
        badgeClass = "is-syncing";
        badgeText = "동기화 중…";
      } else if (cloud.status === "offline") {
        badgeClass = "is-offline";
        badgeText = "오프라인 대기";
      } else if (cloud.status === "error") {
        badgeClass = "is-error";
        badgeText = "동기화 오류";
      } else {
        badgeClass = "is-synced";
        badgeText = "동기화됨";
      }
    }

    const syncBadges = [
      [dom.cloudSyncBadge, dom.cloudSyncBadgeText],
      [dom.mobileCloudEntryBadge, dom.mobileCloudEntryBadgeText],
    ];
    for (const [badgeEl, textEl] of syncBadges) {
      if (!badgeEl || !textEl) continue;
      badgeEl.classList.remove(
        "is-synced",
        "is-syncing",
        "is-offline",
        "is-error",
      );
      if (badgeClass) {
        badgeEl.classList.add(badgeClass);
      }
      textEl.textContent = badgeText;
    }

    if (dom.mobileCloudEntryBtn) {
      dom.mobileCloudEntryBtn.classList.toggle("is-signed-in", isSignedIn);
    }
    if (dom.mobileCloudEntrySub) {
      dom.mobileCloudEntrySub.textContent = isSignedIn
        ? `${displayName} 계정 연결됨`
        : "로그인 · 기기 간 동기화";
    }

    // Desktop header trigger button
    if (dom.cloudMenuBtn) {
      dom.cloudMenuBtn.classList.toggle("is-signed-in", isSignedIn);
      dom.cloudMenuBtn.title = isSignedIn
        ? `클라우드 동기화 (${displayName})`
        : "클라우드 계정 동기화";
    }
    if (dom.cloudHeaderLabel) {
      dom.cloudHeaderLabel.textContent = isSignedIn ? displayName : "클라우드";
    }
    if (dom.cloudHeaderStatusDot) {
      dom.cloudHeaderStatusDot.hidden = !isSignedIn;
      dom.cloudHeaderStatusDot.classList.remove(
        "is-syncing",
        "is-offline",
        "is-error",
      );
      if (isSignedIn) {
        if (cloud.status === "syncing") {
          dom.cloudHeaderStatusDot.classList.add("is-syncing");
        } else if (cloud.status === "offline") {
          dom.cloudHeaderStatusDot.classList.add("is-offline");
        } else if (cloud.status === "error") {
          dom.cloudHeaderStatusDot.classList.add("is-error");
        }
      }
    }

    // Logged-out vs logged-in panels
    if (dom.cloudAuthLoggedOut) {
      dom.cloudAuthLoggedOut.hidden = isSignedIn;
    }
    if (dom.cloudAuthLoggedIn) {
      dom.cloudAuthLoggedIn.hidden = !isSignedIn;
    }

    if (isSignedIn) {
      if (dom.cloudAccountName) {
        dom.cloudAccountName.textContent = displayName;
      }
      if (dom.cloudAvatar) {
        const initial = displayName ? displayName.charAt(0).toUpperCase() : "L";
        dom.cloudAvatar.textContent = initial;
      }
      if (dom.cloudLastSyncText) {
        dom.cloudLastSyncText.textContent = formatLastSyncTime(
          cloud.lastSyncedAt || persistedState.updatedAt,
        );
      }
    }

    // Busy/loading button states
    const authDisabled = cloud.isAuthBusy;
    if (dom.cloudLoginBtn) {
      dom.cloudLoginBtn.disabled = authDisabled;
      dom.cloudLoginBtn.textContent = authDisabled ? "처리 중…" : "로그인";
    }
    if (dom.cloudSignupBtn) {
      dom.cloudSignupBtn.disabled = authDisabled;
    }
    if (dom.cloudUsernameInput) {
      dom.cloudUsernameInput.disabled = authDisabled;
    }
    if (dom.cloudPasswordInput) {
      dom.cloudPasswordInput.disabled = authDisabled;
    }
    if (dom.cloudSyncNowBtn) {
      dom.cloudSyncNowBtn.disabled = cloud.isSyncing || cloud.isAuthBusy;
      dom.cloudSyncNowBtn.classList.toggle("is-loading", cloud.isSyncing);
    }
    if (dom.cloudLogoutBtn) {
      dom.cloudLogoutBtn.disabled = cloud.isAuthBusy;
    }
  }

  function buildCloudProgressJson() {
    ensureTodayStats();
    return {
      version: persistedState.version || 4,
      theme: persistedState.theme,
      selectedDeck: persistedState.selectedDeck,
      hideMeanings: Boolean(persistedState.hideMeanings),
      randomOrder: Boolean(persistedState.randomOrder),
      randomSeed: persistedState.randomSeed || null,
      deckSteps: sanitizeDeckSteps(persistedState.deckSteps),
      updatedAt: persistedState.updatedAt,
      todayStats: {
        date: persistedState.todayStats.date,
        count: persistedState.todayStats.count,
        byDeck: { ...persistedState.todayStats.byDeck },
      },
      words: { ...persistedState.words },
    };
  }

  function applyCloudStateToApp(cloudState, cloudUpdatedIso) {
    const preservedTheme = persistedState.theme;
    persistedState = cloudState;
    persistedState.theme = preservedTheme;
    persistedState.updatedAt = cloudUpdatedIso || cloudState.updatedAt;

    savePersistedState({ markUpdated: false, syncCloud: false });

    session.activeDeck =
      persistedState.selectedDeck === "all" ||
      DECK_MAP.has(persistedState.selectedDeck)
        ? persistedState.selectedDeck
        : "all";

    if (dom.hideMeaningToggle) {
      dom.hideMeaningToggle.checked = Boolean(persistedState.hideMeanings);
    }

    rebuildRandomOrderMap();
    syncRandomOrderUI();
    clearSwipeClasses();
    resetCardFlipInstant();
    renderDeckSelector();
    renderStreamFilterOptions();
    buildSessionQueue();
    renderAll({ animateEnter: session.activeTab !== "wrong-archive" });
  }

  async function pushLocalStateToCloud(options = {}) {
    const { silent = true } = options;
    if (!cloud.client || !cloud.user) return false;

    if (!navigator.onLine) {
      cloud.status = "offline";
      cloud.pendingPush = true;
      renderCloudUI();
      return false;
    }

    cloud.status = "syncing";
    renderCloudUI();

    const updatedAtIso = persistedState.updatedAt || new Date().toISOString();
    persistedState.updatedAt = updatedAtIso;

    try {
      const { error } = await cloud.client.from(CLOUD_PROGRESS_TABLE).upsert(
        {
          user_id: cloud.user.id,
          progress_json: buildCloudProgressJson(),
          updated_at: updatedAtIso,
        },
        { onConflict: "user_id" },
      );

      if (error) {
        throw error;
      }

      savePersistedState({ markUpdated: false, syncCloud: false });
      cloud.status = "synced";
      cloud.pendingPush = false;
      cloud.lastSyncedAt = updatedAtIso;
      setCloudMessage(dom.cloudSyncedMessage, "");
      renderCloudUI();
      return true;
    } catch (error) {
      console.error("Cloud push failed:", error);
      cloud.status = navigator.onLine ? "error" : "offline";
      cloud.pendingPush = true;
      const msg = translateCloudError(error, "sync");
      setCloudMessage(dom.cloudSyncedMessage, msg, "error");
      if (!silent) {
        showToast(msg, "error");
      }
      renderCloudUI();
      return false;
    }
  }

  function scheduleCloudPush() {
    if (!cloud.client || !cloud.user) return;
    cloud.pendingPush = true;
    if (cloud.debounceTimer) {
      clearTimeout(cloud.debounceTimer);
    }
    cloud.debounceTimer = setTimeout(() => {
      cloud.debounceTimer = null;
      flushCloudPush({ silent: true });
    }, CLOUD_SYNC_DEBOUNCE_MS);
  }

  async function flushCloudPush(options = {}) {
    if (cloud.debounceTimer) {
      clearTimeout(cloud.debounceTimer);
      cloud.debounceTimer = null;
    }
    if (!cloud.client || !cloud.user) return false;
    return pushLocalStateToCloud(options);
  }

  async function syncWithCloud(options = {}) {
    const { silent = false } = options;
    if (!cloud.client || !cloud.user) return false;
    if (cloud.isSyncing) return false;

    if (cloud.debounceTimer) {
      clearTimeout(cloud.debounceTimer);
      cloud.debounceTimer = null;
    }

    if (!navigator.onLine) {
      cloud.status = "offline";
      setCloudMessage(
        dom.cloudSyncedMessage,
        "오프라인 상태입니다. 연결되면 자동으로 동기화됩니다.",
        "error",
      );
      if (!silent) {
        showToast("오프라인 상태입니다. 로컬 기록으로 계속 학습합니다.", "error");
      }
      renderCloudUI();
      return false;
    }

    cloud.isSyncing = true;
    cloud.status = "syncing";
    setCloudMessage(dom.cloudSyncedMessage, "");
    renderCloudUI();

    try {
      const { data: row, error } = await cloud.client
        .from(CLOUD_PROGRESS_TABLE)
        .select("user_id, progress_json, updated_at")
        .eq("user_id", cloud.user.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!row) {
        // First time syncing this account: upload current local progress to cloud
        const pushed = await pushLocalStateToCloud({ silent });
        if (pushed && !silent) {
          showToast("클라우드에 학습 데이터를 초기 동기화했습니다.", "success");
        }
        return pushed;
      }

      const cloudUpdatedIso =
        normalizeIsoTimestamp(row.updated_at) ||
        normalizeIsoTimestamp(row.progress_json && row.progress_json.updatedAt);
      const cloudState = sanitizeStatePayload(row.progress_json || {}, {
        fallbackTheme: persistedState.theme,
        fallbackDeck: session.activeDeck,
        overrideUpdatedAt: cloudUpdatedIso,
      });

      const localHasData = hasMeaningfulProgress(persistedState);
      const cloudHasData = hasMeaningfulProgress(cloudState);
      const localMs = parseTimestampMs(persistedState.updatedAt);
      const cloudMs = parseTimestampMs(cloudUpdatedIso || cloudState.updatedAt);

      let direction = "same";
      if (!localHasData && cloudHasData) {
        direction = "pull";
      } else if (localHasData && !cloudHasData) {
        direction = "push";
      } else if (cloudMs > localMs) {
        direction = "pull";
      } else if (localMs > cloudMs) {
        direction = "push";
      }

      if (direction === "pull") {
        applyCloudStateToApp(cloudState, cloudUpdatedIso);
        cloud.status = "synced";
        cloud.pendingPush = false;
        cloud.lastSyncedAt = new Date().toISOString();
        if (!silent) {
          showToast("클라우드의 최신 학습 데이터를 불러왔습니다.", "success");
        }
      } else if (direction === "push") {
        const pushed = await pushLocalStateToCloud({ silent });
        if (pushed && !silent) {
          showToast("로컬 최신 학습 데이터를 클라우드에 반영했습니다.", "success");
        }
      } else {
        cloud.status = "synced";
        cloud.pendingPush = false;
        cloud.lastSyncedAt = new Date().toISOString();
        if (!silent) {
          showToast("이미 최신 상태입니다.", "success");
        }
      }

      return true;
    } catch (error) {
      console.error("Cloud sync failed:", error);
      cloud.status = navigator.onLine ? "error" : "offline";
      const msg = translateCloudError(error, "sync");
      setCloudMessage(dom.cloudSyncedMessage, msg, "error");
      if (!silent) {
        showToast(msg, "error");
      }
      return false;
    } finally {
      cloud.isSyncing = false;
      cloud.lastPullCheckMs = Date.now();
      renderCloudUI();
    }
  }

  function ensureSupabaseReady() {
    if (cloud.client) return true;
    if (
      window.supabase &&
      typeof window.supabase.createClient === "function"
    ) {
      initSupabaseSync();
    }
    return Boolean(cloud.client);
  }

  function readAndValidateCloudCredentials() {
    const idResult = normalizeUsernameToEmail(
      dom.cloudUsernameInput ? dom.cloudUsernameInput.value : "",
    );
    if (idResult.error) {
      setCloudMessage(dom.cloudAuthMessage, idResult.error, "error");
      if (dom.cloudUsernameInput) dom.cloudUsernameInput.focus();
      return null;
    }

    const password = dom.cloudPasswordInput ? dom.cloudPasswordInput.value : "";
    if (!password || password.length < 6) {
      setCloudMessage(
        dom.cloudAuthMessage,
        "비밀번호는 6자 이상 입력해 주세요.",
        "error",
      );
      if (dom.cloudPasswordInput) dom.cloudPasswordInput.focus();
      return null;
    }

    return {
      email: idResult.email,
      displayName: idResult.displayName,
      password,
    };
  }

  async function handleCloudLogin(e) {
    if (e) e.preventDefault();
    if (cloud.isAuthBusy) return;
    clearCloudMessages();

    if (!ensureSupabaseReady()) {
      setCloudMessage(
        dom.cloudAuthMessage,
        "클라우드 SDK를 불러오지 못했습니다. 네트워크 연결 후 새로고침해 주세요.",
        "error",
      );
      return;
    }

    const creds = readAndValidateCloudCredentials();
    if (!creds) return;

    cloud.isAuthBusy = true;
    renderCloudUI();

    try {
      const { data, error } = await cloud.client.auth.signInWithPassword({
        email: creds.email,
        password: creds.password,
      });

      if (error) {
        throw error;
      }

      if (dom.cloudPasswordInput) {
        dom.cloudPasswordInput.value = "";
      }

      if (data && data.user) {
        cloud.user = data.user;
        cloud.activeAuthUserId = data.user.id;
        renderCloudUI();
        showToast(`${creds.displayName} 계정으로 로그인했습니다.`, "success");
        await syncWithCloud({ silent: false });
      }
    } catch (error) {
      console.error("Cloud login failed:", error);
      const msg = translateCloudError(error, "login");
      setCloudMessage(dom.cloudAuthMessage, msg, "error");
      showToast(msg, "error");
    } finally {
      cloud.isAuthBusy = false;
      renderCloudUI();
    }
  }

  async function handleCloudSignup() {
    if (cloud.isAuthBusy) return;
    clearCloudMessages();

    if (!ensureSupabaseReady()) {
      setCloudMessage(
        dom.cloudAuthMessage,
        "클라우드 SDK를 불러오지 못했습니다. 네트워크 연결 후 새로고침해 주세요.",
        "error",
      );
      return;
    }

    const creds = readAndValidateCloudCredentials();
    if (!creds) return;

    cloud.isAuthBusy = true;
    renderCloudUI();

    try {
      const { data, error } = await cloud.client.auth.signUp({
        email: creds.email,
        password: creds.password,
      });

      if (error) {
        throw error;
      }

      let activeUser = data && data.session ? data.session.user : null;

      // Some Supabase setups require an immediate sign-in call after signUp
      if (!activeUser) {
        const signInRes = await cloud.client.auth.signInWithPassword({
          email: creds.email,
          password: creds.password,
        });
        if (signInRes.error) {
          throw signInRes.error;
        }
        activeUser = signInRes.data ? signInRes.data.user : null;
      }

      if (dom.cloudPasswordInput) {
        dom.cloudPasswordInput.value = "";
      }

      if (activeUser) {
        cloud.user = activeUser;
        cloud.activeAuthUserId = activeUser.id;
        renderCloudUI();
        showToast(
          `${creds.displayName} 계정이 생성되어 바로 로그인되었습니다!`,
          "success",
        );
        await syncWithCloud({ silent: false });
      }
    } catch (error) {
      console.error("Cloud signup failed:", error);
      const msg = translateCloudError(error, "signup");
      setCloudMessage(dom.cloudAuthMessage, msg, "error");
      showToast(msg, "error");
    } finally {
      cloud.isAuthBusy = false;
      renderCloudUI();
    }
  }

  async function handleCloudLogout() {
    if (!cloud.client || cloud.isAuthBusy) return;
    clearCloudMessages();

    cloud.isAuthBusy = true;
    renderCloudUI();

    try {
      if (cloud.pendingPush && navigator.onLine) {
        await flushCloudPush({ silent: true });
      }
      if (cloud.debounceTimer) {
        clearTimeout(cloud.debounceTimer);
        cloud.debounceTimer = null;
      }

      const { error } = await cloud.client.auth.signOut();
      if (error) {
        throw error;
      }

      cloud.user = null;
      cloud.activeAuthUserId = null;
      cloud.status = "local";
      cloud.lastSyncedAt = null;
      cloud.pendingPush = false;
      showToast("로그아웃했습니다. 로컬 모드로 계속 학습합니다.");
    } catch (error) {
      console.error("Cloud logout failed:", error);
      const msg = translateCloudError(error, "sync");
      setCloudMessage(dom.cloudSyncedMessage, msg, "error");
      showToast(msg, "error");
    } finally {
      cloud.isAuthBusy = false;
      renderCloudUI();
    }
  }

  function handleAuthSessionUpdate(event, authSession) {
    const nextUser = authSession && authSession.user ? authSession.user : null;

    if (!nextUser) {
      if (cloud.debounceTimer) {
        clearTimeout(cloud.debounceTimer);
        cloud.debounceTimer = null;
      }
      cloud.user = null;
      cloud.activeAuthUserId = null;
      cloud.status = "local";
      cloud.lastSyncedAt = null;
      cloud.pendingPush = false;
      renderCloudUI();
      return;
    }

    const isNewUserSession = cloud.activeAuthUserId !== nextUser.id;
    cloud.user = nextUser;
    cloud.activeAuthUserId = nextUser.id;
    renderCloudUI();

    if (
      isNewUserSession &&
      !cloud.isAuthBusy &&
      (event === "INITIAL_SESSION" || event === "SIGNED_IN")
    ) {
      syncWithCloud({ silent: event === "INITIAL_SESSION" });
    }
  }

  function initSupabaseSync() {
    if (cloud.client) return;

    if (
      !window.supabase ||
      typeof window.supabase.createClient !== "function"
    ) {
      cloud.sdkReady = false;
      renderCloudUI();
      return;
    }

    try {
      cloud.client = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false,
          },
        },
      );
      cloud.sdkReady = true;

      cloud.client.auth.onAuthStateChange((event, authSession) => {
        handleAuthSessionUpdate(event, authSession);
      });

      cloud.client.auth
        .getSession()
        .then(({ data, error }) => {
          if (error) {
            console.warn("Supabase session restore error:", error);
            return;
          }
          handleAuthSessionUpdate("INITIAL_SESSION", data ? data.session : null);
        })
        .catch((error) => {
          console.warn("Supabase getSession failed (offline fallback):", error);
        });
    } catch (error) {
      console.error("Supabase initialization failed (offline fallback):", error);
      cloud.client = null;
      cloud.sdkReady = false;
    }

    renderCloudUI();
  }

  /* ========================================================================
     11. Physics-Based Mouse & Touch Swipe Gesture (Pointer Events)
     ======================================================================== */
  const swipe = {
    pointerId: null,
    isDown: false,
    isDragging: false,
    wasDragged: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    startTime: 0,
    rafId: null,
  };

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function getSwipeThreshold() {
    const width = dom.flashcard ? dom.flashcard.offsetWidth : 360;
    return clamp(width * 0.26, 85, 130);
  }

  function applySwipeFrame() {
    swipe.rafId = null;
    if (!swipe.isDragging) return;

    const dx = swipe.lastX - swipe.startX;
    const dy = swipe.lastY - swipe.startY;
    const threshold = getSwipeThreshold();
    const progress = clamp(Math.abs(dx) / threshold, 0, 1);
    const rotation = clamp(dx * 0.055, -16, 16);
    const dampedY = clamp(dy * 0.16, -24, 24);

    dom.flashcard.style.setProperty("--swipe-x", `${dx.toFixed(1)}px`);
    dom.flashcard.style.setProperty("--swipe-y", `${dampedY.toFixed(1)}px`);
    dom.flashcard.style.setProperty("--swipe-rot", `${rotation.toFixed(2)}deg`);
    dom.flashcard.style.setProperty("--swipe-tint", progress.toFixed(3));

    if (dx < -8) {
      dom.flashcard.classList.add("swiping-left");
      dom.flashcard.classList.remove("swiping-right");
    } else if (dx > 8) {
      dom.flashcard.classList.add("swiping-right");
      dom.flashcard.classList.remove("swiping-left");
    } else {
      dom.flashcard.classList.remove("swiping-left", "swiping-right");
    }
  }

  function onCardPointerDown(e) {
    if (session.isAnimating || session.queue.length === 0) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (e.target.closest("button, a, input, select")) return;

    swipe.pointerId = e.pointerId;
    swipe.isDown = true;
    swipe.isDragging = false;
    swipe.wasDragged = false;
    swipe.startX = e.clientX;
    swipe.startY = e.clientY;
    swipe.lastX = e.clientX;
    swipe.lastY = e.clientY;
    swipe.startTime = performance.now();

    try {
      dom.flashcard.setPointerCapture(e.pointerId);
    } catch (_) {
      // Safe ignore when capture is unavailable
    }
  }

  function onCardPointerMove(e) {
    if (!swipe.isDown || e.pointerId !== swipe.pointerId) return;

    swipe.lastX = e.clientX;
    swipe.lastY = e.clientY;
    const dx = swipe.lastX - swipe.startX;
    const dy = swipe.lastY - swipe.startY;

    if (!swipe.isDragging) {
      // Allow vertical scroll on touch if vertical movement clearly dominates
      if (Math.abs(dy) > 14 && Math.abs(dy) > Math.abs(dx) * 1.25) {
        cancelSwipeTracking();
        return;
      }

      if (Math.abs(dx) > 8 && Math.abs(dx) >= Math.abs(dy)) {
        swipe.isDragging = true;
        swipe.wasDragged = true;
        dom.flashcard.classList.add("is-dragging");
      } else {
        return;
      }
    }

    if (!swipe.rafId) {
      swipe.rafId = requestAnimationFrame(applySwipeFrame);
    }
  }

  function cancelSwipeTracking() {
    if (swipe.rafId) {
      cancelAnimationFrame(swipe.rafId);
      swipe.rafId = null;
    }

    if (swipe.pointerId !== null) {
      try {
        if (dom.flashcard.hasPointerCapture(swipe.pointerId)) {
          dom.flashcard.releasePointerCapture(swipe.pointerId);
        }
      } catch (_) {
        // Ignore release errors
      }
    }

    swipe.pointerId = null;
    swipe.isDown = false;
    swipe.isDragging = false;
    clearSwipeClasses();
  }

  function onCardPointerUp(e) {
    if (!swipe.isDown || e.pointerId !== swipe.pointerId) return;

    const dx = e.clientX - swipe.startX;
    const elapsed = Math.max(1, performance.now() - swipe.startTime);
    const velocity = Math.abs(dx) / elapsed; // px per ms
    const wasDragging = swipe.isDragging;

    if (swipe.rafId) {
      cancelAnimationFrame(swipe.rafId);
      swipe.rafId = null;
    }

    try {
      if (dom.flashcard.hasPointerCapture(swipe.pointerId)) {
        dom.flashcard.releasePointerCapture(swipe.pointerId);
      }
    } catch (_) {
      // Ignore release errors
    }

    swipe.pointerId = null;
    swipe.isDown = false;
    swipe.isDragging = false;

    if (!wasDragging) {
      // Short tap -> flip card
      flipCard();
      return;
    }

    const threshold = getSwipeThreshold();
    const isFlick = Math.abs(dx) >= 48 && velocity >= 0.55;
    const passed = Math.abs(dx) >= threshold || isFlick;

    if (passed) {
      if (dx < 0) {
        // Swipe Left -> 1: 모름
        rateCurrentCard(1, { flyDirection: "left" });
      } else {
        // Swipe Right -> 3: 알겠음
        rateCurrentCard(3, { flyDirection: "right" });
      }
    } else {
      // Spring back cleanly to center
      clearSwipeClasses();
    }
  }

  /* ========================================================================
     12. Keyboard Shortcuts
     ======================================================================== */
  function syncShortcutHintBar() {
    if (!dom.shortcutHintBar) return;
    dom.shortcutHintBar.innerHTML =
      '<span class="shortcut-item"><kbd>Space</kbd> 뒤집기</span>' +
      '<span class="shortcut-divider" aria-hidden="true">·</span>' +
      '<span class="shortcut-item"><kbd>1</kbd>–<kbd>3</kbd> 기억 평가</span>' +
      '<span class="shortcut-divider" aria-hidden="true">·</span>' +
      '<span class="shortcut-item"><kbd>R</kbd> 발음 듣기</span>' +
      '<span class="shortcut-divider" aria-hidden="true">·</span>' +
      '<span class="shortcut-item"><kbd>B</kbd> 북마크</span>' +
      '<span class="shortcut-divider" aria-hidden="true">·</span>' +
      '<span class="shortcut-item"><kbd>←</kbd><kbd>→</kbd> 이전/다음</span>';
    if (dom.pronounceBtn) {
      dom.pronounceBtn.title = "발음 듣기 (R)";
    }
  }

  function handleKeyDown(e) {
    if (session.isMenuOpen) {
      if (e.key === "Escape") {
        e.preventDefault();
        if (session.isMobileLayout && session.menuView === "cloud") {
          setMobileMenuView("main");
        } else {
          closeMobileMenu();
        }
      }
      return;
    }

    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target && e.target.closest("input, textarea, select")) return;

    // Study shortcuts apply only in study views
    if (session.activeTab === "wrong-archive") return;
    if (session.queue.length === 0) return;

    const key = e.key;
    const lower = key.toLowerCase();

    if (e.code === "Space" || key === " ") {
      e.preventDefault();
      flipCard();
      return;
    }

    if (key === "1" || key === "2" || key === "3") {
      e.preventDefault();
      const targetBtn = dom.ratingButtons.find(
        (btn) => btn.dataset.rating === key,
      );
      if (targetBtn) {
        targetBtn.style.transform = "scale(0.96)";
        setTimeout(() => {
          targetBtn.style.transform = "";
        }, 120);
      }
      rateCurrentCard(Number(key));
      return;
    }

    if (lower === "r" || lower === "s") {
      e.preventDefault();
      const word = getCurrentWord();
      if (word) {
        speakText(word.word, dom.pronounceBtn);
      }
      return;
    }

    if (lower === "b") {
      e.preventDefault();
      toggleBookmark();
      return;
    }

    if (key === "ArrowLeft") {
      e.preventDefault();
      navigateCard(-1);
      return;
    }

    if (key === "ArrowRight") {
      e.preventDefault();
      navigateCard(1);
    }
  }

  /* ========================================================================
     13. Event Listeners & Initialization
     ======================================================================== */
  function bindEvents() {
    // Header actions
    if (dom.cloudMenuBtn) {
      dom.cloudMenuBtn.addEventListener("click", toggleMobileMenu);
    }
    dom.themeToggleBtn.addEventListener("click", toggleTheme);
    dom.exportBtn.addEventListener("click", exportBackupJson);
    dom.importBtn.addEventListener("click", () => dom.importFileInput.click());
    dom.importFileInput.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      importBackupJson(file);
    });
    if (dom.resetAllDataBtn) {
      dom.resetAllDataBtn.addEventListener("click", resetAllAppData);
    }

    // Cloud account auth & sync controls
    if (dom.cloudAuthLoggedOut) {
      dom.cloudAuthLoggedOut.addEventListener("submit", handleCloudLogin);
    }
    if (dom.cloudSignupBtn) {
      dom.cloudSignupBtn.addEventListener("click", handleCloudSignup);
    }
    if (dom.cloudSyncNowBtn) {
      dom.cloudSyncNowBtn.addEventListener("click", () => {
        syncWithCloud({ silent: false });
      });
    }
    if (dom.cloudLogoutBtn) {
      dom.cloudLogoutBtn.addEventListener("click", handleCloudLogout);
    }

    // Network & visibility lifecycle hooks for seamless cross-device sync
    window.addEventListener("online", () => {
      if (!cloud.user || !cloud.client) return;
      if (cloud.pendingPush) {
        flushCloudPush({ silent: true });
      } else {
        syncWithCloud({ silent: true });
      }
    });
    window.addEventListener("offline", () => {
      if (cloud.user) {
        cloud.status = "offline";
        renderCloudUI();
      }
    });
    document.addEventListener("visibilitychange", () => {
      if (!cloud.user || !cloud.client) return;
      if (document.visibilityState === "hidden") {
        if (cloud.pendingPush) {
          flushCloudPush({ silent: true });
        }
      } else if (document.visibilityState === "visible") {
        if (
          !cloud.pendingPush &&
          !cloud.isSyncing &&
          Date.now() - cloud.lastPullCheckMs > CLOUD_PULL_COOLDOWN_MS
        ) {
          syncWithCloud({ silent: true });
        }
      }
    });

    // Dynamic Multi-Deck selector (event delegation)
    if (dom.deckSelector) {
      dom.deckSelector.addEventListener("click", (e) => {
        const deckBtn = e.target.closest("button[data-deck]");
        if (!deckBtn) return;
        switchDeck(deckBtn.dataset.deck);
      });
    }

    // Mobile expandable menu controls & responsive breakpoint listener
    if (dom.mobileMenuBtn) {
      dom.mobileMenuBtn.addEventListener("click", toggleMobileMenu);
    }
    if (dom.mobileStatusPill) {
      dom.mobileStatusPill.addEventListener("click", toggleMobileMenu);
    }
    if (dom.mobileMenuBackdrop) {
      dom.mobileMenuBackdrop.addEventListener("click", closeMobileMenu);
    }
    if (dom.mobileMenuCloseBtn) {
      dom.mobileMenuCloseBtn.addEventListener("click", closeMobileMenu);
    }
    if (dom.mobileMenuBackBtn) {
      dom.mobileMenuBackBtn.addEventListener("click", () => {
        setMobileMenuView("main");
      });
    }
    if (dom.mobileCloudEntryBtn) {
      dom.mobileCloudEntryBtn.addEventListener("click", () => {
        setMobileMenuView("cloud");
      });
    }

    const handleMediaChange = (event) => {
      syncResponsiveMenuPlacement(event.matches);
    };
    if (typeof mobileMediaQuery.addEventListener === "function") {
      mobileMediaQuery.addEventListener("change", handleMediaChange);
    } else if (typeof mobileMediaQuery.addListener === "function") {
      mobileMediaQuery.addListener(handleMediaChange);
    }

    // Segmented tabs & Stream filter
    dom.tabButtons.forEach((btn) => {
      btn.addEventListener("click", () => switchTab(btn.dataset.tab));
    });
    if (dom.wrongStudySubnav) {
      dom.wrongStudySubnav.addEventListener("click", (e) => {
        const scopeBtn = e.target.closest("button[data-wrong-scope]");
        if (!scopeBtn) return;
        switchWrongStudyScope(scopeBtn.dataset.wrongScope);
      });
    }
    dom.streamFilter.addEventListener("change", (e) =>
      handleStreamFilterChange(e.target.value),
    );

    // Deck controls
    if (dom.randomOrderToggle) {
      dom.randomOrderToggle.addEventListener("change", (e) => {
        toggleRandomOrder(e.target.checked);
      });
    }
    dom.shuffleBtn.addEventListener("click", shuffleCurrentSession);
    if (dom.restartSessionBtn) {
      dom.restartSessionBtn.addEventListener("click", startMasteredFreeReview);
    }
    dom.returnToAllBtn.addEventListener("click", () => {
      if (
        session.activeTab === "wrong-study" &&
        session.wrongStudyScope === "focus"
      ) {
        const hasAnyWrongInDeck = getActiveDeckWords().some((w) => {
          const wp = getWordProgress(w.id);
          if (session.streamFilter === "bookmarked" && !wp.bookmarked) {
            return false;
          }
          return isWrongFocusTarget(w.id);
        });
        if (hasAnyWrongInDeck) {
          switchWrongStudyScope("all");
          return;
        }
      }
      if (
        session.activeTab === "all" &&
        session.streamFilter === "smart-mix" &&
        session.activeDeck !== "all"
      ) {
        switchDeck("all");
        return;
      }
      session.streamFilter = "smart-mix";
      session.activeTab = "all";
      renderStreamFilterOptions();
      buildSessionQueue();
      renderAll({ animateEnter: true });
    });

    // Card pointer swipe & tap-to-flip
    dom.flashcard.addEventListener("pointerdown", onCardPointerDown);
    dom.flashcard.addEventListener("pointermove", onCardPointerMove);
    dom.flashcard.addEventListener("pointerup", onCardPointerUp);
    dom.flashcard.addEventListener("pointercancel", cancelSwipeTracking);

    // Keyboard accessibility when focus is directly on card (Enter key)
    dom.flashcard.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        flipCard();
      }
    });

    // Card inner buttons
    dom.pronounceBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const word = getCurrentWord();
      if (word) speakText(word.word, dom.pronounceBtn);
    });

    dom.pronounceExampleBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const word = getCurrentWord();
      if (word) speakText(word.example, dom.pronounceExampleBtn);
    });

    dom.bookmarkBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleBookmark();
    });

    // 3-Level elimination rating buttons
    dom.ratingButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        rateCurrentCard(Number(btn.dataset.rating));
      });
    });

    // Archive controls
    dom.hideMeaningToggle.addEventListener("change", (e) => {
      persistedState.hideMeanings = e.target.checked;
      dom.archiveList.classList.toggle(
        "hide-meanings",
        persistedState.hideMeanings,
      );
      if (!persistedState.hideMeanings) {
        dom.archiveList
          .querySelectorAll(".archive-item.is-revealed")
          .forEach((item) => item.classList.remove("is-revealed"));
      }
      savePersistedState({ markUpdated: false, syncCloud: false });
    });

    dom.resetWrongBtn.addEventListener("click", resetAllWrong);

    // Event delegation inside archive list (speak, reset-one, tap-to-peek)
    dom.archiveList.addEventListener("click", (e) => {
      const actionBtn = e.target.closest("button[data-action]");
      if (actionBtn) {
        const wordId = actionBtn.dataset.wordId;
        const action = actionBtn.dataset.action;

        if (action === "speak") {
          const word = WORD_MAP.get(wordId);
          if (word) speakText(word.word, actionBtn);
        } else if (action === "reset-one") {
          resetSingleWrong(wordId);
        }
        return;
      }

      // Tap blurred meaning to reveal/hide individually
      if (persistedState.hideMeanings) {
        const item = e.target.closest(".archive-item");
        if (item) {
          item.classList.toggle("is-revealed");
        }
      }
    });

    // Global keyboard shortcuts
    window.addEventListener("keydown", handleKeyDown);
  }

  function init() {
    loadDeckRegistry();
    persistedState = loadPersistedState();
    session.activeDeck =
      persistedState.selectedDeck === "all" ||
      DECK_MAP.has(persistedState.selectedDeck)
        ? persistedState.selectedDeck
        : "all";

    applyTheme(persistedState.theme);
    rebuildRandomOrderMap();
    syncRandomOrderUI();
    syncShortcutHintBar();
    renderDeckSelector();
    renderStreamFilterOptions();
    syncResponsiveMenuPlacement(mobileMediaQuery.matches);
    dom.hideMeaningToggle.checked = persistedState.hideMeanings;

    buildSessionQueue();
    bindEvents();
    renderAll({ animateEnter: true });
    initSupabaseSync();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
