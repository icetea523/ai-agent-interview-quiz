const { useState, useEffect, useMemo, useCallback, useRef } = React;

// ========== Data Loading ==========
async function loadQuestions() {
  try {
    const res = await fetch('assets/questions.json');
    const data = await res.json();
    // Handle both v1 (single set) and v2 (collections) formats
    if (data.collections) {
      return data;
    }
    // v1 format: wrap into a single collection
    return {
      version: '2.0',
      collections: [{
        id: 'agent-general',
        name: 'AI Agent 高频面试题',
        icon: '🧠',
        desc: '12 大模块 · 55 道经典题',
        categories: data.categories || []
      }]
    };
  } catch (e) {
    console.error('Failed to load questions:', e);
    return null;
  }
}

// ========== Icons ==========
const Icon = {
  Home: () => (
    <svg viewBox="0 0 24 24"><path d="M3 12L12 3l9 9M5 10v10a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V10"/></svg>
  ),
  List: () => (
    <svg viewBox="0 0 24 24"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>
  ),
  Stats: () => (
    <svg viewBox="0 0 24 24"><path d="M3 3v18h18M7 14l4-4 4 4 5-5"/></svg>
  ),
  ChevronLeft: () => (
    <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
  ),
  ChevronRight: () => (
    <svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
  ),
  Check: () => (
    <svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>
  ),
  Search: () => (
    <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
  ),
  Star: () => (
    <svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
  ),
  Shuffle: () => (
    <svg viewBox="0 0 24 24"><path d="M16 3h5v5M4 20l17-17M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>
  ),
  Java: () => (
    <svg viewBox="0 0 24 24"><path d="M9 2v2M15 2v2M5 6h14v2a7 7 0 01-7 7 7 7 0 01-7-7V6zM8 17c0 2.5 2 4 4 4s4-1.5 4-4M10 21v2M14 21v2"/></svg>
  ),
  Refresh: () => (
    <svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 0115.5-6.3L21 8M21 3v5h-5M21 12a9 9 0 01-15.5 6.3L3 16M3 21v-5h5"/></svg>
  ),
  Eye: () => (
    <svg viewBox="0 0 24 24"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>
  ),
  Fire: () => (
    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c-1.5 3-2 4.5-2 6a5 5 0 0010 0c0-2-1.5-4-3-5 1 2 1 3 1 4a3 3 0 01-6 0c0-2.5 1-4.5 2-5z"/></svg>
  ),
};

// ========== Utility Functions ==========
const STORAGE_KEY = 'agent-interview-app-state-v3';
const OLD_STORAGE_KEYS = [
  'agent-interview-app-state-v2',
  'agent-interview-app-state',
  'interview-app-state'
];

function normalizeState(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const defaults = {
    completed: {},
    starred: {},
    seenAnswer: {},
    javaMode: true,
    activeCollectionId: 'agent-general',
    lastView: 'home'
  };
  const normalized = { ...defaults };
  // Only copy known keys, discard anything else
  for (const key of Object.keys(defaults)) {
    if (raw[key] !== undefined) {
      if (key === 'completed' || key === 'starred' || key === 'seenAnswer') {
        // Ensure these are plain objects
        if (raw[key] && typeof raw[key] === 'object' && !Array.isArray(raw[key])) {
          normalized[key] = raw[key];
        }
      } else if (key === 'javaMode') {
        normalized[key] = !!raw[key];
      } else if (typeof raw[key] === typeof defaults[key]) {
        normalized[key] = raw[key];
      }
    }
  }
  return normalized;
}

function loadState() {
  // Try v3 first
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const normalized = normalizeState(parsed);
      if (normalized) return normalized;
    }
  } catch (e) { console.warn('Failed to load v3 state', e); }

  // Try to migrate from old storage keys
  for (const oldKey of OLD_STORAGE_KEYS) {
    try {
      const raw = localStorage.getItem(oldKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        const normalized = normalizeState(parsed);
        if (normalized) {
          console.log('Migrated state from', oldKey);
          // Save migrated state to v3 key
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized)); } catch (e2) {}
          return normalized;
        }
      }
    } catch (e) { console.warn('Failed to migrate from', oldKey, e); }
  }

  // Clean up all old keys to avoid future confusion
  try {
    OLD_STORAGE_KEYS.forEach(k => localStorage.removeItem(k));
  } catch (e) {}

  return {
    completed: {},
    starred: {},
    seenAnswer: {},
    javaMode: true,
    activeCollectionId: 'agent-general',
    lastView: 'home'
  };
}

