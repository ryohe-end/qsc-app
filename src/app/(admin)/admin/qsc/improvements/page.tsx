"use client";

export const dynamic = "force-dynamic";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  ClipboardCheck, Search, Home, ChevronRight, ChevronLeft, AlertCircle,
  Clock, CheckCircle2, Image as ImageIcon, MessageSquare, ArrowRight,
  X, History, RotateCcw, Maximize2, Building2, MapPin, ArrowUpRight,
  UserCheck, Filter, Calendar, LayoutGrid, Download
} from "lucide-react";

/** =========================
 * 型定義
 * ========================= */
type IssueStatus = "pending" | "ongoing" | "review" | "completed";
type Quarter = "2025-Q4" | "2026-Q1" | "2026-Q2";

type HistoryLog = {
  date: string;
  user: string;
  action: string;
  comment?: string;
};

type IssueRow = {
  issueId: string;
  storeName: string;
  category: string;
  questionText: string;
  deadline: string;
  status: IssueStatus;
  inspectorName: string;
  beforePhoto: string;
  afterPhoto?: string;
  updatedAt: string;
  history: HistoryLog[];
  quarter: Quarter;
};

type Store = {
  id: string;
  name: string;
  address: string;
  issueCount: number;
  lastInspector: string;
};

/** =========================
 * モックデータ
 * ========================= */
const STORES: Store[] = [
  { id: "ST-001", name: "札幌大通店", address: "北海道札幌市中央区大通西2丁目", issueCount: 1, lastInspector: "佐藤 検査員" },
  { id: "ST-002", name: "新宿西口店", address: "東京都新宿区西新宿1丁目", issueCount: 2, lastInspector: "高橋 検査員" },
  { id: "ST-003", name: "大阪梅田店", address: "大阪府大阪市北区梅田3丁目", issueCount: 0, lastInspector: "田中 検査員" },
  { id: "ST-004", name: "福岡天神店", address: "福岡県福岡市中央区天神2丁目", issueCount: 1, lastInspector: "伊藤 検査員" },
];

const INITIAL_ISSUES: IssueRow[] = [
  {
    issueId: "IS-001",
    storeName: "札幌大通店",
    category: "館外",
    questionText: "入口周辺にゴミ・吸い殻・汚れはないか",
    deadline: "2026-02-15",
    status: "review",
    inspectorName: "佐藤 検査員",
    quarter: "2026-Q1",
    beforePhoto: "https://images.unsplash.com/photo-1590247813693-5541d1c609fd?w=1200",
    afterPhoto: "https://images.unsplash.com/photo-1589923188900-85dae523342b?w=1200",
    updatedAt: "2026-02-05 14:00",
    history: [
      { date: "2026-02-01 10:00", user: "佐藤 検査員", action: "不備を指摘", comment: "吸い殻が散乱しています。" },
      { date: "2026-02-03 15:30", user: "札幌大通店 店長", action: "改善報告提出", comment: "清掃ルートを見直し、実施しました。" },
    ]
  },
  {
    issueId: "IS-002",
    storeName: "新宿西口店",
    category: "マシン",
    questionText: "グリップ部分の拭き上げ清掃",
    deadline: "2026-02-06",
    status: "ongoing",
    inspectorName: "高橋 検査員",
    quarter: "2026-Q1",
    beforePhoto: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200",
    updatedAt: "2026-02-04 10:00",
    history: [
      { date: "2026-02-04 10:00", user: "高橋 検査員", action: "不備を指摘", comment: "全体的にベタつきが残っています。" },
    ]
  },
];

/** =========================
 * メインページ
 * ========================= */
