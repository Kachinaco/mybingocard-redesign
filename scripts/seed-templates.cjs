const { MongoClient } = require('mongodb');
const { openSqliteShadowDatabase, useSqliteBackend } = require('./sqlite-shadow-store.cjs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mybingocard';

const templates = [
  // Baby Shower Templates
  {
    title: "Baby Shower Classic",
    description: "Traditional baby shower bingo with gifts and activities",
    category: "baby-shower",
    tags: ["baby", "shower", "gifts", "party", "newborn"],
    size: 5,
    cells: [
      "Diapers", "Bottles", "Onesie", "Blanket", "Pacifier",
      "Stuffed Animal", "Books", "Stroller", "Car Seat", "Bib",
      "Baby Monitor", "Rattle", "FREE", "Socks", "Hat",
      "Teething Toy", "Bath Toys", "Lotion", "Wipes", "Swaddle",
      "Gift Card", "Clothes", "Shoes", "Mobile", "Night Light"
    ],
    freeSpace: true,
    style: { backgroundColor: "#fce7f3", textColor: "#831843", borderColor: "#f9a8d4" },
    isPremium: false,
    isFeatured: true,
    uses: 1250
  },
  {
    title: "Baby Predictions",
    description: "Guess details about the new baby",
    category: "baby-shower",
    tags: ["baby", "predictions", "guessing", "fun"],
    size: 5,
    cells: [
      "Boy", "Girl", "Brown Eyes", "Blue Eyes", "Bald",
      "Full Head Hair", "Over 7 lbs", "Under 7 lbs", "Early Arrival", "On Due Date",
      "Late Arrival", "Looks Like Mom", "FREE", "Looks Like Dad", "Night Owl",
      "Morning Baby", "Loves Bath", "Hates Bath", "Quiet Sleeper", "Loud Crier",
      "Thumb Sucker", "Pacifier Baby", "Foodie", "Picky", "Always Smiling"
    ],
    freeSpace: true,
    style: { backgroundColor: "#dbeafe", textColor: "#1e40af", borderColor: "#93c5fd" },
    isPremium: false,
    isFeatured: false,
    uses: 890
  },

  // Wedding/Bridal Shower Templates
  {
    title: "Wedding Reception Bingo",
    description: "Fun activities to spot at a wedding reception",
    category: "bridal-shower",
    tags: ["wedding", "reception", "party", "celebration"],
    size: 5,
    cells: [
      "First Dance", "Cake Cutting", "Bouquet Toss", "Garter Toss", "Crying Guest",
      "Toast Speech", "Dad Joke", "Dance Floor Packed", "Photo Booth", "Champagne Pop",
      "Kids Running", "Slow Dance", "FREE", "Group Photo", "Live Music",
      "DJ Request", "Dessert Table", "Late Arrival", "Early Exit", "Fancy Hat",
      "Sneaking Food", "Phone Photos", "Dancing Grandma", "Best Man Speech", "Flower Girl Cute"
    ],
    freeSpace: true,
    style: { backgroundColor: "#fef3c7", textColor: "#92400e", borderColor: "#fcd34d" },
    isPremium: false,
    isFeatured: true,
    uses: 2100
  },
  {
    title: "Bridal Shower Gifts",
    description: "Classic bridal shower gift bingo",
    category: "bridal-shower",
    tags: ["bridal", "shower", "gifts", "bride"],
    size: 5,
    cells: [
      "Kitchen Aid", "Towels", "Sheets", "Wine Glasses", "Cookware",
      "Lingerie", "Photo Frame", "Candles", "Vase", "Blender",
      "Coffee Maker", "Dishes", "FREE", "Gift Card", "Jewelry",
      "Luggage", "Spa Set", "Cookbook", "Throw Blanket", "Art",
      "Cutting Board", "Mixer", "Wine", "Cash", "Something Blue"
    ],
    freeSpace: true,
    style: { backgroundColor: "#fae8ff", textColor: "#86198f", borderColor: "#e879f9" },
    isPremium: false,
    isFeatured: false,
    uses: 1450
  },

  // Birthday Templates
  {
    title: "Kids Birthday Party",
    description: "Fun party activities for children's birthdays",
    category: "birthday",
    tags: ["birthday", "kids", "party", "games", "fun"],
    size: 5,
    cells: [
      "Cake Time", "Happy Birthday Song", "Make a Wish", "Candle Blowing", "Present Time",
      "Party Games", "Musical Chairs", "Pin the Tail", "Balloon Pop", "Face Paint",
      "Pizza!", "Juice Box", "FREE", "Goodie Bag", "Party Hat",
      "Sugar Rush", "Running Around", "Photo Time", "Costume", "Dance Party",
      "Piñata", "Hide & Seek", "Crying Kid", "Best Friends", "Thank You Cards"
    ],
    freeSpace: true,
    style: { backgroundColor: "#dcfce7", textColor: "#166534", borderColor: "#86efac" },
    isPremium: false,
    isFeatured: true,
    uses: 3200
  },
  {
    title: "Adult Birthday Bash",
    description: "Milestone birthday celebration bingo",
    category: "birthday",
    tags: ["birthday", "adult", "party", "milestone", "30", "40", "50"],
    size: 5,
    cells: [
      "Surprise!", "Embarrassing Photo", "Roast Speech", "Heartfelt Toast", "Cake Smash",
      "Old Photos Slideshow", "Dancing", "Karaoke", "Shots!", "Cheers!",
      "Gift Opening", "Thank You Speech", "FREE", "Group Selfie", "Memory Sharing",
      "Someone Crying", "Late Guest", "Over the Hill Joke", "Balloon Arch", "Photo Booth",
      "Designated Driver", "Uber Called", "Best Gift", "Gag Gift", "After Party"
    ],
    freeSpace: true,
    style: { backgroundColor: "#f0abfc", textColor: "#701a75", borderColor: "#d946ef" },
    isPremium: false,
    isFeatured: false,
    uses: 1800
  },

  // Classroom Templates
  {
    title: "Math Vocabulary",
    description: "Elementary math terms for classroom learning",
    category: "classroom",
    tags: ["math", "education", "vocabulary", "elementary", "school"],
    size: 5,
    cells: [
      "Addition", "Subtraction", "Multiply", "Divide", "Equals",
      "Greater Than", "Less Than", "Fraction", "Decimal", "Percent",
      "Sum", "Difference", "FREE", "Product", "Quotient",
      "Numerator", "Denominator", "Whole Number", "Even", "Odd",
      "Triangle", "Square", "Circle", "Rectangle", "Pentagon"
    ],
    freeSpace: true,
    style: { backgroundColor: "#e0e7ff", textColor: "#3730a3", borderColor: "#a5b4fc" },
    isPremium: false,
    isFeatured: true,
    uses: 4500
  },
  {
    title: "Science Terms",
    description: "Basic science vocabulary for students",
    category: "classroom",
    tags: ["science", "education", "vocabulary", "STEM"],
    size: 5,
    cells: [
      "Hypothesis", "Experiment", "Variable", "Control", "Data",
      "Observation", "Conclusion", "Measure", "Predict", "Theory",
      "Matter", "Energy", "FREE", "Atom", "Molecule",
      "Cell", "Organism", "Ecosystem", "Gravity", "Force",
      "Motion", "Chemical", "Physical", "Solid", "Liquid"
    ],
    freeSpace: true,
    style: { backgroundColor: "#ccfbf1", textColor: "#115e59", borderColor: "#5eead4" },
    isPremium: false,
    isFeatured: false,
    uses: 3100
  },
  {
    title: "Reading Comprehension",
    description: "Literary terms for English class",
    category: "classroom",
    tags: ["reading", "english", "literature", "vocabulary"],
    size: 5,
    cells: [
      "Character", "Setting", "Plot", "Theme", "Conflict",
      "Resolution", "Protagonist", "Antagonist", "Narrator", "Dialogue",
      "Metaphor", "Simile", "FREE", "Foreshadowing", "Flashback",
      "Climax", "Exposition", "Symbolism", "Irony", "Mood",
      "Tone", "Genre", "Fiction", "Non-Fiction", "Author"
    ],
    freeSpace: true,
    style: { backgroundColor: "#fef9c3", textColor: "#854d0e", borderColor: "#fde047" },
    isPremium: true,
    isFeatured: false,
    uses: 2800
  },

  // Holiday Templates
  {
    title: "Christmas Bingo",
    description: "Holiday favorites for Christmas parties",
    category: "holiday",
    tags: ["christmas", "holiday", "winter", "santa", "festive"],
    size: 5,
    cells: [
      "Santa Claus", "Reindeer", "Snowman", "Christmas Tree", "Presents",
      "Candy Cane", "Gingerbread", "Stockings", "Ornaments", "Star",
      "Snowflake", "Elf", "FREE", "Sleigh", "Mistletoe",
      "Hot Cocoa", "Cookies", "Carols", "Wreath", "Fireplace",
      "Jingle Bells", "Nutcracker", "Angel", "Lights", "Snow"
    ],
    freeSpace: true,
    style: { backgroundColor: "#fecaca", textColor: "#991b1b", borderColor: "#f87171" },
    isPremium: false,
    isFeatured: true,
    uses: 5600
  },
  {
    title: "Halloween Spooky",
    description: "Spooky fun for Halloween parties",
    category: "holiday",
    tags: ["halloween", "spooky", "scary", "fall", "october"],
    size: 5,
    cells: [
      "Ghost", "Witch", "Vampire", "Zombie", "Skeleton",
      "Pumpkin", "Bat", "Spider", "Black Cat", "Werewolf",
      "Haunted House", "Candy Corn", "FREE", "Trick or Treat", "Costume",
      "Mummy", "Frankenstein", "Cauldron", "Broomstick", "Full Moon",
      "Cobweb", "Tombstone", "Jack-o-Lantern", "Scarecrow", "Boo!"
    ],
    freeSpace: true,
    style: { backgroundColor: "#fed7aa", textColor: "#9a3412", borderColor: "#fb923c" },
    isPremium: false,
    isFeatured: false,
    uses: 4200
  },
  {
    title: "Thanksgiving Feast",
    description: "Give thanks with this holiday bingo",
    category: "holiday",
    tags: ["thanksgiving", "fall", "gratitude", "family", "feast"],
    size: 5,
    cells: [
      "Turkey", "Stuffing", "Mashed Potatoes", "Gravy", "Cranberry Sauce",
      "Pumpkin Pie", "Apple Pie", "Sweet Potato", "Green Beans", "Rolls",
      "Family Gathering", "Football", "FREE", "Gratitude", "Leftovers",
      "Nap Time", "Black Friday", "Corn", "Pilgrim", "Mayflower",
      "Harvest", "Cornucopia", "Autumn Leaves", "Prayer", "Feast"
    ],
    freeSpace: true,
    style: { backgroundColor: "#fef3c7", textColor: "#92400e", borderColor: "#fbbf24" },
    isPremium: false,
    isFeatured: false,
    uses: 2900
  },

  // Team Building Templates
  {
    title: "Office Bingo",
    description: "Fun observations in the workplace",
    category: "team-building",
    tags: ["office", "work", "corporate", "funny", "meetings"],
    size: 5,
    cells: [
      "Coffee Run", "Meeting Marathon", "Reply All", "Printer Jam", "Deadline",
      "Synergy", "Touch Base", "Circle Back", "Low-Hanging Fruit", "Bandwidth",
      "Happy Hour", "Potluck", "FREE", "Birthday Cake", "IT Issues",
      "Video Call Glitch", "Muted Mic", "Pet on Call", "Kid Interruption", "Casual Friday",
      "Early Leave", "Late Arrival", "Lunch Meeting", "Team Outing", "Promotion"
    ],
    freeSpace: true,
    style: { backgroundColor: "#e0e7ff", textColor: "#4338ca", borderColor: "#818cf8" },
    isPremium: false,
    isFeatured: true,
    uses: 3800
  },
  {
    title: "Virtual Meeting Bingo",
    description: "For remote team video calls",
    category: "team-building",
    tags: ["zoom", "remote", "virtual", "meeting", "work from home"],
    size: 5,
    cells: [
      "You're Muted", "Can You See My Screen?", "Technical Difficulties", "Echo", "Frozen Screen",
      "Pet Cameo", "Kid Appears", "Doorbell Rings", "Background Blur", "Virtual Background",
      "Multitasking Obvious", "Camera Off", "FREE", "Sorry, Go Ahead", "Talking Over",
      "Connection Issues", "Unmuted Eating", "Phone Notification", "Late Joiner", "Early Leaver",
      "Wrong Name Display", "Chat Messages", "Thumbs Up Reaction", "Hand Raise", "Let's Take This Offline"
    ],
    freeSpace: true,
    style: { backgroundColor: "#dbeafe", textColor: "#1e40af", borderColor: "#60a5fa" },
    isPremium: false,
    isFeatured: false,
    uses: 4100
  },

  // Icebreaker Templates
  {
    title: "Get To Know You",
    description: "Find people with these traits or experiences",
    category: "icebreaker",
    tags: ["icebreaker", "networking", "social", "party", "meeting"],
    size: 5,
    cells: [
      "Has Traveled Abroad", "Speaks 2+ Languages", "Has a Pet", "Plays Instrument", "Morning Person",
      "Night Owl", "Only Child", "Has Siblings", "Coffee Lover", "Tea Drinker",
      "Exercises Daily", "Loves Cooking", "FREE", "Bookworm", "Movie Buff",
      "Sports Fan", "Gamer", "Hiker", "Beach Lover", "Mountain Person",
      "Has Met Celebrity", "Been on TV", "Has Tattoo", "Vegetarian", "Foodie"
    ],
    freeSpace: true,
    style: { backgroundColor: "#f0fdf4", textColor: "#166534", borderColor: "#4ade80" },
    isPremium: false,
    isFeatured: true,
    uses: 5200
  },
  {
    title: "Two Truths and a Lie",
    description: "Discover surprising facts about people",
    category: "icebreaker",
    tags: ["icebreaker", "game", "fun", "party", "social"],
    size: 5,
    cells: [
      "Has Skydived", "Met a President", "Been to 10+ Countries", "Swam with Sharks", "Climbed Mountain",
      "Has a Twin", "Speaks 3 Languages", "Been on TV", "Won Contest", "Lived Abroad",
      "Has Unusual Hobby", "Celebrity Encounter", "FREE", "Extreme Sport", "Unique Talent",
      "Weird Food Eaten", "Unusual Pet", "Record Holder", "Famous Relative", "Near Death Experience",
      "Unexpected Job", "Hidden Skill", "Surprise Birthday", "Wrong Flight", "Lucky Escape"
    ],
    freeSpace: true,
    style: { backgroundColor: "#fef3c7", textColor: "#b45309", borderColor: "#fcd34d" },
    isPremium: true,
    isFeatured: false,
    uses: 2400
  },

  // Virtual Event Templates
  {
    title: "Virtual Party Games",
    description: "Online celebration activities",
    category: "virtual",
    tags: ["virtual", "online", "party", "zoom", "remote"],
    size: 5,
    cells: [
      "Trivia Question", "Scavenger Hunt", "Show & Tell", "Dance Break", "Charades",
      "Would You Rather", "Never Have I Ever", "Pictionary", "Story Time", "Talent Show",
      "Costume Contest", "Lip Sync", "FREE", "Quiz Game", "Memory Game",
      "Photo Challenge", "Emoji Game", "Escape Room", "Murder Mystery", "Bingo",
      "Karaoke", "Mad Libs", "20 Questions", "Two Truths Lie", "Name That Tune"
    ],
    freeSpace: true,
    style: { backgroundColor: "#ede9fe", textColor: "#5b21b6", borderColor: "#a78bfa" },
    isPremium: false,
    isFeatured: false,
    uses: 2700
  },


  // Drinking Games Templates
  {
    title: "Classic Drinking Bingo",
    description: "Party drinking game - take a sip when you spot it!",
    category: "drinking-games",
    tags: ["drinking", "party", "adult", "game", "fun", "beer", "cocktail"],
    size: 5,
    cells: [
      "Someone Spills", "Dance Floor Opens", "Shots!", "Birthday Toast", "Conga Line",
      "Beer Pong Win", "Phone Dies", "Sings Wrong Lyrics", "Tells Bad Joke", "Lost Keys",
      "Selfie Taken", "Pizza Ordered", "FREE", "Uber Called", "Shoes Off",
      "Dramatic Story", "Old Friend Arrives", "Bathroom Line", "Loud Sneeze", "Song Request",
      "Photobomb", "Air Guitar", "Group Photo", "Drunk Text", "Last Call"
    ],
    freeSpace: true,
    style: { backgroundColor: "#fef3c7", textColor: "#92400e", borderColor: "#f59e0b" },
    isPremium: false,
    isFeatured: true,
    uses: 3400
  },
  {
    title: "House Party Bingo",
    description: "Spot these classic house party moments",
    category: "drinking-games",
    tags: ["house party", "drinking", "college", "adult", "social"],
    size: 5,
    cells: [
      "Red Cups", "Music Too Loud", "Neighbor Complaint", "Flip Cup", "King's Cup",
      "Truth or Dare", "Karaoke Fail", "Passed Out Early", "Snack Raid", "Broken Glass",
      "Playlist Hijack", "Lost Phone", "FREE", "Hot Sauce Dare", "Arm Wrestling",
      "Kitchen Gathering", "Bad Dance Move", "Old Stories", "Ghost in Bathroom", "Spill on Shirt",
      "Cab Split", "After Party", "Couch Sleeper", "Mystery Drink", "Morning Cleanup"
    ],
    freeSpace: true,
    style: { backgroundColor: "#fecaca", textColor: "#991b1b", borderColor: "#ef4444" },
    isPremium: false,
    isFeatured: false,
    uses: 2800
  },
  {
    title: "Bar Night Bingo",
    description: "Night out at the bar - drink when you spot these!",
    category: "drinking-games",
    tags: ["bar", "pub", "drinking", "nightlife", "adult"],
    size: 5,
    cells: [
      "Long Wait at Bar", "Jukebox Play", "Awkward Flirt", "Pool Shark", "Trivia Night",
      "Bouncer ID Check", "Spilled Drink", "Wrong Order", "Bartender Flair", "Tab Shock",
      "Bathroom Line", "Lost in Crowd", "FREE", "Dance Off", "Birthday Group",
      "Bachelorette Party", "Drink Special", "Sports on TV", "Loud Table", "Closing Time",
      "Wrong Bar", "Coat Check", "VIP Attempt", "Drink Sent", "Last Round"
    ],
    freeSpace: true,
    style: { backgroundColor: "#1e1b4b", textColor: "#c7d2fe", borderColor: "#6366f1" },
    isPremium: false,
    isFeatured: false,
    uses: 2200
  },
  {
    title: "Wine Tasting Bingo",
    description: "Sophisticated wine tasting event bingo",
    category: "drinking-games",
    tags: ["wine", "tasting", "classy", "adult", "vineyard"],
    size: 5,
    cells: [
      "Notes of Oak", "Full-Bodied", "Swirl & Sniff", "Cork Sniff", "Legs on Glass",
      "Terroir Mentioned", "Cheese Pairing", "Vintage Year", "Sommelier Advice", "Decanting",
      "Pinot Noir", "Cabernet", "FREE", "Chardonnay", "Rosé All Day",
      "Tannins Talk", "Dry vs Sweet", "Bouquet Comment", "Second Bottle", "Grape Variety",
      "Wine Stain", "Photo of Label", "Buzzed Already", "Expensive Sip", "Designated Driver"
    ],
    freeSpace: true,
    style: { backgroundColor: "#fdf2f8", textColor: "#9d174d", borderColor: "#f472b6" },
    isPremium: true,
    isFeatured: false,
    uses: 1600
  },

  // Premium Templates
  {
    title: "Corporate Training",
    description: "Professional development session bingo",
    category: "team-building",
    tags: ["corporate", "training", "professional", "workshop", "business"],
    size: 5,
    cells: [
      "Action Items", "Best Practices", "Stakeholders", "KPIs", "ROI",
      "Synergy", "Paradigm Shift", "Deep Dive", "Move the Needle", "Leverage",
      "Scalable", "Ecosystem", "FREE", "Value Add", "Holistic Approach",
      "Core Competency", "Bandwidth", "Circle Back", "Pivot", "Disrupt",
      "Innovative", "Proactive", "Strategic", "Alignment", "Optimize"
    ],
    freeSpace: true,
    style: { backgroundColor: "#f1f5f9", textColor: "#334155", borderColor: "#94a3b8" },
    isPremium: true,
    isFeatured: true,
    uses: 1900
  },
  {
    title: "Movie Night Bingo",
    description: "Common movie tropes and clichés",
    category: "other",
    tags: ["movie", "film", "entertainment", "fun", "tropes"],
    size: 5,
    cells: [
      "Jump Scare", "Love Triangle", "Plot Twist", "Villain Monologue", "Hero's Journey",
      "Dramatic Music", "Slow Motion", "Flashback", "Montage", "Cliffhanger",
      "Comic Relief", "Foreshadowing", "FREE", "MacGuffin", "Deus Ex Machina",
      "Red Herring", "Chase Scene", "Fight Scene", "Kiss Scene", "Death Scene",
      "Happy Ending", "Sad Ending", "Post Credits", "Sequel Bait", "Easter Egg"
    ],
    freeSpace: true,
    style: { backgroundColor: "#1e1b4b", textColor: "#e0e7ff", borderColor: "#4338ca" },
    isPremium: true,
    isFeatured: false,
    uses: 1600
  },
  {
    title: "Road Trip Adventure",
    description: "Fun things to spot on a road trip",
    category: "other",
    tags: ["road trip", "travel", "car", "vacation", "family"],
    size: 5,
    cells: [
      "Red Car", "Blue Truck", "Motorcycle", "RV/Camper", "License Plate Game",
      "Rest Stop", "Gas Station", "Fast Food", "Scenic View", "State Sign",
      "Cow Field", "Horse", "FREE", "Billboard", "Construction Zone",
      "Police Car", "Bridge", "Tunnel", "River", "Mountain",
      "Windmill", "Water Tower", "Train", "Airplane", "Rainbow"
    ],
    freeSpace: true,
    style: { backgroundColor: "#ecfdf5", textColor: "#047857", borderColor: "#34d399" },
    isPremium: false,
    isFeatured: false,
    uses: 2200
  }
];

async function seedTemplates() {
  const sqliteDb = useSqliteBackend() ? openSqliteShadowDatabase() : null;
  const client = sqliteDb ? null : new MongoClient(MONGODB_URI);

  try {
    if (client) await client.connect();
    console.log(sqliteDb ? 'Connected to SQLite shadow store' : 'Connected to MongoDB');

    const db = sqliteDb || client.db('mybingocard');
    const collection = db.collection('templates');

    // Check if templates already exist
    const existingCount = await collection.countDocuments();
    console.log(`Existing templates: ${existingCount}`);

    if (existingCount > 0) {
      console.log('Clearing existing templates...');
      await collection.deleteMany({});
    }

    // Add timestamps to templates
    const templatesWithDates = templates.map(t => ({
      ...t,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    // Insert templates
    const result = await collection.insertMany(templatesWithDates);
    console.log(`Inserted ${result.insertedCount} templates`);

    // Verify
    const finalCount = await collection.countDocuments();
    console.log(`Total templates in database: ${finalCount}`);

  } catch (error) {
    console.error('Error seeding templates:', error);
    process.exitCode = 1;
  } finally {
    if (client) await client.close();
    if (sqliteDb) sqliteDb.close();
    console.log(sqliteDb ? 'Disconnected from SQLite shadow store' : 'Disconnected from MongoDB');
  }
}

seedTemplates();
