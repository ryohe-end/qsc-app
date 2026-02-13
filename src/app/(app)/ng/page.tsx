"use client";

import React, { useState, useRef, useMemo } from "react";
import Link from "next/link";
import { 
  ChevronLeft, 
  Camera, 
  Trash2, 
  Clock,
  Send,
  CheckCircle,
  MessageSquare,
  Check,
  Building2,
  ChevronRight,
  AlertCircle
} from "lucide-react";
import styles from "./NgPage.module.css";
import { useSession } from "@/app/(app)/lib/auth";

export const dynamic = "force-dynamic";

/* =========================================
   Types
   ========================================= */
type NgIssue = {
  id: string;
  category: string;
  question: string;
  inspectorNote: string;
  deadline: string;
  beforePhoto: string;
  afterPhoto?: string;
  comment: string;
  isSubmitting?: boolean;
};

/* =========================================
   Mock Data
   ========================================= */
const ADMIN_STORES = [
  { id: "S001", name: "JOYFIT 札幌大通", pending: 2, urgent: 1 },
  { id: "S002", name: "JOYFIT 仙台駅前", pending: 5, urgent: 0 },
  { id: "S003", name: "JOYFIT 新宿西口", pending: 1, urgent: 1 },
  { id: "S004", name: "JOYFIT 名古屋栄", pending: 3, urgent: 0 },
  { id: "S005", name: "JOYFIT 梅田", pending: 0, urgent: 0 },
];

function getMockIssues(storeId: string): NgIssue[] {
  // デモ用：店舗IDによって出し分け（S005は完了済みとする）
  if (storeId === "S005") return [];

  return [
    {
      id: "IS-001",
      category: "Cleanliness",
      question: "入口周辺にゴミ・吸い殻・汚れはないか",
      inspectorNote: "自動ドアの溝に砂利が溜まっています。清掃をお願いします。",
      deadline: "2026/02/15",
      beforePhoto: "https://images.unsplash.com/photo-1590247813693-5541d1c609fd?w=400",
      comment: ""
    },
    {
      id: "IS-002",
      category: "Service",
      question: "掲示物が期限切れになっていないか",
      inspectorNote: "キャンペーン案内が先月末のままです。貼り替えを至急実施してください。",
      deadline: "2026/02/13",
      beforePhoto: "https://images.unsplash.com/photo-1586769852836-bc069f19e1b6?w=400",
      comment: ""
    }
  ];
}

/* =========================================
   Components
   ========================================= */

/**
 * 店舗向け詳細ビュー（是正報告の実画面）
 */
