"use client";

export const dynamic = "force-dynamic";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  X,
  Home,
  Trash2,
  ChevronRight,
  Sparkles,
  MapPin,
  Save,
  ClipboardList,
  Type,
  Eye,
} from "lucide-react";

/** =========================
 * Types & Constants
 * ========================= */
type Category = "Q" | "S" | "C";

type QscQuestion = {
  questionId: string;
  place: string;
  no: number;
  category: Category;
  text: string;
  isActive: boolean;
  updatedAt: string;
};

const PLACE_MASTER = [
  "館外", "入口", "フロント", "ラウンジ", "ジムエリア", "マシン", 
  "フリーウェイト", "スタジオ", "更衣室", "ロッカー", "シャワー", 
  "トイレ", "バックヤード"
];

const PLACE_COLORS: Record<string, { bg: string; text: string }> = {
  "館外": { bg: "#f1f5f9", text: "#475569" },
  "入口": { bg: "#ecfdf5", text: "#065f46" },
  "フロント": { bg: "#eff6ff", text: "#1e40af" },
  "ラウンジ": { bg: "#fefce8", text: "#854d0e" },
  "ジムエリア": { bg: "#faf5ff", text: "#6b21a8" },
  "マシン": { bg: "#fff7ed", text: "#9a3412" },
  "更衣室": { bg: "#f5f3ff", text: "#5b21b6" },
  "トイレ": { bg: "#fff1f2", text: "#9f1239" },
  "default": { bg: "#f8fafc", text: "#64748b" }
};

const CATEGORY_COLORS: Record<Category, { bg: string; text: string; bd: string }> = {
  "Q": { bg: "#10b981", text: "#ffffff", bd: "#059669" },
  "S": { bg: "#3b82f6", text: "#ffffff", bd: "#2563eb" },
  "C": { bg: "#f43f5e", text: "#ffffff", bd: "#e11d48" }
};

const CATEGORIES: Category[] = ["Q", "S", "C"];

const INITIAL_QUESTIONS: QscQuestion[] = [
  { questionId: "Q001", place: "館外", no: 1, category: "Q", text: "外壁/外灯/花壇などに破損箇所はないか", isActive: true, updatedAt: new Date().toISOString() },
  { questionId: "Q002", place: "入口", no: 1, category: "S", text: "スタッフの挨拶がある", isActive: true, updatedAt: new Date().toISOString() },
  { questionId: "Q003", place: "トイレ", no: 1, category: "C", text: "トイレットペーパーの予備が十分に配置されている", isActive: true, updatedAt: new Date().toISOString() },
];

/** =========================
 * UI Components
 * ========================= */

function Chip({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "blue" | "green" | "red" | "indigo" | "amber" }) {
  const s = {
    blue: { bg: "#eff6ff", text: "#1d4ed8", bd: "#dbeafe" },
    green: { bg: "#f0fdf4", text: "#15803d", bd: "#dcfce7" },
    red: { bg: "#fef2f2", text: "#991b1b", bd: "#fee2e2" },
    indigo: { bg: "#eef2ff", text: "#4338ca", bd: "#e0e7ff" },
    amber: { bg: "#fffbeb", text: "#b45309", bd: "#fef3c7" },
    muted: { bg: "#f8fafc", text: "#475569", bd: "#e2e8f0" },
  }[tone];
  return (
    <span style={{ fontSize: 10, fontWeight: 900, padding: "4px 10px", borderRadius: 8, background: s.bg, color: s.text, border: `1px solid ${s.bd}`, display: "inline-flex", alignItems: "center", gap: 6 }}>
      {children}
    </span>
  );
}

function PlaceChip({ name }: { name: string }) {
  const color = PLACE_COLORS[name] || PLACE_COLORS["default"];
  return (
    <span style={{ fontSize: 10, fontWeight: 800, padding: "4px 10px", borderRadius: 6, background: color.bg, color: color.text, border: "1px solid rgba(0,0,0,0.05)" }}>
      {name}
    </span>
  );
}

function CategoryChip({ type }: { type: Category }) {
  const color = CATEGORY_COLORS[type];
  return (
    <span style={{ fontSize: 10, fontWeight: 900, padding: "4px 8px", borderRadius: 4, background: color.bg, color: color.text, boxShadow: `0 2px 4px ${color.bd}44` }}>
      {type}
    </span>
  );
}

/** =========================
 * Main Page
 * ========================= */
