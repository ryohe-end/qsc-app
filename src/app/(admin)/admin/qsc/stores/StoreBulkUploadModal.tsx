"use client";

import React, { useState, useRef } from "react";
import { Upload, X, CheckCircle2, AlertCircle, Download, Loader2 } from "lucide-react";

type BulkRow = {
  storeId: string;
  email: string;
  managers: string[];
};

type UploadResult = {
  storeId: string;
  ok: boolean;
  error?: string;
};

type Props = {
  onClose: () => void;
  onComplete: () => void;
};

/* ========================= CSV Parser ========================= */
function parseCSV(text: string): BulkRow[] {
  // BOM除去
  const cleaned = text.replace(/^\uFEFF/, "");
  const lines = cleaned.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
  const storeIdIdx = headers.indexOf("storeid");
  const emailIdx = headers.indexOf("email");
  const managersIdx = headers.indexOf("managers");

  if (storeIdIdx === -1) throw new Error("storeId 列が見つかりません");

  const rows: BulkRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map(c => c.trim());
    const storeId = cols[storeIdIdx] || "";
    if (!storeId) continue;

    const email = emailIdx !== -1 ? (cols[emailIdx] || "") : "";
    const managersRaw = managersIdx !== -1 ? (cols[managersIdx] || "") : "";
    const managers = managersRaw
      ? managersRaw.split(";").map(m => m.trim()).filter(Boolean)
      : [];

    rows.push({ storeId, email, managers });
  }
  return rows;
}

