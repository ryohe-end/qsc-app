"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Building2,
  Layers3,
  Tag,
  Search,
  X,
  Check,
  Circle,
  PauseCircle,
  CheckCircle2,
  Store,
  ClipboardCheck,
  Plus,
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudFog,
  Wind,
  Thermometer,
} from "lucide-react";

export const dynamic = "force-dynamic";

/* =========================
   Types
   ========================= */
type StoreStatus = "new" | "draft" | "done";

type StoreRow = {
  companyId: string;
  companyName: string;
  bizId: string;
  bizName: string;
  brandId: string;
  brandName: string;
  storeId: string;
  storeName: string;
  status: StoreStatus;
};

type WeatherKind =
  | "sunny"
  | "cloudy"
  | "rain"
  | "snow"
  | "fog"
  | "wind"
  | "unknown";
type Tod = "morning" | "day" | "night";

/* =========================
   Mock master (後でAPI差替え)
   ========================= */
const STORE_MASTER: StoreRow[] = [
  {
    companyId: "c001",
    companyName: "YAMAUCHI",
    bizId: "b001",
    bizName: "FITNESS",
    brandId: "br001",
    brandName: "JOYFIT",
    storeId: "S001",
    storeName: "札幌大通",
    status: "done",
  },
  {
    companyId: "c001",
    companyName: "YAMAUCHI",
    bizId: "b001",
    bizName: "FITNESS",
    brandId: "br002",
    brandName: "FIT365",
    storeId: "S002",
    storeName: "新宿西口",
    status: "draft",
  },
  {
    companyId: "c001",
    companyName: "YAMAUCHI",
    bizId: "b001",
    bizName: "FITNESS",
    brandId: "br002",
    brandName: "FIT365",
    storeId: "S003",
    storeName: "名古屋栄",
    status: "new",
  },
  {
    companyId: "c002",
    companyName: "OKAMOTO",
    bizId: "b002",
    bizName: "REHAB",
    brandId: "br003",
    brandName: "ジョイリハ",
    storeId: "S004",
    storeName: "仙台駅前",
    status: "new",
  },
  {
    companyId: "c002",
    companyName: "OKAMOTO",
    bizId: "b002",
    bizName: "REHAB",
    brandId: "br003",
    brandName: "ジョイリハ",
    storeId: "S005",
    storeName: "福岡天神",
    status: "draft",
  },
];

/* =========================
   Helpers
   ========================= */
function uniqBy<T>(arr: T[], keyFn: (v: T) => string) {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const v of arr) {
    const k = keyFn(v);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(v);
  }
  return out;
}

function todayParts() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  const dow = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
  const quarter = Math.floor(d.getMonth() / 3) + 1; // Q1..Q4
  return { mmdd: `${mm}/${dd}`, yyyy, dow, quarter };
}

function statusLabel(s: StoreStatus) {
  if (s === "draft") return "途中保存";
  if (s === "done") return "完了";
  return "未着手";
}

function getTod(): Tod {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return "morning";
  if (h >= 11 && h < 18) return "day";
  return "night";
}

/** Open-Meteo の weathercode をざっくりUI用に丸める */
function mapWeatherCode(code: number | null | undefined): WeatherKind {
  if (code == null) return "unknown";
  // 0: Clear
  if (code === 0) return "sunny";
  // 1-3: Mainly clear/partly cloudy/overcast
  if (code >= 1 && code <= 3) return "cloudy";
  // 45-48: Fog
  if (code === 45 || code === 48) return "fog";
  // 51-67: Drizzle/Rain (freezing含む)
  if (code >= 51 && code <= 67) return "rain";
  // 71-77: Snow
  if (code >= 71 && code <= 77) return "snow";
  // 80-82: Rain showers
  if (code >= 80 && code <= 82) return "rain";
  // 85-86: Snow showers
  if (code === 85 || code === 86) return "snow";
  // 95-99: Thunderstorm
  if (code >= 95 && code <= 99) return "rain";
  return "unknown";
}