function saveState(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
}

function flattenQuestions(categories) {
  const flat = [];
  categories.forEach(cat => {
    cat.questions.forEach(q => {
      flat.push({ ...q, categoryId: cat.id, categoryName: cat.name, categoryIcon: cat.icon });
    });
  });
  return flat;
}

function flattenAllCollections(collections) {
  const flat = [];
  collections.forEach(col => {
    col.categories.forEach(cat => {
      cat.questions.forEach(q => {
        flat.push({
          ...q,
          categoryId: cat.id,
          categoryName: cat.name,
          categoryIcon: cat.icon,
          collectionId: col.id,
          collectionName: col.name,
          collectionIcon: col.icon,
        });
      });
    });
  });
  return flat;
}

function formatAnswer(text) {
  let html = text
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // Convert lines starting with "- " to list items when they're part of a list
    .replace(/^- (.+)$/gm, '<li style="margin-left: 4px;">$1</li>')
    // Wrap consecutive <li>s in <ul>
    .replace(/((?:<li[^>]*>.*?<\/li>\s*)+)/g, '<ul style="padding-left: 20px; margin: 8px 0; list-style: disc;">$1</ul>');
  return html;
}

// Frequency badge helper
function getFrequencyLevel(freq) {
  if (!freq) return 0;
  if (freq.includes('极高')) return 3;
  if (freq.includes('高')) return 2;
  if (freq.includes('中')) return 1;
  return 0;
}

function FrequencyBadge({ frequency }) {
  const level = getFrequencyLevel(frequency);
  if (!level) return null;
  const flames = '🔥'.repeat(level);
  return (
    <span
      className="frequency-badge"
      title={`出镜率：${frequency}`}
    >
      {flames}
    </span>
  );
}

