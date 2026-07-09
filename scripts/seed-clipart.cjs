/**
 * Seed system clip-art library with SVG-based icons converted to WebP.
 * Also creates image-based templates (Loteria, Animal Bingo, Emoji Bingo).
 *
 * Usage: node scripts/seed-clipart.cjs
 */

const { ObjectId } = require('bson');
const { openSqliteShadowDatabase } = require('./sqlite-shadow-store.cjs');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const UPLOAD_BASE = process.env.MYBINGOCARD_CLIPART_UPLOAD_BASE || '/var/www/mybingocard.com/uploads/system/clipart';
const CLIPART_LIMIT = Number(process.env.MYBINGOCARD_CLIPART_LIMIT || 0);
const IMG_SIZE = 400; // main image px
const THUMB_SIZE = 150;
const WEBP_QUALITY = 85;

// ── Clip-art definitions ─────────────────────────────────────────────
// Each entry: { name, category, emoji, bg (hex) }
// We render each emoji as an SVG then convert to WebP.

const CLIPART = [
  // Animals
  { name: "rooster", category: "animals", emoji: "\u{1F413}", bg: "#FFF3E0" },
  { name: "cat", category: "animals", emoji: "\u{1F408}", bg: "#FFF3E0" },
  { name: "dog", category: "animals", emoji: "\u{1F415}", bg: "#FFF3E0" },
  { name: "fish", category: "animals", emoji: "\u{1F41F}", bg: "#E3F2FD" },
  { name: "frog", category: "animals", emoji: "\u{1F438}", bg: "#E8F5E9" },
  { name: "bird", category: "animals", emoji: "\u{1F426}", bg: "#E3F2FD" },
  { name: "butterfly", category: "animals", emoji: "\u{1F98B}", bg: "#F3E5F5" },
  { name: "turtle", category: "animals", emoji: "\u{1F422}", bg: "#E8F5E9" },
  { name: "rabbit", category: "animals", emoji: "\u{1F407}", bg: "#FFF3E0" },
  { name: "bear", category: "animals", emoji: "\u{1F43B}", bg: "#EFEBE9" },
  { name: "monkey", category: "animals", emoji: "\u{1F412}", bg: "#FFF3E0" },
  { name: "elephant", category: "animals", emoji: "\u{1F418}", bg: "#ECEFF1" },
  { name: "lion", category: "animals", emoji: "\u{1F981}", bg: "#FFF3E0" },
  { name: "horse", category: "animals", emoji: "\u{1F40E}", bg: "#EFEBE9" },
  { name: "owl", category: "animals", emoji: "\u{1F989}", bg: "#F3E5F5" },
  { name: "penguin", category: "animals", emoji: "\u{1F427}", bg: "#E3F2FD" },
  { name: "whale", category: "animals", emoji: "\u{1F40B}", bg: "#E3F2FD" },
  { name: "octopus", category: "animals", emoji: "\u{1F419}", bg: "#FCE4EC" },
  { name: "snake", category: "animals", emoji: "\u{1F40D}", bg: "#E8F5E9" },
  { name: "spider", category: "animals", emoji: "\u{1F577}", bg: "#ECEFF1" },

  // Food & Drink
  { name: "pizza", category: "food", emoji: "\u{1F355}", bg: "#FFF3E0" },
  { name: "taco", category: "food", emoji: "\u{1F32E}", bg: "#FFF8E1" },
  { name: "burger", category: "food", emoji: "\u{1F354}", bg: "#FFF3E0" },
  { name: "sushi", category: "food", emoji: "\u{1F363}", bg: "#E3F2FD" },
  { name: "cake", category: "food", emoji: "\u{1F370}", bg: "#FCE4EC" },
  { name: "ice-cream", category: "food", emoji: "\u{1F366}", bg: "#FCE4EC" },
  { name: "donut", category: "food", emoji: "\u{1F369}", bg: "#FCE4EC" },
  { name: "apple", category: "food", emoji: "\u{1F34E}", bg: "#FFEBEE" },
  { name: "watermelon", category: "food", emoji: "\u{1F349}", bg: "#E8F5E9" },
  { name: "coffee", category: "food", emoji: "\u{2615}", bg: "#EFEBE9" },

  // Holidays
  { name: "christmas-tree", category: "holidays", emoji: "\u{1F384}", bg: "#E8F5E9" },
  { name: "pumpkin", category: "holidays", emoji: "\u{1F383}", bg: "#FFF3E0" },
  { name: "ghost", category: "holidays", emoji: "\u{1F47B}", bg: "#F3E5F5" },
  { name: "santa", category: "holidays", emoji: "\u{1F385}", bg: "#FFEBEE" },
  { name: "heart", category: "holidays", emoji: "\u{2764}", bg: "#FCE4EC" },
  { name: "fireworks", category: "holidays", emoji: "\u{1F386}", bg: "#1A237E" },
  { name: "gift", category: "holidays", emoji: "\u{1F381}", bg: "#FFEBEE" },
  { name: "snowman", category: "holidays", emoji: "\u{2603}", bg: "#E3F2FD" },
  { name: "turkey", category: "holidays", emoji: "\u{1F983}", bg: "#FFF3E0" },
  { name: "egg", category: "holidays", emoji: "\u{1F95A}", bg: "#FFF8E1" },

  // Sports
  { name: "soccer", category: "sports", emoji: "\u{26BD}", bg: "#E8F5E9" },
  { name: "basketball", category: "sports", emoji: "\u{1F3C0}", bg: "#FFF3E0" },
  { name: "football", category: "sports", emoji: "\u{1F3C8}", bg: "#EFEBE9" },
  { name: "baseball", category: "sports", emoji: "\u{26BE}", bg: "#ECEFF1" },
  { name: "tennis", category: "sports", emoji: "\u{1F3BE}", bg: "#F1F8E9" },

  // Nature
  { name: "sun", category: "nature", emoji: "\u{2600}", bg: "#FFF8E1" },
  { name: "moon", category: "nature", emoji: "\u{1F319}", bg: "#1A237E" },
  { name: "star", category: "nature", emoji: "\u{2B50}", bg: "#FFF8E1" },
  { name: "rainbow", category: "nature", emoji: "\u{1F308}", bg: "#E3F2FD" },
  { name: "flower", category: "nature", emoji: "\u{1F33B}", bg: "#FFF8E1" },
  { name: "tree", category: "nature", emoji: "\u{1F333}", bg: "#E8F5E9" },
  { name: "mushroom", category: "nature", emoji: "\u{1F344}", bg: "#FFEBEE" },
  { name: "cloud", category: "nature", emoji: "\u{2601}", bg: "#E3F2FD" },
  { name: "lightning", category: "nature", emoji: "\u{26A1}", bg: "#FFF8E1" },
  { name: "fire", category: "nature", emoji: "\u{1F525}", bg: "#FFF3E0" },

  // Loteria-specific extras
  { name: "skull", category: "loteria", emoji: "\u{1F480}", bg: "#ECEFF1" },
  { name: "mermaid", category: "loteria", emoji: "\u{1F9DC}", bg: "#E3F2FD" },
  { name: "crown", category: "loteria", emoji: "\u{1F451}", bg: "#FFF8E1" },
  { name: "bell", category: "loteria", emoji: "\u{1F514}", bg: "#FFF8E1" },
  { name: "bottle", category: "loteria", emoji: "\u{1F37E}", bg: "#E8F5E9" },
  { name: "drum", category: "loteria", emoji: "\u{1FA98}", bg: "#EFEBE9" },
  { name: "hand", category: "loteria", emoji: "\u{270B}", bg: "#FFF3E0" },
  { name: "rose", category: "loteria", emoji: "\u{1F339}", bg: "#FCE4EC" },
  { name: "cactus", category: "loteria", emoji: "\u{1F335}", bg: "#E8F5E9" },
  { name: "ladder", category: "loteria", emoji: "\u{1FA9C}", bg: "#EFEBE9" },
  { name: "boot", category: "loteria", emoji: "\u{1F462}", bg: "#EFEBE9" },
  { name: "harp", category: "loteria", emoji: "\u{1F3BC}", bg: "#F3E5F5" },
  { name: "umbrella", category: "loteria", emoji: "\u{2602}", bg: "#E3F2FD" },
  { name: "barrel", category: "loteria", emoji: "\u{1F6E2}", bg: "#EFEBE9" },
  { name: "candle", category: "loteria", emoji: "\u{1F56F}", bg: "#FFF8E1" },
  { name: "scorpion", category: "loteria", emoji: "\u{1F982}", bg: "#FFEBEE" },
  { name: "world", category: "loteria", emoji: "\u{1F30E}", bg: "#E3F2FD" },
  { name: "watermelon-loteria", category: "loteria", emoji: "\u{1F349}", bg: "#E8F5E9" },
  { name: "parrot", category: "loteria", emoji: "\u{1F99C}", bg: "#E8F5E9" },
  { name: "guitar", category: "loteria", emoji: "\u{1F3B8}", bg: "#FFF3E0" },
  { name: "arrow", category: "loteria", emoji: "\u{1F3F9}", bg: "#EFEBE9" },
  { name: "heart-loteria", category: "loteria", emoji: "\u{2764}", bg: "#FCE4EC" },
  { name: "flag", category: "loteria", emoji: "\u{1F3F4}", bg: "#ECEFF1" },
  { name: "melon", category: "loteria", emoji: "\u{1F348}", bg: "#E8F5E9" },
  { name: "soldier", category: "loteria", emoji: "\u{1F482}", bg: "#FFEBEE" },

  // Objects / Party
  { name: "balloon", category: "party", emoji: "\u{1F388}", bg: "#FCE4EC" },
  { name: "confetti", category: "party", emoji: "\u{1F389}", bg: "#FFF8E1" },
  { name: "music", category: "party", emoji: "\u{1F3B5}", bg: "#F3E5F5" },
  { name: "trophy", category: "party", emoji: "\u{1F3C6}", bg: "#FFF8E1" },
  { name: "dice", category: "party", emoji: "\u{1F3B2}", bg: "#ECEFF1" },

  // Classroom
  { name: "book", category: "classroom", emoji: "\u{1F4DA}", bg: "#E3F2FD" },
  { name: "pencil", category: "classroom", emoji: "\u{270F}", bg: "#FFF8E1" },
  { name: "globe", category: "classroom", emoji: "\u{1F30D}", bg: "#E3F2FD" },
  { name: "microscope", category: "classroom", emoji: "\u{1F52C}", bg: "#ECEFF1" },
  { name: "rocket", category: "classroom", emoji: "\u{1F680}", bg: "#E3F2FD" },
];

