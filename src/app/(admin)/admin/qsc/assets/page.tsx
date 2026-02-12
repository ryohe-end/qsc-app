"use client";

export const dynamic = "force-dynamic";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  LayoutGrid,
  Plus,
  Search,
  X,
  GripVertical,
  Eye,
  EyeOff,
  Home,
  Trash2,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  MapPin,
  Settings2,
  Save,
  Check,
} from "lucide-react";

/** =========================
 * Types
 * ========================= */
type AnswerType = "okng" | "scale" | "yesno";
type CategoryType = "Q" | "S" | "C";

type QscQuestion = {
  questionId: string;
  place: string;
  no: number;
  category: CategoryType;
  text: string;
  answerType: AnswerType;
  weight: number;
  required: boolean;
  isActive: boolean;
};

type Asset = {
  assetId: string;
  name: string;
  description?: string;
  isActive: boolean;
  questionIds: string[];
  updatedAt: string;
};

/** =========================
 * Mock Masters
 * ========================= */
const QUESTIONS_MASTER_MOCK: QscQuestion[] = [
  { questionId: "Q001", place: "館外", no: 1, category: "Q", text: "外壁/外灯/花壇/お客様動線などに破損箇所はないか", answerType: "okng", weight: 1, required: true, isActive: true },
  { questionId: "Q002", place: "館外", no: 2, category: "C", text: "入口周辺にゴミ・吸い殻・汚れはないか", answerType: "scale", weight: 2, required: true, isActive: true },
  { questionId: "Q003", place: "入口", no: 1, category: "S", text: "スタッフの挨拶がある", answerType: "yesno", weight: 2, required: true, isActive: true },
  { questionId: "Q004", place: "マシン", no: 1, category: "C", text: "マシンが拭き上げされている", answerType: "scale", weight: 3, required: true, isActive: true },
  { questionId: "Q005", place: "トイレ", no: 1, category: "C", text: "トイレットペーパーが補充されている", answerType: "okng", weight: 1, required: false, isActive: true },
  { questionId: "Q006", place: "更衣室", no: 1, category: "C", text: "ロッカー内に忘れ物やゴミはないか", answerType: "okng", weight: 1, required: true, isActive: true },
];

const ASSET_MOCK: Asset[] = [
  {
    assetId: "A001",
    name: "JOYFIT_標準チェック",
    description: "全店共通の標準的なQSCチェックアセット",
    isActive: true,
    questionIds: ["Q001", "Q002", "Q003", "Q005"],
    updatedAt: new Date().toISOString(),
  },
];

/** =========================
 * Utils
 * ========================= */
const nowISO = () => new Date().toISOString();
const uniq = (arr: string[]) => Array.from(new Set(arr));

/** =========================
 * UI Components
 * ========================= */
