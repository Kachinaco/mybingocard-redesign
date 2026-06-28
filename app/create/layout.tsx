import type { Metadata } from "next";

const createFaqItems = [
  {
    question: "Can I make printable bingo cards online?",
    answer:
      "Yes. Use the editor to add your title, squares, images, grid size, and card style, then prepare printable bingo cards when your draft is ready.",
  },
  {
    question: "Can I create online bingo cards for players?",
    answer:
      "Yes. MyBingoCard supports online-ready bingo cards and hosted games when you need players to join from phones, tablets, or computers.",
  },
  {
    question: "Does MyBingoCard include caller tools?",
    answer:
      "Yes. Hosted games include an online bingo caller, call list, called item tracking, card-verifier style winner checks, and tools for running a live bingo room from a finished card.",
  },
  {
    question: "Can each bingo card be unique?",
    answer:
      "Yes. The editor can randomize card content for batches so players receive different bingo cards from the same word list or template.",
  },
  {
    question: "Can I add images to a bingo card?",
    answer:
      "Yes. You can build bingo cards with text, image cells, templates, colors, and custom card settings for classroom, party, work, and event games.",
  },
];

const createPageSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://mybingocard.com/create#webpage",
      name: "Create Bingo Cards Online",
      url: "https://mybingocard.com/create",
      description:
        "Create custom bingo cards online with templates, text, images, printable output, batch generation, online caller tools, call lists, and hosted game options.",
      isPartOf: { "@id": "https://mybingocard.com/#website" },
      mainEntity: { "@id": "https://mybingocard.com/create#app" },
    },
    {
      "@type": "WebApplication",
      "@id": "https://mybingocard.com/create#app",
      name: "MyBingoCard Custom Bingo Card Maker",
      applicationCategory: "GameApplication",
      operatingSystem: "Web",
      url: "https://mybingocard.com/create",
      description:
        "A web-based bingo card maker for printable and online-ready cards with custom text, images, templates, grid sizes, randomized batches, online caller tools, call lists, winner checks, and hosted game options.",
      featureList: [
        "Create custom bingo cards from a blank board or template",
        "Add text, image cells, colors, headers, and footers",
        "Choose 3x3, 4x4, and 5x5 card layouts",
        "Generate randomized printable card batches",
        "Prepare bingo cards for print, sharing, or online hosted games",
        "Run hosted games with an online bingo caller, call list, called item tracking, and winner verification",
      ],
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        description:
          "Drafting, editor access, exports, sharing, and hosted bingo tools are included in the current public release.",
      },
    },
    {
      "@type": "HowTo",
      "@id": "https://mybingocard.com/create#howto",
      name: "How to create bingo cards online",
      description:
        "Use MyBingoCard to build a custom bingo card, preview it, then prepare printable or online-ready cards for players.",
      step: [
        {
          "@type": "HowToStep",
          position: 1,
          name: "Start with a blank card or template",
          text: "Open the bingo card maker and choose a blank board or a template that matches your class, party, wedding, meeting, or fundraiser.",
        },
        {
          "@type": "HowToStep",
          position: 2,
          name: "Customize the bingo squares",
          text: "Add words, numbers, prompts, or images, then adjust the card title, grid size, colors, header, and footer.",
        },
        {
          "@type": "HowToStep",
          position: 3,
          name: "Preview and randomize cards",
          text: "Review the card preview and create unique randomized cards when you need multiple players to receive different boards.",
        },
        {
          "@type": "HowToStep",
          position: 4,
          name: "Print, share, call, or host",
          text: "Use the finished card for printable files, share links, player cards, an online bingo caller, call list, winner verification, or a hosted online bingo game when your event is ready.",
        },
      ],
    },
    {
      "@type": "FAQPage",
      "@id": "https://mybingocard.com/create#faq",
      mainEntity: createFaqItems.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    },
    {
      "@type": "BreadcrumbList",
      "@id": "https://mybingocard.com/create#breadcrumb",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: "https://mybingocard.com/",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Create Bingo Cards Online",
          item: "https://mybingocard.com/create",
        },
      ],
    },
  ],
};

export const metadata: Metadata = {
  title: "Create Bingo Cards Online | Custom Bingo Card Maker",
  description: "Create printable and online bingo cards in minutes. Customize templates, images, batches, PDFs, caller tools, call lists, and hosted games.",
  other: {
    google: "notranslate",
  },
  alternates: {
    canonical: "https://mybingocard.com/create",
  },
  openGraph: {
    title: "Create Bingo Cards Online | MyBingoCard",
    description: "Build printable bingo card drafts with text, images, templates, AI ideas, share links, caller tools, and live hosting.",
    url: "https://mybingocard.com/create",
    siteName: "MyBingoCard",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Create Bingo Cards Online | MyBingoCard",
    description: "Build printable bingo card drafts with text, images, templates, AI ideas, share links, caller tools, and live hosting.",
  },
};

export default function CreateLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(createPageSchema) }}
      />
      {children}
    </>
  );
}
