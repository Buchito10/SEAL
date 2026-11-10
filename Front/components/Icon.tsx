import type { SVGProps } from "react";

const paths = {
  home: "M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z",
  document: "M14 2H5v20h14V7Zm0 0v5h5M8 12h8M8 16h8",
  templates: "M8 3h13v15H8ZM3 7v14h13M12 7h5M12 11h5",
  sparkles: "m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5ZM20 2v4m-2-2h4",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8m8 .13a4 4 0 0 1 0 7.75",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4",
  history: "M3 11a9 9 0 1 1 2.7 7.4M3 4v7h7m2-5v6l4 2",
  settings: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2",
  menu: "M4 6h16M4 12h16M4 18h16",
  close: "m6 6 12 12M6 18 18 6",
  arrow: "M12 19V5m-6 6 6-6 6 6",
  copy: "M8 8h13v13H8ZM16 4V2H2v14h2",
  external: "M14 3h7v7m0-7L10 14M10 3H3v18h18v-7",
  logout: "M9 3H3v18h6m6-14 5 5-5 5m-8-5h13",
  shield: "m12 3 9 4v5c0 5-9 9-9 9s-9-4-9-9V7Zm-4 9 3 3 5-6",
} as const;

export type IconName = keyof typeof paths;
export default function Icon({ name, ...props }: SVGProps<SVGSVGElement> & { name: IconName }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name]} /></svg>;
}