function Chip({ children, tone = "muted" }: { children: React.ReactNode; tone?: string }) {
  const s: any = {
    blue: { bg: "#eff6ff", text: "#1d4ed8", bd: "#dbeafe" },
    green: { bg: "#f0fdf4", text: "#15803d", bd: "#dcfce7" },
    red: { bg: "#fef2f2", text: "#991b1b", bd: "#fee2e2" },
    indigo: { bg: "#eef2ff", text: "#4338ca", bd: "#e0e7ff" },
    amber: { bg: "#fffbeb", text: "#b45309", bd: "#fef3c7" },
    pink: { bg: "#fdf2f8", text: "#be185d", bd: "#fce7f3" },
    muted: { bg: "#f8fafc", text: "#475569", bd: "#e2e8f0" },
  }[tone || "muted"];
  return (
    <span style={{ fontSize: 10, fontWeight: 900, padding: "4px 10px", borderRadius: 8, background: s.bg, color: s.text, border: `1px solid ${s.bd}`, display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

function CategoryChip({ category }: { category: CategoryType }) {
  const config = {
    Q: { label: "Quality", tone: "indigo" },
    S: { label: "Service", tone: "amber" },
    C: { label: "Cleanliness", tone: "green" },
  }[category];
  return <Chip tone={config.tone}>{category} : {config.label}</Chip>;
}

function QuestionPickerModal({ open, questions, pickedIds, onToggle, onClose }: any) {
  const [q, setQ] = useState("");
  const filtered = questions.filter((x: any) => x.isActive && (x.text.includes(q) || x.place.includes(q)));
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(15,23,42,0.5)", backdropFilter: "blur(12px)", display: "grid", placeItems: "center", padding: 20 }}>
      <div style={{ background: "#fff", width: "100%", maxWidth: 1100, height: "85vh", borderRadius: 32, display: "grid", gridTemplateRows: "auto auto 1fr", overflow: "hidden", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }}>
        <div style={{ padding: "24px 32px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div><h2 style={{ fontSize: 20, fontWeight: 950, margin: 0 }}>設問ライブラリ</h2><p style={{ fontSize: 13, fontWeight: 700, color: "#64748b", margin: 0 }}>チェック項目を選択してください</p></div>
          <button onClick={onClose} style={{ border: "none", background: "#f1f5f9", borderRadius: 14, width: 44, height: 44, cursor: "pointer" }}><X size={24} /></button>
        </div>
        <div style={{ padding: "16px 32px", background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="設問文や場所で検索..." style={{ width: "100%", height: 48, borderRadius: 16, border: "1px solid #e2e8f0", padding: "0 20px", fontWeight: 800, outline: "none" }} />
        </div>
        <div style={{ overflowY: "auto", padding: "24px 32px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
          {filtered.map((qq: QscQuestion) => {
            const isPicked = pickedIds.includes(qq.questionId);
            return (
              <div key={qq.questionId} onClick={() => onToggle(qq.questionId)} style={{ padding: 24, borderRadius: 28, border: "2px solid", borderColor: isPicked ? "#4f46e5" : "#f1f5f9", background: isPicked ? "#f5f3ff" : "#fff", cursor: "pointer", transition: "0.2s" }}>
                <div style={{ display: "flex", gap: 6, marginBottom: 12 }}><CategoryChip category={qq.category} /><Chip tone="blue">{qq.place}</Chip></div>
                <div style={{ fontWeight: 850, fontSize: 15, lineHeight: 1.5 }}>{qq.text}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** =========================
 * Main Page
 * ========================= */
export default function AdminQscAssetsPage() {
  const [questions] = useState<QscQuestion[]>(QUESTIONS_MASTER_MOCK);
  const [assets, setAssets] = useState<Asset[]>(ASSET_MOCK);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(assets[0]?.assetId ?? null);
  const [draft, setDraft] = useState<Asset | null>(null);
  const [dirty, setDirty] = useState(false);
  const [listQ, setListQ] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const dragId = useRef<string | null>(null);

  // 初回および選択変更時のデータ同期
  useEffect(() => {
    if (selectedAssetId) {
      const sel = assets.find(a => a.assetId === selectedAssetId);
      if (sel) {
        setDraft(JSON.parse(JSON.stringify(sel)));
        setDirty(false);
      }
    }
  }, [selectedAssetId, assets]);

  const questionMap = useMemo(() => {
    const m: Record<string, QscQuestion> = {};
    questions.forEach(q => m[q.questionId] = q);
    return m;
  }, [questions]);

  // アセット選択
  const handleSelectAsset = (id: string) => {
    if (dirty) {
      if (!confirm("編集中の内容が保存されていません。移動しますか？")) return;
    }
    setSelectedAssetId(id);
  };

  // 新規作成
  const handleNewAsset = () => {
    if (dirty) {
      if (!confirm("編集中の内容を破棄して新規作成しますか？")) return;
    }
    const newAsset: Asset = {
      assetId: `NEW-${Date.now()}`,
      name: "新規QSCチェック",
      isActive: true,
      questionIds: [],
      updatedAt: nowISO(),
    };
    setSelectedAssetId(null);
    setDraft(newAsset);
    setDirty(true);
  };

  // 保存
  const saveDraft = () => {
    if (!draft || !draft.name.trim()) return alert("アセット名を入力してください");
    const updated = { ...draft, updatedAt: nowISO() };
    const exists = assets.find(a => a.assetId === draft.assetId);

    if (exists) {
      setAssets(assets.map(a => a.assetId === draft.assetId ? updated : a));
    } else {
      setAssets([updated, ...assets]);
    }
    setSelectedAssetId(updated.assetId);
    setDirty(false);
    alert("保存が完了しました");
  };

  // 削除
  const deleteAsset = () => {
    if (!draft) return;
    if (!confirm(`アセット「${draft.name}」を削除してもよろしいですか？`)) return;

    const remaining = assets.filter(a => a.assetId !== draft.assetId);
    setAssets(remaining);
    setDraft(remaining.length > 0 ? JSON.parse(JSON.stringify(remaining[0])) : null);
    setSelectedAssetId(remaining.length > 0 ? remaining[0].assetId : null);
    setDirty(false);
  };

  // 並び替え
  const reorder = (fromId: string, toId: string) => {
    if (!draft) return;
    const list = [...draft.questionIds];
    const fromIdx = list.indexOf(fromId);
    const toIdx = list.indexOf(toId);
    list.splice(toIdx, 0, list.splice(fromIdx, 1)[0]);
    setDraft({ ...draft, questionIds: list });
    setDirty(true);
  };

  // プレビュー用グルーピング
  const groupedPreview = useMemo(() => {
    if (!draft) return [];
    const qs = draft.questionIds.map(id => questionMap[id]).filter(Boolean);
    const map = new Map<string, QscQuestion[]>();
    qs.forEach(q => {
      if (!map.has(q.place)) map.set(q.place, []);
      map.get(q.place)!.push(q);
    });
    return Array.from(map.entries());
  }, [draft, questionMap]);

  return (
    <main style={{ minHeight: "100vh", padding: "24px", background: "radial-gradient(1000px 600px at 10% -5%, rgba(79, 70, 229, 0.05) 0%, transparent 50%), #f8fafc", fontFamily: "'Inter', sans-serif" }}>
      
      {/* Top Bar with Breadcrumbs */}
      <div style={{ maxWidth: 1680, margin: "0 auto 28px", display: "grid", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Link href="/admin" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 6, color: "#64748b", fontSize: 13, fontWeight: 800 }}>
            <Home size={14} /><span>Dashboard</span>
          </Link>
          <ChevronRight size={14} style={{ color: "#cbd5e1" }} />
          <span style={{ color: "#1e293b", fontSize: 13, fontWeight: 900 }}>QSCアセット管理</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 54, height: 54, background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)", borderRadius: 18, display: "grid", placeItems: "center", color: "#fff", boxShadow: "0 10px 20px -5px rgba(79, 70, 229, 0.3)" }}><LayoutGrid size={28} /></div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 950, margin: 0, letterSpacing: "-0.02em" }}>QSC Asset Builder</h1>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#64748b", margin: "2px 0 0" }}>店舗チェックリストの構成・順番をカスタマイズ</p>
            </div>
          </div>
          <button onClick={handleNewAsset} style={{ height: 48, padding: "0 24px", borderRadius: 16, background: "#1e293b", color: "#fff", border: "none", fontWeight: 900, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}><Plus size={20} />新規アセット</button>
        </div>
      </div>

      <div style={{ maxWidth: 1680, margin: "0 auto", display: "grid", gridTemplateColumns: "360px 1fr 460px", gap: 24 }}>
        
        {/* Left: Asset List */}
        <section style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(20px)", borderRadius: 32, height: "calc(100vh - 150px)", border: "1px solid #e2e8f0", overflow: "hidden", display: "grid", gridTemplateRows: "auto 1fr", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
          <div style={{ padding: 20, borderBottom: "1px solid #f1f5f9" }}>
            <div style={{ position: "relative" }}>
              <Search size={18} style={{ position: "absolute", left: 14, top: 12, color: "#94a3b8" }} />
              <input value={listQ} onChange={e => setListQ(e.target.value)} placeholder="アセットを検索..." style={{ width: "100%", height: 42, borderRadius: 14, border: "1px solid #e2e8f0", paddingLeft: 42, outline: "none", fontSize: 14, fontWeight: 700 }} />
            </div>
          </div>
          <div style={{ overflowY: "auto", padding: 16 }}>
            {assets.filter(a => a.name.includes(listQ)).map(a => {
              const isActive = a.assetId === selectedAssetId;
              return (
                <div key={a.assetId} onClick={() => handleSelectAsset(a.assetId)} style={{ padding: 20, borderRadius: 24, cursor: "pointer", marginBottom: 12, background: isActive ? "#fff" : "transparent", border: "2px solid", borderColor: isActive ? "#4f46e5" : "transparent", transition: "0.2s" }}>
                  <div style={{ fontWeight: 950, fontSize: 15, color: isActive ? "#4f46e5" : "#1e293b" }}>{a.name}</div>
                  <div style={{ marginTop: 10, display: "flex", gap: 6 }}><Chip tone={a.isActive ? "green" : "red"}>{a.isActive ? "有効" : "無効"}</Chip><Chip tone="muted">{a.questionIds.length} 設問</Chip></div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Center: Editor */}
        <section style={{ background: "#fff", borderRadius: 32, border: "1px solid #e2e8f0", height: "calc(100vh - 150px)", display: "grid", gridTemplateRows: "auto 1fr", overflow: "hidden", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.05)" }}>
          {!draft ? <div style={{ display: "grid", placeItems: "center", height: "100%", color: "#94a3b8", fontWeight: 800 }}>アセットを選択してください</div> : (
            <>
              <div style={{ padding: "20px 32px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ fontSize: 18, fontWeight: 950, margin: 0 }}>構成を編集</h2>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={deleteAsset} style={{ height: 44, padding: "0 18px", borderRadius: 14, background: "#fef2f2", color: "#ef4444", border: "1px solid #fee2e2", fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}><Trash2 size={18} />削除</button>
                  <button onClick={saveDraft} disabled={!dirty} style={{ height: 44, padding: "0 28px", borderRadius: 14, background: dirty ? "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)" : "#e2e8f0", color: "#fff", border: "none", fontWeight: 900, cursor: dirty ? "pointer" : "default", display: "flex", alignItems: "center", gap: 10 }}><Save size={18} />保存</button>
                </div>
              </div>
              <div style={{ overflowY: "auto", padding: 32 }}>
                <div style={{ display: "grid", gap: 32 }}>
                  <div style={{ display: "grid", gap: 8 }}>
                    <label style={{ fontSize: 12, fontWeight: 900, color: "#64748b", marginLeft: 4 }}>アセット名</label>
                    <input value={draft.name} onChange={e => { setDraft({...draft, name: e.target.value}); setDirty(true); }} style={{ height: 54, borderRadius: 16, border: "1px solid #e2e8f0", padding: "0 20px", fontSize: 17, fontWeight: 900, outline: "none" }} />
                  </div>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                      <div style={{ fontWeight: 950, fontSize: 15 }}>構成設問一覧 <Chip tone="indigo">{draft.questionIds.length}</Chip></div>
                      <button onClick={() => setPickerOpen(true)} style={{ height: 40, padding: "0 20px", borderRadius: 12, border: "2px solid #4f46e5", color: "#4f46e5", fontWeight: 900, cursor: "pointer", background: "none", display: "flex", alignItems: "center", gap: 8 }}><Plus size={18} />設問を追加</button>
                    </div>
                    <div style={{ display: "grid", gap: 12 }}>
                      {draft.questionIds.map((qid, idx) => {
                        const q = questionMap[qid];
                        return (
                          <div key={qid} draggable onDragStart={() => dragId.current = qid} onDragOver={e => e.preventDefault()} onDrop={() => { if(dragId.current) reorder(dragId.current, qid); dragId.current = null; }} style={{ padding: "18px 24px", borderRadius: 24, background: "#fff", border: "1px solid #f1f5f9", display: "grid", gridTemplateColumns: "auto 40px 1fr auto", alignItems: "center", gap: 16, cursor: "grab", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                            <GripVertical size={20} color="#cbd5e1" />
                            <div style={{ fontWeight: 950, color: "#4f46e5", fontSize: 14 }}>#{idx + 1}</div>
                            <div style={{ display: "grid", gap: 6 }}>
                              <div style={{ display: "flex", gap: 6 }}><CategoryChip category={q?.category || "Q"} /><Chip tone="muted">{q?.place}</Chip></div>
                              <div style={{ fontWeight: 800, fontSize: 15, color: "#1e293b" }}>{q?.text || `ID: ${qid}`}</div>
                            </div>
                            <button onClick={() => { setDraft({...draft, questionIds: draft.questionIds.filter(x => x !== qid)}); setDirty(true); }} style={{ border: "none", background: "#f8fafc", color: "#94a3b8", borderRadius: 10, width: 36, height: 36, display: "grid", placeItems: "center", cursor: "pointer" }}><X size={18} /></button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>

        {/* Right: Preview */}
        <section style={{ background: "rgba(15, 23, 42, 0.02)", borderRadius: 32, height: "calc(100vh - 150px)", overflowY: "auto", padding: 24, border: "1px solid rgba(0,0,0,0.03)" }}>
          <h2 style={{ fontSize: 17, fontWeight: 950, marginBottom: 24, display: "flex", alignItems: "center", gap: 8, color: "#1e293b" }}><Eye size={20} color="#4f46e5" /> 実施プレビュー</h2>
          {!draft || draft.questionIds.length === 0 ? (
             <div style={{ textAlign: "center", marginTop: 100, color: "#94a3b8", fontWeight: 700 }}>設問がありません</div>
          ) : (
            <div style={{ display: "grid", gap: 28 }}>
              {groupedPreview.map(([place, qs]) => (
                <div key={place}>
                  <div style={{ fontSize: 14, fontWeight: 950, color: "#4f46e5", marginBottom: 16, display: "flex", alignItems: "center", gap: 8, paddingLeft: 8 }}><MapPin size={16} /> {place}</div>
                  <div style={{ display: "grid", gap: 12 }}>
                    {qs.map((q, i) => (
                      <div key={q.questionId} style={{ background: "#fff", padding: 20, borderRadius: 24, border: "1px solid #f1f5f9", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
                        <div style={{ fontSize: 14, fontWeight: 850, lineHeight: 1.6 }}>{i + 1}. {q.text}</div>
                        <div style={{ marginTop: 12 }}><Chip tone="muted">{q.answerType.toUpperCase()}</Chip></div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <QuestionPickerModal open={pickerOpen} questions={questions} pickedIds={draft?.questionIds || []} onToggle={(id: string) => { if(!draft) return; const next = draft.questionIds.includes(id) ? draft.questionIds.filter(x => x !== id) : [...draft.questionIds, id]; setDraft({...draft, questionIds: next}); setDirty(true); }} onClose={() => setPickerOpen(false)} />
    </main>
  );
}