"use client";

import { useEffect, useMemo, useState } from "react";

type User = {
  id: string;
  username: string;
};

type Word = {
  id: string;
  word: string;
  meaning: string;
};

type WordList = {
  id: string;
  title: string;
  source_type: string;
  created_at: string;
};

type WrongWord = {
  word_id: string;
  wrong_count: number;
  last_wrong_at: string | null;
  word_list_id: string | null;
  words: { word: string; meaning: string } | null;
};

type TestSession = {
  id: string;
  mode: "english-to-chinese" | "chinese-to-english";
  status: "active" | "finished";
  order_ids: string[];
  current_index: number;
  correct_ids: string[];
  incorrect_ids: string[];
  word_list_id?: string | null;
};

type HistoryItem = {
  id: string;
  mode: TestSession["mode"];
  accuracy: number | null;
  finished_at: string | null;
};

const fetchJson = async (url: string, options?: RequestInit) => {
  const response = await fetch(url, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error ?? "请求失败");
  }

  return response.json();
};

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authForm, setAuthForm] = useState({ username: "", password: "" });
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lists, setLists] = useState<WordList[]>([]);
  const [wrongWords, setWrongWords] = useState<WrongWord[]>([]);
  const [globalWrongWords, setGlobalWrongWords] = useState<WrongWord[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeSession, setActiveSession] = useState<TestSession | null>(null);
  const [activeWords, setActiveWords] = useState<Word[]>([]);
  const [mode, setMode] = useState<TestSession["mode"]>("english-to-chinese");
  const [shuffle, setShuffle] = useState(true);
  const [showAnswer, setShowAnswer] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [manualText, setManualText] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentListId, setCurrentListId] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<"image" | "manual">("image");

  const currentWord = useMemo(() => {
    if (!activeSession) return null;
    return activeWords[activeSession.current_index] ?? null;
  }, [activeSession, activeWords]);

  const accuracy = useMemo(() => {
    if (!activeSession) return 0;
    const answered = activeSession.correct_ids.length + activeSession.incorrect_ids.length;
    if (answered === 0) return 0;
    return Math.round((activeSession.correct_ids.length / answered) * 100);
  }, [activeSession]);

  const loadUser = async () => {
    try {
      const data = await fetchJson("/api/auth/me");
      setUser(data.user);
      setError(null);
    } catch {
      setUser(null);
    }
  };

  const loadLists = async () => {
    const data = await fetchJson("/api/word-lists");
    setLists(data.lists ?? []);
  };

  const loadWrongWords = async () => {
    if (!currentListId) {
      setWrongWords([]);
      return;
    }
    const data = await fetchJson(`/api/wrong-words?listId=${currentListId}`);
    setWrongWords(data.items ?? []);
  };

  const loadGlobalWrongWords = async () => {
    const data = await fetchJson("/api/wrong-words?scope=global");
    setGlobalWrongWords(data.items ?? []);
  };

  const loadHistory = async () => {
    const data = await fetchJson("/api/history");
    setHistory(data.items ?? []);
  };

  const loadActiveSession = async () => {
    const data = await fetchJson("/api/test/active");
    if (data.session) {
      setActiveSession(data.session);
      setActiveWords(data.words ?? []);
      setCurrentListId(data.session.word_list_id ?? null);
    } else {
      setActiveSession(null);
      setActiveWords([]);
      setCurrentListId(null);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (!user) return;
    loadLists();
    loadWrongWords();
    loadGlobalWrongWords();
    loadActiveSession();
    loadHistory();
  }, [user, currentListId]);

  const handleAuth = async () => {
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const endpoint = authMode === "login" ? "/api/auth/login" : "/api/auth/register";
      const data = await fetchJson(endpoint, {
        method: "POST",
        body: JSON.stringify(authForm),
      });
      setUser(data.user);
      setAuthForm({ username: "", password: "" });
      setNotice(authMode === "login" ? "登录成功" : "注册成功");
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await fetchJson("/api/auth/logout", { method: "POST" });
      setUser(null);
      setActiveSession(null);
      setActiveWords([]);
      setLists([]);
      setWrongWords([]);
      setGlobalWrongWords([]);
      setCurrentListId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "退出失败");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file?: File) => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setNotice("正在识别图片并整理单词...");
    try {
      const formData = new FormData();
      formData.append("image", file);
      const response = await fetch("/api/words/image", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "图片识别失败");
      }
      await response.json();
      setNotice("图片解析成功，词表已保存。");
      await loadLists();
    } catch (err) {
      setError(err instanceof Error ? err.message : "图片识别失败");
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = async () => {
    if (!manualText.trim()) {
      setError("请输入英文单词或短语");
      return;
    }
    setLoading(true);
    setError(null);
    setNotice("正在整理并翻译单词...");
    try {
      await fetchJson("/api/words/text", {
        method: "POST",
        body: JSON.stringify({ text: manualText }),
      });
      setManualText("");
      setNotice("手动词表已保存。");
      await loadLists();
    } catch (err) {
      setError(err instanceof Error ? err.message : "整理失败");
    } finally {
      setLoading(false);
    }
  };

  const startTest = async (listId: string | null, nextMode = mode, shuffleOrder = shuffle) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJson("/api/test/start", {
        method: "POST",
        body: JSON.stringify({ listId, mode: nextMode, shuffle: shuffleOrder }),
      });
      setActiveSession(data.session);
      setActiveWords(data.words ?? []);
      setShowAnswer(false);
      setSummaryOpen(false);
      setCurrentListId(listId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "无法开始测试");
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async (isCorrect: boolean) => {
    if (!activeSession || !currentWord) return;

    const nextCorrect = isCorrect
      ? [...activeSession.correct_ids, currentWord.id]
      : activeSession.correct_ids;
    const nextIncorrect = !isCorrect
      ? [...activeSession.incorrect_ids, currentWord.id]
      : activeSession.incorrect_ids;
    const nextIndex = activeSession.current_index + 1;

    const updatedSession: TestSession = {
      ...activeSession,
      current_index: nextIndex,
      correct_ids: nextCorrect,
      incorrect_ids: nextIncorrect,
    };

    setActiveSession(updatedSession);
    setShowAnswer(false);

    const answeredCount = nextCorrect.length + nextIncorrect.length;
    const nextAccuracy = answeredCount === 0 ? 0 : Math.round((nextCorrect.length / answeredCount) * 100);

    try {
      await fetchJson("/api/test/answer", {
        method: "POST",
        body: JSON.stringify({
          sessionId: activeSession.id,
          wordId: currentWord.id,
          correct: isCorrect,
          currentIndex: nextIndex,
          correctIds: nextCorrect,
          incorrectIds: nextIncorrect,
        }),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "记录失败");
    }

    if (nextIndex >= activeSession.order_ids.length) {
      setSummaryOpen(true);
      await fetchJson("/api/test/finish", {
        method: "POST",
        body: JSON.stringify({ sessionId: activeSession.id, accuracy: nextAccuracy }),
      });
      await loadWrongWords();
      await loadGlobalWrongWords();
      await loadLists();
      await loadHistory();
    }
  };

  const startWrongTest = async (listId: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJson("/api/test/start", {
        method: "POST",
        body: JSON.stringify({ listId, mode, shuffle, wrongOnly: true }),
      });
      setActiveSession(data.session);
      setActiveWords(data.words ?? []);
      setShowAnswer(false);
      setSummaryOpen(false);
      setCurrentListId(listId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "无法开始错词本复测");
    } finally {
      setLoading(false);
    }
  };

  const handleShuffleRetest = async () => {
    await startTest(currentListId, mode, true);
  };

  const speakWord = (text: string) => {
    if (!("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const handleEndEarly = async () => {
    if (!activeSession) return;
    setSummaryOpen(true);
    await fetchJson("/api/test/finish", {
      method: "POST",
      body: JSON.stringify({ sessionId: activeSession.id, accuracy }),
    });
  };

  const handleResume = async () => {
    await loadActiveSession();
    setShowAnswer(false);
  };

  const resetSession = () => {
    setActiveSession(null);
    setActiveWords([]);
    setSummaryOpen(false);
  };

  const renderAuthCard = () => (
    <div className="card">
      <div className="badge">账户登录</div>
      <h3>{authMode === "login" ? "欢迎回来" : "创建账户"}</h3>
      <p className="hero-subtitle">用户名仅支持英文与数字，密码至少 6 位。</p>
      <div className="grid">
        <input
          className="input"
          placeholder="用户名"
          value={authForm.username}
          onChange={(event) => setAuthForm({ ...authForm, username: event.target.value })}
        />
        <input
          className="input"
          placeholder="密码"
          type="password"
          value={authForm.password}
          onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })}
        />
        <button className="button" onClick={handleAuth} disabled={loading}>
          {loading ? "处理中..." : authMode === "login" ? "登录" : "注册"}
        </button>
        <button
          className="button ghost"
          onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}
        >
          {authMode === "login" ? "没有账号？去注册" : "已有账号？去登录"}
        </button>
      </div>
    </div>
  );

  const renderUploadPanel = () => (
    <div className="panel">
      <div className="panel-header">
        <div>
          <div className="kicker">自定义词表</div>
          <h3>上传图片生成词库</h3>
        </div>
      </div>
      <p className="hero-subtitle">支持包含英文单词的照片/截图，自动识别并翻译。</p>
      <input
        className="input"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(event) => handleImageUpload(event.target.files?.[0])}
        disabled={loading}
      />
    </div>
  );

  const renderManualPanel = () => (
    <div className="panel">
      <div className="panel-header">
        <div>
          <div className="kicker">手动输入</div>
          <h3>直接输入单词清单</h3>
        </div>
      </div>
      <p className="hero-subtitle">每行一个单词或短语，系统会自动翻译并去重。</p>
      <textarea
        className="input"
        rows={6}
        placeholder={`例如:\napple\norange\nplay football`}
        value={manualText}
        onChange={(event) => setManualText(event.target.value)}
      />
      <button className="button" onClick={handleManualSubmit} disabled={loading}>
        生成词表
      </button>
    </div>
  );

  const renderListsPanel = () => (
    <div className="panel">
      <div className="panel-header">
        <div>
          <div className="kicker">词表库</div>
          <h3>选择一个词表开始测试</h3>
        </div>
      </div>
      <div className="pill-row">
        <label>
          模式
          <select
            className="input"
            value={mode}
            onChange={(event) => setMode(event.target.value as TestSession["mode"])}
          >
            <option value="english-to-chinese">英 → 中</option>
            <option value="chinese-to-english">中 → 英</option>
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={shuffle}
            onChange={(event) => setShuffle(event.target.checked)}
          />
          随机顺序
        </label>
      </div>
      <ul className="list">
        {lists.length === 0 && <li className="notice">暂无词表，请先上传图片或手动输入。</li>}
        {lists.map((list) => (
          <li key={list.id} className="list-item">
            <div>
              <strong>{list.title}</strong>
              <div className="kicker">来源：{list.source_type}</div>
            </div>
            <div className="pill-row">
              <button className="button" onClick={() => startTest(list.id)} disabled={loading}>
                开始测试
              </button>
              <button className="button ghost" onClick={() => startWrongTest(list.id)} disabled={loading}>
                错词复测
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );

  const renderWrongWordsPanel = () => (
    <details className="panel" open>
      <summary className="panel-header">
        <div>
          <div className="kicker">错词本</div>
          <h3>当前词表错词</h3>
        </div>
      </summary>
      <div className="pill-row">
        <button className="button secondary" onClick={() => startWrongTest(currentListId)} disabled={loading}>
          当前词表错词复测
        </button>
      </div>
      <ul className="list">
        {wrongWords.length === 0 && <li className="notice">暂无错词记录。</li>}
        {wrongWords.map((item) => (
          <li key={item.word_id} className="list-item">
            <div>
              <strong>{item.words?.word ?? ""}</strong>
              <div className="kicker">{item.words?.meaning ?? ""}</div>
            </div>
            <span className="badge">错 {item.wrong_count} 次</span>
          </li>
        ))}
      </ul>
    </details>
  );

  const renderHistoryPanel = () => (
    <details className="panel">
      <summary className="panel-header">
        <div>
          <div className="kicker">历史记录</div>
          <h3>最近完成的测试</h3>
        </div>
      </summary>
      <ul className="list">
        {history.length === 0 && <li className="notice">暂无历史记录。</li>}
        {history.map((item) => (
          <li key={item.id} className="list-item">
            <div>
              <strong>{item.mode === "english-to-chinese" ? "英 → 中" : "中 → 英"}</strong>
              <div className="kicker">
                {item.finished_at ? new Date(item.finished_at).toLocaleString("zh-CN") : "--"}
              </div>
            </div>
            <span className="badge">正确率 {item.accuracy ?? 0}%</span>
          </li>
        ))}
      </ul>
    </details>
  );

  const renderQuizPanel = () => {
    if (!activeSession || !currentWord) return null;

    const question = activeSession.mode === "english-to-chinese" ? currentWord.word : currentWord.meaning;
    const answer = activeSession.mode === "english-to-chinese" ? currentWord.meaning : currentWord.word;

    return (
      <div className="panel">
        <div className="panel-header">
          <div>
            <div className="kicker">正在测试</div>
            <h3>第 {activeSession.current_index + 1} / {activeSession.order_ids.length} 题</h3>
          </div>
          <div className="badge">正确率 {accuracy}%</div>
        </div>
        <div className="quiz">
          <div className="quiz-word">{question}</div>
          {showAnswer && <div className="quiz-meaning">{answer}</div>}
          <div className="pill-row">
            {!showAnswer && (
              <button
                className="button"
                onClick={() => {
                  setShowAnswer(true);
                  speakWord(currentWord.word);
                }}
              >
                显示解释
              </button>
            )}
            {showAnswer && (
              <>
                <button className="button" onClick={() => submitAnswer(true)}>
                  我认识
                </button>
                <button className="button secondary" onClick={() => submitAnswer(false)}>
                  我不认识
                </button>
              </>
            )}
            <button className="button ghost" onClick={handleEndEarly}>
              结束测试
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderSummary = () => {
    if (!activeSession) return null;
    const correctWords = activeWords.filter((word) => activeSession.correct_ids.includes(word.id));
    const incorrectWords = activeWords.filter((word) => activeSession.incorrect_ids.includes(word.id));

    if (!summaryOpen) return null;

    return (
      <div className="panel">
        <div className="panel-header">
          <div>
            <div className="kicker">测试总结</div>
            <h3>共完成 {activeSession.correct_ids.length + activeSession.incorrect_ids.length} 题</h3>
          </div>
          <div className="badge">正确率 {accuracy}%</div>
        </div>
        <div className="grid two">
          <div>
            <h4>答对</h4>
            <ul className="list">
              {correctWords.map((word) => (
                <li key={word.id} className="list-item">
                  {word.word} - {word.meaning}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4>答错</h4>
            <ul className="list">
              {incorrectWords.map((word) => (
                <li key={word.id} className="list-item">
                  {word.word} - {word.meaning}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="pill-row">
          {currentListId && (
            <button className="button" onClick={handleShuffleRetest}>
              打乱顺序再测
            </button>
          )}
          <button className="button secondary" onClick={() => startWrongTest(null)}>
            全局错词复测
          </button>
          <button className="button ghost" onClick={resetSession}>
            返回首页
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="app">
      <section className="hero">
        <div className="hero-card">
          <span className="badge">English Autotest</span>
          <h1 className="hero-title">拍照定制单词测试系统</h1>
          <p className="hero-subtitle">
            让你的词汇测试真正为你定制。<br />
            上传图片或手动输入，系统自动识别、翻译并生成测试。
          </p>
          {notice && <div className="notice">{notice}</div>}
          {error && <div className="notice error">{error}</div>}
          {user ? (
            <div className="grid">
              <div className="badge">当前用户：{user.username}</div>
              <button className="button ghost" onClick={handleLogout} disabled={loading}>
                退出登录
              </button>
              {activeSession && activeSession.status === "active" && (
                <button className="button" onClick={handleResume}>
                  继续上次测试
                </button>
              )}
            </div>
          ) : (
            renderAuthCard()
          )}
        </div>
        {user && (
          <div className="grid">
            <div className="panel">
              <div className="panel-header">
                <div>
                  <div className="kicker">输入方式</div>
                  <h3>选择生成词表方式</h3>
                </div>
              </div>
              <div className="pill-row">
                <button
                  className={inputMode === "image" ? "button" : "button ghost"}
                  onClick={() => setInputMode("image")}
                  disabled={loading}
                >
                  上传图片
                </button>
                <button
                  className={inputMode === "manual" ? "button" : "button ghost"}
                  onClick={() => setInputMode("manual")}
                  disabled={loading}
                >
                  手动输入
                </button>
              </div>
            </div>
            {inputMode === "image" ? renderUploadPanel() : renderManualPanel()}
          </div>
        )}
      </section>

      {user && (
        <section className="section">
          {activeSession && !summaryOpen && renderQuizPanel()}
          {summaryOpen && renderSummary()}
          {renderListsPanel()}
          {currentListId && renderWrongWordsPanel()}
          <details className="panel">
            <summary className="panel-header">
              <div>
                <div className="kicker">全局错词</div>
                <h3>高频错误单词</h3>
              </div>
            </summary>
            <div className="pill-row">
              <button className="button secondary" onClick={() => startWrongTest(null)} disabled={loading}>
                全局错词复测
              </button>
            </div>
            <ul className="list">
              {globalWrongWords.length === 0 && <li className="notice">暂无错词记录。</li>}
              {globalWrongWords.map((item) => (
                <li key={`${item.word_id}-${item.word_list_id ?? "global"}`} className="list-item">
                  <div>
                    <strong>{item.words?.word ?? ""}</strong>
                    <div className="kicker">{item.words?.meaning ?? ""}</div>
                  </div>
                  <span className="badge">错 {item.wrong_count} 次</span>
                </li>
              ))}
            </ul>
          </details>
          {renderHistoryPanel()}
        </section>
      )}

      <footer className="footer">
        建议在 Supabase 控制台设置每日备份，确保词表与测试历史安全。
      </footer>
    </div>
  );
}
