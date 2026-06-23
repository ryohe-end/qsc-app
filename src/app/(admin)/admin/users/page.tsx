"use client";

export const dynamic = "force-dynamic";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Users, Search, X, Home, Trash2, ChevronRight, Save, Mail, UserPlus,
  Shield, Building2, Hash, Loader2, Eye, EyeOff, Lock, Store, Check,
  Upload, Download, FileText, AlertCircle, CheckCircle2,
} from "lucide-react";

/* ========================= Types ========================= */
type UserRole = "admin" | "store" | "inspector";
type UserStatus = "active" | "invited" | "suspended";

type UserRow = {
  userId: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  corpId: string;
  status: UserStatus;
  assignedStoreIds: string[]; // クラブコードの代わりに storeId 複数
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
};

type StoreOption = {
  storeId: string;
  name: string;
  brandName?: string;
  clubCode?: number;
};

type CorpOption = {
  corpId: string;
  name: string;
};

const ROLES: Record<UserRole, { label: string; tone: string; desc: string }> = {
  admin:     { label: "システム管理者", tone: "red",    desc: "全機能へのアクセス権限" },
  store:     { label: "店舗担当",       tone: "indigo", desc: "自店舗の結果閲覧と改善入力" },
  inspector: { label: "検査員",         tone: "blue",   desc: "QSC検査の実施と報告" },
};

/* ========================= Sub Components ========================= */
const Chip = ({ children, tone = "muted" }: { children: React.ReactNode; tone?: string }) => {
  const styles: Record<string, { bg: string; text: string; bd: string }> = {
    blue:   { bg: "#eff6ff", text: "#1d4ed8", bd: "#dbeafe" },
    green:  { bg: "#f0fdf4", text: "#15803d", bd: "#dcfce7" },
    red:    { bg: "#fef2f2", text: "#991b1b", bd: "#fee2e2" },
    indigo: { bg: "#eef2ff", text: "#4338ca", bd: "#e0e7ff" },
    amber:  { bg: "#fffbeb", text: "#b45309", bd: "#fef3c7" },
    muted:  { bg: "#f8fafc", text: "#475569", bd: "#e2e8f0" },
  };
  const c = styles[tone] || styles.muted;
  return (
    <span className="status-chip" style={{ background: c.bg, color: c.text, border: `1px solid ${c.bd}` }}>
      {children}
    </span>
  );
};

const FormLabel = ({ children, required }: { children: React.ReactNode; required?: boolean }) => (
  <label className="form-label">
    {children}
    {required && <span className="required-mark">*</span>}
  </label>
);