function weatherLabel(kind: WeatherKind) {
  if (kind === "sunny") return "晴れ";
  if (kind === "cloudy") return "くもり";
  if (kind === "rain") return "雨";
  if (kind === "snow") return "雪";
  if (kind === "fog") return "霧";
  if (kind === "wind") return "強風";
  return "天気取得中";
}

function WeatherIcon({ kind }: { kind: WeatherKind }) {
  if (kind === "sunny") return <Sun size={18} />;
  if (kind === "cloudy") return <Cloud size={18} />;
  if (kind === "rain") return <CloudRain size={18} />;
  if (kind === "snow") return <CloudSnow size={18} />;
  if (kind === "fog") return <CloudFog size={18} />;
  if (kind === "wind") return <Wind size={18} />;
  return <Cloud size={18} style={{ opacity: 0.8 }} />;
}

/* =========================
   Small UI
   ========================= */
function StepBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="qsc-pill">
      {icon}
      <span>{label}</span>
    </div>
  );
}

function Chip({
  active,
  icon,
  label,
  onClick,
  disabled,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={`qsc-chip2 ${active ? "is-active" : ""}`}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
    >
      <span className="qsc-chip2-ic">{icon}</span>
      <span className="qsc-chip2-tx">{label}</span>
      <span className={`qsc-chip2-ok ${active ? "is-on" : ""}`}>
        <Check size={14} />
      </span>
    </button>
  );
}

/**
 * ② 企業名：iOSっぽいボトムシート（検索＋一覧）
 */
function CompanyPicker({
  value,
  options,
  onChange,
}: {
  value: { id: string; name: string } | null;
  options: { id: string; name: string }[];
  onChange: (id: string) => void;
}) {
  return (
    <div className={`qsc-nativeSelect ${value ? "is-selected" : ""}`}>
      {/* 見た目は今のボタン風 */}
      <div className="qsc-nativeSelectUi" aria-hidden="true">
        <span className="qsc-nativeSelectLeft">
          <span className="qsc-companyBtnIcon">
            <Building2 size={18} />
          </span>
          <span className="qsc-nativeSelectText">
            {value ? value.name : "企業名を選択"}
          </span>
        </span>

        <span className="qsc-nativeSelectRight">
          {value ? <span className="qsc-companySelected">選択中</span> : null}
          <ChevronRight size={18} />
        </span>
      </div>

      {/* ✅ 透明selectを被せる：タップでiOSホイール */}
      <select
        className="qsc-nativeSelectEl"
        value={value?.id ?? ""}
        onChange={(e) => onChange(e.target.value)}
        aria-label="企業名を選択"
      >
        <option value="">（未選択）</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </div>
  );
}

/* =========================
   Page
   ========================= */
