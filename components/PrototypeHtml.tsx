"use client";

export default function PrototypeHtml({ html }: { html: string }) {
  return (
    <div
      className="prototype-html"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