export default function AdminQscQuestionsPage() {
  const [questions, setQuestions] = useState<QscQuestion[]>(INITIAL_QUESTIONS);
  const [selectedId, setSelectedId] = useState<string | "new" | null>(INITIAL_QUESTIONS[0].questionId);
  const [draft, setDraft] = useState<QscQuestion | null>(null);
  const [dirty, setDirty] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterPlace, setFilterPlace] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const nowISO = () => new Date().toISOString();

  useEffect(() => {
    if (selectedId === "new") {
      setDraft({
        questionId: `Q_TEMP_${Date.now()}`,
        place: PLACE_MASTER[0],
        no: 1,
        category: "Q",
        text: "",
        isActive: true,
        updatedAt: nowISO(),
      });
      setDirty(true);
    } else {
      const sel = questions.find((x) => x.questionId === selectedId);
      if (sel) {
        setDraft({ ...sel });
        setDirty(false);
      }
    }
  }, [selectedId, questions]);

  const filteredQuestions = useMemo(() => {
    return questions.filter((x) => {
      const matchSearch = x.text.includes(searchQuery) || x.questionId.includes(searchQuery);
      const matchPlace = filterPlace === "all" || x.place === filterPlace;
      const matchCategory = filterCategory === "all" || x.category === filterCategory;
      return matchSearch && matchPlace && matchCategory;
    });
  }, [questions, searchQuery, filterPlace, filterCategory]);

  const setDraftPatch = (patch: Partial<QscQuestion>) => {
    setDirty(true);
    setDraft((prev) => (prev ? { ...prev, ...patch } : null));
  };

  const saveDraft = () => {
    if (!draft || !draft.text.trim()) return alert("設問内容を入力してください");

    const updated = { 
      ...draft, 
      questionId: selectedId === "new" ? `Q${String(Date.now()).slice(-3)}` : draft.questionId,
      updatedAt: nowISO() 
    };

    if (selectedId === "new") {
      setQuestions([updated, ...questions]);
    } else {
      setQuestions((prev) => prev.map((x) => (x.questionId === draft.questionId ? updated : x)));
    }
    
    setSelectedId(updated.questionId);
    setDirty(false);
    alert("保存しました");
  };

  const createNewTrigger = () => {
    if (dirty) {
      if (!confirm("編集中の内容がありますが破棄して新規作成しますか？")) return;
    }
    setSelectedId("new");
  };

  return (
    <main style={{ minHeight: "100vh", padding: "24px", color: "#0f172a", background: "#f8fafc", fontFamily: "'Inter', sans-serif" }}>
      
      {/* --- Breadcrumb --- */}
      <nav style={{ maxWidth: 1680, margin: "0 auto 16px", display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700 }}>
        <Link href="/admin" style={{ color: "#64748b", textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
          <Home size={14} />
          <span>Dashboard</span>
        </Link>
        <ChevronRight size={14} style={{ color: "#cbd5e1" }} />
        <span style={{ color: "#1e293b" }}>設問マスタ管理</span>
      </nav>

      {/* Header */}
      <div style={{ maxWidth: 1680, margin: "0 auto 28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 52, height: 52, background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)", borderRadius: 16, display: "grid", placeItems: "center", color: "#fff", boxShadow: "0 10px 20px -5px rgba(79, 70, 229, 0.4)" }}>
            <ClipboardList size={26} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 950, margin: 0, letterSpacing: "-0.04em" }}>設問マスタ管理</h1>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#64748b", margin: "2px 0 0" }}>QSCチェック項目の一元管理・編集</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={createNewTrigger} disabled={selectedId === "new"} style={{ height: 46, padding: "0 24px", borderRadius: 14, background: selectedId === "new" ? "#cbd5e1" : "#1e293b", color: "#fff", border: "none", fontWeight: 900, cursor: selectedId === "new" ? "default" : "pointer", display: "flex", alignItems: "center", gap: 10 }}><Plus size={20} />新規設問追加</button>
        </div>
      </div>

      <div style={{ maxWidth: 1680, margin: "0 auto", display: "grid", gridTemplateColumns: "400px 1fr 440px", gap: 24, alignItems: "start" }}>
        
        {/* Left Panel: Question List */}
        <section style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 32, height: "calc(100vh - 180px)", display: "grid", gridTemplateRows: "auto 1fr", overflow: "hidden", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
          <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid #f1f5f9", display: "grid", gap: 12 }}>
            <div style={{ position: "relative" }}>
              <Search size={18} style={{ position: "absolute", left: 14, top: 12, color: "#94a3b8" }} />
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="設問内容やIDで検索..." style={{ width: "100%", height: 42, borderRadius: 14, border: "1px solid #e2e8f0", paddingLeft: 42, outline: "none", fontSize: 14, fontWeight: 700 }} />
            </div>
            
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
                <button onClick={() => setFilterPlace("all")} style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: filterPlace === "all" ? "#1e293b" : "#f1f5f9", color: filterPlace === "all" ? "#fff" : "#64748b", fontSize: 11, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}>全場所</button>
                {PLACE_MASTER.map(p => (
                  <button key={p} onClick={() => setFilterPlace(p)} style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: filterPlace === p ? "#1e293b" : "#f1f5f9", color: filterPlace === p ? "#fff" : "#64748b", fontSize: 11, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}>{p}</button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {["all", ...CATEGORIES].map(c => (
                  <button key={c} onClick={() => setFilterCategory(c)} style={{ flex: 1, padding: "6px", borderRadius: 8, border: "none", background: filterCategory === c ? (CATEGORY_COLORS[c as Category]?.bg || "#1e293b") : "#f8fafc", color: filterCategory === c ? "#fff" : "#94a3b8", fontSize: 10, fontWeight: 900, cursor: "pointer" }}>{c === "all" ? "全種別" : c}</button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ overflowY: "auto", padding: "12px 16px" }}>
            {selectedId === "new" && (
              <div style={{ padding: "18px 20px", borderRadius: 24, border: "2px dashed #4f46e5", background: "#f5f3ff", marginBottom: 10 }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                   <Chip tone="indigo">新規作成中</Chip>
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#4f46e5" }}>{draft?.text || "(設問を編集中...)"}</div>
              </div>
            )}
            {filteredQuestions.map((x) => {
              const isActive = x.questionId === selectedId;
              return (
                <div key={x.questionId} onClick={() => setSelectedId(x.questionId)} style={{ 
                  padding: "18px 20px", borderRadius: 24, cursor: "pointer", marginBottom: 10, 
                  background: isActive ? "#f8fafc" : "transparent", 
                  border: `2px solid ${isActive ? "#4f46e5" : "transparent"}`, 
                  transition: "0.2s" 
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <CategoryChip type={x.category} />
                      <PlaceChip name={x.place} />
                    </div>
                    {!x.isActive && <span style={{ fontSize: 10, color: "#ef4444", fontWeight: 800 }}>停止中</span>}
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: isActive ? "#4f46e5" : "#1e293b", lineHeight: 1.5 }}>{x.text}</div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Center Panel: Editor */}
        <section style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 32, height: "calc(100vh - 180px)", display: "grid", gridTemplateRows: "auto 1fr", overflow: "hidden", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.08)" }}>
          {draft && (
            <>
              <div style={{ padding: "20px 32px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ fontSize: 18, fontWeight: 950, margin: 0 }}>
                  {selectedId === "new" ? "新規設問作成" : "設問の詳細編集"}
                </h2>
                <div style={{ display: "flex", gap: 10 }}>
                  {selectedId === "new" && (
                    <button onClick={() => setSelectedId(questions[0]?.questionId || null)} style={{ height: 42, padding: "0 16px", borderRadius: 12, background: "#f1f5f9", color: "#64748b", fontWeight: 900, cursor: "pointer", border: "none" }}>キャンセル</button>
                  )}
                  <button onClick={saveDraft} disabled={!dirty} style={{ height: 42, padding: "0 24px", borderRadius: 12, background: dirty ? "#4f46e5" : "#e2e8f0", border: "none", color: "#fff", fontWeight: 900, cursor: dirty ? "pointer" : "default" }}>保存して確定</button>
                </div>
              </div>
              
              <div style={{ overflowY: "auto", padding: "24px 32px", display: "flex", flexDirection: "column", gap: "24px" }}>
                
                {/* 設問文エリア */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <label style={{ fontSize: 12, fontWeight: 900, color: "#64748b", marginLeft: 4 }}>設問内容</label>
                  <textarea 
                    value={draft.text} 
                    onChange={(e) => setDraftPatch({ text: e.target.value })} 
                    placeholder="例: フロントカウンターにホコリや汚れはないか" 
                    style={{ borderRadius: 16, border: "1px solid #e2e8f0", padding: "16px 20px", fontSize: 16, fontWeight: 800, outline: "none", minHeight: "140px", lineHeight: 1.6, width: "100%", boxSizing: "border-box", resize: "none" }} 
                  />
                </div>

                {/* 場所・カテゴリ */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <label style={{ fontSize: 12, fontWeight: 900, color: "#64748b", marginLeft: 4 }}>点検場所（Place）</label>
                    <select 
                      value={draft.place} 
                      onChange={(e) => setDraftPatch({ place: e.target.value })} 
                      style={{ height: 50, borderRadius: 14, border: "1px solid #e2e8f0", padding: "0 16px", fontSize: 14, fontWeight: 800, background: "#f8fafc", width: "100%" }}
                    >
                      {PLACE_MASTER.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <label style={{ fontSize: 12, fontWeight: 900, color: "#64748b", marginLeft: 4 }}>QSCカテゴリ</label>
                    <div style={{ display: "flex", gap: 4, background: "#f1f5f9", padding: 4, borderRadius: 12 }}>
                      {CATEGORIES.map(c => {
                        const active = draft.category === c;
                        return (
                          <button key={c} onClick={() => setDraftPatch({ category: c })} style={{ 
                            flex: 1, height: 38, border: "none", borderRadius: 8, 
                            background: active ? CATEGORY_COLORS[c].bg : "transparent", 
                            color: active ? "#fff" : "#94a3b8", fontWeight: 900, cursor: "pointer",
                            transition: "0.2s"
                          }}>{c}</button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 公開ステータス */}
                {selectedId !== "new" && (
                  <div style={{ padding: "20px", borderRadius: 24, background: "#f8fafc", border: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 900 }}>公開ステータス</div>
                      <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700 }}>「停止中」にすると点検フォームの選択肢から除外されます</div>
                    </div>
                    <button onClick={() => setDraftPatch({ isActive: !draft.isActive })} style={{ 
                      height: 40, padding: "0 20px", borderRadius: 10, border: "none", 
                      background: draft.isActive ? "#10b981" : "#f43f5e", color: "#fff", 
                      fontWeight: 900, cursor: "pointer" 
                    }}>{draft.isActive ? "公開中" : "停止中"}</button>
                  </div>
                )}

                {/* 削除ボタン */}
                {selectedId !== "new" && (
                  <button onClick={() => { if(confirm("本当にマスタから削除しますか？")) { setQuestions(prev => prev.filter(x => x.questionId !== draft.questionId)); setSelectedId(questions[0]?.questionId || null); } }} style={{ marginTop: "12px", height: 50, borderRadius: 16, background: "none", color: "#f87171", border: "1px solid #fee2e2", fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, justifyContent: "center" }}>
                    <Trash2 size={18} />マスタから削除
                  </button>
                )}
              </div>
            </>
          )}
        </section>

        {/* Right Panel: Mobile Preview */}
        <section style={{ background: "rgba(15, 23, 42, 0.02)", borderRadius: 32, height: "calc(100vh - 180px)", padding: 24, border: "1px solid rgba(0,0,0,0.03)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "#fff", display: "grid", placeItems: "center", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}><Eye size={18} color="#4f46e5" /></div>
            <h2 style={{ fontSize: 17, fontWeight: 950, margin: 0 }}>フォームプレビュー</h2>
          </div>
          {draft && (
            <div style={{ padding: 28, background: "#fff", borderRadius: 32, border: "1px solid #e2e8f0", boxShadow: "0 10px 20px rgba(0,0,0,0.05)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <PlaceChip name={draft.place} />
                <CategoryChip type={draft.category} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 950, lineHeight: 1.6, margin: 0, color: "#0f172a", whiteSpace: "pre-wrap" }}>{draft.text || "設問内容を入力してください"}</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 24 }}>
                {["OK", "NG", "保留", "該当なし"].map(v => (
                  <div key={v} style={{ height: 44, borderRadius: 10, background: "#f8fafc", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 800, color: "#cbd5e1", border: "1px solid #f1f5f9" }}>{v}</div>
                ))}
              </div>
              <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px dashed #e2e8f0", display: "flex", gap: 8 }}>
                <div style={{ flex: 1, height: 36, borderRadius: 8, background: "#f1f5f9", display: "grid", placeItems: "center", color: "#94a3b8" }}>
                  <ImageIcon size={16} />
                </div>
                <div style={{ flex: 1, height: 36, borderRadius: 8, background: "#f1f5f9", display: "grid", placeItems: "center", color: "#94a3b8" }}>
                  <MessageSquare size={16} />
                </div>
              </div>
            </div>
          )}
          <p style={{ marginTop: 20, fontSize: 12, color: "#94a3b8", textAlign: "center", fontWeight: 600 }}>※ 実際の点検画面での見え方をシミュレートしています</p>
        </section>
      </div>

    </main>
  );
}

// 足りないアイコンのインポートを補完
import { ImageIcon, MessageSquare } from "lucide-react";