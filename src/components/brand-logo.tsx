import Image from "next/image";
import symbol from "@/app/recursos/VELA.png";
import wordmark from "@/app/recursos/VELA (2).png";
import full from "@/app/recursos/VELA (3).png";

type BrandLogoProps = {
  variant?: "symbol" | "wordmark" | "full";
  className?: string;
  priority?: boolean;
};

const assets = {
  symbol: { src: symbol, width: 44, height: 44, alt: "VELA" },
  wordmark: { src: wordmark, width: 170, height: 52, alt: "VELA" },
  full: { src: full, width: 190, height: 64, alt: "VELA" },
};

export default function BrandLogo({ variant = "full", className, priority = false }: BrandLogoProps) {
  const asset = assets[variant];
  return (
    <Image
      src={asset.src}
      alt={asset.alt}
      width={asset.width}
      height={asset.height}
      priority={priority}
      className={className}
      style={{ width: "auto", height: "auto", maxWidth: "100%" }}
    />
  );
}
