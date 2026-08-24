import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

import bodyHtml from "../csmix-body.html?raw";

const TITLE = "CSMIX — Mixes de CS por JuninN";
const DESCRIPTION =
  "Organize e entre em mixes de Counter-Strike online e presenciais (LAN): agenda de 10 dias, ranking de jogadores e histórico de partidas.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Inter:wght@400;500;600&display=swap",
      },
      { rel: "stylesheet", href: "/css/styles.css" },
    ],
  }),
  component: CsmixPage,
});

const MODULES = [
  "/js/identity.js",
  "/js/day-rollover.js",
  "/js/header-admin.js",
  "/js/ui-home.js",
  "/js/ui-admin.js",
];

function CsmixPage() {
  useEffect(() => {
    const tags = MODULES.map((src) => {
      const el = document.createElement("script");
      el.type = "module";
      el.src = src;
      document.body.appendChild(el);
      return el;
    });
    return () => {
      tags.forEach((el) => el.remove());
    };
  }, []);

  return <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />;
}
