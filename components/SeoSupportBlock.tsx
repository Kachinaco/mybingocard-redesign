type SeoSupportContent = {
  label: string;
  audience: string;
  setting: string;
  examples: string[];
  tip: string;
  related: string;
};

const supportContent: Record<string, SeoSupportContent> = {
  features: {
    label: "MyBingoCard features",
    audience: "teachers, hosts, event planners, team leads, and families",
    setting: "printable cards, online games, shared links, and live browser-based play",
    examples: ["custom square lists", "PDF exports", "mobile play links", "template starting points"],
    tip: "Start with the format your players will actually use, then choose styling and exports after the card content feels right.",
    related: "the card maker, templates, pricing, printable cards, and online bingo generator pages",
  },
  supplies: {
    label: "bingo supplies",
    audience: "party hosts, activity directors, classroom teachers, senior centers, and family game organizers",
    setting: "in-person bingo games where printed cards, markers, calling tools, and simple prizes make play easier",
    examples: ["daubers", "chips", "card holders", "small winner prizes"],
    tip: "Match the supplies to the group: kids usually need washable markers, seniors benefit from large-print cards, and parties work best with lightweight prizes.",
    related: "printable bingo cards, party bingo, classroom bingo, and holiday bingo ideas",
  },
  about: {
    label: "MyBingoCard",
    audience: "people who need quick custom bingo cards without spreadsheet formatting or design software",
    setting: "classrooms, showers, weddings, work events, holidays, fundraisers, and family gatherings",
    examples: ["included templates", "custom text squares", "image cards", "paid online sharing"],
    tip: "The product is designed around a simple workflow: choose an idea, customize the squares, then print or share the finished card.",
    related: "the template library, card creator, pricing page, and bingo idea guides",
  },
  contact: {
    label: "MyBingoCard support",
    audience: "creators who need help with accounts, exports, billing, live games, or custom card setup",
    setting: "support questions before an event, classroom activity, subscription change, or large batch export",
    examples: ["PDF export issues", "premium plan questions", "live game setup", "template feedback"],
    tip: "Include the card title, account email, browser, device, and what you were trying to do so support can reproduce the issue quickly.",
    related: "pricing, settings, the card editor, live game tools, and the template pages",
  },
  blog: {
    label: "bingo card guides",
    audience: "hosts, teachers, parents, coordinators, and team leaders looking for practical game ideas",
    setting: "planning a specific event and needing square ideas, setup tips, print guidance, or online play options",
    examples: ["baby shower gift bingo", "wedding reception bingo", "classroom review games", "holiday party cards"],
    tip: "Use the guides to choose the game format first, then open the card maker with a focused list of prompts.",
    related: "occasion pages, printable card guides, online play tips, and the template library",
  },
  "wedding-bingo": {
    label: "wedding bingo",
    audience: "couples, planners, wedding parties, and reception hosts",
    setting: "cocktail hours, dinner tables, reception games, and guest icebreakers",
    examples: ["first dance", "toast moment", "photo booth", "guest from out of town"],
    tip: "Mix predictable reception moments with personal details so guests can play naturally without interrupting the schedule.",
    related: "bridal shower bingo, wedding reception bingo, and bridal shower gift bingo",
  },
  "baby-shower-bingo": {
    label: "baby shower bingo",
    audience: "shower hosts, parents-to-be, relatives, and friend groups",
    setting: "gift opening, prediction games, table activities, and casual shower icebreakers",
    examples: ["tiny socks", "diapers", "storybook", "baby blanket"],
    tip: "Use a mix of common gifts and family-specific prompts so the game stays easy for guests who do not know every registry item.",
    related: "baby shower gift bingo, baby prediction bingo, and printable bingo cards",
  },
  "classroom-bingo": {
    label: "classroom bingo",
    audience: "teachers, tutors, homeschool parents, and activity coordinators",
    setting: "review lessons, vocabulary practice, first-day activities, centers, and end-of-unit games",
    examples: ["vocabulary word", "math fact", "science term", "classmate clue"],
    tip: "Keep square wording short enough for students to scan quickly, especially when you are using the game for review or assessment.",
    related: "vocabulary bingo, sight word bingo, math bingo, and back-to-school bingo",
  },
  "party-bingo": {
    label: "party bingo",
    audience: "birthday hosts, families, friends, and casual event organizers",
    setting: "game nights, birthdays, reunions, holiday parties, and mixed-age gatherings",
    examples: ["someone dances", "group photo", "snack refill", "funny story"],
    tip: "Choose squares people can notice during the party instead of tasks that force guests to stop socializing.",
    related: "birthday bingo, icebreaker bingo, music bingo, and movie bingo",
  },
  "office-party-bingo": {
    label: "office party bingo",
    audience: "HR teams, managers, culture committees, and team leads",
    setting: "holiday parties, offsites, lunch events, team celebrations, and casual workplace mixers",
    examples: ["mentions Q4", "team photo", "awkward toast", "someone talks about snacks"],
    tip: "Keep prompts friendly and inclusive, especially when the event includes new employees or cross-functional teams.",
    related: "team-building bingo, office meeting bingo, onboarding bingo, and remote meeting bingo",
  },
  "birthday-bingo": {
    label: "birthday bingo",
    audience: "parents, friends, family members, and party hosts",
    setting: "kids parties, milestone birthdays, family dinners, and casual celebrations",
    examples: ["candles blown", "birthday song", "present opened", "cake photo"],
    tip: "For mixed-age parties, make the squares visual and simple so younger players and grandparents can follow along.",
    related: "party bingo, family reunion bingo, music bingo, and holiday bingo",
  },
  "halloween-bingo": {
    label: "Halloween bingo",
    audience: "families, teachers, party hosts, and neighborhood groups",
    setting: "class parties, costume contests, trunk-or-treat events, and October game nights",
    examples: ["witch hat", "pumpkin", "spider web", "candy corn"],
    tip: "Balance spooky prompts with kid-friendly squares when the game is for classrooms or family events.",
    related: "holiday bingo, Thanksgiving bingo, Christmas party bingo, and classroom bingo",
  },
  "thanksgiving-bingo": {
    label: "Thanksgiving bingo",
    audience: "families, teachers, hosts, and community groups",
    setting: "family dinners, classroom activities, Friendsgiving parties, and holiday gatherings",
    examples: ["pumpkin pie", "turkey", "gratitude", "leftovers"],
    tip: "Use the card to keep guests engaged before dinner or between courses, not as a replacement for conversation.",
    related: "holiday bingo, family reunion bingo, classroom bingo, and printable bingo cards",
  },
  "super-bowl-bingo": {
    label: "Super Bowl bingo",
    audience: "watch-party hosts, families, sports fans, and office pools",
    setting: "football watch parties, halftime activities, commercial games, and casual group events",
    examples: ["touchdown", "flag on play", "funny commercial", "halftime song"],
    tip: "Mix game action with commercials and party moments so casual fans can enjoy the card too.",
    related: "party bingo, office party bingo, music bingo, and printable bingo cards",
  },
  "church-bingo": {
    label: "church bingo",
    audience: "ministry teams, youth leaders, volunteers, and fellowship coordinators",
    setting: "youth nights, small groups, fundraisers, retreats, and community events",
    examples: ["welcome table", "favorite hymn", "prayer request", "new visitor"],
    tip: "Keep prompts respectful, welcoming, and easy to understand for guests who may be new to the group.",
    related: "fundraiser bingo, icebreaker bingo, family reunion bingo, and printable bingo cards",
  },
  "family-reunion-bingo": {
    label: "family reunion bingo",
    audience: "reunion planners, relatives, grandparents, cousins, and family hosts",
    setting: "picnics, banquet halls, backyard gatherings, and multigenerational weekends",
    examples: ["shares old photo", "favorite recipe", "family nickname", "cousin selfie"],
    tip: "Use prompts that help relatives talk to each other instead of only marking squares silently.",
    related: "icebreaker bingo, party bingo, birthday bingo, and family-friendly templates",
  },
  "team-building-bingo": {
    label: "team-building bingo",
    audience: "managers, HR teams, facilitators, and remote team leads",
    setting: "workshops, offsites, onboarding sessions, standups, and virtual team events",
    examples: ["uses keyboard shortcut", "has a pet", "worked in another industry", "shares a win"],
    tip: "Choose prompts that create useful conversation without putting anyone on the spot.",
    related: "office meeting bingo, onboarding bingo, training bingo, and conference bingo",
  },
  "music-bingo": {
    label: "music bingo",
    audience: "party hosts, DJs, teachers, families, and community event organizers",
    setting: "playlist games, classroom listening activities, bar events, and family game nights",
    examples: ["80s hit", "guitar solo", "movie soundtrack", "song everyone sings"],
    tip: "Build the card around recognizable categories or song moments so players do not need expert music knowledge.",
    related: "party bingo, movie bingo, birthday bingo, and fundraiser bingo",
  },
  "movie-bingo": {
    label: "movie bingo",
    audience: "families, teachers, film clubs, party hosts, and friend groups",
    setting: "movie nights, classroom screenings, watch parties, and themed events",
    examples: ["dramatic music", "plot twist", "funny sidekick", "someone says the title"],
    tip: "Use prompts that happen on screen and can be spotted without pausing the movie.",
    related: "music bingo, party bingo, Halloween bingo, and holiday bingo",
  },
  "fundraiser-bingo": {
    label: "fundraiser bingo",
    audience: "schools, churches, clubs, nonprofits, and volunteer organizers",
    setting: "raffle nights, charity events, community dinners, and school fundraisers",
    examples: ["raffle ticket", "donation table", "local sponsor", "winner photo"],
    tip: "Plan cards, prizes, and calling rules before the event so volunteers can focus on guests and donations.",
    related: "church bingo, party bingo, printable bingo cards, and supplies",
  },
  "icebreaker-bingo": {
    label: "icebreaker bingo",
    audience: "teachers, HR teams, facilitators, hosts, and group leaders",
    setting: "new classes, onboarding, workshops, conferences, and social mixers",
    examples: ["has a sibling", "speaks another language", "loves coffee", "visited another country"],
    tip: "Use low-pressure prompts that help people start conversations without asking for anything too personal.",
    related: "team-building bingo, onboarding bingo, classroom bingo, and conference bingo",
  },
};