function StoreNgView({ 
  storeName, 
  storeId, 
  onBack 
}: { 
  storeName: string; 
  storeId: string;
  onBack?: () => void; 
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeIssueId, setActiveIssueId] = useState<string | null>(null);
  const [isBatchSubmitting, setIsBatchSubmitting] = useState(false);
  
  // 初期データロード
  const [issues, setIssues] = useState<NgIssue[]>(() => getMockIssues(storeId));

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>, issueId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setIssues(prev => prev.map(iss => 
        iss.id === issueId ? { ...iss, afterPhoto: dataUrl } : iss
      ));
    };
    reader.readAsDataURL(file);
  };

  const handleCommentChange = (issueId: string, text: string) => {
    setIssues(prev => prev.map(iss => 
      iss.id === issueId ? { ...iss, comment: text } : iss
    ));
  };

  const handleSingleSubmit = async (issueId: string) => {
    setIssues(prev => prev.map(iss => iss.id === issueId ? { ...iss, isSubmitting: true } : iss));
    await new Promise(r => setTimeout(r, 800));
    alert("この項目の報告を送信しました。");
    setIssues(prev => prev.filter(iss => iss.id !== issueId));
  };

  const handleBatchSubmit = async () => {
    const targets = issues.filter(iss => !!iss.afterPhoto);
    if (targets.length === 0) return;
    setIsBatchSubmitting(true);
    await new Promise(r => setTimeout(r, 1500));
    alert(`${targets.length}件の是正報告をまとめて送信しました。`);
    setIssues(prev => prev.filter(iss => !iss.afterPhoto));
    setIsBatchSubmitting(false);
  };

  const batchCount = issues.filter(iss => !!iss.afterPhoto).length;
  const canBatchSubmit = batchCount > 0 && !isBatchSubmitting;

  return (
    <div className={styles.container}>
      <div className={styles.scrollArea}>
        
        {/* Navigation */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {onBack ? (
            <button 
              onClick={onBack} 
              className="qsc-btn qsc-btn-secondary" 
              style={{ height: 36, padding: "0 12px", gap: 6, fontSize: 12 }}
            >
               <ChevronLeft size={16} /> 店舗一覧に戻る
            </button>
          ) : (
            <Link href="/" className="qsc-btn qsc-btn-secondary" style={{ height: 36, padding: "0 12px", gap: 6, fontSize: 12 }}>
               <ChevronLeft size={16} /> ホーム
            </Link>
          )}
        </div>

        <div className={styles.header}>
          <h1 className={styles.title}>{storeName} 是正報告</h1>
          <p className={styles.sub}>対応した項目の写真を撮り、報告してください。</p>
        </div>

        {issues.length === 0 ? (
          <div className={styles.empty}>
            <CheckCircle size={64} strokeWidth={1} style={{ marginBottom: 16, color: '#34c759' }} />
            <p style={{ fontWeight: 800 }}>対応が必要な不備はありません</p>
          </div>
        ) : (
          issues.map((issue) => (
            <section key={issue.id} className={styles.card}>
              <div className={styles.cardHead}>
                <span className={styles.category}>{issue.category}</span>
                <span className={styles.deadline}>
                  <Clock size={12} /> {issue.deadline}
                </span>
              </div>

              <div className={styles.questionText}>{issue.question}</div>
              
              <div className={styles.inspectorNote}>
                {issue.inspectorNote}
              </div>

              <div className={styles.photoCompare}>
                <div className={styles.photoBox}>
                  <div className={styles.photoLabel}>指摘時 (Before)</div>
                  <div className={styles.imgWrapper}>
                    <img src={issue.beforePhoto} className={styles.img} alt="Before" />
                  </div>
                </div>

                <div className={styles.photoBox}>
                  <div className={styles.photoLabel}>改善後 (After)</div>
                  <div className={styles.imgWrapper}>
                    {issue.afterPhoto ? (
                      <>
                        <img src={issue.afterPhoto} className={styles.img} alt="After" />
                        <button 
                          className="qsc-btn" 
                          style={{ position:"absolute", top:4, right:4, width:32, height:32, padding:0, borderRadius:8, background:"rgba(255,59,48,0.9)", border:"none", color:"#fff", zIndex: 10 }}
                          onClick={() => setIssues(prev => prev.map(iss => iss.id === issue.id ? { ...iss, afterPhoto: undefined } : iss))}
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    ) : (
                      <button 
                        className={styles.uploadBtn} 
                        onClick={() => {
                          setActiveIssueId(issue.id);
                          fileInputRef.current?.click();
                        }}
                      >
                        <Camera size={24} />
                        <span style={{ fontSize: 10, fontWeight: 900 }}>撮影</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 900, opacity: 0.5 }}>
                  <MessageSquare size={12} /> 実施コメント
                </div>
                <textarea 
                  className={styles.commentArea}
                  placeholder="実施した対策を入力（任意）"
                  rows={2}
                  value={issue.comment}
                  onChange={(e) => handleCommentChange(issue.id, e.target.value)}
                />
              </div>

              <div className={styles.actions}>
                <button 
                  className={styles.submitSingleBtn}
                  disabled={!issue.afterPhoto || issue.isSubmitting || isBatchSubmitting}
                  onClick={() => handleSingleSubmit(issue.id)}
                >
                  {issue.isSubmitting ? (
                    <span className="qsc-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                  ) : (
                    <>
                      <Check size={16} />
                      <span>この項目のみ報告</span>
                    </>
                  )}
                </button>
              </div>
            </section>
          ))
        )}
      </div>

      {batchCount >= 2 && (
        <div className={styles.bottomBar}>
          <button 
            className={styles.submitAllBtn} 
            disabled={!canBatchSubmit}
            onClick={handleBatchSubmit}
          >
            {isBatchSubmitting ? (
              <span className="qsc-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
            ) : (
              <>
                <Send size={20} />
                <span>選択中の {batchCount} 件をまとめて送信</span>
              </>
            )}
          </button>
        </div>
      )}

      <input 
        type="file" accept="image/*" capture="environment"
        ref={fileInputRef} style={{ display: 'none' }}
        onChange={(e) => activeIssueId && handlePhotoSelect(e, activeIssueId)}
      />
    </div>
  );
}

