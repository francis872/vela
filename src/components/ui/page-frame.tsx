import type { ReactNode } from "react";

type PageFrameProps = {
  children: ReactNode;
  className?: string;
};

export default function PageFrame({ children, className = "" }: PageFrameProps) {
  return <div className={`vela-page-frame ${className}`}>{children}</div>;
}
