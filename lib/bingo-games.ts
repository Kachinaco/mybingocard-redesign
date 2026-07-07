export type BingoGameCategory =
  | "Showers and Weddings"
  | "Parties and Holidays"
  | "Classroom and Learning"
  | "Work and Groups"
  | "Community and Events";

export type BingoGame = {
  slug: string;
  title: string;
  description: string;
  category: BingoGameCategory;
  audience: string;
};

export const bingoGameCategoryOrder: BingoGameCategory[] = [
  "Showers and Weddings",
  "Parties and Holidays",
  "Classroom and Learning",
  "Work and Groups",
  "Community and Events",
];

export const bingoGames: BingoGame[] = [
  {
    slug: "baby-shower-bingo",
    title: "Baby Shower Bingo",
    description: "Gift, prediction, and guest activity cards for baby showers.",
    category: "Showers and Weddings",
    audience: "Baby shower hosts",
  },
  {
    slug: "baby-shower-gift-bingo",
    title: "Baby Shower Gift Bingo",
    description: "Classic gift-opening bingo built around registry and nursery items.",
    category: "Showers and Weddings",
    audience: "Shower planners",
  },
  {
    slug: "baby-prediction-bingo",
    title: "Baby Prediction Bingo",
    description: "Prediction cards for names, dates, traits, and first milestones.",
    category: "Showers and Weddings",
    audience: "Parents and guests",
  },
  {
    slug: "bridal-shower-bingo",
    title: "Bridal Shower Bingo",
    description: "Brunch, gift, and celebration cards for bridal shower games.",
    category: "Showers and Weddings",
    audience: "Bridal shower hosts",
  },
  {
    slug: "bridal-shower-gift-bingo",
    title: "Bridal Shower Gift Bingo",
    description: "Gift-opening cards for registry items, advice, and wedding prep.",
    category: "Showers and Weddings",
    audience: "Wedding parties",
  },
  {
    slug: "wedding-bingo",
    title: "Wedding Bingo",
    description: "Guest-friendly wedding cards for speeches, photos, dancing, and table moments.",
    category: "Showers and Weddings",
    audience: "Wedding guests",
  },
  {
    slug: "wedding-reception-bingo",
    title: "Wedding Reception Bingo",
    description: "Reception cards for cocktail hour, dinner, speeches, and dancing.",
    category: "Showers and Weddings",
    audience: "Wedding planners",
  },
  {
    slug: "party-bingo",
    title: "Party Bingo",
    description: "Flexible party cards for birthdays, game nights, dinners, and celebrations.",
    category: "Parties and Holidays",
    audience: "Party hosts",
  },
  {
    slug: "birthday-bingo",
    title: "Birthday Bingo",
    description: "Birthday cards for cake, gifts, photos, games, and milestone moments.",
    category: "Parties and Holidays",
    audience: "Birthday hosts",
  },
  {
    slug: "holiday-bingo",
    title: "Holiday Bingo",
    description: "Seasonal cards for Christmas, classroom parties, family nights, and office events.",
    category: "Parties and Holidays",
    audience: "Holiday hosts",
  },
  {
    slug: "christmas-party-bingo",
    title: "Christmas Party Bingo",
    description: "Festive bingo cards for office parties, family gatherings, and December events.",
    category: "Parties and Holidays",
    audience: "Christmas party hosts",
  },
  {
    slug: "halloween-bingo",
    title: "Halloween Bingo",
    description: "Friendly spooky cards for classrooms, trunk-or-treat, and October parties.",
    category: "Parties and Holidays",
    audience: "Teachers and parents",
  },
  {
    slug: "thanksgiving-bingo",
    title: "Thanksgiving Bingo",
    description: "Family dinner cards for food, football, gratitude, and holiday moments.",
    category: "Parties and Holidays",
    audience: "Family hosts",
  },
  {
    slug: "super-bowl-bingo",
    title: "Super Bowl Bingo",
    description: "Watch-party cards for game action, commercials, snacks, and halftime.",
    category: "Parties and Holidays",
    audience: "Football party hosts",
  },
  {
    slug: "movie-bingo",
    title: "Movie Bingo",
    description: "Movie-night cards for tropes, quotes, plot twists, and watch parties.",
    category: "Parties and Holidays",
    audience: "Movie night hosts",
  },
  {
    slug: "music-bingo",
    title: "Music Bingo",
    description: "Song, playlist, and listening cards for parties, classrooms, and events.",
    category: "Parties and Holidays",
    audience: "Music game hosts",
  },
  {
    slug: "trivia-bingo",
    title: "Trivia Bingo",
    description: "Trivia-night cards for teams, pub quizzes, bonus rounds, and game nights.",
    category: "Parties and Holidays",
    audience: "Trivia hosts",
  },
  {
    slug: "classroom-bingo",
    title: "Classroom Bingo",
    description: "Teacher-ready bingo cards for review, routines, centers, and class games.",
    category: "Classroom and Learning",
    audience: "Teachers",
  },
  {
    slug: "back-to-school-bingo",
    title: "Back-to-School Bingo",
    description: "First-week cards for routines, supplies, names, and classroom icebreakers.",
    category: "Classroom and Learning",
    audience: "Teachers",
  },
  {
    slug: "end-of-year-bingo",
    title: "End-of-Year Bingo",
    description: "Class memory and celebration cards for the final weeks of school.",
    category: "Classroom and Learning",
    audience: "Teachers",
  },
  {
    slug: "sight-word-bingo-generator",
    title: "Sight Word Bingo",
    description: "Early reading cards for sight words, literacy centers, and small groups.",
    category: "Classroom and Learning",
    audience: "Reading teachers",
  },
  {
    slug: "vocabulary-bingo-generator",
    title: "Vocabulary Bingo",
    description: "Word-list cards for ELA, science, social studies, and review days.",
    category: "Classroom and Learning",
    audience: "Teachers",
  },
  {
    slug: "esl-bingo-generator",
    title: "ESL Bingo",
    description: "Language-practice cards for vocabulary, listening, speaking, and picture games.",
    category: "Classroom and Learning",
    audience: "ESL teachers",
  },
  {
    slug: "math-bingo-generator",
    title: "Math Bingo",
    description: "Math practice cards for facts, terms, answers, and quick classroom review.",
    category: "Classroom and Learning",
    audience: "Math teachers",
  },
  {
    slug: "multiplication-bingo-cards",
    title: "Multiplication Bingo",
    description: "Times-table cards for products, facts, and classroom math centers.",
    category: "Classroom and Learning",
    audience: "Elementary teachers",
  },
  {
    slug: "periodic-table-bingo",
    title: "Periodic Table Bingo",
    description: "Chemistry review cards for elements, symbols, groups, and properties.",
    category: "Classroom and Learning",
    audience: "Science teachers",
  },
  {
    slug: "state-capitals-bingo",
    title: "State Capitals Bingo",
    description: "Geography cards for state names, capitals, regions, and quiz prep.",
    category: "Classroom and Learning",
    audience: "Social studies teachers",
  },
  {
    slug: "team-building-bingo",
    title: "Team Building Bingo",
    description: "Workplace cards for retreats, all-hands events, and team bonding.",
    category: "Work and Groups",
    audience: "Team leaders",
  },
  {
    slug: "icebreaker-bingo",
    title: "Icebreaker Bingo",
    description: "Find-someone-who cards for groups, workshops, networking, and classes.",
    category: "Work and Groups",
    audience: "Facilitators",
  },
  {
    slug: "remote-meeting-bingo",
    title: "Remote Meeting Bingo",
    description: "Virtual-call cards for distributed teams, online classes, and workshops.",
    category: "Work and Groups",
    audience: "Remote teams",
  },
  {
    slug: "office-meeting-bingo",
    title: "Office Meeting Bingo",
    description: "Meeting cards for recurring syncs, all-hands calls, and work humor.",
    category: "Work and Groups",
    audience: "Office teams",
  },
  {
    slug: "office-party-bingo",
    title: "Office Party Bingo",
    description: "Work party cards for snacks, music, awards, white elephant, and team moments.",
    category: "Work and Groups",
    audience: "Office hosts",
  },
  {
    slug: "onboarding-bingo",
    title: "Onboarding Bingo",
    description: "New-hire cards for orientation, first-week tasks, and company basics.",
    category: "Work and Groups",
    audience: "HR teams",
  },
  {
    slug: "training-bingo",
    title: "Training Bingo",
    description: "Workshop cards for policies, demos, scenarios, questions, and next steps.",
    category: "Work and Groups",
    audience: "Trainers",
  },
  {
    slug: "conference-bingo",
    title: "Conference Bingo",
    description: "Attendee cards for sessions, sponsor booths, networking, and trade shows.",
    category: "Work and Groups",
    audience: "Event teams",
  },
  {
    slug: "fundraiser-bingo",
    title: "Fundraiser Bingo",
    description: "Fundraising cards for auctions, raffles, sponsor moments, and charity nights.",
    category: "Community and Events",
    audience: "Fundraiser teams",
  },
  {
    slug: "family-reunion-bingo",
    title: "Family Reunion Bingo",
    description: "Conversation cards for reunions, BBQs, potlucks, photo booths, and family history.",
    category: "Community and Events",
    audience: "Family organizers",
  },
  {
    slug: "church-bingo",
    title: "Church Bingo",
    description: "Fellowship cards for youth groups, potlucks, Sunday school, and church events.",
    category: "Community and Events",
    audience: "Church groups",
  },
];

export const featuredBingoGameSlugs = [
  "baby-shower-bingo",
  "wedding-bingo",
  "classroom-bingo",
  "team-building-bingo",
  "holiday-bingo",
  "fundraiser-bingo",
  "icebreaker-bingo",
  "super-bowl-bingo",
];

export const featuredBingoGames = featuredBingoGameSlugs
  .map((slug) => bingoGames.find((game) => game.slug === slug))
  .filter((game): game is BingoGame => Boolean(game));

export function getBingoGamesByCategory() {
  return bingoGameCategoryOrder.map((category) => ({
    category,
    games: bingoGames.filter((game) => game.category === category),
  }));
}
