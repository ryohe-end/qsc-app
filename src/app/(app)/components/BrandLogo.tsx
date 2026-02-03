// src/components/BrandLogo.tsx
import Image from "next/image";

type Props = {
  width?: number;
  priority?: boolean;
  className?: string;

  /** ロゴ登場アニメを使うか（TOP/LOGIN/LOADINGでON推奨） */
  animate?: boolean;

  /** ちょい遅らせたい時（ms） */
  delayMs?: number;
};

export const LOGO_URL =
  "https://houjin-manual.s3.us-east-2.amazonaws.com/logo_QSC.png";

export default function BrandLogo({
  width = 200,
  priority = false,
  className,
  animate = false,
  delayMs = 0,
}: Props) {
  return (
    <div
      className={[
        "qsc-logo-wrap",
        animate ? "qsc-logo-anim" : "",
        className ?? "",
      ]
        .join(" ")
        .trim()}
      style={
        {
          width,
          ["--qsc-delay" as any]: `${delayMs}ms`,
        } as React.CSSProperties
      }
    >
      <Image
        src={LOGO_URL}
        alt="QSC"
        width={width}
        height={Math.round(width * 0.4)}
        priority={priority}
        style={{
          width: "100%",
          height: "auto",
          objectFit: "contain",
          display: "block",
        }}
      />
    </div>
  );
}