export default function ImprovementReportsPage() {
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<IssueRow | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  // フィルター用ステート
  const [searchQuery, setSearchQuery] = useState("");
  const [activeQuarter, setActiveQuarter] = useState<Quarter>("2026-Q1");
  const [filterStatus, setFilterStatus] = useState<IssueStatus | "all">("all");

  /** -------------------------
   * 検索・フィルタリングロジック
   * ------------------------- */
  const filteredStores = useMemo(() => {
    return STORES.filter(s => 
      s.name.includes(searchQuery) || 
      s.address.includes(searchQuery) || 
      s.lastInspector.includes(searchQuery)
    );
  }, [searchQuery]);

  const filteredIssues = useMemo(() => {
    if (!selectedStore) return [];
    return INITIAL_ISSUES.filter(i => {
      const isStore = i.storeName === selectedStore.name;
      const isQuarter = i.quarter === activeQuarter;
      const isStatus = filterStatus === "all" || i.status === filterStatus;
      return isStore && isQuarter && isStatus;
    });
  }, [selectedStore, activeQuarter, filterStatus]);

  /** -------------------------
   * ヘルパーコンポーネント
   * ------------------------- */
  const StatusChip = ({ status }: { status: IssueStatus }) => {
    const config = {
      pending: { label: "未対応", bg: "#fef2f2", tx: "#ef4444", icon: <AlertCircle size={12} /> },
      ongoing: { label: "対応中", bg: "#eef2ff", tx: "#4f46e5", icon: <Clock size={12} /> },
      review: { label: "確認待ち", bg: "#fffbeb", tx: "#d97706", icon: <MessageSquare size={12} /> },
      completed: { label: "完了", bg: "#f0fdf4", tx: "#16a34a", icon: <CheckCircle2 size={12} /> },
    }[status];
    return (
      <span style={{ 
        fontSize: 10, fontWeight: 900, padding: "4px 10px", borderRadius: 8, 
        background: config.bg, color: config.tx, border: `1px solid ${config.tx}20`,
        display: "inline-flex", alignItems: "center", gap: 5 
      }}>
        {config.icon} {config.label}
      </span>
    );
  };

  const Breadcrumbs = () => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
      <Link href="/admin" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 6, color: "#64748b", fontSize: 13, fontWeight: 700 }}>
        <Home size={14} /><span>Dashboard</span>
      </Link>
      <ChevronRight size={14} style={{ color: "#cbd5e1" }} />
      <button 
        onClick={() => setSelectedStore(null)}
        style={{ background: "none", border: "none", padding: 0, color: selectedStore ? "#64748b" : "#1e293b", fontSize: 13, fontWeight: selectedStore ? 700 : 900, cursor: selectedStore ? "pointer" : "default" }}
      >
        改善報告管理
      </button>
      {selectedStore && (
        <>
          <ChevronRight size={14} style={{ color: "#cbd5e1" }} />
          <span style={{ color: "#1e293b", fontSize: 13, fontWeight: 900 }}>{selectedStore.name}</span>
        </>
      )}
    </div>
  );

  /** -------------------------
   * View: 店舗選択 (Filter機能付き)
   * ------------------------- */
  if (!selectedStore) {
    return (
      <main style={{ minHeight: "100vh", padding: "24px", background: "#f8fafc", fontFamily: "'Inter', sans-serif" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Breadcrumbs />
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 40, gap: 20 }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 950, color: "#1e293b", margin: 0, letterSpacing: "-0.02em" }}>店舗選択</h1>
              <p style={{ color: "#64748b", fontWeight: 600, marginTop: 4 }}>検査員：対象の店舗を検索・選択して是正状況を確認してください。</p>
            </div>
            <div style={{ position: "relative", width: "100%", maxWidth: 400 }}>
              <Search size={18} style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
              <input 
                placeholder="店舗名・エリア・検査員名で検索..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: "100%", height: 52, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, paddingLeft: 48, fontWeight: 600, outline: "none", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
            {filteredStores.map(store => (
              <button 
                key={store.id} 
                onClick={() => setSelectedStore(store)}
                style={{ 
                  textAlign: "left", background: "#fff", border: "1px solid #e2e8f0", padding: "24px", 
                  borderRadius: 24, cursor: "pointer", transition: "all 0.2s ease",
                  display: "flex", flexDirection: "column", gap: 16
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "#4f46e5"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "#e2e8f0"}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ width: 40, height: 40, background: "#f1f5f9", borderRadius: 12, display: "grid", placeItems: "center", color: "#64748b" }}>
                    <Building2 size={20} />
                  </div>
                  <div style={{ background: store.issueCount > 0 ? "#fef2f2" : "#f0fdf4", color: store.issueCount > 0 ? "#ef4444" : "#16a34a", fontSize: 11, fontWeight: 900, padding: "4px 10px", borderRadius: 20 }}>
                    指摘 {store.issueCount}件
                  </div>
                </div>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 900, color: "#1e293b", margin: "0 0 4px" }}>{store.name}</h2>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#94a3b8", fontSize: 12, fontWeight: 600 }}>
                    <MapPin size={12} /> {store.address}
                  </div>
                </div>
                <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 12, marginTop: "auto", display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "#64748b" }}>
                  <UserCheck size={14} color="#4f46e5" /> 担当: {store.lastInspector}
                </div>
              </button>
            ))}
          </div>
        </div>
      </main>
    );
  }

  /** -------------------------
   * View: 指摘一覧 (検査員用詳細フィルタ)
   * ------------------------- */
  return (
    <main style={{ minHeight: "100vh", padding: "24px", background: "#f8fafc", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <Breadcrumbs />

        {/* Store Header & Quarter Selection */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 56, height: 56, background: "#1e293b", borderRadius: 18, display: "grid", placeItems: "center", color: "#fff" }}>
              <Building2 size={28} />
            </div>
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 950, color: "#1e293b", margin: 0 }}>{selectedStore.name}</h1>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#64748b", margin: "2px 0 0" }}>指摘事項の是正モニタリング</p>
            </div>
          </div>
          
          <div style={{ display: "flex", background: "#e2e8f0", padding: 4, borderRadius: 12, gap: 4 }}>
            {(["2025-Q4", "2026-Q1", "2026-Q2"] as Quarter[]).map(q => (
              <button 
                key={q} 
                onClick={() => setActiveQuarter(q)} 
                style={{ 
                  padding: "8px 16px", borderRadius: 8, border: "none", fontSize: 12, fontWeight: 800, cursor: "pointer", 
                  background: activeQuarter === q ? "#fff" : "transparent", 
                  color: activeQuarter === q ? "#1e293b" : "#64748b",
                  transition: "0.2s" 
                }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Detailed Status Filters */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
            {(["all", "pending", "ongoing", "review", "completed"] as const).map(s => (
              <button 
                key={s} 
                onClick={() => setFilterStatus(s)} 
                style={{ 
                  whiteSpace: "nowrap", padding: "10px 18px", borderRadius: 14, border: "1px solid", 
                  borderColor: filterStatus === s ? "#1e293b" : "#e2e8f0",
                  background: filterStatus === s ? "#1e293b" : "#fff",
                  color: filterStatus === s ? "#fff" : "#64748b",
                  fontSize: 13, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: 8
                }}
              >
                {s === "all" ? "すべてのステータス" : s === "pending" ? "未対応" : s === "ongoing" ? "対応中" : s === "review" ? "確認待ち" : "完了"}
              </button>
            ))}
          </div>
          <button style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 14, background: "#fff", border: "1px solid #e2e8f0", fontSize: 13, fontWeight: 800, color: "#64748b", cursor: "pointer" }}>
            <Download size={16} /> CSV出力
          </button>
        </div>

        {/* Issue Cards */}
        <div style={{ display: "grid", gap: 24 }}>
          {filteredIssues.length > 0 ? (
            filteredIssues.map(issue => (
              <div key={issue.issueId} style={{ background: "#fff", borderRadius: 32, border: "1px solid #e2e8f0", overflow: "hidden", display: "grid", gridTemplateColumns: "1fr 400px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.02)" }}>
                
                {/* Information Area */}
                <div style={{ padding: 32, display: "flex", flexDirection: "column", gap: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 10, fontWeight: 900, color: "#4f46e5", background: "#f5f3ff", padding: "4px 10px", borderRadius: 8 }}>{issue.category}</span>
                        <span style={{ fontSize: 12, fontWeight: 800, color: "#94a3b8" }}>ID: {issue.issueId}</span>
                      </div>
                      <h3 style={{ fontSize: 20, fontWeight: 900, color: "#1e293b", margin: 0, lineHeight: 1.4 }}>{issue.questionText}</h3>
                    </div>
                    <StatusChip status={issue.status} />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, background: "#f8fafc", padding: 20, borderRadius: 24 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 900, color: "#94a3b8", marginBottom: 4 }}>改善期限</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "#1e293b", display: "flex", alignItems: "center", gap: 6 }}>
                        <Clock size={16} color="#64748b" /> {issue.deadline}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 900, color: "#94a3b8", marginBottom: 4 }}>担当検査員</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "#1e293b", display: "flex", alignItems: "center", gap: 6 }}>
                        <UserCheck size={16} color="#64748b" /> {issue.inspectorName}
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => setSelectedIssue(issue)} 
                    style={{ width: "100%", height: 52, borderRadius: 16, background: "#1e293b", color: "#fff", border: "none", fontWeight: 900, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontSize: 15 }}
                  >
                    <History size={18} /> 対応履歴・コメントを確認
                  </button>
                </div>

                {/* Visual Verification Area */}
                <div style={{ background: "#f1f5f9", padding: 24, display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 16 }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 10, fontWeight: 900, color: "#64748b", marginBottom: 8, letterSpacing: "0.05em" }}>指摘時 (BEFORE)</div>
                    <div style={{ position: "relative", width: "100%", aspectRatio: "1/1", borderRadius: 20, overflow: "hidden", border: "2px solid #fff", background: "#fff", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
                      <img src={issue.beforePhoto} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      <button onClick={() => setZoomedImage(issue.beforePhoto)} style={{ position: "absolute", bottom: 8, right: 8, background: "rgba(15,23,42,0.8)", border: "none", borderRadius: 10, padding: 8, color: "#fff", cursor: "pointer" }}><Maximize2 size={16} /></button>
                    </div>
                  </div>
                  <ArrowRight size={20} color="#cbd5e1" />
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 10, fontWeight: 900, color: "#64748b", marginBottom: 8, letterSpacing: "0.05em" }}>改善後 (AFTER)</div>
                    <div style={{ position: "relative", width: "100%", aspectRatio: "1/1", borderRadius: 20, overflow: "hidden", border: "2px solid #fff", background: "#e2e8f0", display: "grid", placeItems: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
                      {issue.afterPhoto ? (
                        <>
                          <img src={issue.afterPhoto} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          <button onClick={() => setZoomedImage(issue.afterPhoto)} style={{ position: "absolute", bottom: 8, right: 8, background: "rgba(15,23,42,0.8)", border: "none", borderRadius: 10, padding: 8, color: "#fff", cursor: "pointer" }}><Maximize2 size={16} /></button>
                        </>
                      ) : (
                        <div style={{ textAlign: "center" }}>
                          <ImageIcon size={32} color="#cbd5e1" />
                          <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", marginTop: 4 }}>未報告</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div style={{ textAlign: "center", padding: "100px 40px", background: "#fff", borderRadius: 40, border: "2px dashed #e2e8f0" }}>
              <div style={{ width: 80, height: 80, background: "#f0fdf4", color: "#16a34a", borderRadius: "50%", display: "grid", placeItems: "center", margin: "0 auto 24px" }}>
                <CheckCircle2 size={40} />
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 950, color: "#1e293b", marginBottom: 8 }}>指摘事項はありません</h2>
              <p style={{ color: "#64748b", fontWeight: 700 }}>選択された条件に該当する指摘データは見つかりませんでした。</p>
            </div>
          )}
        </div>
      </div>

      {/* Slide Panel: History & Approval */}
      {selectedIssue && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", justifyContent: "flex-end" }}>
          <div onClick={() => setSelectedIssue(null)} style={{ position: "absolute", inset: 0, background: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)" }} />
          <div style={{ position: "relative", width: "100%", maxWidth: 500, height: "100%", background: "#fff", boxShadow: "-10px 0 40px rgba(0,0,0,0.1)", display: "grid", gridTemplateRows: "auto 1fr auto", animation: "slideIn 0.3s cubic-bezier(0, 0, 0.2, 1)" }}>
            <div style={{ padding: "24px 32px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 950, margin: 0 }}>対応履歴・詳細</h2>
                <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 800 }}>ISSUE ID: {selectedIssue.issueId}</span>
              </div>
              <button onClick={() => setSelectedIssue(null)} style={{ width: 44, height: 44, borderRadius: 12, background: "#f8fafc", border: "none", cursor: "pointer", display: "grid", placeItems: "center" }}><X size={20} /></button>
            </div>
            
            <div style={{ padding: "32px", overflowY: "auto" }}>
              <div style={{ position: "relative", paddingLeft: 24, borderLeft: "2px solid #f1f5f9" }}>
                {selectedIssue.history.map((log, idx) => (
                  <div key={idx} style={{ position: "relative", marginBottom: 32 }}>
                    <div style={{ position: "absolute", left: -31, top: 4, width: 12, height: 12, borderRadius: "50%", background: idx === 0 ? "#4f46e5" : "#cbd5e1", border: "3px solid #fff" }} />
                    <div style={{ fontSize: 11, fontWeight: 900, color: "#94a3b8", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}><Calendar size={12} /> {log.date}</div>
                    <div style={{ fontSize: 15, fontWeight: 900, color: "#1e293b" }}>{log.action}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#64748b", marginTop: 2 }}>実行者: {log.user}</div>
                    {log.comment && (
                      <div style={{ marginTop: 12, padding: 16, background: "#f8fafc", borderRadius: 16, fontSize: 13, fontWeight: 600, color: "#475569", lineHeight: 1.6 }}>
                        {log.comment}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: "24px 32px", borderTop: "1px solid #f1f5f9", display: "flex", gap: 12, background: "#fff" }}>
              <button style={{ flex: 1, height: 56, borderRadius: 16, background: "#fff", border: "1px solid #e2e8f0", color: "#ef4444", fontWeight: 900, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <RotateCcw size={18} /> 差し戻し
              </button>
              <button style={{ flex: 2, height: 56, borderRadius: 16, background: "#4f46e5", color: "#fff", border: "none", fontWeight: 900, cursor: "pointer", fontSize: 15 }}>
                是正完了として承認
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {zoomedImage && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(15, 23, 42, 0.95)", backdropFilter: "blur(12px)", display: "grid", placeItems: "center", padding: 40 }} onClick={() => setZoomedImage(null)}>
          <button style={{ position: "absolute", top: 24, right: 24, background: "#fff", border: "none", borderRadius: "50%", width: 56, height: 56, cursor: "pointer", display: "grid", placeItems: "center", boxShadow: "0 10px 20px rgba(0,0,0,0.2)" }}><X size={28} /></button>
          <img src={zoomedImage} style={{ maxWidth: "100%", maxHeight: "85vh", borderRadius: 24, boxShadow: "0 30px 60px rgba(0,0,0,0.5)", objectFit: "contain" }} onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      <style jsx global>{`
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>
    </main>
  );
}