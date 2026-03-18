"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Building2,
  Layers3,
  Tag,
  Search,
  Check,
  Circle,
  PauseCircle,
  CheckCircle2,
  Store,
  ClipboardCheck,
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudFog,
  Wind,
  Thermometer,
  MapPinned,
  SlidersHorizontal,
  X,
  RotateCcw,
} from "lucide-react";

import styles from "./CheckPage.module.css";
import { useSession } from "@/app/(app)/lib/auth";

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
  areaId: string;
  areaName: string;
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

type OptionItem = {
  id: string;
  name: string;
};

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
  const quarter = Math.floor(d.getMonth() / 3) + 1;
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

function mapWeatherCode(code: number | null | undefined): WeatherKind {
  if (code == null) return "unknown";
  if (code === 0) return "sunny";
  if (code >= 1 && code <= 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if (code >= 51 && code <= 67) return "rain";
  if (code >= 71 && code <= 77) return "snow";
  if (code >= 80 && code <= 82) return "rain";
  if (code === 85 || code === 86) return "snow";
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

function selectedNames(ids: string[], options: OptionItem[]) {
  const map = new Map(options.map((o) => [o.id, o.name]));
  return ids.map((id) => ({ id, name: map.get(id) ?? id }));
}

function countActiveFilters(params: {
  companyId: string;
  bizIds: string[];
  brandIds: string[];
  areaIds: string[];
  statusFilter: StoreStatus[];
  storeQuery: string;
}) {
  let c = 0;
  if (params.companyId) c += 1;
  c += params.bizIds.length;
  c += params.brandIds.length;
  c += params.areaIds.length;
  c += params.statusFilter.length !== 2 ? params.statusFilter.length : 0;
  if (params.storeQuery.trim()) c += 1;
  return c;
}

/* =========================
   Components
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
    <div className={`${styles.nativeSelect} ${value ? styles.isSelected : ""}`}>
      <div className={styles.nativeSelectUi} aria-hidden="true">
        <span className={styles.nativeSelectLeft}>
          <span className={styles.nativeSelectIcon}>
            <Building2 size={18} />
          </span>
          <span className={styles.nativeSelectText}>
            {value ? value.name : "企業名を選択"}
          </span>
        </span>

        <span className={styles.nativeSelectRight}>
          {value ? <span className={styles.companyLabel}>選択中</span> : null}
          <ChevronRight size={18} />
        </span>
      </div>

      <select
        className={styles.nativeSelectEl}
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

function FilterBlock({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={styles.filterBlock}>
      <div className={styles.filterBlockHead}>
        <div className={styles.filterBlockTitle}>{title}</div>
        {hint ? <div className={styles.filterBlockHint}>{hint}</div> : null}
      </div>
      <div>{children}</div>
    </section>
  );
}

function ActivePill({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <button type="button" className={styles.activePill} onClick={onRemove}>
      <span>{label}</span>
      <X size={14} />
    </button>
  );
}

/* =========================
   Page Main
   ========================= */
export default function CheckPage() {
  const { mmdd, yyyy, dow, quarter } = useMemo(() => todayParts(), []);
  const { session } = useSession();

  const [storeMaster, setStoreMaster] = useState<StoreRow[]>([]);
  const [loadingStores, setLoadingStores] = useState(true);
  const [storesError, setStoresError] = useState("");

  const [tod, setTod] = useState<Tod>(() => getTod());
  const [weatherKind, setWeatherKind] = useState<WeatherKind>("unknown");
  const [tempC, setTempC] = useState<number | null>(null);

  const widgetWrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadStores() {
      try {
        setLoadingStores(true);
        setStoresError("");

        const res = await fetch("/api/check/stores", {
          method: "GET",
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error("failed to fetch stores");
        }

        const json = await res.json();
        const items = Array.isArray(json?.items) ? json.items : [];

        if (!cancelled) {
          setStoreMaster(items);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setStoreMaster([]);
          setStoresError("店舗一覧の取得に失敗しました。");
        }
      } finally {
        if (!cancelled) {
          setLoadingStores(false);
        }
      }
    }

    loadStores();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const t = window.setInterval(() => setTod(getTod()), 60 * 1000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
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

    fetchWeather(35.681236, 139.767125);

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
        () => {},
        { enableHighAccuracy: false, timeout: 2500, maximumAge: 10 * 60 * 1000 }
      );
    }

    const timer = window.setInterval(() => {
      fetchWeather(35.681236, 139.767125);
    }, 10 * 60 * 1000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const el = widgetWrapRef.current;
    if (!el) return;

    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        const rect = el.getBoundingClientRect();
        const vh = window.innerHeight || 800;
        const centerY = rect.top + rect.height / 2;
        const t = (centerY - vh / 2) / (vh / 2);
        const y = Math.max(-18, Math.min(18, t * 12));
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

  const [companyId, setCompanyId] = useState<string>("");
  const [bizIds, setBizIds] = useState<string[]>([]);
  const [brandIds, setBrandIds] = useState<string[]>([]);
  const [areaIds, setAreaIds] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<StoreStatus[]>(["new", "draft"]);
  const [storeQuery, setStoreQuery] = useState("");
  const [selectedStoreId, setSelectedStoreId] = useState<string>("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const companies = useMemo(() => {
    const rows = uniqBy(storeMaster, (r) => r.companyId).map((r) => ({
      id: r.companyId,
      name: r.companyName,
    }));
    return rows.sort((a, b) => a.name.localeCompare(b.name, "ja"));
  }, [storeMaster]);

  const selectedCompany = useMemo(
    () => companies.find((c) => c.id === companyId) || null,
    [companies, companyId]
  );

  const bizOptions = useMemo(() => {
    const rows = storeMaster.filter((r) => !companyId || r.companyId === companyId);
    const list = uniqBy(rows, (r) => r.bizId).map((r) => ({
      id: r.bizId,
      name: r.bizName,
    }));
    return list.sort((a, b) => a.name.localeCompare(b.name, "ja"));
  }, [storeMaster, companyId]);

  const brandOptions = useMemo(() => {
    const rows = storeMaster.filter((r) => {
      if (companyId && r.companyId !== companyId) return false;
      if (bizIds.length && !bizIds.includes(r.bizId)) return false;
      return true;
    });
    const list = uniqBy(rows, (r) => r.brandId).map((r) => ({
      id: r.brandId,
      name: r.brandName,
    }));
    return list.sort((a, b) => a.name.localeCompare(b.name, "ja"));
  }, [storeMaster, companyId, bizIds]);

  const areaOptions = useMemo(() => {
    const rows = storeMaster.filter((r) => {
      if (companyId && r.companyId !== companyId) return false;
      if (bizIds.length && !bizIds.includes(r.bizId)) return false;
      if (brandIds.length && !brandIds.includes(r.brandId)) return false;
      return true;
    });

    const list = uniqBy(rows, (r) => r.areaId).map((r) => ({
      id: r.areaId,
      name: r.areaName,
    }));

    return list.sort((a, b) => a.name.localeCompare(b.name, "ja"));
  }, [storeMaster, companyId, bizIds, brandIds]);

  const storeList = useMemo(() => {
    const k = storeQuery.trim().toLowerCase();
    const assignedStoreId = session?.assignedStoreId;
    const isRestricted =
      session?.role === "auditor" || session?.role === "manager";

    return storeMaster
      .filter((r) => {
        if (isRestricted && assignedStoreId) {
          if (r.storeId !== assignedStoreId) return false;
        }

        if (companyId && r.companyId !== companyId) return false;
        if (bizIds.length && !bizIds.includes(r.bizId)) return false;
        if (brandIds.length && !brandIds.includes(r.brandId)) return false;
        if (areaIds.length && !areaIds.includes(r.areaId)) return false;
        if (!statusFilter.includes(r.status)) return false;
        if (k && !r.storeName.toLowerCase().includes(k)) return false;
        return true;
      })
      .sort((a, b) => a.storeName.localeCompare(b.storeName, "ja"));
  }, [
    storeMaster,
    companyId,
    bizIds,
    brandIds,
    areaIds,
    statusFilter,
    storeQuery,
    session,
  ]);

  const selectedStore = useMemo(() => {
    const found = storeMaster.find((s) => s.storeId === selectedStoreId);
    if (!found) return null;
    const visible = storeList.some((s) => s.storeId === selectedStoreId);
    if (!visible) return null;
    if (found.status === "done") return null;
    return found;
  }, [selectedStoreId, storeList, storeMaster]);

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
        areaId: selectedStore.areaId,
        storeId: selectedStore.storeId,
        storeName: selectedStore.storeName,
        companyName: selectedStore.companyName,
        brandName: selectedStore.brandName,
        areaName: selectedStore.areaName,
        ts: Date.now(),
      })
    );
  }, [selectedStore]);

  useEffect(() => {
    document.body.style.overflow = isFilterOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isFilterOpen]);

  const toggle = (arr: string[], id: string) =>
    arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];

  const toggleStatus = (s: StoreStatus) =>
    setStatusFilter((v) =>
      v.includes(s) ? v.filter((x) => x !== s) : [...v, s]
    );

  const onCompanyChange = (id: string) => {
    setCompanyId(id);
    setBizIds([]);
    setBrandIds([]);
    setAreaIds([]);
    setStoreQuery("");
    setSelectedStoreId("");
  };

  const clearAllFilters = () => {
    setCompanyId("");
    setBizIds([]);
    setBrandIds([]);
    setAreaIds([]);
    setStatusFilter(["new", "draft"]);
    setStoreQuery("");
    setSelectedStoreId("");
  };

  const activeFilterCount = countActiveFilters({
    companyId,
    bizIds,
    brandIds,
    areaIds,
    statusFilter,
    storeQuery,
  });

  const bizSelected = selectedNames(bizIds, bizOptions);
  const brandSelected = selectedNames(brandIds, brandOptions);
  const areaSelected = selectedNames(areaIds, areaOptions);

  return (
    <div className={styles.page}>
      <div ref={widgetWrapRef} className={styles.widgetWrap} aria-label="日付と天気">
        <div className={styles.widget} data-tod={tod} data-weather={weatherKind}>
          <div className={styles.widgetGlow} aria-hidden="true" />
          <div className={styles.widgetRow}>
            <div className={styles.dateMain}>
              <div className={styles.dateBig}>
                <CalendarDays size={18} />
                <span className={styles.dateBigTx}>{mmdd}</span>
              </div>
              <div className={styles.dateSub}>
                <span className={styles.year}>{yyyy}</span>
                <span className={styles.dateSubDot}>•</span>
                <span className={styles.dow}>{dow}</span>
              </div>
            </div>
            <div className={styles.qMain}>
              <span className={styles.qPill}>
                <span className={styles.qPillTx}>Q{quarter}</span>
              </span>
              <span className={styles.qLabel}>Quarter</span>
            </div>
          </div>
        </div>

        <div className={styles.widget} data-tod={tod} data-weather={weatherKind}>
          <div className={styles.widgetGlow2} aria-hidden="true" />
          <div className={styles.widgetRow}>
            <div className={styles.weatherMain}>
              <span className={styles.weatherIc}>
                <WeatherIcon kind={weatherKind} />
              </span>
              <div className={styles.weatherText}>
                <div className={styles.weatherLabel}>{weatherLabel(weatherKind)}</div>
                <div className={styles.weatherHint}>
                  {tod === "morning" ? "Morning" : tod === "day" ? "Daytime" : "Night"}
                </div>
              </div>
            </div>
            <div className={styles.tempPill}>
              <Thermometer size={16} style={{ opacity: 0.85 }} />
              <span className={styles.tempVal}>
                {tempC == null ? "—" : `${Math.round(tempC)}°`}
              </span>
            </div>
          </div>
        </div>
      </div>

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

          {session?.role === "auditor" ? (
            <p className="qsc-sub qsc-subCheck" style={{ margin: "8px 0 0 0" }}>
              担当店舗のみ表示されています。対象を選択して開始してください。
            </p>
          ) : (
            <p className="qsc-sub qsc-subCheck" style={{ margin: "8px 0 0 0" }}>
              店舗をタップで選択 → 右下の「＋」でスタート。
            </p>
          )}

          <div className={styles.selectedLine} aria-live="polite">
            {selectedStore ? (
              <>
                <span className={`${styles.dot} ${styles.dotOn}`} />
                <span>
                  選択中：<b>{selectedStore.storeName}</b>（
                  {selectedStore.companyName} / {selectedStore.brandName} / {selectedStore.areaName}
                  ）
                </span>
              </>
            ) : (
              <>
                <span className={styles.dot} />
                <span style={{ opacity: 0.6 }}>未選択</span>
              </>
            )}
          </div>
        </div>
      </header>

      <section className={`qsc-panel ${styles.filterSummaryPanel}`} aria-label="絞り込みサマリー">
        <div className={styles.filterSummaryTop}>
          <div className={styles.filterSummaryLeft}>
            <div className={styles.filterSummaryTitle}>
              <SlidersHorizontal size={16} />
              <span>絞り込み</span>
            </div>
            <div className={styles.filterSummarySub}>
              {companyId ? (
                <>
                  <b>{selectedCompany?.name}</b>
                  <span>・ {storeList.length}件</span>
                </>
              ) : (
                <span>企業名を選択して絞り込み</span>
              )}
            </div>
          </div>

          <div className={styles.filterSummaryActions}>
            {activeFilterCount > 0 ? (
              <button
                type="button"
                className={styles.ghostBtn}
                onClick={clearAllFilters}
              >
                <RotateCcw size={14} />
                <span>リセット</span>
              </button>
            ) : null}

            <button
              type="button"
              className={styles.primaryFilterBtn}
              onClick={() => setIsFilterOpen(true)}
            >
              <SlidersHorizontal size={16} />
              <span>条件を選ぶ</span>
              {activeFilterCount > 0 ? (
                <span className={styles.filterCount}>{activeFilterCount}</span>
              ) : null}
            </button>
          </div>
        </div>

        <div className={styles.activePills}>
          {selectedCompany ? (
            <ActivePill label={`企業: ${selectedCompany.name}`} onRemove={() => onCompanyChange("")} />
          ) : null}

          {bizSelected.map((b) => (
            <ActivePill
              key={`biz-${b.id}`}
              label={`業態: ${b.name}`}
              onRemove={() => {
                setBizIds((v) => v.filter((id) => id !== b.id));
                setBrandIds([]);
                setAreaIds([]);
                setSelectedStoreId("");
              }}
            />
          ))}

          {brandSelected.map((b) => (
            <ActivePill
              key={`brand-${b.id}`}
              label={`ブランド: ${b.name}`}
              onRemove={() => {
                setBrandIds((v) => v.filter((id) => id !== b.id));
                setAreaIds([]);
                setSelectedStoreId("");
              }}
            />
          ))}

          {areaSelected.map((a) => (
            <ActivePill
              key={`area-${a.id}`}
              label={`エリア: ${a.name}`}
              onRemove={() => {
                setAreaIds((v) => v.filter((id) => id !== a.id));
                setSelectedStoreId("");
              }}
            />
          ))}

          {statusFilter.includes("new") ? null : (
            <ActivePill label="未着手: OFF" onRemove={() => toggleStatus("new")} />
          )}
          {statusFilter.includes("draft") ? null : (
            <ActivePill label="途中: OFF" onRemove={() => toggleStatus("draft")} />
          )}
          {statusFilter.includes("done") ? (
            <ActivePill label="完了: ON" onRemove={() => toggleStatus("done")} />
          ) : null}

          {storeQuery.trim() ? (
            <ActivePill label={`検索: ${storeQuery}`} onRemove={() => setStoreQuery("")} />
          ) : null}
        </div>
      </section>

      <section className="qsc-panel" aria-label="店舗一覧">
        <div className="qsc-panel-head">
          <StepBadge icon={<Store size={14} />} label="店舗一覧" />
          <span className="qsc-swipehint">
            {loadingStores ? "読込中..." : companyId ? `${storeList.length}件` : "—"}
          </span>
        </div>

        {loadingStores ? (
          <div className="qsc-empty">
            <div className="qsc-emptyTitle">店舗一覧を読み込んでいます</div>
            <div className="qsc-emptyBody">少しお待ちください。</div>
          </div>
        ) : storesError ? (
          <div className="qsc-empty">
            <div className="qsc-emptyTitle">取得に失敗しました</div>
            <div className="qsc-emptyBody">{storesError}</div>
          </div>
        ) : !companyId ? (
          <div className="qsc-empty">
            <div className="qsc-emptyTitle">企業名を選択してください</div>
            <div className="qsc-emptyBody">「条件を選ぶ」から企業名を選ぶと店舗一覧が表示されます。</div>
          </div>
        ) : storeList.length === 0 ? (
          <div className="qsc-empty">
            <div className="qsc-emptyTitle">該当する店舗がありません</div>
            <div className="qsc-emptyBody">絞り込み条件を見直してください。</div>
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
                  className={[
                    "qsc-storeCard",
                    `status-${s.status}`,
                    isSelected ? "is-selected" : "",
                  ].join(" ")}
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
                      <span className="qsc-storeMetaItem">
                        <MapPinned size={14} /> {s.areaName}
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

      {isFilterOpen && (
        <>
          <button
            type="button"
            className={styles.sheetBackdrop}
            aria-label="閉じる"
            onClick={() => setIsFilterOpen(false)}
          />
          <div
            className={styles.sheet}
            role="dialog"
            aria-modal="true"
            aria-label="絞り込み条件"
          >
            <div className={styles.sheetHandle} />

            <div className={styles.sheetHead}>
              <div>
                <div className={styles.sheetTitle}>絞り込み条件</div>
                <div className={styles.sheetSub}>スマホ向けにまとめて選択できます</div>
              </div>
              <button
                type="button"
                className={styles.sheetClose}
                onClick={() => setIsFilterOpen(false)}
                aria-label="閉じる"
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.sheetBody}>
              <FilterBlock title="企業名" hint="最初にここを選択">
                <CompanyPicker
                  value={selectedCompany}
                  options={companies}
                  onChange={onCompanyChange}
                />
              </FilterBlock>

              <FilterBlock title="業態" hint="複数選択可">
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
                        setAreaIds([]);
                        setSelectedStoreId("");
                      }}
                    />
                  ))}
                  {companyId && bizOptions.length === 0 && (
                    <div className="qsc-mutedLine">該当する業態がありません</div>
                  )}
                </div>
              </FilterBlock>

              <FilterBlock title="ブランド" hint="複数選択可">
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
                        setAreaIds([]);
                        setSelectedStoreId("");
                      }}
                    />
                  ))}
                  {companyId && brandOptions.length === 0 && (
                    <div className="qsc-mutedLine">該当するブランドがありません</div>
                  )}
                </div>
              </FilterBlock>

              <FilterBlock title="エリア" hint="複数選択可">
                <div className={`qsc-chipScroll2 ${!companyId ? "is-disabled" : ""}`}>
                  {areaOptions.map((a) => (
                    <Chip
                      key={a.id}
                      active={areaIds.includes(a.id)}
                      icon={<MapPinned size={16} />}
                      label={a.name}
                      disabled={!companyId}
                      onClick={() => {
                        if (!companyId) return;
                        setAreaIds((v) => toggle(v, a.id));
                        setSelectedStoreId("");
                      }}
                    />
                  ))}
                  {companyId && areaOptions.length === 0 && (
                    <div className="qsc-mutedLine">該当するエリアがありません</div>
                  )}
                </div>
              </FilterBlock>

              <FilterBlock title="状態" hint="進捗で絞り込み">
                <div className="qsc-chipScroll2">
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
              </FilterBlock>

              <FilterBlock title="店舗検索" hint="店名で絞り込み">
                <div className={`qsc-searchRow2 ${styles.searchRow}`}>
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
                {!companyId && (
                  <div className="qsc-mutedLine" style={{ marginTop: 8 }}>
                    ※ 先に企業名を選択してください
                  </div>
                )}
              </FilterBlock>
            </div>

            <div className={styles.sheetFoot}>
              <button
                type="button"
                className={styles.sheetGhostBtn}
                onClick={clearAllFilters}
              >
                <RotateCcw size={15} />
                <span>リセット</span>
              </button>

              <button
                type="button"
                className={styles.sheetApplyBtn}
                onClick={() => setIsFilterOpen(false)}
              >
                <span>この条件で表示</span>
                <span className={styles.sheetApplyCount}>{storeList.length}件</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}