/**
 * 管理者・監査員向けダッシュボード（店舗一覧）
 */
function AdminNgDashboard({ 
  onSelect 
}: { 
  onSelect: (store: typeof ADMIN_STORES[0]) => void 
}) {
  return (
    <div className={styles.container}>
      <div className={styles.scrollArea}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Link href="/" className="qsc-btn qsc-btn-secondary" style={{ height: 36, padding: "0 12px", gap: 6, fontSize: 12 }}>
             <ChevronLeft size={16} /> ホーム
          </Link>
        </div>

        <div className={styles.header}>
          <h1 className={styles.title}>是正状況一覧</h1>
          <p className={styles.sub}>是正報告が必要な店舗の一覧です。</p>
        </div>

        {ADMIN_STORES.map((store) => (
          <button
            key={store.id}
            onClick={() => onSelect(store)}
            className={styles.card}
            style={{ 
              width: "100%", padding: "16px 20px", textAlign: "left", cursor: "pointer", 
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 40, height: 40, background: "#f1f5f9", borderRadius: 12, display: "grid", placeItems: "center", color: "#64748b" }}>
                <Building2 size={20} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#1e293b" }}>{store.name}</div>
                <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 700, display: "flex", gap: 8, marginTop: 4 }}>
                  {store.pending > 0 ? (
                    <span style={{ color: "#ef4444" }}>未対応 {store.pending}件</span>
                  ) : (
                    <span style={{ color: "#16a34a" }}>対応完了</span>
                  )}
                  {store.urgent > 0 && (
                    <span style={{ color: "#d97706", display: "flex", alignItems: "center", gap: 2 }}>
                      <AlertCircle size={12} /> 緊急 {store.urgent}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <ChevronRight size={18} color="#cbd5e1" />
          </button>
        ))}
      </div>
    </div>
  );
}

/* =========================================
   Main Page Component
   ========================================= */
export default function NgPage() {
  const { session, loading } = useSession();
  const [selectedStore, setSelectedStore] = useState<typeof ADMIN_STORES[0] | null>(null);

  if (loading) return null;

  const role = session?.role || "viewer";
  const isManager = role === "manager";

  // ① 店舗ユーザー: 自店舗の詳細を即時表示
  if (isManager) {
    const storeDisplayName = session?.name ? session.name.split(" ")[0] : "自店舗";
    // 自店舗ID（本来はセッションから取得）
    const myStoreId = session?.assignedStoreId || "MY_STORE";
    return <StoreNgView storeName={storeDisplayName} storeId={myStoreId} />;
  }

  // ② 管理者・その他: ドリルダウン表示
  if (selectedStore) {
    return (
      <StoreNgView 
        storeName={selectedStore.name} 
        storeId={selectedStore.id} 
        onBack={() => setSelectedStore(null)} 
      />
    );
  }

  // デフォルト: 管理者用ダッシュボード
  return <AdminNgDashboard onSelect={setSelectedStore} />;
}