export default function CheckPage() {
  const router = useRouter();
  const { mmdd, yyyy, dow, quarter } = useMemo(() => todayParts(), []);

  // ✅ Widget state（天気＆気温）
  const [tod, setTod] = useState<Tod>(() => getTod());
  const [weatherKind, setWeatherKind] = useState<WeatherKind>("unknown");
  const [tempC, setTempC] = useState<number | null>(null);

  // ✅ Parallax target
  const widgetWrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // 朝昼夜の更新（1分に1回で十分）
    const t = window.setInterval(() => setTod(getTod()), 60 * 1000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    // ✅ 天気取得（Open-Meteo / 位置情報が取れなければ東京）
    let cancelled = false;

    const fetchWeather = async (lat: number, lon: number) => {
      try {
        const url =
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
          `&current_weather=true&timezone=Asia%2FTokyo`;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error("weather fetch failed");
        const json = await res.json();
        const cw = json?.current_weather;
        const code = typeof cw?.weathercode === "number" ? cw.weathercode : null;
        const temp = typeof cw?.temperature === "number" ? cw.temperature : null;

        if (cancelled) return;
        setWeatherKind(mapWeatherCode(code));
        setTempC(temp);
      } catch {
        if (cancelled) return;
        setWeatherKind("unknown");
        setTempC(null);
      }
    };

    // まず東京で即表示（体感を良くする）
    fetchWeather(35.681236, 139.767125);

    // 位置情報が許可されたら上書き
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          fetchWeather(pos.coords.latitude, pos.coords.longitude);
        },
        () => {
          // 許可なしなら東京のまま
        },
        { enableHighAccuracy: false, timeout: 2500, maximumAge: 10 * 60 * 1000 }
      );
    }

    // 10分おきに更新
    const timer = window.setInterval(() => {
      fetchWeather(35.681236, 139.767125);
    }, 10 * 60 * 1000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    // ✅ 微パララックス：ウィジェットだけふわっと動く（軽量版）
    const el = widgetWrapRef.current;
    if (!el) return;

    let raf = 0;

    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        const rect = el.getBoundingClientRect();
        // 画面上端からの距離を -1..1 くらいに正規化
        const vh = window.innerHeight || 800;
        const centerY = rect.top + rect.height / 2;
        const t = (centerY - vh / 2) / (vh / 2); // -1..1
        // 移動量（px）
        const y = Math.max(-18, Math.min(18, t * 12));
        // ほんの少しだけ透明度＆ブラー感（気持ち）
        const a = Math.max(0.92, Math.min(1, 1 - Math.abs(t) * 0.06));

        el.style.setProperty("--qsc-parallaxY", `${y.toFixed(2)}px`);
        el.style.setProperty("--qsc-parallaxA", `${a.toFixed(3)}`);
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // ② 企業（単一）
  const [companyId, setCompanyId] = useState<string>("");

  // ③ 業態・ブランド（複数）
  const [bizIds, setBizIds] = useState<string[]>([]);
  const [brandIds, setBrandIds] = useState<string[]>([]);

  // ④ 状態（横スワイプ / 複数）
  const [statusFilter, setStatusFilter] = useState<StoreStatus[]>(["new", "draft"]);

  // ④ 店舗検索
  const [storeQuery, setStoreQuery] = useState("");

  // ✅ 追加：選択した店舗（1つ）
  const [selectedStoreId, setSelectedStoreId] = useState<string>("");

  const companies = useMemo(() => {
    const rows = uniqBy(STORE_MASTER, (r) => r.companyId).map((r) => ({
      id: r.companyId,
      name: r.companyName,
    }));
    return rows.sort((a, b) => a.name.localeCompare(b.name, "ja"));
  }, []);

  const selectedCompany = useMemo(
    () => companies.find((c) => c.id === companyId) || null,
    [companies, companyId]
  );

  const bizOptions = useMemo(() => {
    const rows = STORE_MASTER.filter((r) => !companyId || r.companyId === companyId);
    const list = uniqBy(rows, (r) => r.bizId).map((r) => ({ id: r.bizId, name: r.bizName }));
    return list.sort((a, b) => a.name.localeCompare(b.name, "ja"));
  }, [companyId]);

  const brandOptions = useMemo(() => {
    const rows = STORE_MASTER.filter((r) => {
      if (companyId && r.companyId !== companyId) return false;
      if (bizIds.length && !bizIds.includes(r.bizId)) return false;
      return true;
    });
    const list = uniqBy(rows, (r) => r.brandId).map((r) => ({ id: r.brandId, name: r.brandName }));
    return list.sort((a, b) => a.name.localeCompare(b.name, "ja"));
  }, [companyId, bizIds]);

  const storeList = useMemo(() => {
    const k = storeQuery.trim().toLowerCase();
    return STORE_MASTER.filter((r) => {
      if (companyId && r.companyId !== companyId) return false;
      if (bizIds.length && !bizIds.includes(r.bizId)) return false;
      if (brandIds.length && !brandIds.includes(r.brandId)) return false;
      if (!statusFilter.includes(r.status)) return false;
      if (k && !r.storeName.toLowerCase().includes(k)) return false;
      return true;
    }).sort((a, b) => a.storeName.localeCompare(b.storeName, "ja"));
  }, [companyId, bizIds, brandIds, statusFilter, storeQuery]);

  // ✅ 選択中店舗（フィルタで消えたら解除）
  const selectedStore = useMemo(() => {
    const found = STORE_MASTER.find((s) => s.storeId === selectedStoreId);
    if (!found) return null;
    const visible = storeList.some((s) => s.storeId === selectedStoreId);
    if (!visible) return null;
    if (found.status === "done") return null;
    return found;
  }, [selectedStoreId, storeList]);

  // ✅ 追加：AppBottomNav（共通FAB）でも使えるように、選択店舗を保存
  useEffect(() => {
    const key = "qsc_check_selected_store";
    if (!selectedStore) {
      localStorage.removeItem(key);
      return;
    }
    localStorage.setItem(
      key,
      JSON.stringify({
        companyId: selectedStore.companyId,
        bizId: selectedStore.bizId,
        brandId: selectedStore.brandId,
        storeId: selectedStore.storeId,
        storeName: selectedStore.storeName,
        companyName: selectedStore.companyName,
        brandName: selectedStore.brandName,
        ts: Date.now(),
      })
    );
  }, [selectedStore]);

  const canStart = !!selectedStore;

  const toggle = (arr: string[], id: string) =>
    arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];

  const toggleStatus = (s: StoreStatus) =>
    setStatusFilter((v) => (v.includes(s) ? v.filter((x) => x !== s) : [...v, s]));

  const onCompanyChange = (id: string) => {
    setCompanyId(id);
    setBizIds([]);
    setBrandIds([]);
    setStoreQuery("");
    setSelectedStoreId("");
  };

  const goStart = () => {
    if (!selectedStore) return;
    router.push(
      `/check/run?companyId=${encodeURIComponent(selectedStore.companyId)}` +
        `&bizId=${encodeURIComponent(selectedStore.bizId)}` +
        `&brandId=${encodeURIComponent(selectedStore.brandId)}` +
        `&storeId=${encodeURIComponent(selectedStore.storeId)}`
    );
  };

  // ✅ class for theme
  const widgetClass = ["qsc-widget", `wx-${weatherKind}`, `tod-${tod}`].join(" ");

  return (
    <div className="qsc-checkPage">
      {/* =========================
         ① 固定：Widget-ish（他カードと幅合わせ済）
         - 天気でグロー切替
         - 朝昼夜でトーン変化
         - スクロールで微パララックス
         ========================= */}
      <div ref={widgetWrapRef} className="qsc-widgetWrap qsc-widgetParallax" aria-label="日付と天気">
        {/* Date + Quarter */}
        <div className={widgetClass} aria-label="日付とクォーター">
          <div className="qsc-widgetGlow" aria-hidden="true" />
          <div className="qsc-widgetRow">
            <div className="qsc-dateMain">
              {/* ✅ ユーザー指定の「羅列」寄りに見えるUI（でもダサくならない） */}
              <div className="qsc-dateBig">
                <CalendarDays size={18} />
                <span className="qsc-dateBigTx">{mmdd}</span>
              </div>

              <div className="qsc-dateSub" aria-label="年・曜日">
                <span className="qsc-year">{yyyy}</span>
                <span className="qsc-dateSubDot">•</span>
                <span className="qsc-dow">{dow}</span>
              </div>
            </div>

            <div className="qsc-qMain" aria-label="クォーター">
              <span className="qsc-qPill2">
                <span className="qsc-qPill2Q">Q{quarter}</span>
                <span className="qsc-qPill2Y">{yyyy}</span>
              </span>
              <span className="qsc-qLabel">Quarter</span>
            </div>
          </div>
        </div>

        {/* Weather + Temp */}
        <div className={widgetClass} aria-label="天気と気温">
          <div className="qsc-widgetGlow2" aria-hidden="true" />
          <div className="qsc-widgetRow">
            <div className="qsc-weatherMain">
              <span className="qsc-weatherIc" aria-hidden="true">
                <WeatherIcon kind={weatherKind} />
              </span>

              <div className="qsc-weatherText">
                <div className="qsc-weatherLabel">{weatherLabel(weatherKind)}</div>
                <div className="qsc-weatherHint">
                  {tod === "morning" ? "Morning" : tod === "day" ? "Daytime" : "Night"}
                </div>
              </div>
            </div>

            <div className="qsc-tempPill" aria-label="気温">
              <Thermometer size={16} style={{ opacity: 0.85 }} />
              <span className="qsc-tempVal">{tempC == null ? "—" : `${Math.round(tempC)}°`}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="qsc-panel" aria-label="点検を開始">
        <div className="qsc-panel-head" style={{ alignItems: "center" }}>
          <StepBadge icon={<ClipboardCheck size={14} />} label="点検" />
          <Link className="qsc-panel-link" href="/" aria-label="HOMEへ戻る">
            <ChevronLeft size={16} style={{ verticalAlign: "-3px" }} /> 戻る
          </Link>
        </div>

        <div style={{ marginTop: 8 }}>
          <h1 className="qsc-title qsc-titleCheck" style={{ margin: 0 }}>
            店舗を選択して開始
          </h1>
          <p className="qsc-sub qsc-subCheck" style={{ margin: "8px 0 0 0" }}>
            店舗をタップで選択 → 右下の「＋」でスタート。
          </p>

          <div className="qsc-selectedLine" aria-live="polite">
            {selectedStore ? (
              <>
                <span className="dot on" />
                <span>
                  選択中：<b>{selectedStore.storeName}</b>（{selectedStore.companyName} /{" "}
                  {selectedStore.brandName}）
                </span>
              </>
            ) : (
              <>
                <span className="dot" />
              </>
            )}
          </div>
        </div>
      </header>

      {/* =========================
         ② 企業名（ボトムシート）
         ========================= */}
      <section className="qsc-panel" aria-label="企業名">
        <div className="qsc-panel-head">
          <StepBadge icon={<Building2 size={14} />} label="② 企業名" />
          <span className="qsc-swipehint">タップして選択</span>
        </div>

        <CompanyPicker value={selectedCompany} options={companies} onChange={onCompanyChange} />

        {!companyId ? (
          <div className="qsc-mutedLine" style={{ marginTop: 10 }}>
            ※ 企業名を選択すると、業態 / ブランド / 店舗候補が絞れます
          </div>
        ) : null}
      </section>

      {/* =========================
         ③ 業態（横スワイプ / 複数）
         ========================= */}
      <section className="qsc-panel" aria-label="業態">
        <div className="qsc-panel-head">
          <StepBadge icon={<Layers3 size={14} />} label="③ 業態" />
          <span className="qsc-swipehint">横にスワイプ / 複数選択</span>
        </div>

        <div className={`qsc-chipScroll2 ${!companyId ? "is-disabled" : ""}`}>
          {bizOptions.map((b) => (
            <Chip
              key={b.id}
              active={bizIds.includes(b.id)}
              icon={<Layers3 size={16} />}
              label={b.name}
              disabled={!companyId}
              onClick={() => {
                if (!companyId) return;
                setBizIds((v) => toggle(v, b.id));
                setBrandIds([]);
                setSelectedStoreId("");
              }}
            />
          ))}
          {companyId && bizOptions.length === 0 ? (
            <div className="qsc-mutedLine">該当する業態がありません</div>
          ) : null}
        </div>
      </section>

      {/* =========================
         ③ ブランド（横スワイプ / 複数）
         ========================= */}
      <section className="qsc-panel" aria-label="ブランド">
        <div className="qsc-panel-head">
          <StepBadge icon={<Tag size={14} />} label="③ ブランド" />
          <span className="qsc-swipehint">横にスワイプ / 複数選択</span>
        </div>

        <div className={`qsc-chipScroll2 ${!companyId ? "is-disabled" : ""}`}>
          {brandOptions.map((b) => (
            <Chip
              key={b.id}
              active={brandIds.includes(b.id)}
              icon={<Tag size={16} />}
              label={b.name}
              disabled={!companyId}
              onClick={() => {
                if (!companyId) return;
                setBrandIds((v) => toggle(v, b.id));
                setSelectedStoreId("");
              }}
            />
          ))}
          {companyId && brandOptions.length === 0 ? (
            <div className="qsc-mutedLine">該当するブランドがありません</div>
          ) : null}
        </div>
      </section>

      {/* =========================
         ④ 状態（横スワイプ） + 店舗検索
         ========================= */}
      <section className="qsc-panel" aria-label="店舗の絞り込み">
        <div className="qsc-panel-head">
          <StepBadge icon={<Store size={14} />} label="④ 絞り込み" />
          <span className="qsc-swipehint">状態は横スワイプ</span>
        </div>

        <div className="qsc-chipScroll2" aria-label="状態フィルタ">
          <Chip
            active={statusFilter.includes("new")}
            icon={<Circle size={16} />}
            label="未着手"
            onClick={() => {
              toggleStatus("new");
              setSelectedStoreId("");
            }}
          />
          <Chip
            active={statusFilter.includes("draft")}
            icon={<PauseCircle size={16} />}
            label="途中"
            onClick={() => {
              toggleStatus("draft");
              setSelectedStoreId("");
            }}
          />
          <Chip
            active={statusFilter.includes("done")}
            icon={<CheckCircle2 size={16} />}
            label="完了"
            onClick={() => {
              toggleStatus("done");
              setSelectedStoreId("");
            }}
          />
        </div>

        <div className="qsc-searchRow2" style={{ marginTop: 12 }}>
          <div className="qsc-searchIcon2">
            <Search size={16} />
          </div>
          <input
            className="qsc-input"
            placeholder="店舗名で検索"
            value={storeQuery}
            onChange={(e) => {
              setStoreQuery(e.target.value);
              setSelectedStoreId("");
            }}
            inputMode="search"
            disabled={!companyId}
          />
        </div>

        {!companyId ? <div className="qsc-mutedLine">※ 先に企業名を選択してください</div> : null}
      </section>

      {/* =========================
         ⑤ 店舗一覧（タップで選択）
         ========================= */}
      <section className="qsc-panel" aria-label="店舗一覧">
        <div className="qsc-panel-head">
          <StepBadge icon={<Store size={14} />} label="⑤ 店舗" />
          <span className="qsc-swipehint">{companyId ? `${storeList.length}件` : "—"}</span>
        </div>

        {!companyId ? (
          <div className="qsc-empty">
            <div className="qsc-emptyTitle">企業名を選択してください</div>
            <div className="qsc-emptyBody">企業名を選ぶと店舗一覧が表示されます。</div>
          </div>
        ) : storeList.length === 0 ? (
          <div className="qsc-empty">
            <div className="qsc-emptyTitle">該当する店舗がありません</div>
            <div className="qsc-emptyBody">フィルタ条件を見直してください。</div>
          </div>
        ) : (
          <div className="qsc-storeCards" role="list">
            {storeList.map((s) => {
              const isDone = s.status === "done";
              const isSelected = selectedStoreId === s.storeId;

              return (
                <button
                  key={s.storeId}
                  type="button"
                  className={["qsc-storeCard", `status-${s.status}`, isSelected ? "is-selected" : ""].join(
                    " "
                  )}
                  disabled={isDone}
                  role="listitem"
                  onClick={() => {
                    if (isDone) return;
                    setSelectedStoreId((cur) => (cur === s.storeId ? "" : s.storeId));
                  }}
                  aria-pressed={isSelected}
                >
                  <div className="qsc-storeCardLeft">
                    <div className="qsc-storeTitle">{s.storeName}</div>
                    <div className="qsc-storeMeta">
                      <span className="qsc-storeMetaItem">
                        <Building2 size={14} /> {s.companyName}
                      </span>
                      <span className="qsc-storeMetaItem">
                        <Layers3 size={14} /> {s.bizName}
                      </span>
                      <span className="qsc-storeMetaItem">
                        <Tag size={14} /> {s.brandName}
                      </span>
                    </div>
                  </div>

                  <div className="qsc-storeCardRight">
                    <span className={`qsc-statusPill status-${s.status}`}>
                      {s.status === "new" ? <Circle size={14} /> : null}
                      {s.status === "draft" ? <PauseCircle size={14} /> : null}
                      {s.status === "done" ? <CheckCircle2 size={14} /> : null}
                      {statusLabel(s.status)}
                    </span>

                    {isSelected ? (
                      <span className="qsc-pickedMark" aria-hidden="true">
                        <Check size={18} />
                      </span>
                    ) : (
                      <ChevronRight size={18} style={{ opacity: 0.75 }} />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <div style={{ height: 60 }} aria-hidden="true" />
    </div>
  );
}
