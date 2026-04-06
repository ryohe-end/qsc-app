"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  Loader2, ArrowLeft, Home, ChevronRight, 
  Printer, AlertCircle, MessageSquare, User, 
  Calendar, Clock 
} from "lucide-react";

export default function ResultPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchResult() {
      if (!params?.id) return;
      try {
        const res = await fetch(`/api/check/results?storeId=${params.id}`);
        if (!res.ok) throw new Error("Not Found");
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchResult();
  }, [params?.id]);

  if (loading) return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}><Loader2 className="animate-spin" /></div>;
  if (!data) return <div style={{ padding: '40px', textAlign: 'center' }}>データが見つかりません</div>;

  const { summary, sections, storeName, userName } = data;

  // --- スコアに応じた色を決定する関数 ---
  const getStatusColor = (percent: number) => {
    if (percent >= 80) return { main: '#2563eb', bg: '#eff6ff', border: '#dbeafe', text: '#1e40af' }; // 青
    if (percent >= 60) return { main: '#d97706', bg: '#fffbeb', border: '#fef3c7', text: '#92400e' }; // 黄
    return { main: '#dc2626', bg: '#fef2f2', border: '#fee2e2', text: '#991b1b' }; // 赤
  };

  const status = getStatusColor(summary.percentage);

  // --- NG項目だけを抽出する ---
  const ngItems = sections.flatMap((sec: any) => 
    sec.items.filter((item: any) => item.state === 'ng')
      .map((item: any) => ({ ...item, sectionTitle: sec.title }))
  );

  // --- 印刷ボタンの処理 ---
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="report-container" style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      
      {/* 🟢 ヘッダー（印刷時は非表示） */}
      <style>{`@media print { .no-print { display: none !important; } .report-container { background: white !important; padding: 0 !important; } }`}</style>
      
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748b' }}>
          <Home size={14} onClick={() => router.push('/')} style={{ cursor: 'pointer' }} />
          <ChevronRight size={12} />
          <span>点検レポート</span>
          <ChevronRight size={12} />
          <span style={{ fontWeight: 'bold', color: '#1e293b' }}>{storeName}</span>
        </div>
        <button onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', backgroundColor: '#1e293b', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' }}>
          <Printer size={16} /> PDF/印刷
        </button>
      </div>

      {/* 🟢 メインスコア（動的色分け） */}
      <div style={{ backgroundColor: status.bg, borderRadius: '32px', padding: '40px', textAlign: 'center', border: `2px solid ${status.border}`, marginBottom: '24px' }}>
        <div style={{ fontSize: '14px', fontWeight: 'bold', color: status.text, opacity: 0.7, letterSpacing: '2px' }}>TOTAL SCORE</div>
        <div style={{ fontSize: '100px', fontWeight: '900', color: status.main, letterSpacing: '-5px', margin: '10px 0' }}>
          {summary.percentage}<span style={{ fontSize: '40px', letterSpacing: '0' }}>%</span>
        </div>
        <div style={{ fontWeight: 'bold', color: status.text }}>{summary.score} / {summary.maxScore} 項目合格</div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '30px' }}>
          <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '20px' }}>
            <Calendar size={16} color={status.main} />
            <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>点検日</div>
            <div style={{ fontWeight: 'bold' }}>{summary.inspectionDate}</div>
          </div>
          <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '20px' }}>
            <Clock size={16} color="#e11d48" />
            <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>改善期限</div>
            <div style={{ fontWeight: 'bold', color: '#e11d48' }}>{summary.improvementDeadline}</div>
          </div>
        </div>
      </div>

      {/* 🟢 カテゴリ分析 */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ fontSize: '14px', color: '#64748b', marginBottom: '12px', paddingLeft: '8px' }}>CATEGORY SCORES</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {sections.map((sec: any) => {
            const secColor = getStatusColor(sec.percentage).main;
            return (
              <div key={sec.id} style={{ backgroundColor: 'white', padding: '20px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#475569' }}>{sec.title}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', margin: '8px 0' }}>
                  <span style={{ fontSize: '24px', fontWeight: '900', color: secColor }}>{sec.percentage}</span>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>%</span>
                </div>
                <div style={{ width: '100%', height: '6px', backgroundColor: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${sec.percentage}%`, height: '100%', backgroundColor: secColor }}></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 🟢 NG項目リスト（ここが改善指示書になる） */}
      <div style={{ marginBottom: '40px' }}>
        <h3 style={{ fontSize: '14px', color: '#e11d48', marginBottom: '12px', paddingLeft: '8px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <AlertCircle size={16} /> 改善が必要な項目 ({ngItems.length})
        </h3>
        {ngItems.length > 0 ? (
          ngItems.map((item: any, idx: number) => (
            <div key={idx} style={{ backgroundColor: 'white', padding: '20px', borderRadius: '20px', borderLeft: '6px solid #e11d48', marginBottom: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 'bold', marginBottom: '4px' }}>{item.sectionTitle}</div>
              <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#1e293b', marginBottom: '10px' }}>{item.label}</div>
              <div style={{ backgroundColor: '#fff1f2', padding: '12px', borderRadius: '12px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <MessageSquare size={16} color="#e11d48" style={{ marginTop: '2px' }} />
                <div style={{ fontSize: '14px', color: '#9f1239', fontWeight: '500' }}>{item.note || "指示事項なし"}</div>
              </div>
            </div>
          ))
        ) : (
          <div style={{ textAlign: 'center', padding: '30px', backgroundColor: '#f0fdf4', borderRadius: '20px', color: '#15803d', fontWeight: 'bold' }}>
            ✨ 全項目合格です！素晴らしい！
          </div>
        )}
      </div>

      {/* 🟢 署名 */}
      <div style={{ backgroundColor: '#1e293b', padding: '24px', borderRadius: '24px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 'bold' }}>STORE / AUDITOR</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{storeName}</div>
          <div style={{ fontSize: '14px', color: '#94a3b8' }}>点検者: {userName}</div>
        </div>
        <User size={32} color="#334155" />
      </div>
    </div>
  );
}