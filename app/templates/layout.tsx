import type { Metadata } from "next";

const popularTemplateItems = [
  {
    name: "Wedding Bingo Template",
    category: "Wedding",
    description:
      "A wedding bingo card template for receptions, showers, rehearsal dinners, speeches, and guest icebreakers.",
  },
  {
    name: "Baby Shower Bingo Template",
    category: "Baby Shower",
    description:
      "A baby shower bingo template for gift openings, prediction games, parent advice, and nursery themes.",
  },
  {
    name: "Classroom Vocabulary Bingo Template",
    category: "Classroom",
    description:
      "A classroom bingo template for vocabulary practice, sight words, review games, and student engagement.",
  },
  {
    name: "Office Meeting Bingo Template",
    category: "Office",
    description:
      "An office bingo template for meeting phrases, remote calls, team building, and workplace events.",
  },
  {
    name: "Holiday Bingo Template",
    category: "Holiday",
    description:
      "A holiday bingo template for Christmas parties, Halloween activities, New Year's goals, and seasonal gatherings.",
  },
  {
    name: "Fundraiser Bingo Template",
    category: "Event",
    description:
      "A fundraiser bingo template for community events, prize nights, donor engagement, and local organizations.",
  },
];

const templateFaqItems = [
  {
    question: "Can I customize these bingo card templates?",
    answer:
      "Yes. Choose a template, then edit the title, square text, images, colors, grid size, and card quantity before previewing or sharing your cards.",
  },
  {
    question: "Can I print a bingo card template?",
    answer:
      "Yes. Templates can be prepared for printable bingo cards after you customize the squares and preview the generated card set.",
  },
  {
    question: "Can I use a template for online bingo?",
    answer:
      "Yes. Templates are built for both printable cards and online-hosted bingo games, so you can share cards digitally or run a live game.",
  },
  {
    question: "What bingo template should I choose?",
    answer:
      "Start with the closest occasion, such as wedding, baby shower, classroom, office, holiday, fundraiser, or icebreaker. Then replace any squares that do not fit your audience.",
  },
];

const templatePageSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "CollectionPage",
      "@id": "https://mybingocard.com/templates#collection",
      name: "Bingo Card Templates",
      url: "https://mybingocard.com/templates",
      description:
        "Browse customizable bingo card templates for printable cards and online bingo games, including weddings, baby showers, classrooms, holidays, offices, fundraisers, and parties.",
      isPartOf: { "@id": "https://mybingocard.com/#website" },
      mainEntity: { "@id": "https://mybingocard.com/templates#templates" },
    },
    {
      "@type": "ItemList",
      "@id": "https://mybingocard.com/templates#templates",
      name: "Popular bingo card templates",
      itemListElement: popularTemplateItems.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "CreativeWork",
          name: item.name,
          description: item.description,
          genre: item.category,
          url: "https://mybingocard.com/templates",
        },
      })),
    },
    {
      "@type": "HowTo",
      "@id": "https://mybingocard.com/templates#howto",
      name: "How to use a bingo card template",
      description:
        "Choose a bingo card template, customize the squares and card settings, then prepare printable or online bingo cards for your event.",
      step: [
        {
          "@type": "HowToStep",
          position: 1,
          name: "Choose a template",
          text: "Pick the template category that best matches your event, class, party, fundraiser, or meeting.",
        },
        {
          "@type": "HowToStep",
          position: 2,
          name: "Customize the card",
          text: "Edit the card title, square text, images, colors, grid size, and number of unique cards.",
        },
        {
          "@type": "HowToStep",
          position: 3,
          name: "Preview the generated cards",
          text: "Review the randomized cards and adjust the template until the content matches your players.",
        },
        {
          "@type": "HowToStep",
          position: 4,
          name: "Print or host online",
          text: "Use the finished template for printable bingo cards, digital sharing, or a live hosted bingo game.",
        },
      ],
    },
    {
      "@type": "FAQPage",
      "@id": "https://mybingocard.com/templates#faq",
      mainEntity: templateFaqItems.map((item) => ({
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
      "@id": "https://mybingocard.com/templates#breadcrumb",
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
          name: "Bingo Card Templates",
          item: "https://mybingocard.com/templates",
        },
      ],
    },
  ],
};

export const metadata: Metadata = {
  title: "Bingo Card Templates for Printable and Online Bingo",
  description:
    "Browse customizable bingo card templates for weddings, baby showers, classrooms, holidays, parties, offices, fundraisers, and online bingo games.",
  alternates: {
    canonical: "https://mybingocard.com/templates",
  },
  openGraph: {
    title: "Bingo Card Templates | MyBingoCard",
    description:
      "Customize printable and online-ready bingo card templates for weddings, baby showers, classrooms, holidays, parties, office events, and fundraisers.",
    url: "https://mybingocard.com/templates",
    siteName: "MyBingoCard",
    type: "website",
  },
};

export default function TemplatesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(templatePageSchema) }}
      />
      {children}
    </>
  );
}