/* ========================= Component ========================= */
export function StoreBulkUploadModal({ onClose, onComplete }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<BulkRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<UploadResult[] | null>(null);
  const [successCount, setSuccessCount] = useState(0);
  const [failCount, setFailCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    setFile(f);
    setParseError(null);
    setResults(null);
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const text = e.target?.result as string;
        const rows = parseCSV(text);
        if (rows.length === 0) throw new Error("有効なデータがありません");
        setPreview(rows);
      } catch (err) {
        setParseError(err instanceof Error ? err.message : "CSVの解析に失敗しました");
        setPreview([]);
      }
    };
    reader.readAsText(f, "utf-8");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleUpload = async () => {
    if (preview.length === 0) return;
    setUploading(true);
    try {
      // 100件ずつバッチ処理
      const BATCH = 100;
      let allResults: UploadResult[] = [];
      let totalSuccess = 0;
      let totalFail = 0;

      for (let i = 0; i < preview.length; i += BATCH) {
        const batch = preview.slice(i, i + BATCH);
        const res = await fetch("/api/admin/qsc/stores/bulk-update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows: batch }),
        });
        const data = await res.json();
        allResults = [...allResults, ...(data.results || [])];
        totalSuccess += data.successCount || 0;
        totalFail += data.failCount || 0;
      }

      setResults(allResults);
      setSuccessCount(totalSuccess);
      setFailCount(totalFail);
      if (totalFail === 0) onComplete();
    } catch (e) {
      setParseError(e instanceof Error ? e.message : "アップロードに失敗しました");
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const csv = "storeId,email,managers\nS_001,store001@example.com,manager1@example.com;manager2@example.com\nS_002,store002@example.com,manager3@example.com\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "store_bulk_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(15,23,42,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "#fff", borderRadius: 28, width: "100%", maxWidth: 640, maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 25px 50px rgba(0,0,0,0.2)" }}>

        {/* ヘッダー */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 900, color: "#1e293b" }}>CSV一括登録</div>
            <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600, marginTop: 2 }}>メールアドレスと担当者を一括更新</div>
          </div>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 10, background: "#f1f5f9", border: "none", cursor: "pointer", display: "grid", placeItems: "center" }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 24, overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>

          {/* テンプレートDL */}
          <button onClick={downloadTemplate} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 12, border: "1.5px dashed #e2e8f0", background: "#f8fafc", cursor: "pointer", fontSize: 13, fontWeight: 800, color: "#64748b", width: "100%" }}>
            <Download size={15} color="#6366f1" /> テンプレートCSVをダウンロード
          </button>

          {/* フォーマット説明 */}
          <div style={{ background: "#f8fafc", borderRadius: 14, padding: "12px 16px", fontSize: 12, fontWeight: 600, color: "#64748b", lineHeight: 1.7 }}>
            <div style={{ fontWeight: 900, color: "#1e293b", marginBottom: 4 }}>CSVフォーマット</div>
            <div>• <code style={{ background: "#e2e8f0", padding: "1px 4px", borderRadius: 4 }}>storeId</code> 必須（例: S_001）</div>
            <div>• <code style={{ background: "#e2e8f0", padding: "1px 4px", borderRadius: 4 }}>email</code> 通知先メール（1件）</div>
            <div>• <code style={{ background: "#e2e8f0", padding: "1px 4px", borderRadius: 4 }}>managers</code> 担当者メール（; 区切りで複数可）</div>
          </div>

          {/* ドロップゾーン */}
          {!results && (
            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              style={{ border: `2px dashed ${file ? "#6366f1" : "#e2e8f0"}`, borderRadius: 18, padding: "32px 20px", textAlign: "center", cursor: "pointer", background: file ? "#f5f3ff" : "#fafafa", transition: "all 0.2s" }}
            >
              <Upload size={32} color={file ? "#6366f1" : "#cbd5e1"} style={{ margin: "0 auto 10px" }} />
              <div style={{ fontSize: 14, fontWeight: 800, color: file ? "#4f46e5" : "#64748b" }}>
                {file ? file.name : "CSVファイルをドロップ or クリックして選択"}
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>UTF-8 / Shift-JIS 対応</div>
              <input ref={fileInputRef} type="file" accept=".csv" style={{ display: "none" }}
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </div>
          )}

          {/* エラー */}
          {parseError && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderRadius: 12, background: "#fef2f2", color: "#dc2626", fontSize: 13, fontWeight: 700 }}>
              <AlertCircle size={16} /> {parseError}
            </div>
          )}

          {/* プレビュー */}
          {preview.length > 0 && !results && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 900, color: "#1e293b", marginBottom: 8 }}>
                プレビュー（{preview.length}件）
              </div>
              <div style={{ border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden", maxHeight: 240, overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead style={{ background: "#f8fafc", position: "sticky", top: 0 }}>
                    <tr>
                      {["storeId", "email", "managers"].map(h => (
                        <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 900, color: "#94a3b8", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 50).map((row, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "8px 12px", fontWeight: 800, color: "#1e293b" }}>{row.storeId}</td>
                        <td style={{ padding: "8px 12px", color: "#64748b" }}>{row.email || "—"}</td>
                        <td style={{ padding: "8px 12px", color: "#64748b" }}>{row.managers.join(", ") || "—"}</td>
                      </tr>
                    ))}
                    {preview.length > 50 && (
                      <tr><td colSpan={3} style={{ padding: "8px 12px", textAlign: "center", color: "#94a3b8", fontSize: 11 }}>... 他 {preview.length - 50}件</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 結果 */}
          {results && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ background: "#f0fdf4", borderRadius: 14, padding: "16px", textAlign: "center" }}>
                  <CheckCircle2 size={24} color="#059669" style={{ margin: "0 auto 6px" }} />
                  <div style={{ fontSize: 24, fontWeight: 900, color: "#059669" }}>{successCount}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#059669" }}>件成功</div>
                </div>
                <div style={{ background: failCount > 0 ? "#fef2f2" : "#f0fdf4", borderRadius: 14, padding: "16px", textAlign: "center" }}>
                  <AlertCircle size={24} color={failCount > 0 ? "#dc2626" : "#059669"} style={{ margin: "0 auto 6px" }} />
                  <div style={{ fontSize: 24, fontWeight: 900, color: failCount > 0 ? "#dc2626" : "#059669" }}>{failCount}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: failCount > 0 ? "#dc2626" : "#059669" }}>件失敗</div>
                </div>
              </div>

              {failCount > 0 && (
                <div style={{ border: "1px solid #fee2e2", borderRadius: 14, overflow: "hidden", maxHeight: 160, overflowY: "auto" }}>
                  {results.filter(r => !r.ok).map((r, i) => (
                    <div key={i} style={{ padding: "8px 14px", borderBottom: "1px solid #fee2e2", fontSize: 12, color: "#dc2626", display: "flex", gap: 8 }}>
                      <span style={{ fontWeight: 900 }}>{r.storeId}</span>
                      <span>{r.error}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* フッター */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid #f1f5f9", display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, height: 48, borderRadius: 14, border: "1px solid #e2e8f0", background: "#fff", fontWeight: 800, cursor: "pointer", fontSize: 14, color: "#64748b" }}>
            {results ? "閉じる" : "キャンセル"}
          </button>
          {!results && (
            <button onClick={handleUpload} disabled={preview.length === 0 || uploading}
              style={{ flex: 2, height: 48, borderRadius: 14, border: "none", background: preview.length === 0 ? "#e2e8f0" : "#1e293b", color: "#fff", fontWeight: 900, cursor: preview.length === 0 ? "not-allowed" : "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {uploading ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> 更新中...</> : `${preview.length}件を一括更新`}
            </button>
          )}
        </div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}`}</style>
    </div>
  );
}
