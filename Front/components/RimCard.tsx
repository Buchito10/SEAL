import React from "react";

type RimCardProps = {
  children: React.ReactNode;
  className?: string;
};

export default function RimCard({ children, className = "" }: RimCardProps) {
  return <div className={`rim ${className}`.trim()}>{children}</div>;
}