// ========== Main App ==========
function App() {
  const [data, setData] = useState(null);
  const [view, setView] = useState('home');
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState(null);
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [shuffleMode, setShuffleMode] = useState(false);
  const [state, setState] = useState(() => loadState());
  const [showAnswer, setShowAnswer] = useState(false);

  // Load data
  useEffect(() => {
    loadQuestions().then(d => {
      if (d) {
        setData(d);
        // Set default active collection if not set
        if (!state.activeCollectionId && d.collections && d.collections.length > 0) {
          setState(prev => ({ ...prev, activeCollectionId: d.collections[0].id }));
        }
      }
    });
  }, []);

  // Persist state
  useEffect(() => { saveState(state); }, [state]);

  const activeCollectionId = state.activeCollectionId;

  const activeCollection = useMemo(() => {
    if (!data || !data.collections) return null;
    return data.collections.find(c => c.id === activeCollectionId) || data.collections[0];
  }, [data, activeCollectionId]);

  const activeCategories = useMemo(() => activeCollection ? activeCollection.categories : [], [activeCollection]);

  // All questions in active collection
  const collectionQuestions = useMemo(() => flattenQuestions(activeCategories), [activeCategories]);

  // All questions across all collections
  const allQuestions = useMemo(() => data ? flattenAllCollections(data.collections) : [], [data]);

  const totalQuestions = collectionQuestions.length;
  const completedCount = useMemo(() => collectionQuestions.filter(q => state.completed[q.id]).length, [collectionQuestions, state.completed]);
  const starredCount = useMemo(() => collectionQuestions.filter(q => state.starred[q.id]).length, [collectionQuestions, state.starred]);
  const javaCount = useMemo(() => collectionQuestions.filter(q => q.javaAngle).length, [collectionQuestions]);

  // Get questions for current category (within active collection)
  const currentCategoryQuestions = useMemo(() => {
    if (!activeCategories.length || !selectedCategoryId || selectedCategoryId === '__filtered__') return [];
    const cat = activeCategories.find(c => c.id === selectedCategoryId);
    if (!cat) return [];
    return cat.questions.map(q => ({
      ...q,
      categoryId: cat.id,
      categoryName: cat.name,
      categoryIcon: cat.icon,
      collectionId: activeCollectionId,
      collectionName: activeCollection?.name,
      collectionIcon: activeCollection?.icon,
    }));
  }, [activeCategories, selectedCategoryId, activeCollectionId, activeCollection]);

  // Filtered list for list view (within active collection)
  const filteredQuestions = useMemo(() => {
    let list = collectionQuestions;
    if (difficultyFilter !== 'all') {
      list = list.filter(q => q.d === difficultyFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(qItem =>
        qItem.q.toLowerCase().includes(q) ||
        qItem.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    if (shuffleMode) {
      list = [...list].sort(() => Math.random() - 0.5);
    }
    return list;
  }, [collectionQuestions, difficultyFilter, searchQuery, shuffleMode]);

  // ===== Detail view question source (MUST be before goPrev/goNext callbacks) =====
  const detailQuestions = selectedCategoryId === '__filtered__' ? filteredQuestions : currentCategoryQuestions;

  // Find the current question by id
  const detailQuestion = useMemo(() => {
    if (!selectedQuestionId || !detailQuestions.length) return null;
    return detailQuestions.find(q => q.id === selectedQuestionId) || null;
  }, [detailQuestions, selectedQuestionId]);

  // Current index (derived, for display and canPrev/canNext)
  const selectedQuestionIndex = useMemo(() => {
    if (!selectedQuestionId || !detailQuestions.length) return 0;
    const idx = detailQuestions.findIndex(q => q.id === selectedQuestionId);
    return idx >= 0 ? idx : 0;
  }, [detailQuestions, selectedQuestionId]);

  const setActiveCollection = useCallback((colId) => {
    setState(prev => ({ ...prev, activeCollectionId: colId }));
    setSelectedCategoryId(null);
    setDifficultyFilter('all');
    setSearchQuery('');
    setShuffleMode(false);
  }, []);

  const toggleCompleted = useCallback((qId) => {
    setState(prev => ({ ...prev, completed: { ...prev.completed, [qId]: !prev.completed[qId] } }));
  }, []);

  const toggleStarred = useCallback((qId) => {
    setState(prev => ({ ...prev, starred: { ...prev.starred, [qId]: !prev.starred[qId] } }));
  }, []);

  const resetProgress = useCallback(() => {
    if (confirm('确定要重置所有学习进度吗？此操作不可撤销。')) {
      setState(prev => ({ ...prev, completed: {}, seenAnswer: {} }));
    }
  }, []);

  const navigateToCategory = useCallback((catId) => {
    setSelectedCategoryId(catId);
    // Find first question id in this category
    setSelectedQuestionId(null); // will be set by effect
    setShowAnswer(false);
    setView('detail');
  }, []);

  const goPrev = useCallback(() => {
    if (!selectedQuestionId || detailQuestions.length === 0) return;
    const idx = detailQuestions.findIndex(q => q.id === selectedQuestionId);
    if (idx > 0) {
      setSelectedQuestionId(detailQuestions[idx - 1].id);
      setShowAnswer(false);
    }
  }, [selectedQuestionId, detailQuestions]);

  const goNext = useCallback(() => {
    if (!selectedQuestionId || detailQuestions.length === 0) return;
    const idx = detailQuestions.findIndex(q => q.id === selectedQuestionId);
    if (idx >= 0 && idx < detailQuestions.length - 1) {
      setSelectedQuestionId(detailQuestions[idx + 1].id);
      setShowAnswer(false);
    }
  }, [selectedQuestionId, detailQuestions]);

  const openQuestionFromList = useCallback((qId) => {
    setSelectedCategoryId('__filtered__');
    setSelectedQuestionId(qId);
    setShowAnswer(false);
    setView('detail');
  }, []);

  // When entering a category from home (selectedQuestionId is null),
  // auto-select the first question
  useEffect(() => {
    if (
      view === 'detail' &&
      selectedCategoryId &&
      selectedCategoryId !== '__filtered__' &&
      (!selectedQuestionId || !detailQuestions.find(q => q.id === selectedQuestionId)) &&
      detailQuestions.length > 0
    ) {
      setSelectedQuestionId(detailQuestions[0].id);
    }
  }, [view, selectedCategoryId, selectedQuestionId, detailQuestions]);

  if (!data) {
    return (
      <div className="app">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-tertiary)' }}>
          正在加载题库...
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {view === 'home' && (
        <HomeView
          collections={data.collections}
          activeCollection={activeCollection}
          activeCategories={activeCategories}
          completedCount={completedCount}
          totalQuestions={totalQuestions}
          starredCount={starredCount}
          javaCount={javaCount}
          state={state}
          onCollectionChange={setActiveCollection}
          onCategoryClick={navigateToCategory}
          onAllClick={() => setView('list')}
        />
      )}

      {view === 'list' && (
        <ListView
          activeCollection={activeCollection}
          allQuestions={collectionQuestions}
          filteredQuestions={filteredQuestions}
          difficultyFilter={difficultyFilter}
          setDifficultyFilter={setDifficultyFilter}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          shuffleMode={shuffleMode}
          setShuffleMode={setShuffleMode}
          state={state}
          onQuestionClick={(qId) => openQuestionFromList(qId)}
        />
      )}

      {view === 'detail' && detailQuestion && (
        <DetailView
          question={detailQuestion}
          questionIndex={selectedQuestionIndex}
          total={detailQuestions.length}
          showAnswer={showAnswer}
          setShowAnswer={setShowAnswer}
          isCompleted={!!state.completed[detailQuestion.id]}
          isStarred={!!state.starred[detailQuestion.id]}
          showJava={state.javaMode}
          onToggleCompleted={() => toggleCompleted(detailQuestion.id)}
          onToggleStar={() => toggleStarred(detailQuestion.id)}
          onPrev={goPrev}
          onNext={goNext}
          onBack={() => {
            if (selectedCategoryId === '__filtered__') {
              setView('list');
            } else {
              setView('home');
            }
          }}
          canPrev={selectedQuestionIndex > 0}
          canNext={selectedQuestionIndex < detailQuestions.length - 1}
        />
      )}

      {view === 'stats' && (
        <StatsView
          activeCollection={activeCollection}
          activeCategories={activeCategories}
          allQuestions={collectionQuestions}
          completedCount={completedCount}
          totalQuestions={totalQuestions}
          state={state}
          onReset={resetProgress}
          onCategoryClick={navigateToCategory}
        />
      )}

      {view !== 'detail' && (
        <div className="bottom-nav">
          <button className={`nav-item ${view === 'home' ? 'active' : ''}`} onClick={() => setView('home')}>
            <Icon.Home />
            <span>首页</span>
          </button>
          <button className={`nav-item ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')}>
            <Icon.List />
            <span>题库</span>
          </button>
          <button className={`nav-item ${view === 'stats' ? 'active' : ''}`} onClick={() => setView('stats')}>
            <Icon.Stats />
            <span>进度</span>
          </button>
        </div>
      )}
    </div>
  );
}

// ========== Home View ==========
function HomeView({ collections, activeCollection, activeCategories, completedCount, totalQuestions, starredCount, javaCount, state, onCollectionChange, onCategoryClick }) {
  const progressPct = totalQuestions > 0 ? Math.round((completedCount / totalQuestions) * 100) : 0;

  return (
    <>
      <div className="app-header">
        <div className="header-title-group">
          <div className="header-title">地铁面试题库</div>
          <div className="header-subtitle">碎片时间高效复习</div>
        </div>
        <div className="header-actions">
          <button className="icon-btn" onClick={() => alert('先看题自测 → 点击揭示答案 → 标记已掌握。进度自动保存。')}>
            <Icon.Eye />
          </button>
        </div>
      </div>

      <div className="app-main">
        <div className="home-view">
          {/* Collection Selector */}
          <div className="collection-selector">
            {collections.map(col => {
              const colQCount = col.categories.reduce((sum, c) => sum + c.questions.length, 0);
              const colCompleted = col.categories.reduce((sum, c) =>
                sum + c.questions.filter(q => state.completed[q.id]).length, 0);
              const isActive = col.id === activeCollection.id;
              return (
                <button
                  key={col.id}
                  className={`collection-card ${isActive ? 'active' : ''}`}
                  onClick={() => onCollectionChange(col.id)}
                >
                  <div className="collection-card-icon">{col.icon}</div>
                  <div className="collection-card-info">
                    <div className="collection-card-name">{col.name}</div>
                    <div className="collection-card-meta">
                      <span>{colCompleted}/{colQCount} 题</span>
                      <span className="collection-card-pct">{Math.round((colCompleted / colQCount) * 100)}%</span>
                    </div>
                  </div>
                  <div className="collection-card-check">
                    {isActive && <Icon.Check />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Hero / Progress */}
          <div className="hero-card fade-in">
            <div className="hero-title">{activeCollection.icon} {activeCollection.name}</div>
            <div className="hero-desc">已掌握 {completedCount} / {totalQuestions} 道</div>
            <div className="hero-stats">
              <div className="hero-stat">
                <span className="hero-stat-num">{progressPct}%</span>
                <span className="hero-stat-label">总进度</span>
              </div>
              <div className="hero-stat">
                <span className="hero-stat-num">{starredCount}</span>
                <span className="hero-stat-label">收藏</span>
              </div>
              <div className="hero-stat">
                <span className="hero-stat-num">{activeCategories.length}</span>
                <span className="hero-stat-label">模块</span>
              </div>
            </div>
          </div>

          <div className="section-title">
            <span>{activeCollection.name.includes('Spring') ? '三大题型' : '12 大知识模块'}</span>
            <span className="section-title-right">共 {activeCategories.length} 个分类</span>
          </div>

          <div className="category-grid">
            {activeCategories.map((cat, idx) => {
              const catCompleted = cat.questions.filter(q => state.completed[q.id]).length;
              const pct = Math.round((catCompleted / cat.questions.length) * 100);
              return (
                <button
                  key={cat.id}
                  className="category-card fade-in"
                  style={{ animationDelay: `${idx * 0.03}s` }}
                  onClick={() => onCategoryClick(cat.id)}
                >
                  <div className="category-card-icon">{cat.icon}</div>
                  <div className="category-card-name">{cat.name}</div>
                  <div className="category-card-count">
                    <span>{catCompleted}/{cat.questions.length} 题</span>
                  </div>
                  <div className="category-progress-bar" style={{ width: `${pct}%` }} />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

// ========== List View ==========
function ListView({ activeCollection, allQuestions, filteredQuestions, difficultyFilter, setDifficultyFilter, searchQuery, setSearchQuery, shuffleMode, setShuffleMode, state, onQuestionClick }) {
  const difficulties = ['all', '基础', '进阶', '场景'];

  const countByDifficulty = useMemo(() => {
    const counts = {};
    difficulties.forEach(d => {
      counts[d] = d === 'all'
        ? allQuestions.length
        : allQuestions.filter(q => q.d === d).length;
    });
    return counts;
  }, [allQuestions]);

  return (
    <>
      <div className="app-header">
        <div className="header-title-group">
          <div className="header-title">{activeCollection.icon} 全部题库</div>
          <div className="header-subtitle">{allQuestions.length} 道题 · {activeCollection.name}</div>
        </div>
        <div className="header-actions">
          <button
            className="icon-btn"
            onClick={() => setShuffleMode(s => !s)}
            style={{ borderColor: shuffleMode ? 'var(--accent)' : 'var(--border)' }}
            title="随机模式"
          >
            <Icon.Shuffle />
          </button>
        </div>
      </div>

      <div className="search-box-wrap">
        <div className="search-box">
          <Icon.Search />
          <input
            type="text"
            placeholder="搜索题目关键词..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="filter-bar">
        {difficulties.map(d => (
          <button
            key={d}
            className={`filter-chip ${difficultyFilter === d ? 'active' : ''}`}
            onClick={() => setDifficultyFilter(d)}
          >
            <span>{d === 'all' ? '全部' : d}</span>
            <span className="count">{countByDifficulty[d]}</span>
          </button>
        ))}
      </div>

      <div className="app-main" style={{ paddingBottom: 'calc(60px + var(--safe-bottom))' }}>
        <div className="question-list">
          {filteredQuestions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🔍</div>
              <div className="empty-text">暂无匹配的题目</div>
              <div className="empty-sub">试试其他关键词或难度</div>
            </div>
          ) : (
            filteredQuestions.map((q, idx) => (
              <QuestionListItem
                key={q.id}
                question={q}
                index={idx}
                isCompleted={!!state.completed[q.id]}
                isStarred={!!state.starred[q.id]}
                onClick={() => onQuestionClick(q.id)}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}

function QuestionListItem({ question, index, isCompleted, isStarred, onClick }) {
  return (
    <button
      className={`question-item fade-in ${isCompleted ? 'completed' : ''}`}
      style={{ animationDelay: `${Math.min(index, 20) * 0.02}s` }}
      onClick={onClick}
    >
      <div className="question-item-header">
        <span className="question-num">{question.id.toUpperCase()}</span>
        <span className={`question-diff-badge diff-${question.d}`}>{question.d}</span>
      </div>
      <div className="question-text">{question.q}</div>
      <div className="question-tags">
        {question.tags.slice(0, 3).map((tag, i) => (
          <span key={i} className={`question-tag ${tag === 'Java转型' ? 'java-tag' : ''}`}>{tag}</span>
        ))}
        {question.javaAngle && <span className="question-tag java-tag">☕ Java视角</span>}
        {question.frequency && <FrequencyBadge frequency={question.frequency} />}
      </div>
      {isCompleted && (
        <div className="question-check"><Icon.Check /></div>
      )}
    </button>
  );
}

// ========== Detail View ==========
function DetailView({ question, questionIndex, total, showAnswer, setShowAnswer, isCompleted, isStarred, showJava, onToggleCompleted, onToggleStar, onPrev, onNext, onBack, canPrev, canNext }) {
  const answerRef = useRef(null);

  const handleReveal = () => {
    setShowAnswer(true);
  };

  const categoryLabel = question.collectionName
    ? `${question.collectionIcon} ${question.collectionName} · ${question.categoryName}`
    : `${question.categoryIcon} ${question.categoryName}`;

  return (
    <div className="detail-view">
      <div className="detail-header">
        <button className="back-btn" onClick={onBack}>
          <Icon.ChevronLeft />
        </button>
        <div className="detail-title-wrap">
          <div className="detail-category">{categoryLabel}</div>
          <div className="detail-progress">{questionIndex + 1} / {total}</div>
        </div>
        <button
          className={`star-btn ${isStarred ? 'starred' : ''}`}
          onClick={onToggleStar}
          title={isStarred ? '取消收藏' : '收藏'}
        >
          <Icon.Star />
        </button>
      </div>

      <div className="detail-content slide-in-right" key={question.id}>
        <div className="question-card">
          <div className="question-card-top">
            <span style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="question-num" style={{ fontSize: '12px' }}>{question.id.toUpperCase()}</span>
              <span className={`question-diff-badge diff-${question.d}`}>{question.d}</span>
              {question.frequency && (
                <span className="freq-inline" title={`出镜率：${question.frequency}`}>
                  🔥 {question.frequency.split('，')[0].split('（')[0]}
                </span>
              )}
            </span>
          </div>
          <div className="question-card-q">{question.q}</div>
          <div className="question-tags" style={{ marginTop: '4px' }}>
            {question.tags.map((tag, i) => (
              <span key={i} className={`question-tag ${tag === 'Java转型' ? 'java-tag' : ''}`}>{tag}</span>
            ))}
          </div>
        </div>

        <div
          className={`answer-section ${showAnswer ? '' : 'hidden-answer'}`}
          onClick={!showAnswer ? handleReveal : undefined}
          ref={answerRef}
        >
          {!showAnswer ? (
            <div className="reveal-hint">
              <div className="hint-icon">💡</div>
              <div className="hint-text">先想自己的答案，点这里查看</div>
            </div>
          ) : (
            <>
              <div
                className="answer-content"
                dangerouslySetInnerHTML={{ __html: formatAnswer(question.a) }}
              />
              {showJava && question.javaAngle && (
                <div className="java-angle">
                  <div className="java-angle-label">
                    ☕ Java 工程师视角
                  </div>
                  <div className="java-angle-text">{question.javaAngle}</div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="detail-bottom-bar">
        <button className="nav-btn" onClick={onPrev} disabled={!canPrev}>
          <Icon.ChevronLeft />
          <span>上一题</span>
        </button>
        <button
          className={`nav-btn primary-btn ${isCompleted ? 'completed' : ''}`}
          onClick={onToggleCompleted}
        >
          {isCompleted ? (
            <><Icon.Check /><span>已掌握</span></>
          ) : (
            <><Icon.Check /><span>标记掌握</span></>
          )}
        </button>
        <button className="nav-btn" onClick={onNext} disabled={!canNext}>
          <span>下一题</span>
          <Icon.ChevronRight />
        </button>
      </div>
    </div>
  );
}

// ========== Stats View ==========
function StatsView({ activeCollection, activeCategories, allQuestions, completedCount, totalQuestions, state, onReset, onCategoryClick }) {
  const pct = totalQuestions > 0 ? Math.round((completedCount / totalQuestions) * 100) : 0;
  const circumference = 2 * Math.PI * 60;
  const offset = circumference - (pct / 100) * circumference;

  const remaining = totalQuestions - completedCount;
  const javaQuestions = allQuestions.filter(q => q.javaAngle);
  const javaCompleted = javaQuestions.filter(q => state.completed[q.id]).length;

  return (
    <>
      <div className="app-header">
        <div className="header-title-group">
          <div className="header-title">学习进度</div>
          <div className="header-subtitle">{activeCollection.icon} {activeCollection.name}</div>
        </div>
      </div>

      <div className="app-main">
        <div className="stats-view">
          <div className="progress-ring-card fade-in">
            <div className="progress-ring-wrap">
              <svg className="progress-ring" viewBox="0 0 140 140">
                <circle className="ring-bg" cx="70" cy="70" r="60" />
                <circle
                  className="ring-fg"
                  cx="70"
                  cy="70"
                  r="60"
                  style={{ strokeDashoffset: offset }}
                />
              </svg>
              <div className="progress-ring-center">
                <div className="progress-ring-pct">{pct}%</div>
                <div className="progress-ring-label">总完成度</div>
              </div>
            </div>
            <div className="stats-row">
              <div className="stat-item">
                <div className="stat-num" style={{ color: 'var(--success)' }}>{completedCount}</div>
                <div className="stat-label">已掌握</div>
              </div>
              <div className="stat-item">
                <div className="stat-num" style={{ color: 'var(--warn)' }}>{remaining}</div>
                <div className="stat-label">待复习</div>
              </div>
              <div className="stat-item">
                <div className="stat-num" style={{ color: 'var(--gold)' }}>{allQuestions.filter(q => state.starred[q.id]).length}</div>
                <div className="stat-label">收藏</div>
              </div>
            </div>
          </div>

          <div className="stats-section">
            <div className="stats-section-title">各模块进度</div>
            {activeCategories.map((cat, idx) => {
              const catCompleted = cat.questions.filter(q => state.completed[q.id]).length;
              const catPct = Math.round((catCompleted / cat.questions.length) * 100);
              return (
                <div
                  key={cat.id}
                  className="category-progress-item fade-in"
                  style={{ animationDelay: `${idx * 0.03}s`, cursor: 'pointer' }}
                  onClick={() => onCategoryClick(cat.id)}
                >
                  <div className="category-progress-top">
                    <span className="category-progress-name">
                      <span>{cat.icon}</span>
                      <span>{cat.name}</span>
                    </span>
                    <span className="category-progress-num">{catCompleted}/{cat.questions.length}</span>
                  </div>
                  <div className="category-progress-bar-bg">
                    <div className="category-progress-bar-fill" style={{ width: `${catPct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          {javaQuestions.length > 0 && (
            <div className="stats-section">
              <div className="stats-section-title">Java 视角</div>
              <div className="category-progress-item">
                <div className="category-progress-top">
                  <span className="category-progress-name">
                    <span>☕</span>
                    <span>Java 工程师迁移点</span>
                  </span>
                  <span className="category-progress-num">{javaCompleted}/{javaQuestions.length}</span>
                </div>
                <div className="category-progress-bar-bg">
                  <div
                    className="category-progress-bar-fill"
                    style={{
                      width: `${javaQuestions.length > 0 ? Math.round((javaCompleted / javaQuestions.length) * 100) : 0}%`,
                      background: 'linear-gradient(90deg, var(--java) 0%, #E76F51 100%)'
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          <button className="reset-btn" onClick={onReset}>
            <Icon.Refresh />
            <span>重置当前题库进度</span>
          </button>
        </div>
      </div>
    </>
  );
}

// ========== Render ==========
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
