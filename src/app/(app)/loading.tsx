// src/app/loading.tsx
import BrandLogo from "@/app/(app)/components/BrandLogo";

export default function Loading() {
  return (
    <div className="qsc-loading">
      <div className="qsc-loading-inner">
        <div className="qsc-loading-logo">
          <BrandLogo width={280} priority animate delayMs={0} />
        </div>
        <div className="qsc-spinner" aria-label="loading" />
        <div className="qsc-loading-text">読み込み中…</div>
      </div>
    </div>
  );
}
