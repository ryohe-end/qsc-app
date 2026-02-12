// src/app/(app)/ng/page.tsx
"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { 
  ChevronLeft, 
  Camera, 
  Trash2, 
  Clock,
  Send,
  CheckCircle,
  MessageSquare,
  Check
} from "lucide-react";
import styles from "./NgPage.module.css";
import { useSession } from "@/app/(app)/lib/auth";

export const dynamic = "force-dynamic";

type NgIssue = {
  id: string;
  category: string;
  question: string;
  inspectorNote: string;
  deadline: string;
  beforePhoto: string;
  afterPhoto?: string;
  comment: string;
  isSubmitting?: boolean; // 個別のローディング状態
};

export default function NgPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeIssueId, setActiveIssueId] = useState<string | null>(null);
  const [isBatchSubmitting, setIsBatchSubmitting] = useState(false);

  // Mock Data
  const [issues, setIssues] = useState<NgIssue[]>([
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
  ]);

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

  // ✅ 追加：個別報告の送信
  const handleSingleSubmit = async (issueId: string) => {
    setIssues(prev => prev.map(iss => iss.id === issueId ? { ...iss, isSubmitting: true } : iss));
    
    await new Promise(r => setTimeout(r, 800)); // シミュレーション
    
    alert("この項目の報告を送信しました。");
    setIssues(prev => prev.filter(iss => iss.id !== issueId));
  };

  // ✅ 一括報告の送信
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
    <main className={styles.container}>
      <div className={styles.scrollArea}>
        
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Link href="/" className="qsc-btn qsc-btn-secondary" style={{ height: 36, padding: "0 12px", gap: 6, fontSize: 12 }}>
             <ChevronLeft size={16} /> ホーム
          </Link>
        </div>

        <div className={styles.header}>
          <h1 className={styles.title}>是正報告</h1>
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

              {/* ✅ 個別報告アクション */}
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

      {/* 一括報告ボタン（複数あるときに出すと効果的） */}
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
    </main>
  );
}