/* ========================= StoreMultiSelect ========================= */
function StoreMultiSelect({ selected, onChange, stores }: {
  selected: string[];
  onChange: (ids: string[]) => void;
  stores: StoreOption[];
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, []);

  const filtered = stores.filter(s =>
    !query || s.name.toLowerCase().includes(query.toLowerCase()) || s.storeId.toLowerCase().includes(query.toLowerCase())
  );

  const toggle = (storeId: string) => {
    onChange(selected.includes(storeId) ? selected.filter(id => id !== storeId) : [...selected, storeId]);
  };

  const selectedStores = stores.filter(s => selected.includes(s.storeId));

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      {/* 選択済みタグ */}
      {selectedStores.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
          {selectedStores.map(s => (
            <div key={s.storeId} style={{ display: "flex", alignItems: "center", gap: 6, background: "#f1f5f9", borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 700, color: "#1e293b" }}>
              <Store size={12} color="#6366f1" />
              {s.name}
              <button type="button" onClick={() => toggle(s.storeId)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 0, display: "grid", placeItems: "center" }}>
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
      {/* 検索インプット */}
      <div style={{ position: "relative" }}>
        <Search size={15} style={{ position: "absolute", left: 14, top: 15, color: "#94a3b8", pointerEvents: "none" }} />
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="店舗名で検索して選択..."
          style={{ width: "100%", boxSizing: "border-box", height: 46, borderRadius: 14, border: "1px solid #e2e8f0", paddingLeft: 40, paddingRight: 12, fontSize: 14, fontWeight: 600, outline: "none" }}
        />
      </div>
      {/* ドロップダウン */}
      {open && (
        <div style={{ position: "absolute", top: "105%", left: 0, right: 0, zIndex: 300, background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 10px 25px rgba(0,0,0,0.1)", maxHeight: 220, overflowY: "auto", padding: 6 }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "12px 16px", fontSize: 13, color: "#94a3b8", textAlign: "center", fontWeight: 700 }}>該当する店舗がありません</div>
          ) : filtered.map(s => {
            const isSel = selected.includes(s.storeId);
            return (
              <button key={s.storeId} type="button" onClick={() => toggle(s.storeId)}
                style={{ width: "100%", textAlign: "left", padding: "10px 12px", borderRadius: 10, border: "none", background: isSel ? "#f5f3ff" : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}
                onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = "#f8fafc"; }}
                onMouseLeave={e => { e.currentTarget.style.background = isSel ? "#f5f3ff" : "transparent"; }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#1e293b" }}>{s.name}</div>
                  {s.brandName && <div style={{ fontSize: 11, color: "#94a3b8" }}>{s.brandName}</div>}
                </div>
                {isSel && <Check size={15} color="#6366f1" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ========================= CSV Import ========================= */
type CsvParsedRow = {
  rowNum: number;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  corpId: string;
  corpDisplay: string; // プレビュー表示用（解決後の法人名）
  assignedStoreIds: string[];
  storeDisplays: string[]; // プレビュー表示用（解決後の店舗名）
  errors: string[];
};

const CSV_HEADERS = ["name", "email", "password", "role", "corp", "assignedStores"] as const;
const CSV_TEMPLATE =
  "name,email,password,role,corp,assignedStores\n" +
  "山田 太郎,yamada@example.com,Pass1234!,store,株式会社サンプル,\n" +
  "鈴木 花子,suzuki@example.com,Suzuki987!,inspector,株式会社サンプル,渋谷店|新宿店\n";

// 簡易CSVパーサ（"…" 内のカンマと改行、"" によるエスケープに対応）
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;
  const t = text.replace(/^﻿/, ""); // BOM除去
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (inQuotes) {
      if (ch === '"') {
        if (t[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") { cur.push(field); field = ""; }
      else if (ch === "\n") { cur.push(field); rows.push(cur); cur = []; field = ""; }
      else if (ch === "\r") { /* skip */ }
      else field += ch;
    }
  }
  if (field.length > 0 || cur.length > 0) { cur.push(field); rows.push(cur); }
  return rows.filter(r => r.some(c => c.trim().length > 0));
}

function validateAndMapRows(
  rawRows: string[][],
  existingEmails: Set<string>,
  corpOptions: CorpOption[],
  storeOptions: StoreOption[],
): { rows: CsvParsedRow[]; headerError: string | null } {
  if (rawRows.length === 0) return { rows: [], headerError: "CSVが空です" };

  const header = rawRows[0].map(h => h.trim());
  const missing = CSV_HEADERS.filter(h => !header.includes(h));
  if (missing.length > 0) {
    return { rows: [], headerError: `ヘッダーが不足しています: ${missing.join(", ")}` };
  }
  const colIndex: Record<string, number> = {};
  CSV_HEADERS.forEach(h => { colIndex[h] = header.indexOf(h); });

  // 名前→IDマップ（複数ヒットは曖昧）。IDマップは単純集合。
  const corpById = new Map(corpOptions.map(c => [c.corpId, c.name]));
  const corpByName = new Map<string, string[]>();
  for (const c of corpOptions) {
    const k = c.name.trim();
    if (!k) continue;
    corpByName.set(k, [...(corpByName.get(k) ?? []), c.corpId]);
  }
  const storeById = new Map(storeOptions.map(s => [s.storeId, s.name]));
  const storeByName = new Map<string, string[]>();
  const storeByClubCode = new Map<string, { storeId: string; name: string }[]>();
  for (const s of storeOptions) {
    const k = s.name.trim();
    if (k) storeByName.set(k, [...(storeByName.get(k) ?? []), s.storeId]);
    if (s.clubCode && Number(s.clubCode) > 0) {
      const code = String(s.clubCode);
      storeByClubCode.set(code, [...(storeByClubCode.get(code) ?? []), { storeId: s.storeId, name: s.name }]);
    }
  }

  // 1つの入力（名前またはID）を解決して {id, displayName} を返す。失敗時は理由を返す。
  const resolveCorp = (raw: string): { id?: string; display?: string; error?: string } => {
    const v = raw.trim();
    if (!v) return { error: "corp が空です" };
    if (corpById.has(v)) return { id: v, display: corpById.get(v)! };
    const hits = corpByName.get(v);
    if (!hits || hits.length === 0) return { error: `法人「${v}」が見つかりません` };
    if (hits.length > 1) return { error: `法人名「${v}」が複数ヒットします（IDで指定してください）` };
    return { id: hits[0], display: v };
  };
  const resolveStore = (raw: string): { id?: string; display?: string; error?: string } => {
    const v = raw.trim();
    if (!v) return { error: "店舗が空です" };
    if (storeById.has(v)) return { id: v, display: storeById.get(v)! };
    // クラブコード（数値文字列）で引く
    if (/^\d+$/.test(v)) {
      const hits = storeByClubCode.get(v) ?? [];
      if (hits.length === 0) return { error: `クラブコード「${v}」の店舗が見つかりません` };
      if (hits.length > 1) {
        const names = hits.map(h => h.name).join(", ");
        return { error: `クラブコード「${v}」が複数店舗で重複: ${names}（店舗名 or storeIdで指定してください）` };
      }
      return { id: hits[0].storeId, display: hits[0].name };
    }
    const hits = storeByName.get(v);
    if (!hits || hits.length === 0) return { error: `店舗「${v}」が見つかりません` };
    if (hits.length > 1) return { error: `店舗名「${v}」が複数ヒットします（IDで指定してください）` };
    return { id: hits[0], display: v };
  };

  const seen = new Set<string>();

  const rows: CsvParsedRow[] = rawRows.slice(1).map((r, i) => {
    const get = (key: string) => (r[colIndex[key]] ?? "").trim();
    const name = get("name");
    const email = get("email").toLowerCase();
    const password = get("password");
    const roleRaw = get("role") || "store";
    const corpRaw = get("corp");
    const storesRaw = get("assignedStores");
    const storeTokens = storesRaw ? storesRaw.split("|").map(s => s.trim()).filter(Boolean) : [];

    const errors: string[] = [];
    if (!name) errors.push("name が空です");
    if (!email) errors.push("email が空です");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("email の形式が不正です");
    if (!password) errors.push("password が空です");

    const role: UserRole = (["admin", "store", "inspector"] as UserRole[]).includes(roleRaw as UserRole)
      ? (roleRaw as UserRole) : "store";
    if (!["admin", "store", "inspector"].includes(roleRaw)) {
      errors.push(`role「${roleRaw}」は admin/store/inspector のいずれかにしてください`);
    }

    // 法人を解決
    let corpId = "";
    let corpDisplay = "";
    if (!corpRaw) {
      errors.push("corp が空です");
    } else {
      const r = resolveCorp(corpRaw);
      if (r.error) errors.push(r.error);
      else { corpId = r.id!; corpDisplay = r.display!; }
    }

    // 担当店舗を解決
    const assignedStoreIds: string[] = [];
    const storeDisplays: string[] = [];
    for (const tok of storeTokens) {
      const r = resolveStore(tok);
      if (r.error) errors.push(r.error);
      else { assignedStoreIds.push(r.id!); storeDisplays.push(r.display!); }
    }

    if (email && existingEmails.has(email)) errors.push("既に登録済みのメールアドレス");
    if (email && seen.has(email)) errors.push("CSV内で重複");
    if (email) seen.add(email);

    return {
      rowNum: i + 2, // 1行目=ヘッダなのでデータ開始は2
      name, email, password, role, corpId, corpDisplay, assignedStoreIds, storeDisplays, errors,
    };
  });

  return { rows, headerError: null };
}

function CsvImportModal({
  open, onClose, existingEmails, corpOptions, storeOptions, onCompleted,
}: {
  open: boolean;
  onClose: () => void;
  existingEmails: Set<string>;
  corpOptions: CorpOption[];
  storeOptions: StoreOption[];
  onCompleted: () => void;
}) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsed, setParsed] = useState<CsvParsedRow[]>([]);
  const [headerError, setHeaderError] = useState<string | null>(null);
  const [sendEmail, setSendEmail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [serverFailed, setServerFailed] = useState<{ row: number; email: string; reason: string }[]>([]);
  const [managerSyncErrors, setManagerSyncErrors] = useState<{ storeId: string; reason: string }[]>([]);

  const reset = () => {
    setFileName(null); setParsed([]); setHeaderError(null);
    setSubmitting(false); setResultMsg(null); setServerFailed([]); setManagerSyncErrors([]);
  };

  useEffect(() => { if (!open) reset(); }, [open]);

  const onFile = async (file: File) => {
    setResultMsg(null); setServerFailed([]); setManagerSyncErrors([]);
    setFileName(file.name);
    const text = await file.text();
    const raw = parseCsv(text);
    const { rows, headerError: hErr } = validateAndMapRows(raw, existingEmails, corpOptions, storeOptions);
    setHeaderError(hErr);
    setParsed(rows);
  };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "users_template.csv";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const validRows = parsed.filter(r => r.errors.length === 0);
  const invalidCount = parsed.length - validRows.length;
  const canSubmit = !submitting && !headerError && validRows.length > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true); setResultMsg(null); setServerFailed([]); setManagerSyncErrors([]);
    try {
      const res = await fetch("/api/admin/qsc/users/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sendWelcomeEmail: sendEmail,
          users: validRows.map(r => ({
            name: r.name, email: r.email, password: r.password,
            role: r.role, corpId: r.corpId, assignedStoreIds: r.assignedStoreIds,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "登録に失敗しました");
      setServerFailed(data.failed || []);
      setManagerSyncErrors(data.managerSyncErrors || []);
      setResultMsg(`${data.ok}件 登録しました${data.failedCount ? ` / ${data.failedCount}件 失敗` : ""}`);
      onCompleted();
    } catch (e: unknown) {
      setResultMsg(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  };

  // SSR safety: portal must be created on client
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!open || !mounted) return null;

  const overlay = (
    <div
      className="csv-modal-overlay"
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0,
        background: "rgba(15,23,42,0.5)",
        zIndex: 1000,
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <div className="csv-modal" onClick={e => e.stopPropagation()}>
        <div className="csv-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="csv-modal-icon"><Upload size={20} /></div>
            <div>
              <h2>CSVで一括登録</h2>
              <p>数十件のユーザーをまとめて登録できます</p>
            </div>
          </div>
          <button className="btn-close" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="csv-modal-body">
          {/* 説明 + テンプレート */}
          <div className="csv-info-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.7 }}>
                <strong style={{ color: "#1e293b" }}>必要な列:</strong> name, email, password, role, corp, assignedStores<br />
                <span style={{ color: "#64748b" }}>
                  ・role は <code>admin</code> / <code>store</code> / <code>inspector</code><br />
                  ・<code>corp</code> は <strong>法人名 / corpId</strong>、<code>assignedStores</code> は <strong>店舗名 / storeId / クラブコード</strong> で指定可<br />
                  ・<code>assignedStores</code> は <code>|</code> 区切りで複数指定（空欄OK・inspector のみ反映）<br />
                  ・status は全て「招待中」で登録されます
                </span>
              </div>
              <button className="btn-template" onClick={downloadTemplate}>
                <Download size={14} /> テンプレート
              </button>
            </div>
          </div>

          {/* ファイル選択 */}
          <label className="csv-drop-zone">
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }}
              style={{ display: "none" }}
            />
            <FileText size={28} color="#6366f1" />
            <div className="csv-drop-title">{fileName || "CSVファイルを選択"}</div>
            <div className="csv-drop-sub">クリックしてファイルを選択</div>
          </label>

          {headerError && (
            <div className="csv-alert csv-alert-error">
              <AlertCircle size={16} /> {headerError}
            </div>
          )}

          {/* プレビュー */}
          {parsed.length > 0 && !headerError && (
            <>
              <div className="csv-summary">
                <div className="csv-summary-stat csv-stat-ok">
                  <CheckCircle2 size={16} /> 登録可能 <strong>{validRows.length}</strong> 件
                </div>
                {invalidCount > 0 && (
                  <div className="csv-summary-stat csv-stat-err">
                    <AlertCircle size={16} /> エラー <strong>{invalidCount}</strong> 件
                  </div>
                )}
              </div>

              <div className="csv-preview">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 36 }}></th>
                      <th style={{ width: 40 }}>行</th>
                      <th>name</th>
                      <th>email</th>
                      <th>role</th>
                      <th>法人</th>
                      <th>担当店舗</th>
                      <th>状態</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.map(r => (
                      <tr key={r.rowNum} className={r.errors.length ? "row-err" : "row-ok"}>
                        <td>{r.errors.length ? <AlertCircle size={14} color="#dc2626" /> : <CheckCircle2 size={14} color="#059669" />}</td>
                        <td className="row-num">{r.rowNum}</td>
                        <td>{r.name || <span className="empty">-</span>}</td>
                        <td>{r.email || <span className="empty">-</span>}</td>
                        <td>{r.role}</td>
                        <td>{r.corpDisplay || <span className="empty">-</span>}</td>
                        <td>
                          {r.storeDisplays.length === 0
                            ? <span className="empty">-</span>
                            : r.storeDisplays.length <= 2
                              ? r.storeDisplays.join(", ")
                              : <span title={r.storeDisplays.join(", ")}>{r.storeDisplays.slice(0, 2).join(", ")} 他{r.storeDisplays.length - 2}件</span>
                          }
                        </td>
                        <td>
                          {r.errors.length === 0
                            ? <span className="badge-ok">OK</span>
                            : <span className="badge-err" title={r.errors.join(" / ")}>{r.errors[0]}{r.errors.length > 1 ? ` 他${r.errors.length - 1}件` : ""}</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* オプション */}
              <label className="csv-option">
                <input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} disabled={submitting} />
                <Mail size={15} />
                <span>登録完了後、各ユーザーに招待メール（ログイン情報）を送信する</span>
              </label>
            </>
          )}

          {/* サーバ結果 */}
          {serverFailed.length > 0 && (
            <div className="csv-alert csv-alert-error" style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
              <div style={{ fontWeight: 900 }}>登録できなかった行:</div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.6 }}>
                {serverFailed.map((f, i) => (
                  <li key={i}>行{f.row} ({f.email}): {f.reason}</li>
                ))}
              </ul>
            </div>
          )}
          {resultMsg && !serverFailed.length && (
            <div className={`csv-alert ${resultMsg.includes("登録しました") ? "csv-alert-ok" : "csv-alert-error"}`}>
              {resultMsg.includes("登録しました") ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              {resultMsg}
            </div>
          )}
          {managerSyncErrors.length > 0 && (
            <div className="csv-alert csv-alert-warn" style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
              <div style={{ fontWeight: 900 }}>店舗の担当者欄への反映で一部エラー:</div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.6 }}>
                {managerSyncErrors.map((e, i) => (
                  <li key={i}>store「{e.storeId}」: {e.reason}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="csv-modal-footer">
          <button className="btn-cancel" onClick={onClose} disabled={submitting}>キャンセル</button>
          <button className="btn-submit" disabled={!canSubmit} onClick={handleSubmit}>
            {submitting ? <Loader2 className="spin" size={16} /> : <UserPlus size={16} />}
            {submitting ? "登録中..." : `${validRows.length}件 登録する`}
          </button>
        </div>

        <style jsx>{`
          .csv-modal { background: #fff; border-radius: 24px; width: 100%; max-width: 900px; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); }
          .csv-modal-header { padding: 24px 28px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
          .csv-modal-icon { width: 44px; height: 44px; background: linear-gradient(135deg,#4f46e5,#7c3aed); border-radius: 14px; display: grid; place-items: center; color: #fff; }
          .csv-modal-header h2 { font-size: 18px; font-weight: 900; margin: 0; color: #1e293b; }
          .csv-modal-header p { font-size: 12px; color: #94a3b8; font-weight: 700; margin: 2px 0 0; }
          .btn-close { background: #f1f5f9; border: none; width: 36px; height: 36px; border-radius: 12px; cursor: pointer; display: grid; place-items: center; color: #475569; }
          .csv-modal-body { padding: 24px 28px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 16px; }
          .csv-info-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px 18px; }
          .csv-info-card code { background: #eef2ff; color: #4338ca; padding: 1px 6px; border-radius: 4px; font-size: 11px; font-weight: 800; }
          .btn-template { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 8px 12px; font-size: 12px; font-weight: 800; color: #4f46e5; cursor: pointer; display: flex; align-items: center; gap: 6px; white-space: nowrap; }
          .btn-template:hover { background: #f5f3ff; border-color: #c7d2fe; }
          .csv-drop-zone { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; padding: 28px; border: 2px dashed #cbd5e1; border-radius: 16px; cursor: pointer; background: #fafbfc; transition: all 0.15s; }
          .csv-drop-zone:hover { border-color: #6366f1; background: #f5f3ff; }
          .csv-drop-title { font-size: 14px; font-weight: 900; color: #1e293b; margin-top: 4px; }
          .csv-drop-sub { font-size: 12px; color: #94a3b8; font-weight: 700; }
          .csv-summary { display: flex; gap: 10px; }
          .csv-summary-stat { display: flex; align-items: center; gap: 8px; padding: 8px 14px; border-radius: 10px; font-size: 13px; font-weight: 800; }
          .csv-summary-stat strong { font-size: 16px; font-weight: 950; }
          .csv-stat-ok { background: #f0fdf4; color: #059669; }
          .csv-stat-err { background: #fef2f2; color: #dc2626; }
          .csv-preview { border: 1px solid #e2e8f0; border-radius: 14px; overflow: auto; max-height: 320px; }
          .csv-preview table { width: 100%; border-collapse: collapse; font-size: 12px; }
          .csv-preview th { background: #f8fafc; padding: 10px 12px; text-align: left; font-size: 10px; font-weight: 900; color: #94a3b8; text-transform: uppercase; position: sticky; top: 0; border-bottom: 1px solid #e2e8f0; }
          .csv-preview td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-weight: 600; }
          .csv-preview tr.row-err td { background: #fef9f9; }
          .csv-preview tr.row-ok td { background: #fff; }
          .row-num { font-family: monospace; color: #94a3b8; font-weight: 800; }
          .empty { color: #cbd5e1; font-weight: 800; }
          .badge-ok { font-size: 10px; font-weight: 900; color: #059669; background: #f0fdf4; padding: 2px 8px; border-radius: 6px; }
          .badge-err { font-size: 10px; font-weight: 900; color: #dc2626; background: #fef2f2; padding: 2px 8px; border-radius: 6px; cursor: help; }
          .csv-option { display: flex; align-items: center; gap: 10px; padding: 14px 16px; background: #f5f3ff; border: 1px solid #ede9fe; border-radius: 12px; cursor: pointer; font-size: 13px; font-weight: 700; color: #4338ca; }
          .csv-option input { width: 16px; height: 16px; margin: 0; padding: 0; flex-shrink: 0; accent-color: #4f46e5; }
          .csv-alert { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: 12px; font-size: 13px; font-weight: 800; }
          .csv-alert-error { background: #fef2f2; color: #b91c1c; border: 1px solid #fee2e2; }
          .csv-alert-ok { background: #f0fdf4; color: #059669; border: 1px solid #d1fae5; }
          .csv-alert-warn { background: #fffbeb; color: #b45309; border: 1px solid #fef3c7; }
          .csv-modal-footer { padding: 18px 28px; border-top: 1px solid #f1f5f9; background: #f8fafc; border-radius: 0 0 24px 24px; display: flex; justify-content: flex-end; gap: 10px; }
          .btn-cancel { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 0 22px; height: 44px; font-size: 13px; font-weight: 800; color: #475569; cursor: pointer; }
          .btn-submit { background: #4f46e5; color: #fff; border: none; border-radius: 12px; padding: 0 22px; height: 44px; font-size: 13px; font-weight: 900; cursor: pointer; display: flex; align-items: center; gap: 8px; box-shadow: 0 8px 16px -4px rgba(79,70,229,0.4); }
          .btn-submit:disabled { background: #cbd5e1; cursor: not-allowed; box-shadow: none; }
          .spin { animation: spin 1s linear infinite; }
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}

/* ========================= Main ========================= */
export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [corpOptions, setCorpOptions] = useState<CorpOption[]>([]);
  const [storeOptions, setStoreOptions] = useState<StoreOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<Partial<UserRow> | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [csvOpen, setCsvOpen] = useState(false);

  const existingEmailSet = useMemo(
    () => new Set(users.map(u => u.email.toLowerCase())),
    [users]
  );

  const isCreatingNew = selectedId === "new";

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const [uRes, cRes, sRes] = await Promise.all([
        fetch("/api/admin/qsc/users", { cache: "no-store" }),
        fetch("/api/admin/qsc/corps", { cache: "no-store" }),
        fetch("/api/admin/qsc/stores", { cache: "no-store" }),
      ]);
      const uData = await uRes.json();
      const cData = await cRes.json();
      const sData = await sRes.json();
      if (uRes.ok) setUsers(uData.items || []);
      if (cRes.ok) setCorpOptions(cData.items || []);
      if (sRes.ok) setStoreOptions((sData.items || []).map((s: { storeId: string; name: string; brandName?: string; clubCode?: number }) => ({
        storeId: s.storeId,
        name: s.name,
        brandName: s.brandName,
        clubCode: s.clubCode,
      })));
    } catch (e) {
      console.error("Failed to fetch data:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadInitialData(); }, [loadInitialData]);

  useEffect(() => {
    if (selectedId === "new") {
      setDraft({ name: "", email: "", password: "", role: "inspector", corpId: corpOptions[0]?.corpId || "", status: "invited", assignedStoreIds: [] });
      setShowPassword(false);
      setDirty(true);
    } else if (selectedId) {
      const target = users.find(u => u.userId === selectedId);
      if (target) { setDraft({ ...target, assignedStoreIds: target.assignedStoreIds || [] }); setShowPassword(false); setDirty(false); }
    } else {
      setDraft(null);
    }
  }, [selectedId, users, corpOptions]);

  const displayUsers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return users.map(u => ({
      ...u,
      corpName: corpOptions.find(c => c.corpId === u.corpId)?.name || "未割当",
    })).filter(u =>
      !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.corpName.toLowerCase().includes(q)
    );
  }, [users, searchQuery, corpOptions]);

  /* ========================= Save ========================= */
  const handleSave = async () => {
    if (!draft?.name || !draft?.email || !draft?.corpId) {
      setSaveMsg("必須フィールドを入力してください");
      return;
    }
    if (isCreatingNew && !draft?.password) {
      setSaveMsg("パスワードを入力してください");
      return;
    }
    setSaving(true);
    setSaveMsg(null);
    try {
      const payload = {
        ...draft,
        userId: isCreatingNew ? `U${Date.now()}` : selectedId,
        assignedStoreIds: draft.assignedStoreIds || [],
        sendWelcomeEmail: isCreatingNew, // 新規作成時にメール送信
      };

      const res = await fetch("/api/admin/qsc/users", {
        method: isCreatingNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || "保存に失敗しました");
      }

      // inspector の場合、選択した店舗の managers を更新
      if (draft.role === "inspector") {
        await syncManagersToStores({
          userId: payload.userId as string,
          userName: draft.name,
          userEmail: draft.email,
          assignedStoreIds: payload.assignedStoreIds,
        });
      }

      await loadInitialData();
      setSelectedId(null);
      setSaveMsg(isCreatingNew ? "登録しました。招待メールを送信しました。" : "保存しました。");
    } catch (e: unknown) {
      setSaveMsg(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setSaving(false);
    }
  };

  /* 担当者を店舗のmanagersに同期 */
  const syncManagersToStores = async (params: {
    userId: string;
    userName: string;
    userEmail: string;
    assignedStoreIds: string[];
  }) => {
    // 全店舗を取得して、このユーザーのmanagers登録を更新
    const allStores = storeOptions;
    await Promise.allSettled(allStores.map(async store => {
      const shouldBeManager = params.assignedStoreIds.includes(store.storeId);
      // 現在の店舗データを取得
      const res = await fetch(`/api/admin/qsc/stores?storeId=${encodeURIComponent(store.storeId)}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const storeData = data.item || data;
      const currentManagers: { email: string; name: string }[] = storeData.managers || [];

      const alreadyManager = currentManagers.some(m => m.email === params.userEmail);

      let newManagers = currentManagers;
      if (shouldBeManager && !alreadyManager) {
        newManagers = [...currentManagers, { email: params.userEmail, name: params.userName }];
      } else if (!shouldBeManager && alreadyManager) {
        newManagers = currentManagers.filter(m => m.email !== params.userEmail);
      } else {
        return; // 変更なし
      }

      await fetch("/api/admin/qsc/stores", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...storeData, managers: newManagers }),
      });
    }));
  };

  const handleDelete = async () => {
    if (!selectedId || isCreatingNew) return;
    if (!confirm("このユーザーを完全に削除しますか？")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/qsc/users?userId=${selectedId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      await loadInitialData();
      setSelectedId(null);
    } catch {
      setSaveMsg("削除に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="admin-container">
      <header className="header-wrapper">
        <div className="breadcrumb">
          <Link href="/admin" className="bc-item"><Home size={14} /> Dashboard</Link>
          <ChevronRight size={14} className="bc-sep" />
          <span className="bc-current">ユーザー管理</span>
        </div>
        <div className="title-bar">
          <div className="title-left">
            <div className="icon-box"><Users size={28} /></div>
            <div>
              <h1>ユーザー管理</h1>
              <p>組織アカウントの発行・権限設定・所属管理</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn-secondary" onClick={() => setCsvOpen(true)}>
              <Upload size={18} /> CSVインポート
            </button>
            <button className="btn-primary" onClick={() => setSelectedId("new")}>
              <UserPlus size={20} /> 新規ユーザー作成
            </button>
          </div>
        </div>
      </header>

      <CsvImportModal
        open={csvOpen}
        onClose={() => setCsvOpen(false)}
        existingEmails={existingEmailSet}
        corpOptions={corpOptions}
        storeOptions={storeOptions}
        onCompleted={loadInitialData}
      />

      <div className={`content-grid ${selectedId ? "is-editing" : ""}`}>
        {/* ユーザー一覧 */}
        <section className="list-card">
          <div className="search-bar">
            <div className="input-with-icon">
              <Search size={18} />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="名前、メール、所属先で検索..." />
            </div>
            <div className="stats-badge">全 {displayUsers.length} 件</div>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>ユーザー詳細</th>
                  <th>権限ロール</th>
                  <th>所属法人</th>
                  <th>ステータス</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="td-loading"><Loader2 className="spin" /> データを取得中...</td></tr>
                ) : displayUsers.map(u => (
                  <tr key={u.userId} className={selectedId === u.userId ? "active-row" : ""} onClick={() => setSelectedId(u.userId)}>
                    <td>
                      <div className="user-info">
                        <div className="avatar">{u.name[0]}</div>
                        <div><div className="u-name">{u.name}</div><div className="u-email">{u.email}</div></div>
                      </div>
                    </td>
                    <td><Chip tone={ROLES[u.role]?.tone}>{ROLES[u.role]?.label}</Chip></td>
                    <td className="u-corp">{u.corpName}</td>
                    <td>
                      <Chip tone={u.status === "active" ? "green" : u.status === "invited" ? "amber" : "red"}>
                        {u.status === "active" ? "有効" : u.status === "invited" ? "招待中" : "停止"}
                      </Chip>
                    </td>
                    <td className="u-arrow"><ChevronRight size={18} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 編集パネル */}
        {selectedId && draft && (
          <aside className="editor-card">
            <div className="editor-header">
              <h2>{isCreatingNew ? "新規アカウント作成" : "詳細情報の編集"}</h2>
              <button className="btn-close" onClick={() => setSelectedId(null)}><X size={20} /></button>
            </div>
            <div className="editor-body">
              <div className="form-stack">

                {/* 氏名 */}
                <div className="form-group">
                  <FormLabel required>氏名</FormLabel>
                  <div className="input-icon-box">
                    <Users size={16} className="i-left" />
                    <input value={draft.name || ""} onChange={e => { setDraft({ ...draft, name: e.target.value }); setDirty(true); }} placeholder="例: 山田 太郎" />
                  </div>
                </div>

                {/* メール */}
                <div className="form-group">
                  <FormLabel required>メールアドレス</FormLabel>
                  <div className="input-icon-box">
                    <Mail size={16} className="i-left" />
                    <input type="email" value={draft.email || ""} onChange={e => { setDraft({ ...draft, email: e.target.value }); setDirty(true); }} placeholder="example@joyfit.jp" />
                  </div>
                </div>

                {/* パスワード */}
                <div className="form-group">
                  <FormLabel required={isCreatingNew}>ログインパスワード</FormLabel>
                  <div className="input-icon-box" style={{ position: "relative" }}>
                    <Lock size={16} className="i-left" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={draft.password || ""}
                      onChange={e => { setDraft({ ...draft, password: e.target.value }); setDirty(true); }}
                      placeholder={isCreatingNew ? "パスワードを設定" : "変更する場合のみ入力"}
                      style={{ paddingRight: 48 }}
                    />
                    <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* ロール・法人 */}
                <div className="form-row">
                  <div className="form-group">
                    <FormLabel required>権限ロール</FormLabel>
                    <div className="select-wrapper">
                      <Shield size={16} className="i-left" />
                      <select value={draft.role} onChange={e => { setDraft({ ...draft, role: e.target.value as UserRole, assignedStoreIds: [] }); setDirty(true); }}>
                        {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <FormLabel required>所属法人</FormLabel>
                    <div className="select-wrapper">
                      <Building2 size={16} className="i-left" />
                      <select value={draft.corpId} onChange={e => { setDraft({ ...draft, corpId: e.target.value }); setDirty(true); }}>
                        {corpOptions.map(c => <option key={c.corpId} value={c.corpId}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* ② 担当店舗（inspectorのみ） */}
                {draft.role === "inspector" && (
                  <div className="form-group">
                    <FormLabel>担当店舗</FormLabel>
                    <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600, marginBottom: 8 }}>
                      選択した店舗の担当者欄に自動で反映されます
                    </div>
                    <StoreMultiSelect
                      selected={draft.assignedStoreIds || []}
                      onChange={ids => { setDraft({ ...draft, assignedStoreIds: ids }); setDirty(true); }}
                      stores={storeOptions}
                    />
                  </div>
                )}

                {/* ① アカウント状態（invited は選択不可） */}
                <div className="form-group">
                  <FormLabel>アカウント状態</FormLabel>
                  <div className="status-grid">
                    {(["active", "invited", "suspended"] as UserStatus[]).map(s => {
                      const isInvited = s === "invited";
                      const isCurrent = draft.status === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          disabled={isInvited}
                          onClick={() => { if (!isInvited) { setDraft({ ...draft, status: s }); setDirty(true); } }}
                          title={isInvited ? "招待中は選択できません" : undefined}
                          className={`status-btn ${isCurrent ? "is-active" : ""} ${isInvited ? "is-disabled" : ""}`}
                        >
                          {s === "active" ? "有効" : s === "invited" ? "招待中" : "停止"}
                        </button>
                      );
                    })}
                  </div>
                  {draft.status === "invited" && (
                    <div style={{ fontSize: 12, color: "#d97706", fontWeight: 700, marginTop: 6 }}>
                      招待メール送信後、ログインすると「有効」に切り替わります
                    </div>
                  )}
                </div>

                {/* エラー/成功メッセージ */}
                {saveMsg && (
                  <div style={{ padding: "12px 16px", borderRadius: 12, background: saveMsg.includes("しました") ? "#f0fdf4" : "#fef2f2", color: saveMsg.includes("しました") ? "#059669" : "#dc2626", fontSize: 13, fontWeight: 700 }}>
                    {saveMsg}
                  </div>
                )}

                {!isCreatingNew && (
                  <button className="btn-danger-outline" onClick={handleDelete} disabled={saving}>
                    <Trash2 size={16} /> このアカウントを削除する
                  </button>
                )}
              </div>
            </div>
            <div className="editor-footer">
              {isCreatingNew && (
                <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, marginBottom: 10, textAlign: "center" }}>
                  📧 作成後、ログイン情報をメールで送信します
                </div>
              )}
              <button className="btn-save" disabled={!dirty || saving} onClick={handleSave}>
                {saving ? <Loader2 className="spin" size={18} /> : <Save size={18} />}
                {saving ? "保存中..." : isCreatingNew ? "登録してメール送信" : "保存"}
              </button>
            </div>
          </aside>
        )}
      </div>

      <style jsx>{`
        .admin-container { min-height: 100vh; padding: 32px; background: #f8fafc; font-family: 'Inter', sans-serif; color: #1e293b; }
        .header-wrapper { max-width: 1400px; margin: 0 auto 32px; }
        .breadcrumb { display: flex; align-items: center; gap: 8px; margin-bottom: 20px; font-size: 13px; font-weight: 600; color: #64748b; }
        .bc-item { text-decoration: none; color: inherit; display: flex; align-items: center; gap: 4px; }
        .bc-sep { color: #cbd5e1; }
        .bc-current { color: #1e293b; font-weight: 800; }
        .title-bar { display: flex; justify-content: space-between; align-items: center; }
        .title-left { display: flex; align-items: center; gap: 20px; }
        .icon-box { width: 56px; height: 56px; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); border-radius: 16px; display: grid; place-items: center; color: #fff; box-shadow: 0 10px 20px rgba(79,70,229,0.3); }
        h1 { font-size: 28px; font-weight: 900; margin: 0; }
        p { margin: 4px 0 0; color: #64748b; font-size: 13px; }
        .btn-primary { background: #1e293b; color: #fff; border: none; padding: 12px 24px; border-radius: 14px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 10px; font-size: 14px; }
        .btn-secondary { background: #fff; color: #1e293b; border: 1px solid #e2e8f0; padding: 12px 22px; border-radius: 14px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 10px; font-size: 14px; }
        .btn-secondary:hover { background: #f8fafc; border-color: #cbd5e1; }
        .content-grid { max-width: 1400px; margin: 0 auto; display: grid; grid-template-columns: 1fr; gap: 24px; }
        .content-grid.is-editing { grid-template-columns: 1fr 500px; }
        .list-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 32px; overflow: hidden; }
        .search-bar { padding: 24px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
        .input-with-icon { position: relative; width: 400px; }
        .input-with-icon svg { position: absolute; left: 16px; top: 13px; color: #94a3b8; }
        .input-with-icon input { width: 100%; height: 44px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding-left: 48px; outline: none; font-weight: 600; font-size: 14px; }
        .stats-badge { background: #f1f5f9; padding: 6px 14px; border-radius: 10px; font-size: 12px; font-weight: 800; color: #64748b; }
        .table-container { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f8fafc; padding: 16px 24px; text-align: left; font-size: 11px; font-weight: 900; color: #94a3b8; text-transform: uppercase; }
        td { padding: 18px 24px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
        .td-loading { text-align: center; color: #94a3b8; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .active-row { background: #f5f3ff !important; }
        tr:hover { background: #fcfcfd; cursor: pointer; }
        .user-info { display: flex; align-items: center; gap: 14px; }
        .avatar { width: 40px; height: 40px; background: #eef2ff; border-radius: 12px; display: grid; place-items: center; color: #4f46e5; font-weight: 900; font-size: 16px; }
        .u-name { font-weight: 800; color: #1e293b; }
        .u-email { font-size: 12px; color: #94a3b8; margin-top: 2px; }
        .u-corp { font-size: 13px; color: #64748b; font-weight: 700; }
        .u-arrow { color: #cbd5e1; }
        .status-chip { font-size: 11px; font-weight: 800; padding: 5px 12px; border-radius: 10px; display: inline-flex; align-items: center; gap: 6px; }
        .editor-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 32px; position: sticky; top: 32px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.1); display: flex; flex-direction: column; max-height: calc(100vh - 64px); }
        .editor-header { padding: 24px 32px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; }
        .editor-header h2 { font-size: 18px; font-weight: 900; margin: 0; }
        .btn-close { background: #f1f5f9; border: none; width: 36px; height: 36px; border-radius: 12px; cursor: pointer; display: grid; place-items: center; }
        .editor-body { padding: 28px 32px; overflow-y: auto; flex: 1; }
        .form-stack { display: flex; flex-direction: column; gap: 20px; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .form-label { font-size: 12px; font-weight: 900; color: #64748b; display: flex; align-items: center; gap: 4px; }
        .required-mark { color: #ef4444; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .input-icon-box { position: relative; }
        .i-left { position: absolute; left: 14px; top: 15px; color: #94a3b8; pointer-events: none; z-index: 1; }
        input, select, textarea { width: 100%; box-sizing: border-box; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 14px 12px 40px; font-size: 14px; font-weight: 600; outline: none; transition: border-color 0.2s; background: #fff; }
        input:focus, select:focus, textarea:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
        textarea { padding-left: 40px; resize: vertical; }
        .select-wrapper { position: relative; }
        .select-wrapper .i-left { top: 14px; }
        .password-toggle { position: absolute; right: 12px; top: 11px; background: none; border: none; color: #94a3b8; cursor: pointer; padding: 4px; }
        .password-toggle:hover { color: #4f46e5; }
        .status-grid { display: flex; gap: 8px; }
        .status-btn { flex: 1; height: 44px; border-radius: 12px; border: 1px solid #e2e8f0; background: #fff; font-size: 13px; font-weight: 800; color: #64748b; cursor: pointer; transition: all 0.15s; }
        .status-btn.is-active { border-color: #4f46e5; background: #f5f3ff; color: #4f46e5; }
        .status-btn.is-disabled { opacity: 0.4; cursor: not-allowed; }
        .btn-danger-outline { margin-top: 8px; height: 48px; background: #fff; border: 1px solid #fee2e2; border-radius: 14px; color: #ef4444; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; font-size: 14px; }
        .editor-footer { padding: 20px 32px; border-top: 1px solid #f1f5f9; background: #f8fafc; border-radius: 0 0 32px 32px; flex-shrink: 0; }
        .btn-save { width: 100%; height: 54px; border-radius: 16px; background: #4f46e5; color: #fff; border: none; font-size: 15px; font-weight: 900; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 12px; box-shadow: 0 10px 20px -5px rgba(79,70,229,0.4); }
        .btn-save:disabled { background: #cbd5e1; cursor: not-allowed; box-shadow: none; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </main>
  );
}