export default function SeoSupportBlock({ slug }: { slug: string }) {
  const content = supportContent[slug];

  if (!content) return null;

  return (
    <section className="mx-auto my-16 max-w-5xl rounded-3xl border border-slate-200 bg-white px-6 py-10 shadow-sm md:px-10">
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <h2 className="text-2xl font-black text-slate-900 md:text-3xl">
            Planning better {content.label}
          </h2>
          <div className="mt-5 space-y-4 text-sm leading-7 text-slate-600 md:text-base">
            <p>
              A useful bingo page should do more than offer a blank grid. It should help {content.audience} decide what belongs on the card, how the game will be played, and whether the final version should be exported for free, shared online with paid links, or used during paid live play. This page is built for {content.setting}, so the square ideas and calls to action should support a real event instead of a generic worksheet.
            </p>
            <p>
              The strongest cards combine recognizable moments with a few details that feel specific to the group. For {content.label}, that usually means starting with familiar prompts like {content.examples.join(", ")}, then editing the wording so it matches the host, class, guests, or team. MyBingoCard keeps that workflow flexible: you can start from a template, paste your own list, shuffle unique cards, and decide later whether to export PDFs or add paid browser links.
            </p>
          </div>
        </div>
        <div className="rounded-2xl bg-slate-50 p-6">
          <h3 className="text-base font-bold text-slate-900">Setup tips</h3>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
            <li>Keep each square short enough to read quickly during the game.</li>
            <li>Use a mix of easy, medium, and rare squares so wins do not happen immediately.</li>
            <li>Make several unique cards when players are competing for prizes.</li>
            <li>{content.tip}</li>
          </ul>
        </div>
      </div>
      <p className="mt-8 text-sm leading-7 text-slate-600 md:text-base">
        Before you publish or print, scan the card as if you were one of the players. Remove inside jokes that only one person understands, clarify any square that could be read two ways, and make sure the free space fits the tone of the event. If you need more ideas, compare this page with {content.related}; those pages can help you adapt the same bingo format for a different group, season, or playing style.
        A final review also helps with practical details: confirm the card title, check spelling, decide whether duplicate cards are acceptable, and choose the export or sharing method before guests arrive. That small planning step makes the game easier to explain and keeps the host from fixing card issues during the event.
      </p>
    </section>
  );
}