function createEmojiSVG(emoji, bgColor, size) {
  const isDark = bgColor.startsWith('#1') || bgColor.startsWith('#0');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" rx="${Math.round(size * 0.08)}" fill="${bgColor}"/>
    <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-size="${Math.round(size * 0.55)}">${emoji}</text>
  </svg>`;
}

async function main() {
  const db = openSqliteShadowDatabase();

  try {
    console.log('Connecting to SQLite shadow store...');
    const imagesCol = db.collection('images');
    const templatesCol = db.collection('templates');

    // Ensure upload directory exists
    fs.mkdirSync(UPLOAD_BASE, { recursive: true });

    // Clear existing system images
    const existingCount = await imagesCol.countDocuments({ isSystem: true });
    if (existingCount > 0) {
      console.log(`Clearing ${existingCount} existing system images...`);
      await imagesCol.deleteMany({ isSystem: true });
    }

    const clipartItems = CLIPART_LIMIT > 0 ? CLIPART.slice(0, CLIPART_LIMIT) : CLIPART;
    console.log(`Generating ${clipartItems.length} clip-art images...`);

    const imageMap = {}; // name -> { imageId, imageUrl }

    for (const item of clipartItems) {
      const id = new ObjectId();
      const idStr = id.toString();

    // Generate SVG
    const svg = createEmojiSVG(item.emoji, item.bg, IMG_SIZE);
    const svgBuffer = Buffer.from(svg);

    // Convert to WebP
    const [mainBuffer, thumbBuffer] = await Promise.all([
      sharp(svgBuffer)
        .resize(IMG_SIZE, IMG_SIZE)
        .webp({ quality: WEBP_QUALITY })
        .toBuffer(),
      sharp(svgBuffer)
        .resize(THUMB_SIZE, THUMB_SIZE)
        .webp({ quality: 70 })
        .toBuffer(),
    ]);

    // Save to disk
    const mainPath = path.join(UPLOAD_BASE, `${idStr}.webp`);
    const thumbPath = path.join(UPLOAD_BASE, `${idStr}_thumb.webp`);
    fs.writeFileSync(mainPath, mainBuffer);
    fs.writeFileSync(thumbPath, thumbBuffer);

    // Insert DB record
    await imagesCol.insertOne({
      _id: id,
      userId: 'system',
      filename: item.name,
      mimeType: 'image/webp',
      size: mainBuffer.length,
      width: IMG_SIZE,
      height: IMG_SIZE,
      storagePath: mainPath,
      thumbnailPath: thumbPath,
      isSystem: true,
      category: item.category,
      createdAt: new Date(),
    });

    imageMap[item.name] = {
      imageId: idStr,
      imageUrl: `/api/images/${idStr}`,
    };

      process.stdout.write('.');
    }

    console.log(`\nCreated ${clipartItems.length} clip-art images.`);

  // ── Create image-based templates ───────────────────────────────────

  // Helper to encode an image cell
  function imgCell(name, label) {
    const img = imageMap[name];
    if (!img) {
      console.warn(`  Warning: no image for "${name}", using text fallback`);
      return label || name;
    }
    return `__IMG__:${JSON.stringify({ imageId: img.imageId, imageUrl: img.imageUrl, label: label || '' })}`;
  }

  // Loteria template (5x5 = 25 cells, center is free space)
  const loteriaTemplate = {
    title: "Loteria - Mexican Bingo",
    description: "Classic Mexican bingo with picture cards. Each cell has an image like traditional Loteria!",
    category: "other",
    tags: ["loteria", "mexican", "picture", "classic", "images", "traditional"],
    size: 5,
    cells: [
      imgCell("rooster", "El Gallo"),
      imgCell("skull", "La Calavera"),
      imgCell("rose", "La Rosa"),
      imgCell("umbrella", "El Paraguas"),
      imgCell("guitar", "La Guitarra"),
      imgCell("mermaid", "La Sirena"),
      imgCell("ladder", "La Escalera"),
      imgCell("scorpion", "El Alacran"),
      imgCell("cactus", "El Nopal"),
      imgCell("bell", "La Campana"),
      imgCell("barrel", "El Barril"),
      imgCell("crown", "La Corona"),
      "FREE",
      imgCell("bottle", "La Botella"),
      imgCell("heart-loteria", "El Corazon"),
      imgCell("watermelon-loteria", "La Sandia"),
      imgCell("flag", "La Bandera"),
      imgCell("moon", "La Luna"),
      imgCell("candle", "La Vela"),
      imgCell("boot", "La Bota"),
      imgCell("hand", "La Mano"),
      imgCell("sun", "El Sol"),
      imgCell("star", "La Estrella"),
      imgCell("world", "El Mundo"),
      imgCell("parrot", "El Cotorro"),
    ],
    freeSpace: true,
    style: { backgroundColor: "#fefce8", textColor: "#78350f", borderColor: "#fbbf24", fontFamily: "Georgia" },
    isPremium: false,
    isFeatured: true,
    uses: 3200,
  };

  // Animal Bingo (5x5)
  const animalTemplate = {
    title: "Animal Picture Bingo",
    description: "Fun animal bingo with pictures! Great for kids and classrooms.",
    category: "classroom",
    tags: ["animals", "kids", "classroom", "pictures", "images", "educational"],
    size: 5,
    cells: [
      imgCell("cat", "Cat"),
      imgCell("dog", "Dog"),
      imgCell("fish", "Fish"),
      imgCell("frog", "Frog"),
      imgCell("bird", "Bird"),
      imgCell("butterfly", "Butterfly"),
      imgCell("turtle", "Turtle"),
      imgCell("rabbit", "Rabbit"),
      imgCell("bear", "Bear"),
      imgCell("monkey", "Monkey"),
      imgCell("elephant", "Elephant"),
      imgCell("lion", "Lion"),
      "FREE",
      imgCell("horse", "Horse"),
      imgCell("owl", "Owl"),
      imgCell("penguin", "Penguin"),
      imgCell("whale", "Whale"),
      imgCell("octopus", "Octopus"),
      imgCell("snake", "Snake"),
      imgCell("spider", "Spider"),
      imgCell("rooster", "Rooster"),
      imgCell("parrot", "Parrot"),
      imgCell("scorpion", "Scorpion"),
      imgCell("turtle", "Turtle"),
      imgCell("frog", "Frog"),
    ],
    freeSpace: true,
    style: { backgroundColor: "#ecfdf5", textColor: "#065f46", borderColor: "#6ee7b7", fontFamily: "Arial" },
    isPremium: false,
    isFeatured: true,
    uses: 2800,
  };

  // Food Bingo (5x5)
  const foodTemplate = {
    title: "Food Picture Bingo",
    description: "Delicious food bingo with tasty pictures!",
    category: "other",
    tags: ["food", "pictures", "fun", "party", "images"],
    size: 5,
    cells: [
      imgCell("pizza", "Pizza"),
      imgCell("taco", "Taco"),
      imgCell("burger", "Burger"),
      imgCell("sushi", "Sushi"),
      imgCell("cake", "Cake"),
      imgCell("ice-cream", "Ice Cream"),
      imgCell("donut", "Donut"),
      imgCell("apple", "Apple"),
      imgCell("watermelon", "Watermelon"),
      imgCell("coffee", "Coffee"),
      imgCell("pizza", "Slice"),
      imgCell("taco", "Taco"),
      "FREE",
      imgCell("burger", "Hamburger"),
      imgCell("sushi", "Sushi Roll"),
      imgCell("cake", "Cake Slice"),
      imgCell("ice-cream", "Sundae"),
      imgCell("donut", "Sprinkle"),
      imgCell("apple", "Red Apple"),
      imgCell("watermelon", "Melon"),
      imgCell("coffee", "Latte"),
      imgCell("pizza", "Pepperoni"),
      imgCell("taco", "Burrito"),
      imgCell("burger", "Cheeseburger"),
      imgCell("sushi", "Maki"),
    ],
    freeSpace: true,
    style: { backgroundColor: "#fff7ed", textColor: "#9a3412", borderColor: "#fdba74", fontFamily: "Arial" },
    isPremium: false,
    isFeatured: true,
    uses: 1900,
  };

  // Holiday Bingo (5x5)
  const holidayTemplate = {
    title: "Holiday Picture Bingo",
    description: "Festive holiday bingo with seasonal pictures for any celebration!",
    category: "holiday",
    tags: ["holiday", "christmas", "halloween", "pictures", "images", "festive"],
    size: 5,
    cells: [
      imgCell("christmas-tree", "Tree"),
      imgCell("pumpkin", "Pumpkin"),
      imgCell("ghost", "Ghost"),
      imgCell("santa", "Santa"),
      imgCell("heart", "Heart"),
      imgCell("fireworks", "Fireworks"),
      imgCell("gift", "Gift"),
      imgCell("snowman", "Snowman"),
      imgCell("turkey", "Turkey"),
      imgCell("egg", "Egg"),
      imgCell("bell", "Bell"),
      imgCell("star", "Star"),
      "FREE",
      imgCell("candle", "Candle"),
      imgCell("balloon", "Balloon"),
      imgCell("confetti", "Confetti"),
      imgCell("crown", "Crown"),
      imgCell("music", "Music"),
      imgCell("trophy", "Trophy"),
      imgCell("flower", "Flower"),
      imgCell("sun", "Sun"),
      imgCell("moon", "Moon"),
      imgCell("rainbow", "Rainbow"),
      imgCell("fire", "Fire"),
      imgCell("cloud", "Cloud"),
    ],
    freeSpace: true,
    style: { backgroundColor: "#fef2f2", textColor: "#991b1b", borderColor: "#fca5a5", fontFamily: "Georgia" },
    isPremium: false,
    isFeatured: true,
    uses: 2100,
  };

  // Nature & Science Bingo (3x3 - simpler for young kids)
  const natureMiniTemplate = {
    title: "Nature Mini Bingo",
    description: "Simple 3x3 nature bingo with pictures - perfect for young learners!",
    category: "classroom",
    tags: ["nature", "kids", "easy", "pictures", "images", "preschool"],
    size: 3,
    cells: [
      imgCell("sun", "Sun"),
      imgCell("moon", "Moon"),
      imgCell("star", "Star"),
      imgCell("flower", "Flower"),
      "FREE",
      imgCell("tree", "Tree"),
      imgCell("cloud", "Cloud"),
      imgCell("rainbow", "Rainbow"),
      imgCell("mushroom", "Mushroom"),
    ],
    freeSpace: true,
    style: { backgroundColor: "#f0fdf4", textColor: "#166534", borderColor: "#86efac", fontFamily: "Arial" },
    isPremium: false,
    isFeatured: false,
    uses: 1500,
  };

  const imageTemplates = [
    loteriaTemplate,
    animalTemplate,
    foodTemplate,
    holidayTemplate,
    natureMiniTemplate,
  ];

  console.log(`\nSeeding ${imageTemplates.length} image-based templates...`);

  for (const tmpl of imageTemplates) {
    // Check if template already exists by title
    const existing = await templatesCol.findOne({ title: tmpl.title });
    if (existing) {
      console.log(`  Updating "${tmpl.title}"...`);
      await templatesCol.updateOne(
        { _id: existing._id },
        { $set: { ...tmpl, updatedAt: new Date() } }
      );
    } else {
      console.log(`  Creating "${tmpl.title}"...`);
      await templatesCol.insertOne({
        ...tmpl,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

    console.log('\nDone! Summary:');
    console.log(`  Clip-art images: ${clipartItems.length}`);
    console.log(`  Categories: ${[...new Set(clipartItems.map(c => c.category))].join(', ')}`);
    console.log(`  Image templates: ${imageTemplates.length}`);
  } finally {
    db.close();
  }
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
