import type { Metadata } from "next";

export type SeoLandingPageData = {
  slug: string;
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  h1: string;
  lead: string;
  accent: "indigo" | "blue" | "emerald" | "rose" | "amber";
  sampleLabel: string;
  sampleSquares: string[];
  primaryCta: string;
  audience: string;
  intro: string;
  benefits: Array<{ title: string; description: string }>;
  useCases: Array<{ title: string; description: string }>;
  steps: string[];
  ideas: string[];
  faqs: Array<{ question: string; answer: string }>;
  related: string[];
};

type LongTailPageInput = {
  slug: string;
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  h1: string;
  lead: string;
  accent: SeoLandingPageData["accent"];
  sampleLabel: string;
  primaryCta: string;
  audience: string;
  intro: string;
  sampleSquares: string[];
  ideas: string[];
  useCases: Array<{ title: string; description: string }>;
  related: string[];
};

function makeLongTailPage(input: LongTailPageInput): SeoLandingPageData {
  return {
    ...input,
    benefits: [
      {
        title: "Ready-to-use square ideas",
        description:
          "Start from a focused list instead of a blank card, then edit the wording to match your exact group.",
      },
      {
        title: "Printable or online",
        description:
          "Use the same card idea for free PDF exports, free online share links, or hosted live games.",
      },
      {
        title: "Unique shuffled cards",
        description:
          "Create randomized cards so players do not all receive the same layout or win at the same time.",
      },
    ],
    steps: [
      "Review the sample square ideas on this page.",
      "Use the list to open the bingo card editor with the card prefilled.",
      "Replace any square that does not fit your group.",
      "Export for free, then add free share links or hosted play when needed.",
    ],
    faqs: [
      {
        question: `Can I customize this ${input.eyebrow.toLowerCase()} card?`,
        answer:
          "Yes. Use the sample list as a starting point, then edit the title, squares, grid size, colors, and free space before sharing or export.",
      },
      {
        question: "Can every player get a unique card?",
        answer:
          "Yes. MyBingoCard can shuffle the same square list into unique cards for groups, classes, parties, and events.",
      },
      {
        question: "Can I play this bingo game online?",
        answer:
          "Yes. You can export cards for in-person play for free, then add free online cards that players mark from a phone, tablet, or laptop browser.",
      },
    ],
  };
}

