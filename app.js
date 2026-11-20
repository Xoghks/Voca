(() => {
  "use strict";

  /* ========================================================================
     1. Constants & Storage Configuration
     ======================================================================== */
  const STORAGE_KEY = "lexicon_vocab_app_v1";
  const VALID_STATUSES = new Set(["new", "wrong", "hard", "good", "master"]);
  const TAB_ORDER = ["all", "wrong-study", "wrong-archive"];
  const FLY_OUT_DURATION_MS = 280;
  const ENTER_ANIMATION_MS = 380;
  const MOBILE_LAYOUT_QUERY =
    "(max-width: 720px), (max-height: 540px) and (max-width: 960px)";
  const mobileMediaQuery = window.matchMedia(MOBILE_LAYOUT_QUERY);

  const WORDS = Array.isArray(window.VOCAB_DATA)
    ? window.VOCAB_DATA
    : typeof VOCAB_DATA !== "undefined" && Array.isArray(VOCAB_DATA)
      ? VOCAB_DATA
      : [];

  const WORD_MAP = new Map(WORDS.map((item) => [item.id, item]));

  /* ========================================================================
     2. DOM Element References
     ======================================================================== */
  const dom = {
    html: document.documentElement,
    themeColorMeta: document.querySelector('meta[name="theme-color"]'),

    // Header & Layout Containers
    headerInner: document.querySelector(".header-inner"),
    headerActions: document.getElementById("headerActions"),
    exportBtn: document.getElementById("exportBtn"),
    importBtn: document.getElementById("importBtn"),
    importFileInput: document.getElementById("importFileInput"),
    themeToggleBtn: document.getElementById("themeToggleBtn"),
    themeToggleLabel: document.getElementById("themeToggleLabel"),
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
    mobileMenuCloseBtn: document.getElementById("mobileMenuCloseBtn"),
    menuSlotStats: document.getElementById("menuSlotStats"),
    menuSlotStudyControls: document.getElementById("menuSlotStudyControls"),
    menuSlotAppActions: document.getElementById("menuSlotAppActions"),

    // Main Containers & Stats
    appContainer: document.querySelector(".app-container"),
    statsWidget: document.getElementById("statsWidget"),
    statTodayCount: document.getElementById("statTodayCount"),
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
    dayFilter: document.getElementById("dayFilter"),

    // Study View
    studyView: document.getElementById("studyView"),
    deckMeta: document.querySelector(".deck-meta"),
    deckModeBadge: document.getElementById("deckModeBadge"),
    cardProgressText: document.getElementById("cardProgressText"),
    shuffleBtn: document.getElementById("shuffleBtn"),
    flashcardStage: document.getElementById("flashcardStage"),
    flashcard: document.getElementById("flashcard"),
    flashcardInner: document.querySelector("#flashcard .flashcard-inner"),

    // Flashcard Front / Back
    cardDayBadge: document.getElementById("cardDayBadge"),
    cardPos: document.getElementById("cardPos"),
    pronounceBtn: document.getElementById("pronounceBtn"),
    bookmarkBtn: document.getElementById("bookmarkBtn"),
    cardWord: document.getElementById("cardWord"),
    cardPhonetic: document.getElementById("cardPhonetic"),
    cardBackWord: document.getElementById("cardBackWord"),
    cardBackPos: document.getElementById("cardBackPos"),
    cardWrongBadge: document.getElementById("cardWrongBadge"),
    cardMeaning: document.getElementById("cardMeaning"),
    pronounceExampleBtn: document.getElementById("pronounceExampleBtn"),
    cardExample: document.getElementById("cardExample"),
    cardExampleKo: document.getElementById("cardExampleKo"),

    // Study Empty & Control Bar
    studyEmptyState: document.getElementById("studyEmptyState"),
    studyEmptyTitle: document.getElementById("studyEmptyTitle"),
    studyEmptyDesc: document.getElementById("studyEmptyDesc"),
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
      version: 1,
      theme: getSystemDefaultTheme(),
      hideMeanings: false,
      todayStats: {
        date: getLocalDateKey(),
        count: 0,
      },
      words: {},
    };
  }

  function sanitizeWordEntry(raw) {
    if (!raw || typeof raw !== "object") {
      return createDefaultWordProgress();
    }
    const wrongCount = Number.isFinite(Number(raw.wrongCount))
      ? Math.max(0, Math.floor(Number(raw.wrongCount)))
      : 0;
    const status = VALID_STATUSES.has(raw.status) ? raw.status : "new";
    const bookmarked = Boolean(raw.bookmarked);
    return { wrongCount, status, bookmarked };
  }

  function loadPersistedState() {
    const fallback = createDefaultState();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return fallback;

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return fallback;

      const state = createDefaultState();
      if (parsed.theme === "light" || parsed.theme === "dark") {
        state.theme = parsed.theme;
      }
      state.hideMeanings = Boolean(parsed.hideMeanings);

      const todayKey = getLocalDateKey();
      if (
        parsed.todayStats &&
        typeof parsed.todayStats === "object" &&
        parsed.todayStats.date === todayKey &&
        Number.isFinite(Number(parsed.todayStats.count))
      ) {
        state.todayStats = {
          date: todayKey,
          count: Math.max(0, Math.floor(Number(parsed.todayStats.count))),
        };
      }

      if (parsed.words && typeof parsed.words === "object") {
        for (const word of WORDS) {
          const entry = parsed.words[String(word.id)] ?? parsed.words[word.id];
          if (entry) {
            state.words[word.id] = sanitizeWordEntry(entry);
          }
        }
      }

      return state;
    } catch (error) {
      console.error("Failed to load state from localStorage:", error);
      return fallback;
    }
  }

  let persistedState = loadPersistedState();

  // Ephemeral UI / Session State
  const session = {
    activeTab: "all", // 'all' | 'wrong-study' | 'wrong-archive'
    dayFilter: "all", // 'all' | '1' | '2' | '3' | 'bookmarked'
    queue: [],
    currentIndex: 0,
    isFlipped: false,
    isAnimating: false,
    isMobileLayout: false,
    isMenuOpen: false,
    menuCloseTimer: null,
    toastTimer: null,
    enterTimer: null,
  };

  function ensureTodayStats() {
    const todayKey = getLocalDateKey();
    if (persistedState.todayStats.date !== todayKey) {
      persistedState.todayStats = { date: todayKey, count: 0 };
    }
  }

  function getWordProgress(wordId) {
    if (!persistedState.words[wordId]) {
      persistedState.words[wordId] = createDefaultWordProgress();
    }
    return persistedState.words[wordId];
  }

  function savePersistedState() {
    try {
      ensureTodayStats();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persistedState));
    } catch (error) {
      console.error("Failed to save state to localStorage:", error);
      showToast("브라우저 저장 공간에 기록하지 못했습니다.", "error");
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
        resolved === "dark" ? "#000000" : "#f5f5f7",
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
    savePersistedState();
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
     7. Data Filtering, Wrong-Note Predicate & Queue Management
     ======================================================================== */
  function isWrongTarget(wordId) {
    const progress = getWordProgress(wordId);
    return (
      progress.wrongCount >= 1 ||
      progress.status === "wrong" ||
      progress.status === "hard"
    );
  }

  function matchesDayFilter(word) {
    if (session.dayFilter === "all") return true;
    if (session.dayFilter === "bookmarked") {
      return getWordProgress(word.id).bookmarked;
    }
    return String(word.day) === String(session.dayFilter);
  }

  function getFilteredPool(tab = session.activeTab) {
    return WORDS.filter((word) => {
      if (!matchesDayFilter(word)) return false;
      if (tab === "wrong-study" || tab === "wrong-archive") {
        return isWrongTarget(word.id);
      }
      return true;
    });
  }

  function getAllWrongWords() {
    return WORDS.filter((word) => isWrongTarget(word.id));
  }

  function buildSessionQueue(options = {}) {
    const { preserveCurrentWordId = null, shuffle = false } = options;
    const pool = getFilteredPool(session.activeTab);
    let ids = pool.map((word) => word.id);

    if (session.activeTab === "wrong-study" && !shuffle) {
      // Prioritize higher wrong counts first in focused wrong-answer study
      ids.sort((a, b) => {
        const pa = getWordProgress(a);
        const pb = getWordProgress(b);
        if (pb.wrongCount !== pa.wrongCount)
          return pb.wrongCount - pa.wrongCount;
        return a - b;
      });
    }

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

  function shuffleCurrentSession() {
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
     7.5. Mobile Expandable Menu & Responsive Placement
     ======================================================================== */
  function openMobileMenu() {
    if (!session.isMobileLayout || !dom.mobileMenu) return;
    if (session.menuCloseTimer) {
      clearTimeout(session.menuCloseTimer);
      session.menuCloseTimer = null;
    }

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
    if (dom.mobileMenuBtnText) {
      dom.mobileMenuBtnText.textContent = "메뉴";
    }

    if (immediate) {
      dom.mobileMenu.hidden = true;
      if (dom.mobileMenuBackdrop) {
        dom.mobileMenuBackdrop.hidden = true;
      }
      return;
    }

    session.menuCloseTimer = setTimeout(() => {
      if (!session.isMenuOpen) {
        dom.mobileMenu.hidden = true;
        if (dom.mobileMenuBackdrop) {
          dom.mobileMenuBackdrop.hidden = true;
        }
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

    if (session.isMobileLayout) {
      if (dom.statsWidget && dom.menuSlotStats) {
        dom.menuSlotStats.appendChild(dom.statsWidget);
      }
      if (dom.filterWrapper && dom.menuSlotStudyControls) {
        dom.menuSlotStudyControls.appendChild(dom.filterWrapper);
      }
      if (dom.shuffleBtn && dom.menuSlotStudyControls) {
        dom.menuSlotStudyControls.appendChild(dom.shuffleBtn);
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
      if (dom.filterWrapper && dom.navigationBar) {
        dom.navigationBar.appendChild(dom.filterWrapper);
      }
      if (dom.shuffleBtn && dom.deckMeta) {
        dom.deckMeta.appendChild(dom.shuffleBtn);
      }
    }

    renderViewVisibility();
  }

  function renderMobileHeaderStatus() {
    if (!dom.mobileStatusPill || !dom.mobileProgressText) return;

    const isFiltered = session.dayFilter !== "all";
    dom.mobileStatusPill.classList.toggle("has-filter", isFiltered);

    if (dom.mobileFilterTag) {
      if (session.dayFilter === "bookmarked") {
        dom.mobileFilterTag.textContent = "★ 북마크";
        dom.mobileFilterTag.hidden = false;
      } else if (isFiltered) {
        dom.mobileFilterTag.textContent = `Day ${session.dayFilter}`;
        dom.mobileFilterTag.hidden = false;
      } else {
        dom.mobileFilterTag.textContent = "";
        dom.mobileFilterTag.hidden = true;
      }
    }

    if (dom.mobileMenuDot) {
      dom.mobileMenuDot.hidden = !isFiltered;
    }

    if (session.activeTab === "wrong-archive") {
      const count = getFilteredPool("wrong-archive").length;
      dom.mobileProgressText.textContent = `오답 ${count}단어`;
    } else if (session.queue.length === 0) {
      dom.mobileProgressText.textContent = "0 / 0";
    } else {
      dom.mobileProgressText.textContent = `${session.currentIndex + 1} / ${session.queue.length}`;
    }
  }

  /* ========================================================================
     8. Rendering Functions
     ======================================================================== */
  function renderStats() {
    ensureTodayStats();
    const totalWords = WORDS.length;
    let masteredCount = 0;
    let wrongNoteCount = 0;

    for (const word of WORDS) {
      const progress = getWordProgress(word.id);
      if (progress.status === "master") masteredCount += 1;
      if (isWrongTarget(word.id)) wrongNoteCount += 1;
    }

    const masteryPercent =
      totalWords > 0 ? Math.round((masteredCount / totalWords) * 100) : 0;

    dom.statTodayCount.textContent = String(persistedState.todayStats.count);
    dom.statMasteryText.textContent = `${masteryPercent}% (${masteredCount}/${totalWords})`;
    dom.statMasteryBar.style.width = `${masteryPercent}%`;
    if (dom.headerMasteryBar) {
      dom.headerMasteryBar.style.width = `${masteryPercent}%`;
    }
    dom.statMasteryTrack.setAttribute("aria-valuenow", String(masteryPercent));
    dom.statWrongCount.textContent = String(wrongNoteCount);

    // Update segmented tab badges
    const updateBadge = (el, count) => {
      if (!el) return;
      el.textContent = String(count);
      el.hidden = count === 0;
    };
    updateBadge(dom.tabWrongStudyCount, wrongNoteCount);
    updateBadge(dom.tabArchiveCount, wrongNoteCount);

    // Update Day filter total label
    const allOption = dom.dayFilter.querySelector('option[value="all"]');
    if (allOption) {
      allOption.textContent = `전체 Day (${totalWords})`;
    }
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
    dom.deckModeBadge.textContent = isWrongMode
      ? "오답 집중 공략"
      : "전체 학습";
    dom.deckModeBadge.classList.toggle("is-wrong-mode", isWrongMode);

    const word = getCurrentWord();
    const hasWords = Boolean(word);

    dom.flashcardStage.hidden = !hasWords;
    dom.controlBar.hidden = !hasWords;
    dom.studyEmptyState.hidden = hasWords;
    dom.shuffleBtn.disabled = session.queue.length <= 1;

    if (!hasWords) {
      dom.cardProgressText.textContent = "0 / 0";
      if (isWrongMode) {
        dom.studyEmptyTitle.textContent = "공략할 오답 단어가 없습니다";
        dom.studyEmptyDesc.textContent =
          session.dayFilter === "all"
            ? "현재 누적된 오답 단어가 없습니다. 전체 학습에서 단어를 암기하며 어려운 단어를 모아 보세요."
            : "선택한 필터 조건에 해당하는 오답 단어가 없습니다. 필터를 변경하거나 전체 학습으로 이동해 보세요.";
      } else if (session.dayFilter === "bookmarked") {
        dom.studyEmptyTitle.textContent = "북마크한 단어가 없습니다";
        dom.studyEmptyDesc.textContent =
          "학습 중 카드 우측 상단의 별표(B)를 눌러 중요 단어를 북마크해 보세요.";
      } else {
        dom.studyEmptyTitle.textContent = "학습할 단어가 없습니다";
        dom.studyEmptyDesc.textContent =
          "다른 Day 필터를 선택해 학습을 이어가 보세요.";
      }
      renderMobileHeaderStatus();
      return;
    }

    const progress = getWordProgress(word.id);

    dom.cardProgressText.textContent = `${session.currentIndex + 1} / ${session.queue.length}`;

    // Front face
    dom.cardDayBadge.textContent = `Day ${word.day}`;
    dom.cardPos.textContent = word.pos;
    dom.cardWord.textContent = word.word;
    dom.cardPhonetic.textContent = word.phonetic;

    dom.bookmarkBtn.classList.toggle("is-bookmarked", progress.bookmarked);
    dom.bookmarkBtn.setAttribute("aria-pressed", String(progress.bookmarked));

    // Back face
    dom.cardBackWord.textContent = word.word;
    dom.cardBackPos.textContent = word.pos;
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
    const wrongWords = getFilteredPool("wrong-archive").sort((a, b) => {
      const pa = getWordProgress(a.id);
      const pb = getWordProgress(b.id);
      if (pb.wrongCount !== pa.wrongCount) return pb.wrongCount - pa.wrongCount;

      const priority = { wrong: 2, hard: 1 };
      const diff = (priority[pb.status] || 0) - (priority[pa.status] || 0);
      if (diff !== 0) return diff;
      return a.id - b.id;
    });

    const totalWrongAll = getAllWrongWords().length;
    const filterNote =
      session.dayFilter === "all"
        ? ""
        : session.dayFilter === "bookmarked"
          ? " (북마크 필터)"
          : ` (Day ${session.dayFilter})`;

    dom.archiveSummaryText.textContent = `오답 횟수 높은 순 · 총 ${wrongWords.length}단어${filterNote}`;
    dom.hideMeaningToggle.checked = persistedState.hideMeanings;
    dom.archiveList.classList.toggle(
      "hide-meanings",
      persistedState.hideMeanings,
    );
    dom.resetWrongBtn.disabled = totalWrongAll === 0;

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

      const daySpan = document.createElement("span");
      daySpan.className = "archive-day";
      daySpan.textContent = `Day ${word.day}`;

      topDiv.append(wordSpan, phoneticSpan, posSpan, daySpan);

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

      // Right action controls
      const actionsDiv = document.createElement("div");
      actionsDiv.className = "archive-item-actions";

      const wrongPill = document.createElement("span");
      wrongPill.className = "archive-wrong-pill";
      wrongPill.textContent =
        progress.wrongCount > 0 ? `오답 ${progress.wrongCount}회` : "복습 필요";

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

      actionsDiv.append(wrongPill, audioBtn, removeBtn);
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
    if (![1, 2, 3, 4].includes(rating)) return;

    session.isAnimating = true;
    const progress = getWordProgress(word.id);

    ensureTodayStats();
    persistedState.todayStats.count += 1;

    let toastMsg = "";
    let toastVariant = "default";

    if (rating === 1) {
      // 1: 모름 -> wrongCount + 1, status 'wrong', 5장 뒤에 즉시 재삽입
      progress.wrongCount += 1;
      progress.status = "wrong";
      const insertIndex = Math.min(
        session.currentIndex + 6,
        session.queue.length,
      );
      session.queue.splice(insertIndex, 0, word.id);
      toastMsg = `"${word.word}" 오답 누적 (${progress.wrongCount}회) · 5장 뒤 재출제`;
      toastVariant = "error";
    } else if (rating === 2) {
      // 2: 애매함 -> wrongCount + 1, status 'hard', 세션 큐 맨 뒤로 이동
      progress.wrongCount += 1;
      progress.status = "hard";
      session.queue.push(word.id);
      toastMsg = `"${word.word}" 애매함 (${progress.wrongCount}회) · 큐 맨 뒤로 이동`;
    } else if (rating === 3) {
      // 3: 알겠음 -> status 'good'
      progress.status = "good";
      toastMsg = `"${word.word}" 복습 완료`;
    } else if (rating === 4) {
      // 4: 완벽함 -> status 'master'
      progress.status = "master";
      toastMsg = `"${word.word}" 마스터 달성!`;
      toastVariant = "success";
    }

    savePersistedState();
    renderStats();
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

    setTimeout(() => {
      session.currentIndex += 1;

      if (session.currentIndex >= session.queue.length) {
        buildSessionQueue();
        if (session.queue.length > 0) {
          showToast(
            "현재 덱을 모두 완료했습니다! 처음부터 다시 시작합니다.",
            "success",
          );
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

    // If user unbookmarks while inside the bookmarked-only filter, refresh queue
    if (session.dayFilter === "bookmarked" && !progress.bookmarked) {
      session.queue = session.queue.filter((id) => id !== word.id);
      if (session.currentIndex >= session.queue.length) {
        session.currentIndex = Math.max(0, session.queue.length - 1);
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
    if (progress.status === "wrong" || progress.status === "hard") {
      progress.status = "new";
    }

    savePersistedState();
    renderStats();
    renderArchive();
    showToast(`"${word.word}" 오답 기록을 초기화했습니다.`, "success");
  }

  function resetAllWrong() {
    const wrongWords = getAllWrongWords();
    if (wrongWords.length === 0) return;

    const confirmed = window.confirm(
      `누적된 오답 단어 ${wrongWords.length}개의 오답 기록을 모두 초기화할까요?`,
    );
    if (!confirmed) return;

    for (const word of wrongWords) {
      const progress = getWordProgress(word.id);
      progress.wrongCount = 0;
      if (progress.status === "wrong" || progress.status === "hard") {
        progress.status = "new";
      }
    }

    savePersistedState();
    buildSessionQueue();
    renderAll();
    showToast("모든 오답 기록을 초기화했습니다.", "success");
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

  function handleDayFilterChange(nextFilter) {
    session.dayFilter = nextFilter;
    clearSwipeClasses();
    resetCardFlipInstant();

    if (session.activeTab !== "wrong-archive") {
      buildSessionQueue();
    }

    renderAll({ animateEnter: session.activeTab !== "wrong-archive" });
    closeMobileMenu();
  }

  /* ========================================================================
     10. JSON Export & Import (Backup / Restore)
     ======================================================================== */
  function exportBackupJson() {
    ensureTodayStats();
    const payload = {
      app: "Lexicon Bridge Vocabulary",
      exportedAt: new Date().toISOString(),
      version: 1,
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
        nextState.hideMeanings = Boolean(source.hideMeanings);

        if (
          source.todayStats &&
          typeof source.todayStats === "object" &&
          typeof source.todayStats.date === "string" &&
          Number.isFinite(Number(source.todayStats.count))
        ) {
          const todayKey = getLocalDateKey();
          nextState.todayStats = {
            date: todayKey,
            count:
              source.todayStats.date === todayKey
                ? Math.max(0, Math.floor(Number(source.todayStats.count)))
                : 0,
          };
        }

        let restoredCount = 0;
        for (const word of WORDS) {
          const rawEntry =
            source.words[String(word.id)] ?? source.words[word.id];
          if (rawEntry) {
            nextState.words[word.id] = sanitizeWordEntry(rawEntry);
            restoredCount += 1;
          }
        }

        persistedState = nextState;
        applyTheme(persistedState.theme);
        savePersistedState();
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
      '<span class="shortcut-item"><kbd>1</kbd>–<kbd>4</kbd> 기억 평가</span>' +
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
        closeMobileMenu();
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

    if (key === "1" || key === "2" || key === "3" || key === "4") {
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
    dom.themeToggleBtn.addEventListener("click", toggleTheme);
    dom.exportBtn.addEventListener("click", exportBackupJson);
    dom.importBtn.addEventListener("click", () => dom.importFileInput.click());
    dom.importFileInput.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      importBackupJson(file);
    });

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

    const handleMediaChange = (event) => {
      syncResponsiveMenuPlacement(event.matches);
    };
    if (typeof mobileMediaQuery.addEventListener === "function") {
      mobileMediaQuery.addEventListener("change", handleMediaChange);
    } else if (typeof mobileMediaQuery.addListener === "function") {
      mobileMediaQuery.addListener(handleMediaChange);
    }

    // Segmented tabs & Day filter
    dom.tabButtons.forEach((btn) => {
      btn.addEventListener("click", () => switchTab(btn.dataset.tab));
    });
    dom.dayFilter.addEventListener("change", (e) =>
      handleDayFilterChange(e.target.value),
    );

    // Deck controls
    dom.shuffleBtn.addEventListener("click", shuffleCurrentSession);
    dom.returnToAllBtn.addEventListener("click", () => {
      session.dayFilter = "all";
      dom.dayFilter.value = "all";
      session.activeTab = "all";
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

    // 4-Level rating buttons
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
      savePersistedState();
    });

    dom.resetWrongBtn.addEventListener("click", resetAllWrong);

    // Event delegation inside archive list (speak, reset-one, tap-to-peek)
    dom.archiveList.addEventListener("click", (e) => {
      const actionBtn = e.target.closest("button[data-action]");
      if (actionBtn) {
        const wordId = Number(actionBtn.dataset.wordId);
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
    applyTheme(persistedState.theme);
    syncShortcutHintBar();
    syncResponsiveMenuPlacement(mobileMediaQuery.matches);
    dom.dayFilter.value = session.dayFilter;
    dom.hideMeaningToggle.checked = persistedState.hideMeanings;

    buildSessionQueue();
    bindEvents();
    renderAll({ animateEnter: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