export const seoLandingPages: Record<string, SeoLandingPageData> = {
  "bingo-card-maker": {
    slug: "bingo-card-maker",
    metaTitle: "Bingo Card Maker and Generator - Create Printable Cards",
    metaDescription:
      "Use MyBingoCard as a free bingo card editor and generator for PDF exports, custom words, images, templates, unique shuffled cards, and free online play.",
    eyebrow: "Bingo card maker",
    h1: "Bingo Card Maker and Generator for Printable Games",
    lead:
      "Create custom bingo cards in minutes with a bingo card maker that exports individual printable cards for free and supports free batch packs or online cards.",
    accent: "indigo",
    sampleLabel: "All-purpose game",
    primaryCta: "Make a Bingo Card",
    audience: "hosts, teachers, event planners, and team leaders",
    intro:
      "MyBingoCard gives you a fast bingo card maker that handles the full workflow: add your own words or images, choose a grid size, export clean PDFs for free, then add free online sharing or hosted games without complicated setup.",
    sampleSquares: [
      "Welcome",
      "Prize",
      "Guest",
      "Music",
      "FREE",
      "Photo",
      "Laugh",
      "Snack",
      "Winner",
      "Round Two",
      "Team",
      "Question",
      "Bonus",
      "Share",
      "Play",
      "Friend",
      "Host",
      "Theme",
      "Card",
      "Bingo",
      "Marker",
      "Table",
      "Caller",
      "Gift",
      "Finish",
    ],
    benefits: [
      {
        title: "Built for real events",
        description:
          "Make cards that are ready for a classroom, reception, office party, fundraiser, or remote game instead of a one-off worksheet.",
      },
      {
        title: "Printable and online",
        description:
          "Export a PDF or add free online card sharing when players are using phones, tablets, or laptops.",
      },
      {
        title: "Flexible card content",
        description:
          "Use text, images, templates, AI suggestions, and shuffled layouts so each game feels tailored to your group.",
      },
    ],
    useCases: [
      { title: "Classroom review", description: "Turn vocabulary, math facts, or lesson terms into an interactive review game." },
      { title: "Party activities", description: "Create cards for birthdays, holidays, showers, weddings, and family gatherings." },
      { title: "Work events", description: "Make icebreakers, team-building activities, onboarding games, or meeting bingo cards." },
    ],
    steps: [
      "Choose a blank card or start from a template.",
      "Add your own words, prompts, numbers, or images.",
      "Pick a 3x3, 4x4, or 5x5 grid and customize the style.",
      "Export an individual PDF for free, then add free batch packs, share links, or hosted play when needed.",
    ],
    ideas: ["Custom event prompts", "Team member names", "Party moments", "Vocabulary terms", "Gift predictions", "Icebreaker questions"],
    faqs: [
      {
        question: "Is this bingo card maker free?",
        answer:
          "Yes. You can create, save, customize, use templates, and export individual PDFs for free. Printable batch packs, free sharing, and hosted games are optional.",
      },
      {
        question: "Can I make multiple unique bingo cards?",
        answer:
          "Yes. MyBingoCard can shuffle cards so players do not all receive the same layout, which is useful for classrooms and events.",
      },
      {
        question: "Can players use the cards online?",
        answer:
          "Yes. free share links and hosted live games let players mark cards on their devices for remote or in-person play.",
      },
    ],
    related: ["printable-bingo-cards", "online-bingo-card-generator", "custom-bingo-card-maker", "ai-bingo-card-generator"],
  },
  "bingo-board-generator": {
    slug: "bingo-board-generator",
    metaTitle: "Bingo Board Generator - Make Printable Bingo Boards Online",
    metaDescription:
      "Create printable bingo boards online with custom words, images, grid sizes, PDFs, and share links. Bingo board draft editor for classes, parties, and events.",
    eyebrow: "Bingo board generator",
    h1: "Bingo Board Generator for Printable and Online Games",
    lead:
      "Make a bingo board online, customize every square, export cards as PDFs for free, or add free play links for your group.",
    accent: "blue",
    sampleLabel: "Printable board",
    primaryCta: "Make a Bingo Board",
    audience: "teachers, hosts, parents, event planners, and group leaders",
    intro:
      "A bingo board generator is useful when you need a clean 3x3, 4x4, or 5x5 board without designing it from scratch. MyBingoCard lets you add your own words or images, choose the grid size, shuffle unique cards, export PDFs for free, and add free online bingo from the same card.",
    sampleSquares: [
      "Welcome",
      "Prize",
      "Question",
      "Photo",
      "FREE",
      "Team",
      "Laugh",
      "Music",
      "Winner",
      "Share",
      "Round",
      "Guest",
      "Board",
      "Prompt",
      "Bingo",
      "Friend",
      "Host",
      "Theme",
      "Card",
      "Play",
      "Marker",
      "Table",
      "Caller",
      "Gift",
      "Finish",
    ],
    benefits: [
      {
        title: "Choose the right board size",
        description:
          "Make quick 3x3 boards, flexible 4x4 boards, or classic 5x5 bingo boards with a free space.",
      },
      {
        title: "Export or share the same board",
        description:
          "Use the same content for free PDF exports, free online cards, or free live games.",
      },
      {
        title: "Shuffle unique player cards",
        description:
          "Generate different layouts from the same square list so everyone is not playing the exact same board.",
      },
    ],
    useCases: [
      { title: "Classroom bingo boards", description: "Turn vocabulary, review questions, math facts, or sight words into printable boards." },
      { title: "Party bingo boards", description: "Make boards for birthdays, showers, weddings, holidays, and family games." },
      { title: "Work and team boards", description: "Create boards for meetings, onboarding, trainings, retreats, and icebreakers." },
    ],
    steps: [
      "Choose a blank board or start from a template.",
      "Add words, prompts, numbers, or images to the squares.",
      "Pick a 3x3, 4x4, or 5x5 board layout.",
      "Export the PDF for free, or add free online sharing and live hosting.",
    ],
    ideas: ["Classroom review board", "Party bingo board", "Team meeting board", "Holiday board", "Baby shower board", "Wedding reception board"],
    faqs: [
      {
        question: "Can I make a printable bingo board?",
        answer:
          "Yes. Create the board online, choose the grid size, and export printable PDF bingo cards for free for your group.",
      },
      {
        question: "Can I make different boards for each player?",
        answer:
          "Yes. MyBingoCard can shuffle your square list into unique boards so players do not all have the same layout.",
      },
      {
        question: "Can I use a bingo board online instead of printing?",
        answer:
          "Yes. after creating, you can share online cards or host a live game so players mark their boards from a phone, tablet, or laptop.",
      },
    ],
    related: ["bingo-card-maker", "printable-bingo-cards", "online-bingo-card-generator", "custom-bingo-card-maker"],
  },
  "printable-bingo-cards": {
    slug: "printable-bingo-cards",
    metaTitle: "Printable Bingo Cards - Custom PDF Generator",
    metaDescription:
      "Create printable bingo cards as PDFs for classrooms, parties, showers, holidays, team events, and fundraisers. Customize and export with free access.",
    eyebrow: "Printable bingo cards",
    h1: "Printable Bingo Cards You Can Customize and Export",
    lead:
      "Make polished bingo cards for any event, then export a clean PDF for free for home, school, office, or professional printing.",
    accent: "blue",
    sampleLabel: "Export ready cards",
    primaryCta: "Create Printable Cards",
    audience: "teachers, parents, hosts, activity directors, and event teams",
    intro:
      "Printable bingo cards still work best when you want a table game, classroom activity, senior center event, or party handout. MyBingoCard helps you draft polished cards first, then export PDFs for free without formatting a spreadsheet or fighting a document template.",
    sampleSquares: [
      "PDF Export",
      "Cut Cards",
      "Dauber",
      "Prize",
      "FREE",
      "Caller",
      "Round 1",
      "Guest",
      "Table",
      "Marker",
      "Winner",
      "Snack",
      "Gift",
      "Game Night",
      "Music",
      "Host",
      "Number",
      "Theme",
      "Card Pack",
      "Shuffle",
      "School",
      "Party",
      "Family",
      "Event",
      "Bingo",
    ],
    benefits: [
      { title: "Clean PDF exports", description: "Export cards for free that are designed for printing instead of relying on screenshots." },
      { title: "Useful grid sizes", description: "Use 3x3, 4x4, or 5x5 layouts depending on age group, game length, and event format." },
      { title: "Easy bulk prep", description: "Create shuffled card sets faster when you need cards for a whole class or guest list." },
    ],
    useCases: [
      { title: "School worksheets", description: "Print vocabulary, spelling, math, and seasonal classroom bingo cards." },
      { title: "Party games", description: "Hand out cards for baby showers, bridal showers, birthdays, and holiday parties." },
      { title: "Fundraisers", description: "Prepare branded cards for charity bingo nights, church events, and community gatherings." },
    ],
    steps: [
      "Enter your card title and square content.",
      "Select the grid size and free space settings.",
      "Customize colors, fonts, and optional images.",
      "Export the finished cards as printable PDFs for free.",
    ],
    ideas: ["Gift opening bingo", "Holiday party bingo", "Classroom review terms", "Senior activity cards", "Fundraiser prize cards", "Family reunion prompts"],
    faqs: [
      {
        question: "Can I print bingo cards at home?",
        answer:
          "Yes. Export your card as a PDF, then print from your browser or PDF viewer on normal paper or cardstock.",
      },
      {
        question: "Can I make printable cards for a large group?",
        answer:
          "Yes. Free batch generation lets you create up to 500 unique printable cards for classrooms, parties, and events.",
      },
      {
        question: "Do printable cards include a free space?",
        answer:
          "You can include or remove the free space depending on the type of bingo card you want to run.",
      },
    ],
    related: ["bingo-card-maker", "custom-bingo-card-maker", "number-bingo-card-generator", "word-bingo-generator"],
  },
  "online-bingo-card-generator": {
    slug: "online-bingo-card-generator",
    metaTitle: "Online Bingo Card Generator - Share and Play Digital Bingo",
    metaDescription:
      "Create bingo cards players can open on phones, tablets, or laptops with free share links or hosted live games. Free exports are included.",
    eyebrow: "Online bingo generator",
    h1: "Online Bingo Card Generator for Digital Games",
    lead:
      "Create bingo cards players can use online, whether your group is in the same room or joining from different locations.",
    accent: "emerald",
    sampleLabel: "Digital play",
    primaryCta: "Create Online Bingo",
    audience: "remote teams, teachers, virtual hosts, trainers, and party planners",
    intro:
      "An online bingo card generator is ideal when printing is inconvenient or players are joining from phones and laptops. MyBingoCard lets you build the card once, export printable copies for free, then add free digital cards for live play.",
    sampleSquares: [
      "Join Link",
      "Phone",
      "Laptop",
      "Remote",
      "FREE",
      "Zoom",
      "Team",
      "Chat",
      "Host",
      "Caller",
      "Round",
      "Winner",
      "Share",
      "Online",
      "Play",
      "Mute",
      "Camera",
      "Emoji",
      "Timer",
      "Prize",
      "Browser",
      "Tablet",
      "Meeting",
      "Digital",
      "Bingo",
    ],
    benefits: [
      { title: "No paper required", description: "Players can mark free online cards from their own devices during virtual or in-person games." },
      { title: "Fast sharing", description: "Create player links instead of emailing attachments or managing printed packets." },
      { title: "Hybrid friendly", description: "Use online cards and free PDF exports for remote players and people in the room." },
    ],
    useCases: [
      { title: "Virtual team building", description: "Run meeting bingo, onboarding games, or icebreakers for distributed teams." },
      { title: "Remote classrooms", description: "Share vocabulary and review games with students learning from home." },
      { title: "Online parties", description: "Host birthday, holiday, or shower bingo with guests in different places." },
    ],
    steps: [
      "Create the card topic and square content.",
      "Customize the look and grid size.",
      "Create share links or start a free live game setup.",
      "Send free links to players and start calling squares.",
    ],
    ideas: ["Remote meeting bingo", "Virtual baby shower bingo", "Online classroom review", "Family video call bingo", "Training session bingo", "Remote holiday party bingo"],
    faqs: [
      {
        question: "Can players mark bingo cards online?",
        answer:
          "Yes. free shared cards can be opened and marked from a phone, tablet, or laptop browser.",
      },
      {
        question: "Do players need to install an app?",
        answer:
          "No. Free play links run in the browser, so players can join from a normal link.",
      },
      {
        question: "Can I also print online bingo cards?",
        answer:
          "Yes. You can use the same card content for online sharing and printable free PDF exports.",
      },
    ],
    related: ["bingo-card-maker", "custom-bingo-card-maker", "team-building-bingo", "icebreaker-bingo"],
  },
  "custom-bingo-card-maker": {
    slug: "custom-bingo-card-maker",
    metaTitle: "Custom Bingo Card Maker - Add Your Own Words and Images",
    metaDescription:
      "Make custom bingo cards with your own words, prompts, numbers, and images. Create free PDF exports or online bingo cards for any theme.",
    eyebrow: "Custom bingo cards",
    h1: "Custom Bingo Card Maker for Any Theme",
    lead:
      "Build bingo cards around your exact event, lesson, audience, or inside jokes instead of using a generic template.",
    accent: "rose",
    sampleLabel: "Custom theme",
    primaryCta: "Make Custom Cards",
    audience: "anyone who needs bingo cards tailored to a specific group",
    intro:
      "A custom bingo card maker should let you control the words, images, card size, colors, and delivery format. MyBingoCard is built for that flexibility, whether you are planning a classroom lesson, shower game, team event, or family night.",
    sampleSquares: [
      "Your Word",
      "Inside Joke",
      "Photo",
      "Prompt",
      "FREE",
      "Name",
      "Place",
      "Prize",
      "Question",
      "Memory",
      "Theme",
      "Color",
      "Image",
      "Event",
      "Guest",
      "Team",
      "Lesson",
      "Song",
      "Movie",
      "Gift",
      "Custom",
      "Phrase",
      "Number",
      "Task",
      "Bingo",
    ],
    benefits: [
      { title: "Add your own content", description: "Use the exact words, phrases, images, names, or prompts your game needs." },
      { title: "Match the occasion", description: "Customize cards for weddings, classrooms, team meetings, fundraisers, and niche themes." },
      { title: "Reuse and adapt", description: "Save time by starting with a template, then changing the content for each new event." },
    ],
    useCases: [
      { title: "Event-specific games", description: "Create cards around the people, moments, and details of a specific event." },
      { title: "Learning activities", description: "Use curriculum words, images, problems, or discussion prompts." },
      { title: "Brand and team games", description: "Build cards around company language, training topics, or team culture." },
    ],
    steps: [
      "Start with a blank card or template.",
      "Replace the sample squares with your own content.",
      "Adjust visual style and grid size.",
      "Print, share, or host the finished custom card.",
    ],
    ideas: ["Guest names", "Product features", "Vocabulary words", "Photo prompts", "Training terms", "Family memories"],
    faqs: [
      {
        question: "Can I add my own words to a bingo card?",
        answer:
          "Yes. You can enter your own words and phrases for every square on the card.",
      },
      {
        question: "Can I add images to custom bingo cards?",
        answer:
          "Yes. Image bingo card tools are available for cards that need photos, icons, or picture-based prompts.",
      },
      {
        question: "Can I use a custom card as a template later?",
        answer:
          "Yes. Saved cards can be reused and adapted for future games.",
      },
    ],
    related: ["image-bingo-card-generator", "word-bingo-generator", "ai-bingo-card-generator", "printable-bingo-cards"],
  },
  "ai-bingo-card-generator": {
    slug: "ai-bingo-card-generator",
    metaTitle: "AI Bingo Card Generator - Create Card Ideas and Squares Fast",
    metaDescription:
      "Use AI to generate bingo card square ideas for classrooms, parties, team events, showers, holidays, and custom themes.",
    eyebrow: "AI bingo generator",
    h1: "AI Bingo Card Generator for Fast Game Ideas",
    lead:
      "Describe your theme, choose the tone, and let AI draft bingo square ideas so you can move from blank card to playable game faster.",
    accent: "indigo",
    sampleLabel: "AI-generated ideas",
    primaryCta: "Try AI Bingo Ideas",
    audience: "busy hosts, teachers, marketers, trainers, and event planners",
    intro:
      "When you know the theme but do not want to write every square by hand, an AI bingo card generator can save the slowest part of setup. MyBingoCard helps you generate square ideas, then edit anything before printing or sharing.",
    sampleSquares: [
      "Funny Toast",
      "Team Shoutout",
      "Pop Quiz",
      "Gift Guess",
      "FREE",
      "Dance Move",
      "Vocabulary",
      "Icebreaker",
      "Movie Quote",
      "Holiday Song",
      "Dad Joke",
      "Prize Clue",
      "Photo Op",
      "Trivia",
      "Memory",
      "Theme Word",
      "Mascot",
      "Action",
      "Prediction",
      "Wildcard",
      "Challenge",
      "Prompt",
      "Guest",
      "Round",
      "Bingo",
    ],
    benefits: [
      { title: "Beat the blank page", description: "Generate square ideas from a short theme instead of writing every card from scratch." },
      { title: "Tune the tone", description: "Create funny, clean, classroom-safe, professional, or event-specific prompts." },
      { title: "Edit before publishing", description: "Use AI as a starting point, then keep full control over the final card." },
    ],
    useCases: [
      { title: "Last-minute parties", description: "Generate a themed game quickly when you do not have time to brainstorm." },
      { title: "Teacher prep", description: "Draft subject-specific review squares from a lesson topic." },
      { title: "Workshops and training", description: "Turn agenda items or training concepts into interactive bingo prompts." },
    ],
    steps: [
      "Describe the theme for your bingo card.",
      "Pick a tone such as funny, serious, or mixed.",
      "Review the AI-generated square ideas.",
      "Edit, print, share, or play the card online.",
    ],
    ideas: ["Office meeting bingo", "Baby shower gift bingo", "Vocabulary review", "Wedding reception bingo", "Holiday party prompts", "Training workshop terms"],
    faqs: [
      {
        question: "Does AI create the entire bingo card?",
        answer:
          "AI can draft square ideas for the card. You can then edit, remove, or replace any item before using it.",
      },
      {
        question: "Can AI make classroom bingo cards?",
        answer:
          "Yes. You can describe a lesson topic and use the generated ideas as a starting point for educational bingo.",
      },
      {
        question: "Can I print AI-generated bingo cards?",
        answer:
          "Yes. After reviewing the card, you can export it as a printable PDF for free or add free online sharing.",
      },
    ],
    related: ["custom-bingo-card-maker", "word-bingo-generator", "vocabulary-bingo-generator", "bingo-card-maker"],
  },
  "image-bingo-card-generator": {
    slug: "image-bingo-card-generator",
    metaTitle: "Image Bingo Card Generator - Make Picture Bingo Cards",
    metaDescription:
      "Create image bingo cards with photos, icons, and picture prompts. Great for kids, ESL, vocabulary, classrooms, and visual event games.",
    eyebrow: "Image bingo cards",
    h1: "Image Bingo Card Generator for Picture-Based Games",
    lead:
      "Make bingo cards with images instead of only text, perfect for younger players, language learners, visual prompts, and branded games.",
    accent: "rose",
    sampleLabel: "Picture bingo",
    primaryCta: "Create Image Bingo",
    audience: "teachers, parents, ESL tutors, activity directors, and event hosts",
    intro:
      "Image bingo cards make games easier for kids, visual learners, and groups where pictures communicate faster than text. MyBingoCard lets you combine image squares with text, then print or share the finished card.",
    sampleSquares: [
      "Apple",
      "Clock",
      "Chair",
      "Book",
      "FREE",
      "Car",
      "Dog",
      "Flower",
      "House",
      "Key",
      "Moon",
      "Pencil",
      "Shoe",
      "Sun",
      "Tree",
      "Water",
      "Hat",
      "Ball",
      "Cup",
      "Star",
      "Bus",
      "Fish",
      "Door",
      "Map",
      "Bird",
    ],
    benefits: [
      { title: "Great for early readers", description: "Use pictures for kids who are still building reading confidence." },
      { title: "Useful for language learning", description: "Pair images with vocabulary practice for ESL and foreign language classes." },
      { title: "More memorable games", description: "Visual prompts make bingo cards easier to scan and more fun to play." },
    ],
    useCases: [
      { title: "Kids picture bingo", description: "Create cards around animals, colors, shapes, classroom objects, or holidays." },
      { title: "ESL vocabulary", description: "Use image prompts to connect words with meaning." },
      { title: "Event photo bingo", description: "Make scavenger-hunt style cards with objects guests should spot or photograph." },
    ],
    steps: [
      "Choose a card size and title.",
      "Add pictures, icons, or image-based prompts.",
      "Mix in text labels if helpful.",
      "Export for free or add free online sharing.",
    ],
    ideas: ["Animal pictures", "Classroom objects", "Holiday symbols", "Wedding photo prompts", "Brand icons", "Vocabulary images"],
    faqs: [
      {
        question: "Can bingo cards use pictures instead of words?",
        answer:
          "Yes. MyBingoCard supports image-based cells for picture bingo and visual games.",
      },
      {
        question: "Are image bingo cards printable?",
        answer:
          "Yes. You can export picture bingo cards as printable files after creating them.",
      },
      {
        question: "Who should use image bingo?",
        answer:
          "Image bingo is useful for younger kids, ESL learners, visual scavenger hunts, and games where pictures are clearer than text.",
      },
    ],
    related: ["custom-bingo-card-maker", "esl-bingo-generator", "vocabulary-bingo-generator", "sight-word-bingo-generator"],
  },
  "word-bingo-generator": {
    slug: "word-bingo-generator",
    metaTitle: "Word Bingo Generator - Make Custom Word Bingo Cards",
    metaDescription:
      "Create word bingo cards for vocabulary, spelling, ESL, classrooms, parties, and custom events. Add your own words, then export with free access or add free online play.",
    eyebrow: "Word bingo generator",
    h1: "Word Bingo Generator for Custom Word Lists",
    lead:
      "Turn any list of words into printable or online bingo cards for learning, review, parties, and group activities.",
    accent: "blue",
    sampleLabel: "Word list game",
    primaryCta: "Make Word Bingo",
    audience: "teachers, tutors, parents, trainers, and event hosts",
    intro:
      "Word bingo works because it turns recognition and recall into a game. Add vocabulary words, spelling lists, topic terms, names, or prompts, then let MyBingoCard shuffle them into cards players can print or mark online.",
    sampleSquares: [
      "Create",
      "Listen",
      "Answer",
      "Review",
      "FREE",
      "Practice",
      "Explain",
      "Match",
      "Write",
      "Read",
      "Speak",
      "Learn",
      "Define",
      "Choose",
      "Solve",
      "Find",
      "Share",
      "Remember",
      "Compare",
      "Notice",
      "Repeat",
      "Describe",
      "Circle",
      "Spell",
      "Bingo",
    ],
    benefits: [
      { title: "Use any word list", description: "Paste in vocabulary, spelling words, names, terms, or custom prompts." },
      { title: "Good for review", description: "Repetition feels less tedious when players are scanning for words in a game." },
      { title: "Works online or printed", description: "Use PDF cards for free or add free digital cards for remote learners." },
    ],
    useCases: [
      { title: "Vocabulary bingo", description: "Review unit terms, definitions, or language-learning words." },
      { title: "Spelling bingo", description: "Make practice more active with randomized spelling word cards." },
      { title: "Event word bingo", description: "Use phrases, sayings, or names from a party, meeting, or family event." },
    ],
    steps: [
      "Collect the words you want to use.",
      "Paste them into the card editor.",
      "Shuffle and customize the card design.",
      "Export for free or add free sharing the cards with players.",
    ],
    ideas: ["Spelling lists", "Vocabulary terms", "Company words", "Party phrases", "Book club terms", "Foreign language words"],
    faqs: [
      {
        question: "Can I paste a word list into the generator?",
        answer:
          "Yes. You can add your own words and edit the card before printing or sharing.",
      },
      {
        question: "Can word bingo use definitions instead of words?",
        answer:
          "Yes. You can place definitions, clues, questions, or prompts in the squares.",
      },
      {
        question: "Can every player get a different word bingo card?",
        answer:
          "Yes. Shuffling and batch tools can create unique card layouts for groups.",
      },
    ],
    related: ["vocabulary-bingo-generator", "sight-word-bingo-generator", "esl-bingo-generator", "custom-bingo-card-maker"],
  },
  "number-bingo-card-generator": {
    slug: "number-bingo-card-generator",
    metaTitle: "Number Bingo Card Generator - Printable Number Bingo Cards",
    metaDescription:
      "Create number bingo cards for math practice, classroom games, parties, seniors, and traditional bingo nights. Export PDFs for free or add free online play.",
    eyebrow: "Number bingo cards",
    h1: "Number Bingo Card Generator for Printable Games",
    lead:
      "Make number bingo cards for classic games, math practice, seniors, parties, and classroom review activities.",
    accent: "amber",
    sampleLabel: "Number bingo",
    primaryCta: "Create Number Bingo",
    audience: "teachers, activity leaders, senior centers, families, and event hosts",
    intro:
      "Number bingo is familiar, fast to explain, and flexible enough for classic bingo nights or math-focused learning. MyBingoCard lets you create number cards, customize the layout, and print or share the result.",
    sampleSquares: [
      "7",
      "14",
      "22",
      "31",
      "FREE",
      "3",
      "18",
      "26",
      "40",
      "55",
      "9",
      "20",
      "33",
      "48",
      "61",
      "12",
      "29",
      "37",
      "52",
      "68",
      "5",
      "24",
      "44",
      "59",
      "72",
    ],
    benefits: [
      { title: "Familiar rules", description: "Players already understand number bingo, so games start quickly." },
      { title: "Math-friendly", description: "Use numbers, answers, operations, or number recognition practice." },
      { title: "Printable or digital", description: "Prepare paper cards or run a device-based game." },
    ],
    useCases: [
      { title: "Classic bingo nights", description: "Create easy number cards for family nights, senior centers, or community games." },
      { title: "Math review", description: "Use numbers as answers to addition, multiplication, fractions, or mental math prompts." },
      { title: "Kids number recognition", description: "Practice identifying numbers with younger learners." },
    ],
    steps: [
      "Choose the number range or enter your own numbers.",
      "Pick the card size and free space option.",
      "Generate shuffled cards for your players.",
      "Export for free or add free sharing the cards for game time.",
    ],
    ideas: ["1 to 75 bingo", "Multiplication answers", "Addition facts", "Number recognition", "Senior activity games", "Family game night"],
    faqs: [
      {
        question: "Can I make traditional number bingo cards?",
        answer:
          "Yes. You can create number-based bingo cards and print or share them for classic bingo games.",
      },
      {
        question: "Can number bingo help with math practice?",
        answer:
          "Yes. Teachers can call math problems while students mark the matching answer on their cards.",
      },
      {
        question: "Can I make cards for a large group?",
        answer:
          "Yes. Bulk card options help create unique number cards for larger events.",
      },
    ],
    related: ["math-bingo-generator", "printable-bingo-cards", "bingo-card-maker", "custom-bingo-card-maker"],
  },
  "vocabulary-bingo-generator": {
    slug: "vocabulary-bingo-generator",
    metaTitle: "Vocabulary Bingo Generator - Printable Vocab Review Cards",
    metaDescription:
      "Create vocabulary bingo cards for classrooms, ESL, test prep, reading groups, and subject review. Add words, definitions, and clues.",
    eyebrow: "Vocabulary bingo",
    h1: "Vocabulary Bingo Generator for Classroom Review",
    lead:
      "Turn vocabulary lists into bingo cards that help students practice word recognition, definitions, and subject terms.",
    accent: "emerald",
    sampleLabel: "Vocabulary review",
    primaryCta: "Create Vocabulary Bingo",
    audience: "teachers, tutors, homeschool parents, ESL instructors, and reading groups",
    intro:
      "Vocabulary bingo keeps review active. Students listen for definitions, clues, or examples, then mark the matching term on their card. MyBingoCard makes it easy to create printable or online cards from any word list.",
    sampleSquares: [
      "Analyze",
      "Compare",
      "Infer",
      "Theme",
      "FREE",
      "Evidence",
      "Context",
      "Summarize",
      "Predict",
      "Define",
      "Describe",
      "Contrast",
      "Main Idea",
      "Detail",
      "Author",
      "Setting",
      "Character",
      "Plot",
      "Claim",
      "Reason",
      "Cause",
      "Effect",
      "Synonym",
      "Antonym",
      "Review",
    ],
    benefits: [
      { title: "Better than flashcards alone", description: "Students hear clues, scan cards, and actively connect words to meaning." },
      { title: "Any subject works", description: "Use ELA, science, social studies, math, or test-prep vocabulary." },
      { title: "Reusable lesson format", description: "Swap in each unit's words while keeping the same review activity structure." },
    ],
    useCases: [
      { title: "ELA vocabulary", description: "Review reading, writing, and literary terms." },
      { title: "Science terms", description: "Practice biology, chemistry, earth science, or physics vocabulary." },
      { title: "ESL vocabulary", description: "Reinforce English words with definitions, images, or translations." },
    ],
    steps: [
      "Paste in the vocabulary terms.",
      "Decide whether to call words, definitions, or clues.",
      "Generate cards for students.",
      "Export for free or add free sharing cards before review time.",
    ],
    ideas: ["Unit vocabulary", "Definition clues", "Test prep terms", "Science words", "Reading terms", "ESL word lists"],
    faqs: [
      {
        question: "How do you play vocabulary bingo?",
        answer:
          "Put vocabulary words on cards, then call definitions, clues, examples, or the words themselves. Students mark matching squares.",
      },
      {
        question: "Can I make vocabulary cards for any subject?",
        answer:
          "Yes. Any word list can become a vocabulary bingo game.",
      },
      {
        question: "Can students play vocabulary bingo online?",
        answer:
          "Yes. You can add free online card sharing when students are using devices.",
      },
    ],
    related: ["word-bingo-generator", "esl-bingo-generator", "sight-word-bingo-generator", "classroom-bingo"],
  },
  "math-bingo-generator": {
    slug: "math-bingo-generator",
    metaTitle: "Math Bingo Generator - Printable Math Facts Bingo Cards",
    metaDescription:
      "Create math bingo cards for addition, subtraction, multiplication, division, fractions, number recognition, and classroom review.",
    eyebrow: "Math bingo",
    h1: "Math Bingo Generator for Facts and Review Games",
    lead:
      "Make math practice more active with bingo cards for number recognition, operations, fractions, vocabulary, and review.",
    accent: "amber",
    sampleLabel: "Math facts",
    primaryCta: "Create Math Bingo",
    audience: "elementary teachers, math tutors, homeschool families, and intervention groups",
    intro:
      "Math bingo turns practice into a game without losing the learning target. Call problems out loud while students mark answers, or place math terms and examples directly on the card.",
    sampleSquares: [
      "12",
      "24",
      "36",
      "48",
      "FREE",
      "5",
      "10",
      "15",
      "20",
      "25",
      "1/2",
      "3/4",
      "0.25",
      "100",
      "8",
      "16",
      "32",
      "64",
      "9",
      "18",
      "27",
      "45",
      "60",
      "72",
      "90",
    ],
    benefits: [
      { title: "More engaging drills", description: "Students practice facts and answers while playing a familiar game." },
      { title: "Flexible formats", description: "Use answers on the card, problems on the card, or vocabulary terms." },
      { title: "Easy differentiation", description: "Create simpler or harder cards depending on the group." },
    ],
    useCases: [
      { title: "Multiplication bingo", description: "Call problems like 6 x 7 and students mark 42." },
      { title: "Fractions and decimals", description: "Practice equivalents, comparisons, and conversions." },
      { title: "Math vocabulary", description: "Review terms like product, quotient, factor, area, and perimeter." },
    ],
    steps: [
      "Choose the math skill or topic.",
      "Add answers, problems, or terms to the card.",
      "Generate unique cards for the group.",
      "Call problems and have students mark matching answers.",
    ],
    ideas: ["Addition facts", "Multiplication answers", "Fractions", "Decimals", "Geometry terms", "Number recognition"],
    faqs: [
      {
        question: "Can I use math bingo for multiplication practice?",
        answer:
          "Yes. Put products on the card, then call multiplication problems aloud.",
      },
      {
        question: "Can math bingo cards be printed?",
        answer:
          "Yes. Export the finished cards as PDFs for free for classroom use.",
      },
      {
        question: "Can I make easier cards for younger students?",
        answer:
          "Yes. Choose simpler numbers, smaller grids, or a narrower skill focus.",
      },
    ],
    related: ["number-bingo-card-generator", "classroom-bingo", "printable-bingo-cards", "vocabulary-bingo-generator"],
  },
  "sight-word-bingo-generator": {
    slug: "sight-word-bingo-generator",
    metaTitle: "Sight Word Bingo Generator - Printable Reading Practice Cards",
    metaDescription:
      "Create sight word bingo cards for kindergarten, first grade, reading groups, intervention, and homeschool practice. Export for free or add free online play.",
    eyebrow: "Sight word bingo",
    h1: "Sight Word Bingo Generator for Reading Practice",
    lead:
      "Help early readers practice high-frequency words with printable or online sight word bingo cards.",
    accent: "blue",
    sampleLabel: "Early reading",
    primaryCta: "Create Sight Word Bingo",
    audience: "kindergarten teachers, first grade teachers, reading tutors, and homeschool families",
    intro:
      "Sight word bingo gives young readers repeated exposure to important words without turning practice into a worksheet. Add your target list, shuffle cards for the group, and call words as students listen and mark.",
    sampleSquares: [
      "the",
      "and",
      "you",
      "said",
      "FREE",
      "was",
      "for",
      "are",
      "with",
      "his",
      "they",
      "this",
      "have",
      "from",
      "one",
      "were",
      "there",
      "when",
      "what",
      "your",
      "can",
      "all",
      "will",
      "up",
      "out",
    ],
    benefits: [
      { title: "Repeated word recognition", description: "Students see and hear high-frequency words multiple times during play." },
      { title: "Small-group friendly", description: "Use smaller grids for intervention groups or younger learners." },
      { title: "Easy list swaps", description: "Change the word list for each unit, reading level, or assessment cycle." },
    ],
    useCases: [
      { title: "Kindergarten sight words", description: "Practice early high-frequency words with simple cards." },
      { title: "First grade review", description: "Use larger lists and more challenging word sets." },
      { title: "Reading intervention", description: "Create targeted cards for students who need extra repetition." },
    ],
    steps: [
      "Add the sight words your students are practicing.",
      "Choose a grid size that matches the group.",
      "Export for free or add free sharing unique cards.",
      "Call words and have students mark what they recognize.",
    ],
    ideas: ["Dolch words", "Fry words", "Kindergarten words", "First grade words", "Small group review", "Homeschool reading practice"],
    faqs: [
      {
        question: "Can I choose my own sight words?",
        answer:
          "Yes. Enter any sight word list you use in your classroom or homeschool plan.",
      },
      {
        question: "What grid size works for sight word bingo?",
        answer:
          "A 3x3 grid works well for younger students. Older or more advanced readers can use 4x4 or 5x5 cards.",
      },
      {
        question: "Can I print sight word bingo cards?",
        answer:
          "Yes. You can create printable PDFs for free for classroom centers, reading groups, or take-home practice.",
      },
    ],
    related: ["word-bingo-generator", "vocabulary-bingo-generator", "classroom-bingo", "esl-bingo-generator"],
  },
  "esl-bingo-generator": {
    slug: "esl-bingo-generator",
    metaTitle: "ESL Bingo Generator - Printable English Vocabulary Cards",
    metaDescription:
      "Create ESL bingo cards for English vocabulary, speaking practice, listening games, picture bingo, and classroom review. Export for free or add free online play.",
    eyebrow: "ESL bingo",
    h1: "ESL Bingo Generator for English Vocabulary Practice",
    lead:
      "Create English-learning bingo cards for vocabulary, listening, speaking prompts, picture bingo, and classroom review.",
    accent: "emerald",
    sampleLabel: "ESL vocabulary",
    primaryCta: "Create ESL Bingo",
    audience: "ESL teachers, language tutors, adult education programs, and homeschool families",
    intro:
      "ESL bingo helps learners connect spoken English, written words, images, and meaning. Use it for vocabulary review, listening practice, conversation prompts, or picture-based games for beginner students.",
    sampleSquares: [
      "Apple",
      "Market",
      "Family",
      "Weather",
      "FREE",
      "Travel",
      "Food",
      "School",
      "Work",
      "Home",
      "Question",
      "Answer",
      "Listen",
      "Speak",
      "Read",
      "Write",
      "Colors",
      "Numbers",
      "Clothes",
      "Directions",
      "Time",
      "Money",
      "Health",
      "Places",
      "Bingo",
    ],
    benefits: [
      { title: "Supports listening practice", description: "Call clues or words aloud while students identify matching squares." },
      { title: "Works with pictures", description: "Use image bingo for beginners who need visual support." },
      { title: "Easy topic changes", description: "Create cards for food, jobs, directions, weather, travel, school, or daily routines." },
    ],
    useCases: [
      { title: "Beginner vocabulary", description: "Use simple words, pictures, and clear categories." },
      { title: "Conversation prompts", description: "Put questions or speaking tasks in the squares." },
      { title: "Listening review", description: "Call definitions, descriptions, or translations." },
    ],
    steps: [
      "Choose the ESL topic or vocabulary set.",
      "Add words, images, or speaking prompts.",
      "Generate cards for students.",
      "Call words or clues and let students mark answers.",
    ],
    ideas: ["Food vocabulary", "Directions", "Jobs", "Weather words", "Conversation questions", "Picture bingo"],
    faqs: [
      {
        question: "Can ESL bingo use images?",
        answer:
          "Yes. Image bingo is useful for beginners and visual vocabulary practice.",
      },
      {
        question: "Can I make ESL bingo cards for adults?",
        answer:
          "Yes. Use practical topics like work, health, money, transportation, and daily routines.",
      },
      {
        question: "Can ESL bingo be played online?",
        answer:
          "Yes. You can share digital cards or export PDFs for free for remote or in-person lessons.",
      },
    ],
    related: ["image-bingo-card-generator", "vocabulary-bingo-generator", "word-bingo-generator", "sight-word-bingo-generator"],
  },
  "multiplication-bingo-cards": makeLongTailPage({
    slug: "multiplication-bingo-cards",
    metaTitle: "Multiplication Bingo Cards - Printable Math Facts Game",
    metaDescription:
      "Create multiplication bingo cards for classroom math facts practice. Use ready products, then export PDFs for free or add free online play with unique cards.",
    eyebrow: "Multiplication bingo",
    h1: "Multiplication Bingo Cards for Math Facts Practice",
    lead:
      "Turn multiplication tables into a fast classroom review game where students solve facts and mark the matching products.",
    accent: "amber",
    sampleLabel: "Multiplication facts",
    primaryCta: "Use Multiplication List",
    audience: "elementary teachers, tutors, intervention groups, and homeschool families",
    intro:
      "Multiplication bingo works best when the card contains answers and the caller reads the problems aloud. Students practice recall, scan for products, and stay engaged longer than they would with another worksheet.",
    sampleSquares: ["6", "8", "9", "10", "FREE", "12", "14", "15", "16", "18", "20", "21", "24", "25", "27", "28", "30", "32", "35", "36", "40", "42", "45", "48", "56"],
    ideas: ["64", "72", "81", "90", "96", "108"],
    useCases: [
      { title: "Times table review", description: "Call facts like 7 x 8 while students mark products on their cards." },
      { title: "Small-group intervention", description: "Use a smaller grid or narrower fact set for students who need targeted practice." },
      { title: "Class warmup", description: "Run a quick round before a lesson to refresh multiplication fluency." },
    ],
    related: ["math-bingo-generator", "number-bingo-card-generator", "vocabulary-bingo-generator", "sight-word-bingo-generator"],
  }),
  "periodic-table-bingo": makeLongTailPage({
    slug: "periodic-table-bingo",
    metaTitle: "Periodic Table Bingo - Printable Chemistry Review Cards",
    metaDescription:
      "Make periodic table bingo cards for chemistry classes. Review elements, symbols, groups, and properties with printable or online cards.",
    eyebrow: "Periodic table bingo",
    h1: "Periodic Table Bingo for Chemistry Review",
    lead:
      "Help students practice element names, symbols, groups, and properties with a science bingo game built for chemistry review.",
    accent: "emerald",
    sampleLabel: "Chemistry review",
    primaryCta: "Use Periodic Table List",
    audience: "science teachers, chemistry tutors, homeschool families, and review groups",
    intro:
      "Periodic table bingo gives students repeated exposure to element names and symbols while keeping review active. Call the symbol, atomic number, group, or clue and have students mark the matching square.",
    sampleSquares: ["Hydrogen", "Helium", "Lithium", "Carbon", "FREE", "Nitrogen", "Oxygen", "Sodium", "Magnesium", "Aluminum", "Silicon", "Phosphorus", "Sulfur", "Chlorine", "Argon", "Potassium", "Calcium", "Iron", "Copper", "Zinc", "Silver", "Gold", "Mercury", "Lead", "Uranium"],
    ideas: ["Noble gases", "Halogens", "Alkali metals", "Atomic number", "Element symbols", "Period trends"],
    useCases: [
      { title: "Element symbol review", description: "Call symbols like Fe or Au and have students mark the element name." },
      { title: "Group practice", description: "Review families such as noble gases, halogens, and alkali metals." },
      { title: "Test prep", description: "Mix element facts, symbols, and properties before a quiz or unit exam." },
    ],
    related: ["vocabulary-bingo-generator", "math-bingo-generator", "word-bingo-generator", "esl-bingo-generator"],
  }),
  "state-capitals-bingo": makeLongTailPage({
    slug: "state-capitals-bingo",
    metaTitle: "State Capitals Bingo - Printable Social Studies Review",
    metaDescription:
      "Create state capitals bingo cards for geography and social studies review. Use ready capital names, then export cards for free or add free online play.",
    eyebrow: "State capitals bingo",
    h1: "State Capitals Bingo for Geography Review",
    lead:
      "Make U.S. state capitals practice more active with printable or online bingo cards students can use during review.",
    accent: "blue",
    sampleLabel: "Capital city review",
    primaryCta: "Use State Capitals List",
    audience: "social studies teachers, geography tutors, homeschool families, and review groups",
    intro:
      "State capitals bingo lets students listen for state names, clues, or regions and mark the matching capital city. It is useful for whole-class review, centers, and end-of-unit games.",
    sampleSquares: ["Phoenix", "Denver", "Austin", "Boston", "FREE", "Atlanta", "Albany", "Sacramento", "Tallahassee", "Honolulu", "Boise", "Springfield", "Indianapolis", "Des Moines", "Topeka", "Frankfort", "Baton Rouge", "Augusta", "Annapolis", "Lansing", "Saint Paul", "Jackson", "Jefferson City", "Helena", "Lincoln"],
    ideas: ["Raleigh", "Bismarck", "Columbus", "Salem", "Harrisburg", "Providence"],
    useCases: [
      { title: "State-to-capital recall", description: "Call a state and have students mark the matching capital city." },
      { title: "Regional review", description: "Use clues like Southwest or New England to reinforce geography context." },
      { title: "Fast quiz prep", description: "Run a short review game before a state capitals quiz." },
    ],
    related: ["vocabulary-bingo-generator", "word-bingo-generator", "classroom-bingo", "sight-word-bingo-generator"],
  }),
  "back-to-school-bingo": makeLongTailPage({
    slug: "back-to-school-bingo",
    metaTitle: "Back-to-School Bingo - Printable First Day Icebreaker",
    metaDescription:
      "Create back-to-school bingo cards for first-day introductions, classroom routines, and student icebreakers. Export for free or add free online play.",
    eyebrow: "Back-to-school bingo",
    h1: "Back-to-School Bingo for First Day Icebreakers",
    lead:
      "Start the school year with a simple bingo activity that helps students learn names, routines, and classroom expectations.",
    accent: "indigo",
    sampleLabel: "First day icebreaker",
    primaryCta: "Use Back-to-School List",
    audience: "teachers, counselors, homeschool groups, and youth leaders",
    intro:
      "Back-to-school bingo gives students a low-pressure way to move, talk, and settle into the classroom. Use it for introductions, routine practice, or a first-week brain break.",
    sampleSquares: ["Finds the pencil sharpener", "Has a pet", "Read this summer", "Knows the schedule", "FREE", "Likes science", "Plays a sport", "Has a sibling", "Loves art", "Took the bus", "New to school", "Knows class rule", "Has blue backpack", "Likes math", "Favorite book", "Born in summer", "Can name teacher", "Has locker", "Likes recess", "Knows lunch time", "Met a new friend", "Has same hobby", "Knows fire drill", "Likes music", "Ready to learn"],
    ideas: ["Classroom tour", "Student names", "Morning routine", "Supply check", "New friend", "Favorite subject"],
    useCases: [
      { title: "First day introductions", description: "Help students talk to classmates without a formal presentation." },
      { title: "Classroom routine review", description: "Turn procedures and locations into a quick scavenger-style bingo game." },
      { title: "First-week reset", description: "Use the card as a brain break while reinforcing expectations." },
    ],
    related: ["icebreaker-bingo", "sight-word-bingo-generator", "vocabulary-bingo-generator", "esl-bingo-generator"],
  }),
  "end-of-year-bingo": makeLongTailPage({
    slug: "end-of-year-bingo",
    metaTitle: "End-of-Year Bingo - Printable Classroom Memory Game",
    metaDescription:
      "Create end-of-year bingo cards for classroom memories, awards days, field days, and last-week activities. Export for free or add free online play.",
    eyebrow: "End-of-year bingo",
    h1: "End-of-Year Bingo for Classroom Celebrations",
    lead:
      "Wrap up the school year with bingo cards built around memories, class moments, student favorites, and last-week activities.",
    accent: "rose",
    sampleLabel: "Last week of school",
    primaryCta: "Use End-of-Year List",
    audience: "teachers, class parents, counselors, and homeschool groups",
    intro:
      "End-of-year bingo is an easy activity for the final week of school. It works for memory sharing, classroom celebrations, field day downtime, and low-prep review.",
    sampleSquares: ["Favorite field trip", "Class joke", "Best project", "Awards day", "FREE", "Yearbook signed", "Field day", "Lost pencil", "Class photo", "Favorite book", "Desk cleanout", "Summer plans", "Teacher thank-you", "Last quiz", "Music day", "Lunch memory", "New friend", "Favorite lesson", "Packed backpack", "Class party", "Game day", "Library return", "Locker cleanout", "Final bell", "Goodbye hug"],
    ideas: ["Memory share", "Student awards", "Field day", "Summer goals", "Class playlist", "Photo booth"],
    useCases: [
      { title: "Class memory game", description: "Use squares based on projects, trips, jokes, and shared moments." },
      { title: "Last-week activity", description: "Keep students engaged during schedule gaps and cleanout days." },
      { title: "Promotion celebration", description: "Adapt the squares for grade-level promotions or moving-up ceremonies." },
    ],
    related: ["back-to-school-bingo", "graduation-ceremony-bingo", "vocabulary-bingo-generator", "word-bingo-generator"],
  }),
  "wedding-reception-bingo": makeLongTailPage({
    slug: "wedding-reception-bingo",
    metaTitle: "Wedding Reception Bingo - Printable Guest Game Cards",
    metaDescription:
      "Create wedding reception bingo cards with guest-friendly moments for cocktail hour, speeches, dancing, and dinner. Export for free or add free online sharing.",
    eyebrow: "Wedding reception bingo",
    h1: "Wedding Reception Bingo Cards for Guests",
    lead:
      "Give guests a simple reception game they can play during cocktail hour, dinner, speeches, and dancing.",
    accent: "rose",
    sampleLabel: "Reception moments",
    primaryCta: "Use Reception List",
    audience: "couples, wedding planners, DJs, coordinators, and shower hosts",
    intro:
      "Wedding reception bingo works because guests already notice the moments on the card. Place exported cards at seats, show a QR code with free links for online play, or use the game as a quiet icebreaker between events.",
    sampleSquares: ["First dance", "Best man toast", "Happy tears", "Bouquet toss", "FREE", "Photo booth", "Cake cutting", "DJ shoutout", "Table cheers", "Kids dancing", "Bride laughs", "Groom smiles", "Guest selfie", "Clinking glasses", "Signature drink", "Dance circle", "Parent dance", "Late-night snack", "Shoe change", "Group photo", "Song request", "Sparkler sendoff", "Guestbook signed", "Dessert table", "Last dance"],
    ideas: ["Cocktail hour", "Dinner speeches", "Reception photos", "Dance floor", "Guestbook", "Sendoff moment"],
    useCases: [
      { title: "Table game", description: "Put a card at each seat so guests can play without interrupting the reception flow." },
      { title: "Cocktail hour icebreaker", description: "Use moments guests can spot while mingling before dinner." },
      { title: "Online QR play", description: "Show a join code or QR sheet so guests can play from their phones." },
    ],
    related: ["custom-bingo-card-maker", "baby-shower-gift-bingo", "bridal-shower-gift-bingo", "online-bingo-card-generator"],
  }),
  "bridal-shower-gift-bingo": makeLongTailPage({
    slug: "bridal-shower-gift-bingo",
    metaTitle: "Bridal Shower Gift Bingo - Printable Shower Game Cards",
    metaDescription:
      "Make bridal shower gift bingo cards for registry gifts, guest predictions, and present opening. Export unique cards for free or add free online play.",
    eyebrow: "Bridal shower gift bingo",
    h1: "Bridal Shower Gift Bingo Cards",
    lead:
      "Turn the gift-opening part of a bridal shower into an easy guest game with printable or online bingo cards.",
    accent: "rose",
    sampleLabel: "Shower gifts",
    primaryCta: "Use Bridal Gift List",
    audience: "maids of honor, bridesmaids, family hosts, and party planners",
    intro:
      "Bridal shower gift bingo keeps guests engaged while gifts are opened. Start with common registry items, add personal details, and create unique cards for each guest.",
    sampleSquares: ["Towels", "Cookware", "Wine glasses", "Picture frame", "FREE", "Sheet set", "Candles", "Serving tray", "Coffee maker", "Cutting board", "Mixing bowls", "Throw blanket", "Cookbook", "Gift card", "Vase", "Measuring cups", "Bath robe", "Dinner plates", "Kitchen tools", "Champagne flutes", "Luggage tags", "Decor pillow", "Dutch oven", "Apron", "Thank-you card"],
    ideas: ["Registry gifts", "Kitchen items", "Home decor", "Honeymoon fund", "Gift cards", "Host prizes"],
    useCases: [
      { title: "Gift-opening game", description: "Guests mark a square when the bride opens a matching item." },
      { title: "Registry-themed cards", description: "Use real registry categories so the game feels personal." },
      { title: "Shower table activity", description: "Place cards at seats with pens before the gifts begin." },
    ],
    related: ["wedding-reception-bingo", "baby-shower-gift-bingo", "custom-bingo-card-maker", "printable-bingo-cards"],
  }),
  "baby-shower-gift-bingo": makeLongTailPage({
    slug: "baby-shower-gift-bingo",
    metaTitle: "Baby Shower Gift Bingo - Printable Gift Opening Cards",
    metaDescription:
      "Create baby shower gift bingo cards with common registry gifts and baby items. Export unique cards for free or add free online sharing for guests.",
    eyebrow: "Baby shower gift bingo",
    h1: "Baby Shower Gift Bingo Cards",
    lead:
      "Keep guests involved during gift opening with bingo cards filled with common baby gifts and registry items.",
    accent: "blue",
    sampleLabel: "Baby gifts",
    primaryCta: "Use Baby Gift List",
    audience: "baby shower hosts, parents, family members, and party planners",
    intro:
      "Baby shower gift bingo is one of the easiest shower games to run. Guests mark squares as gifts are opened, and every shuffled card has a different layout.",
    sampleSquares: ["Diapers", "Wipes", "Onesies", "Pacifiers", "FREE", "Baby blanket", "Bottle set", "Burp cloths", "Stroller", "Car seat", "Baby monitor", "Swaddle", "Teether", "Board books", "Bath towel", "Diaper bag", "Crib sheet", "Baby socks", "High chair", "Plush toy", "Sound machine", "Nursing pillow", "Thermometer", "Bibs", "Gift card"],
    ideas: ["Registry gifts", "Diaper raffle", "Gift opening", "Baby gear", "Nursery items", "Parent favorites"],
    useCases: [
      { title: "Gift-opening bingo", description: "Guests mark squares as matching gifts are opened." },
      { title: "Registry shower", description: "Use registry categories to make the cards more accurate." },
      { title: "Hybrid shower", description: "Export cards or add free online card sharing for in-person and remote guests." },
    ],
    related: ["baby-prediction-bingo", "bridal-shower-gift-bingo", "custom-bingo-card-maker", "printable-bingo-cards"],
  }),
  "baby-prediction-bingo": makeLongTailPage({
    slug: "baby-prediction-bingo",
    metaTitle: "Baby Prediction Bingo - Printable Shower Prediction Game",
    metaDescription:
      "Create baby prediction bingo cards for due date, name, traits, milestones, and parent guesses. Export for free or add free online sharing.",
    eyebrow: "Baby prediction bingo",
    h1: "Baby Prediction Bingo Cards",
    lead:
      "Make a baby shower prediction game with bingo squares for names, dates, traits, milestones, and parent guesses.",
    accent: "rose",
    sampleLabel: "Baby predictions",
    primaryCta: "Use Prediction List",
    audience: "baby shower hosts, parents-to-be, family members, and party planners",
    intro:
      "Baby prediction bingo turns guest guesses into a keepsake-friendly shower activity. Use fun but gentle predictions and let guests mark the squares they believe will come true.",
    sampleSquares: ["Born early", "Born on due date", "Over 7 pounds", "Has mom's eyes", "FREE", "Has dad's smile", "Sleeps well", "Loves music", "First word dada", "First word mama", "Lots of hair", "Tiny toes", "Calm baby", "Night owl", "Early walker", "Loves bath time", "Favorite blanket", "Grandma's laugh", "Dad's dimples", "Mom's nose", "Big appetite", "Animal lover", "Book lover", "Smiles early", "Family name"],
    ideas: ["Due date guesses", "Baby traits", "Name guesses", "First words", "Milestones", "Keepsake cards"],
    useCases: [
      { title: "Prediction table game", description: "Guests mark guesses during the shower and compare later." },
      { title: "Keepsake activity", description: "Save cards for parents as a record of guest predictions." },
      { title: "Name bingo", description: "Adapt the list into potential baby names or initials." },
    ],
    related: ["baby-shower-gift-bingo", "custom-bingo-card-maker", "word-bingo-generator", "printable-bingo-cards"],
  }),
  "office-meeting-bingo": makeLongTailPage({
    slug: "office-meeting-bingo",
    metaTitle: "Office Meeting Bingo - Work Meeting Bingo Card Generator",
    metaDescription:
      "Create office meeting bingo cards for team calls, all-hands, standups, and remote meetings. Export for free or add free browser links.",
    eyebrow: "Office meeting bingo",
    h1: "Office Meeting Bingo Cards for Work Calls",
    lead:
      "Make recurring meetings more interactive with clean, workplace-safe bingo cards for team calls, all-hands, and standups.",
    accent: "indigo",
    sampleLabel: "Meeting moments",
    primaryCta: "Use Meeting List",
    audience: "team leads, HR teams, managers, trainers, and remote teams",
    intro:
      "Office meeting bingo works best when it is light, respectful, and specific to the meeting format. Use it for remote calls, all-hands, kickoff meetings, or team-building breaks.",
    sampleSquares: ["You're on mute", "Action item", "Quick sync", "Can you see my screen", "FREE", "Follow up", "Circle back", "Parking lot", "Great question", "Next slide", "Bandwidth", "Timeline", "Stakeholder", "Roadmap", "Metrics", "Deep dive", "Wins shared", "Blocker named", "Camera off", "Chat reaction", "Deadline moved", "Budget mention", "New priority", "Decision made", "Meeting ends early"],
    ideas: ["All-hands", "Standup", "Remote call", "Leadership update", "Project kickoff", "Weekly sync"],
    useCases: [
      { title: "Remote meeting game", description: "Share online cards with free links so teammates can play during a video call." },
      { title: "All-hands engagement", description: "Use company-safe squares that keep attention without disrupting the meeting." },
      { title: "Team-building break", description: "Run a short round before or after the main agenda." },
    ],
    related: ["remote-meeting-bingo", "team-building-bingo", "onboarding-bingo", "online-bingo-card-generator"],
  }),
  "onboarding-bingo": makeLongTailPage({
    slug: "onboarding-bingo",
    metaTitle: "Onboarding Bingo - New Hire Icebreaker Card Generator",
    metaDescription:
      "Create onboarding bingo cards for new hires, orientation, HR training, and team introductions. Export for free or add free online sharing.",
    eyebrow: "Onboarding bingo",
    h1: "Onboarding Bingo for New Hire Icebreakers",
    lead:
      "Help new hires learn people, tools, routines, and company language with a simple onboarding bingo activity.",
    accent: "emerald",
    sampleLabel: "New hire onboarding",
    primaryCta: "Use Onboarding List",
    audience: "HR teams, people ops, trainers, managers, and team leads",
    intro:
      "Onboarding bingo turns orientation into a more active experience. New hires can mark squares as they meet teammates, learn tools, complete tasks, and hear key company terms.",
    sampleSquares: ["Meets manager", "Sets up email", "Joins Slack", "Finds handbook", "FREE", "Learns values", "Intro call", "Benefits overview", "Security training", "Team lunch", "Tool login", "First ticket", "Buddy meeting", "Office tour", "Remote setup", "Calendar sync", "Org chart", "Product demo", "Asks question", "Shares fun fact", "First standup", "IT help", "Payroll setup", "Customer story", "Week-one win"],
    ideas: ["Orientation", "New hire buddy", "Tool setup", "Company values", "HR training", "Team introductions"],
    useCases: [
      { title: "New hire orientation", description: "Give employees a friendly checklist-style game for the first week." },
      { title: "Team introductions", description: "Encourage new hires to meet teammates and learn roles." },
      { title: "Training completion", description: "Turn required setup tasks into a visible progress activity." },
    ],
    related: ["training-bingo", "office-meeting-bingo", "icebreaker-bingo", "custom-bingo-card-maker"],
  }),
  "training-bingo": makeLongTailPage({
    slug: "training-bingo",
    metaTitle: "Training Bingo - Workshop and Employee Training Cards",
    metaDescription:
      "Create training bingo cards for workshops, employee training, safety sessions, and classroom review. Export for free or add free online play.",
    eyebrow: "Training bingo",
    h1: "Training Bingo Cards for Workshops and Lessons",
    lead:
      "Turn key training terms, agenda items, and learning checks into a bingo activity participants can follow during a session.",
    accent: "blue",
    sampleLabel: "Training session",
    primaryCta: "Use Training List",
    audience: "trainers, HR teams, teachers, facilitators, and workshop hosts",
    intro:
      "Training bingo keeps participants listening for important terms and examples. It works for employee training, safety refreshers, workshops, continuing education, and classroom review.",
    sampleSquares: ["Learning objective", "Key takeaway", "Case study", "Group activity", "FREE", "Breakout room", "Safety tip", "Best practice", "Policy update", "Hands-on demo", "Quiz question", "Role play", "Action plan", "Resource link", "Feedback form", "Scenario", "Checklist", "Common mistake", "Example shared", "Question asked", "Next step", "Worksheet", "Certificate", "Recap", "Follow-up task"],
    ideas: ["Safety training", "Sales training", "Workshop agenda", "Compliance session", "Teacher PD", "Customer support training"],
    useCases: [
      { title: "Employee training", description: "Use terms and scenarios from the session to reinforce attention." },
      { title: "Workshop engagement", description: "Give participants a quiet activity that follows the agenda." },
      { title: "Safety refreshers", description: "Make required reminders more interactive without changing the core material." },
    ],
    related: ["onboarding-bingo", "conference-bingo", "office-meeting-bingo", "vocabulary-bingo-generator"],
  }),
  "conference-bingo": makeLongTailPage({
    slug: "conference-bingo",
    metaTitle: "Conference Bingo - Printable Networking and Event Cards",
    metaDescription:
      "Create conference bingo cards for networking, sessions, trade shows, and attendee engagement. Export for free or add free QR play.",
    eyebrow: "Conference bingo",
    h1: "Conference Bingo Cards for Networking and Sessions",
    lead:
      "Give attendees a lightweight conference game for networking, session engagement, sponsor booths, and event moments.",
    accent: "indigo",
    sampleLabel: "Conference event",
    primaryCta: "Use Conference List",
    audience: "event planners, conference organizers, sponsors, HR teams, and facilitators",
    intro:
      "Conference bingo helps attendees notice sessions, meet people, visit booths, and stay engaged between agenda items. Use printable cards for free or free online play with a QR code.",
    sampleSquares: ["Keynote quote", "Sponsor booth", "New connection", "Panel question", "FREE", "Coffee line", "Badge scan", "Breakout session", "Swag item", "Business card", "LinkedIn add", "Workshop note", "Product demo", "Industry buzzword", "Q&A moment", "Photo wall", "Lunch table", "Session app", "Hallway chat", "Exhibitor map", "Prize drawing", "Speaker selfie", "Roundtable", "Closing remarks", "Follow-up email"],
    ideas: ["Networking", "Trade show", "Sponsor booths", "Session notes", "Attendee challenge", "Event app"],
    useCases: [
      { title: "Networking challenge", description: "Prompt attendees to meet people and visit specific event areas." },
      { title: "Session engagement", description: "Use agenda terms and speaker moments to keep attendees listening." },
      { title: "Sponsor activation", description: "Include booth visits, demos, or QR scans as card squares." },
    ],
    related: ["training-bingo", "icebreaker-bingo", "online-bingo-card-generator", "custom-bingo-card-maker"],
  }),
  "remote-meeting-bingo": makeLongTailPage({
    slug: "remote-meeting-bingo",
    metaTitle: "Remote Meeting Bingo - Online Work Call Bingo Cards",
    metaDescription:
      "Create remote meeting bingo cards for Zoom, Teams, Google Meet, and distributed teams. Add free online card sharing with no app required.",
    eyebrow: "Remote meeting bingo",
    h1: "Remote Meeting Bingo for Online Work Calls",
    lead:
      "Create browser-based bingo cards for remote teams, virtual meetings, training calls, and distributed team-building.",
    accent: "emerald",
    sampleLabel: "Remote call",
    primaryCta: "Use Remote Meeting List",
    audience: "remote teams, managers, HR teams, trainers, and facilitators",
    intro:
      "Remote meeting bingo is easiest when players can join from a link. MyBingoCard lets you build the card, then share it online with free links so players can mark squares from their own browser.",
    sampleSquares: ["Muted mic", "Camera off", "Pet appears", "Screen share", "FREE", "Can you hear me", "Lag moment", "Chat emoji", "Virtual background", "Calendar conflict", "Hard stop", "Link dropped", "Quick poll", "Reaction button", "Side conversation", "Keyboard noise", "Doorbell rings", "Someone waves", "Next slide", "Follow-up doc", "Action item", "Time zone mention", "Breakout room", "Recording starts", "Meeting ends early"],
    ideas: ["Zoom bingo", "Teams call", "Virtual training", "Distributed team", "Online icebreaker", "No app required"],
    useCases: [
      { title: "Virtual team building", description: "Share a card link before a team call or social hour." },
      { title: "Remote training", description: "Keep participants engaged during longer online sessions." },
      { title: "Hybrid events", description: "Use online cards with free links for remote players and exported cards for people in the room." },
    ],
    related: ["online-bingo-card-generator", "office-meeting-bingo", "team-building-bingo", "icebreaker-bingo"],
  }),
  "christmas-party-bingo": makeLongTailPage({
    slug: "christmas-party-bingo",
    metaTitle: "Christmas Party Bingo - Printable Holiday Party Cards",
    metaDescription:
      "Create Christmas party bingo cards for family gatherings, office parties, classrooms, and holiday events. Export for free or add free online play.",
    eyebrow: "Christmas party bingo",
    h1: "Christmas Party Bingo Cards for Holiday Events",
    lead:
      "Make holiday parties easier to host with bingo cards full of Christmas moments, songs, treats, decorations, and party prompts.",
    accent: "rose",
    sampleLabel: "Holiday party",
    primaryCta: "Use Christmas List",
    audience: "party hosts, teachers, HR teams, families, and activity directors",
    intro:
      "Christmas party bingo works for classrooms, family gatherings, office parties, senior centers, and community events. Export cards or add free online card sharing for tables and remote guests.",
    sampleSquares: ["Ugly sweater", "Hot cocoa", "Candy cane", "Gift exchange", "FREE", "Christmas music", "Cookie tray", "Santa hat", "Snowflake decor", "Holiday movie", "Secret Santa", "Ornament", "Jingle bells", "Reindeer", "Photo booth", "Tree lights", "Wrapping paper", "Gingerbread", "Festive socks", "Carol singing", "Mistletoe", "Holiday toast", "Red ribbon", "Family photo", "Stocking"],
    ideas: ["Office holiday party", "Classroom party", "Family gathering", "Cookie exchange", "Secret Santa", "Christmas movie night"],
    useCases: [
      { title: "Office holiday party", description: "Use clean, festive prompts for team events and year-end gatherings." },
      { title: "Classroom celebration", description: "Keep squares simple and kid-friendly for a low-prep class activity." },
      { title: "Family game night", description: "Print shuffled cards for guests across ages." },
    ],
    related: ["printable-bingo-cards", "custom-bingo-card-maker", "word-bingo-generator", "online-bingo-card-generator"],
  }),
};

export const seoLandingPageSlugs = Object.keys(seoLandingPages);

export function getSeoLandingPage(slug: string): SeoLandingPageData {
  const page = seoLandingPages[slug];
  if (!page) {
    throw new Error(`Unknown SEO landing page: ${slug}`);
  }
  return page;
}

export function createSeoLandingMetadata(page: SeoLandingPageData): Metadata {
  return {
    title: page.metaTitle,
    description: page.metaDescription,
    alternates: {
      canonical: `https://mybingocard.com/${page.slug}`,
    },
    openGraph: {
      title: page.metaTitle,
      description: page.metaDescription,
      url: `https://mybingocard.com/${page.slug}`,
      siteName: "MyBingoCard",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: page.metaTitle,
      description: page.metaDescription,
    },
  };
}
