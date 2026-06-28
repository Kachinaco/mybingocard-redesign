"use client";

import { trackTemplateUsed } from "@/lib/analytics";
import { isImageCell, parseImageCell, getCellDisplayText } from "@/lib/cellContent";
import ThemedCardWrapper from "@/components/ThemedCardWrapper";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { trackClientActivity } from "@/lib/activity-client";

interface Template {
  _id: string;
  title: string;
  description?: string;
  category: string;
  tags: string[];
  size: 3 | 4 | 5;
  cells: string[];
  freeSpace: boolean;
  style: {
    backgroundColor?: string;
    textColor?: string;
    borderColor?: string;
    fontSize?: string;
    fontFamily?: string;
    theme?: string;
  };
  isPremium: boolean;
  isFeatured: boolean;
  thumbnail?: string;
  uses: number;
}

interface UserPlan {
  planType: string;
  canAccessAllTemplates: boolean;
}

const CATEGORIES = [
  { id: "all", name: "All Templates" },
  { id: "baby-shower", name: "Baby Shower" },
  { id: "bridal-shower", name: "Bridal Shower" },
  { id: "birthday", name: "Birthday Party" },
  { id: "classroom", name: "Classroom" },
  { id: "holiday", name: "Holiday" },
  { id: "team-building", name: "Team Building" },
  { id: "virtual", name: "Virtual Events" },
  { id: "icebreaker", name: "Icebreaker" },
  { id: "drinking-games", name: "Drinking Games" },
  { id: "other", name: "Other" },
];

type IndexableTemplate = {
  slug: string;
  title: string;
  description: string;
  category: string;
  cells: string[];
  style: Template["style"];
};

const INDEXABLE_TEMPLATES: IndexableTemplate[] = [
  {
    slug: "wedding-bingo",
    title: "Wedding Bingo",
    description: "Reception moments guests can spot during dinner, speeches, photos, and dancing.",
    category: "bridal-shower",
    cells: ["First dance", "Cake cutting", "Toast speech", "Group photo", "FREE", "Bouquet toss", "Happy tears", "Dance floor", "Photo booth"],
    style: { backgroundColor: "#fff7ed", textColor: "#7c2d12", borderColor: "#fed7aa" },
  },
  {
    slug: "baby-shower-gift-bingo",
    title: "Baby Shower Gift Bingo",
    description: "Classic gift-opening bingo with common baby items and registry surprises.",
    category: "baby-shower",
    cells: ["Diapers", "Blanket", "Bottles", "Onesie", "FREE", "Wipes", "Pacifier", "Books", "Stuffed toy"],
    style: { backgroundColor: "#fdf2f8", textColor: "#9d174d", borderColor: "#fbcfe8" },
  },
  {
    slug: "classroom-vocabulary-bingo",
    title: "Classroom Vocabulary Bingo",
    description: "A ready-to-edit vocabulary bingo card for review days and small groups.",
    category: "classroom",
    cells: ["Define it", "Synonym", "Antonym", "Use in a sentence", "FREE", "Root word", "Prefix", "Suffix", "Example"],
    style: { backgroundColor: "#eff6ff", textColor: "#1d4ed8", borderColor: "#bfdbfe" },
  },
  {
    slug: "office-meeting-bingo",
    title: "Office Meeting Bingo",
    description: "Light team-building bingo for recurring meetings and remote calls.",
    category: "team-building",
    cells: ["You're muted", "Circle back", "Share screen", "Action item", "FREE", "Quick sync", "Pet cameo", "Hard stop", "Follow up"],
    style: { backgroundColor: "#f8fafc", textColor: "#334155", borderColor: "#cbd5e1" },
  },
  {
    slug: "christmas-bingo",
    title: "Christmas Bingo",
    description: "Holiday party bingo with festive words, decorations, and traditions.",
    category: "holiday",
    cells: ["Santa", "Reindeer", "Snowman", "Gift", "FREE", "Tree", "Cookies", "Carols", "Lights"],
    style: { backgroundColor: "#fef2f2", textColor: "#991b1b", borderColor: "#fecaca" },
  },
  {
    slug: "graduation-ceremony-bingo",
    title: "Graduation Ceremony Bingo",
    description: "A ceremony-friendly card for speeches, caps, photos, and proud-family moments.",
    category: "other",
    cells: ["Cap toss", "Class photo", "Proud parent", "Speech", "FREE", "Diploma", "Tassel", "Applause", "Group selfie"],
    style: { backgroundColor: "#f5f3ff", textColor: "#5b21b6", borderColor: "#ddd6fe" },
  },
  {
    slug: "birthday-party-bingo",
    title: "Birthday Party Bingo",
    description: "Party moments for kids, adults, milestone birthdays, and family celebrations.",
    category: "birthday",
    cells: ["Cake time", "Make a wish", "Presents", "Party hat", "FREE", "Photo time", "Dance break", "Balloons", "Goodie bag"],
    style: { backgroundColor: "#f0fdf4", textColor: "#166534", borderColor: "#bbf7d0" },
  },
  {
    slug: "bridal-shower-bingo",
    title: "Bridal Shower Bingo",
    description: "Gift and celebration squares for bridal showers, brunches, and wedding parties.",
    category: "bridal-shower",
    cells: ["Towels", "Cookware", "Gift card", "Candles", "FREE", "Wine glasses", "Something blue", "Luggage", "Photo frame"],
    style: { backgroundColor: "#faf5ff", textColor: "#7e22ce", borderColor: "#e9d5ff" },
  },
  {
    slug: "esl-vocabulary-bingo",
    title: "ESL Vocabulary Bingo",
    description: "Simple language-practice prompts for ESL classes and conversation groups.",
    category: "classroom",
    cells: ["Greeting", "Food word", "Question word", "Place", "FREE", "Verb", "Adjective", "Number", "Weather"],
    style: { backgroundColor: "#ecfeff", textColor: "#155e75", borderColor: "#a5f3fc" },
  },
  {
    slug: "math-facts-bingo",
    title: "Math Facts Bingo",
    description: "Fast math review bingo for multiplication, addition, subtraction, or mixed facts.",
    category: "classroom",
    cells: ["6 x 7", "8 + 9", "12 - 5", "9 x 4", "FREE", "15 / 3", "7 x 8", "20 - 11", "6 + 13"],
    style: { backgroundColor: "#eef2ff", textColor: "#3730a3", borderColor: "#c7d2fe" },
  },
  {
    slug: "halloween-bingo",
    title: "Halloween Bingo",
    description: "Spooky-but-friendly bingo for classroom parties, trunk-or-treat, and family nights.",
    category: "holiday",
    cells: ["Pumpkin", "Costume", "Candy", "Spider", "FREE", "Ghost", "Witch", "Bat", "Trick or treat"],
    style: { backgroundColor: "#fff7ed", textColor: "#9a3412", borderColor: "#fed7aa" },
  },
  {
    slug: "team-building-bingo",
    title: "Team Building Bingo",
    description: "Icebreaker squares that work for new teams, retreats, and all-hands meetings.",
    category: "team-building",
    cells: ["Has a pet", "Coffee fan", "Traveled abroad", "Speaks 2 languages", "FREE", "Morning person", "Has a hobby", "Remote worker", "Loves cooking"],
    style: { backgroundColor: "#f0fdfa", textColor: "#0f766e", borderColor: "#99f6e4" },
  },
  {
    slug: "conference-bingo",
    title: "Conference Bingo",
    description: "Keep attendees engaged during sessions, booths, networking, and keynotes.",
    category: "team-building",
    cells: ["Keynote quote", "New contact", "Booth demo", "Panel question", "FREE", "Swag item", "Coffee line", "Name badge", "Breakout session"],
    style: { backgroundColor: "#f1f5f9", textColor: "#0f172a", borderColor: "#cbd5e1" },
  },
  {
    slug: "family-reunion-bingo",
    title: "Family Reunion Bingo",
    description: "Conversation-starting squares for reunions, picnics, and family weekends.",
    category: "icebreaker",
    cells: ["Old photo", "Shared recipe", "Family story", "Group picture", "FREE", "Long drive", "Matching shirts", "Favorite cousin", "Dessert table"],
    style: { backgroundColor: "#fffbeb", textColor: "#92400e", borderColor: "#fde68a" },
  },
  {
    slug: "training-bingo",
    title: "Training Bingo",
    description: "A practical card for onboarding, workshops, safety meetings, and staff training.",
    category: "team-building",
    cells: ["Best practice", "Policy review", "Question asked", "Demo shown", "FREE", "Checklist", "Scenario", "Group activity", "Next step"],
    style: { backgroundColor: "#eff6ff", textColor: "#1e3a8a", borderColor: "#bfdbfe" },
  },
  {
    slug: "back-to-school-bingo",
    title: "Back-to-School Bingo",
    description: "First-week classroom bingo for names, routines, supplies, and student icebreakers.",
    category: "classroom",
    cells: ["New friend", "Pencil", "Backpack", "Class rule", "FREE", "Favorite subject", "Desk label", "Lunch box", "School bus"],
    style: { backgroundColor: "#fefce8", textColor: "#854d0e", borderColor: "#fde047" },
  },
  {
    slug: "remote-meeting-bingo",
    title: "Remote Meeting Bingo",
    description: "A cleaner virtual-call bingo card for remote teams and online workshops.",
    category: "virtual",
    cells: ["Camera off", "Chat message", "Screen share", "Audio lag", "FREE", "Pet cameo", "Hand raise", "Late joiner", "Can you hear me?"],
    style: { backgroundColor: "#eef2ff", textColor: "#4338ca", borderColor: "#c7d2fe" },
  },
  {
    slug: "fundraiser-bingo",
    title: "Fundraiser Bingo",
    description: "Event bingo for auctions, raffles, school fundraisers, and benefit nights.",
    category: "other",
    cells: ["Raffle ticket", "Sponsor shoutout", "Donation", "Silent auction", "FREE", "Prize table", "Volunteer", "Thank-you speech", "Photo moment"],
    style: { backgroundColor: "#ecfdf5", textColor: "#047857", borderColor: "#a7f3d0" },
  },
  {
    slug: "baby-prediction-bingo",
    title: "Baby Prediction Bingo",
    description: "Prediction squares for due dates, baby traits, names, and first milestones.",
    category: "baby-shower",
    cells: ["Boy", "Girl", "Brown eyes", "Blue eyes", "FREE", "Early arrival", "Late arrival", "Looks like mom", "Looks like dad"],
    style: { backgroundColor: "#f0f9ff", textColor: "#0369a1", borderColor: "#bae6fd" },
  },
  {
    slug: "movie-night-bingo",
    title: "Movie Night Bingo",
    description: "Movie trope bingo for watch parties, family nights, and themed screenings.",
    category: "other",
    cells: ["Plot twist", "Jump scare", "Love story", "Chase scene", "FREE", "Dramatic music", "Flashback", "Hero moment", "Post-credit scene"],
    style: { backgroundColor: "#f8fafc", textColor: "#1e293b", borderColor: "#cbd5e1" },
  },
  {
    slug: "sight-word-bingo",
    title: "Sight Word Bingo",
    description: "A starter sight-word card for early readers and small-group literacy practice.",
    category: "classroom",
    cells: ["the", "and", "you", "said", "FREE", "was", "they", "have", "with"],
    style: { backgroundColor: "#fff1f2", textColor: "#9f1239", borderColor: "#fecdd3" },
  },
  {
    slug: "office-party-bingo",
    title: "Office Party Bingo",
    description: "Lightweight party bingo for holiday lunches, team events, and happy hours.",
    category: "team-building",
    cells: ["Group selfie", "Snack table", "Work story", "Prize winner", "FREE", "Music request", "Inside joke", "Late arrival", "Dessert"],
    style: { backgroundColor: "#f5f3ff", textColor: "#6d28d9", borderColor: "#ddd6fe" },
  },
  {
    slug: "new-years-goals-bingo",
    title: "New Year's Goals Bingo",
    description: "Goal-setting bingo for resolutions, social challenges, and annual planning.",
    category: "holiday",
    cells: ["Fitness goal", "Read more", "Save money", "New hobby", "FREE", "Travel plan", "Drink water", "Declutter", "Learn skill"],
    style: { backgroundColor: "#f0fdfa", textColor: "#115e59", borderColor: "#99f6e4" },
  },
  {
    slug: "icebreaker-bingo",
    title: "Icebreaker Bingo",
    description: "Find-someone-who squares for networking, classrooms, groups, and workshops.",
    category: "icebreaker",
    cells: ["Has a sibling", "Plays music", "Likes hiking", "Has met a celebrity", "FREE", "Loves tea", "Has a tattoo", "Reads daily", "Owns a bike"],
    style: { backgroundColor: "#f0fdf4", textColor: "#166534", borderColor: "#bbf7d0" },
  },
];

function getCategoryName(categoryId: string) {
  return CATEGORIES.find((category) => category.id === categoryId)?.name || "Template";
}

function getIndexableTemplateHref(template: IndexableTemplate) {
  const params = new URLSearchParams({
    templateId: `seo-${template.slug}`,
    title: template.title,
    size: "3",
    cells: JSON.stringify(template.cells),
    freeSpace: "true",
    style: JSON.stringify(template.style),
  });

  return `/create?${params.toString()}`;
}

export default function TemplatesPage() {
  const router = useRouter();
  const sessionData = useSession();
  const session = sessionData?.data;
  const status = sessionData?.status || "loading";
  const [templates, setTemplates] = useState<Template[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showPremiumOnly, setShowPremiumOnly] = useState(false);
  const [userPlan, setUserPlan] = useState<UserPlan | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeTemplateContext, setUpgradeTemplateContext] = useState<Record<string, unknown>>({});
  const [showSignInModal, setShowSignInModal] = useState(false);
  const hasFiredPageView = useRef(false);

  // Track templates page viewed (fire once)
  useEffect(() => {
    if (!hasFiredPageView.current) {
      hasFiredPageView.current = true;
      trackClientActivity("templates_page_viewed");
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.email) {
      fetchUserPlan();
    }
  }, [status, session]);

  useEffect(() => {
    filterTemplates();
  }, [templates, selectedCategory, searchQuery, showPremiumOnly]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/templates");
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error("Failed to fetch templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPlan = async () => {
    try {
      const response = await fetch("/api/user/plan");
      const data = await response.json();
      if (data.plan) {
        setUserPlan({
          planType: data.plan.planName || data.planType,
          canAccessAllTemplates: data.plan?.canAccessAllTemplates || false,
        });
      }
    } catch (error) {
      console.error("Failed to fetch user plan:", error);
    }
  };

  const filterTemplates = () => {
    let filtered = [...templates];

    // Category filter
    if (selectedCategory !== "all") {
      filtered = filtered.filter((t) => t.category === selectedCategory);
    }

    // Premium filter
    if (showPremiumOnly) {
      filtered = filtered.filter((t) => t.isPremium);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query) ||
          t.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    setFilteredTemplates(filtered);
  };

  const handleUseTemplate = async (template: Template) => {
    trackClientActivity("template_clicked", {
      template_id: template._id,
      template_name: template.title,
      template_category: template.category,
      is_premium: template.isPremium,
    });

    try {
      // Track template usage
      await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: template._id, templateTitle: template.title, templateCategory: template.category }),
      });

      trackTemplateUsed(template._id, template.title, template.isPremium);
      // Redirect to create page with template data in URL params
      const params = new URLSearchParams({
        templateId: template._id,
        title: template.title,
        size: template.size.toString(),
        cells: JSON.stringify(template.cells),
        freeSpace: template.freeSpace.toString(),
        style: JSON.stringify(template.style),
      });

      router.push(`/create?${params.toString()}`);
    } catch (error) {
      console.error("Failed to use template:", error);
    }
  };

  const renderTemplateCard = (template: Template) => {
    const gridSize = template.size;
    const displayCells = template.cells.slice(0, 9); // Show first 9 cells for preview
    const isPremiumLocked = false;

    return (
      <div
        key={template._id}
        className="group bg-white rounded-2xl shadow-sm border border-slate-200 hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-100 transition-all duration-300 overflow-hidden flex flex-col h-full"
      >
        {/* Template Preview */}
        <div className="p-6 bg-slate-50 relative border-b border-slate-100 group-hover:bg-indigo-50/30 transition-colors">
          <div className="relative transform group-hover:scale-105 transition-transform duration-500">
           <ThemedCardWrapper theme={template.style?.theme} title={template.title} size="mini">
            <div
              className="grid gap-1.5 shadow-lg rounded-lg bg-white p-1.5"
              style={{
                gridTemplateColumns: `repeat(3, 1fr)`,
              }}
            >
              {displayCells.map((cell, index) => (
                <div
                  key={index}
                  className="aspect-square flex items-center justify-center text-center text-[8px] leading-tight font-medium rounded p-1 overflow-hidden"
                  style={{
                    backgroundColor: template.style.backgroundColor || "#fff",
                    color: template.style.textColor || "#334155",
                    border: `1px solid ${template.style.borderColor || "#e2e8f0"}`,
                  }}
                >
                  {isImageCell(cell) ? (
                    <img src={parseImageCell(cell)?.imageUrl} alt={getCellDisplayText(cell)} className="w-full h-full object-contain" loading="lazy" />
                  ) : cell.length > 15 ? cell.substring(0, 15) + "..." : cell}
                </div>
              ))}
            </div>
           </ThemedCardWrapper>
          </div>

          {template.isPremium && (
            <div className="absolute top-3 right-3 bg-gradient-to-r from-amber-400 to-amber-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              Included
            </div>
          )}
        </div>

        {/* Template Info */}
        <div className="p-5 flex flex-col flex-grow">
          <div className="mb-4">
            <h3 className="font-bold text-slate-900 text-lg mb-1 leading-tight">{template.title}</h3>
            {template.description && (
              <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">
                {template.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs font-medium text-slate-400 mb-6 mt-auto">
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              {gridSize}×{gridSize}
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              {template.uses.toLocaleString()} uses
            </span>
          </div>

          <button
            onClick={() => handleUseTemplate(template)}
            className="w-full bg-white text-indigo-600 border border-indigo-200 px-4 py-2.5 rounded-xl hover:bg-indigo-50 hover:border-indigo-300 transition-all font-semibold text-sm shadow-sm"
          >
            Use Template
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 selection:bg-indigo-100 selection:text-indigo-900">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/50">
        <div className="container mx-auto px-4 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 group-hover:shadow-indigo-300 transition-all duration-300">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700">
              MyBingoCard
            </span>
          </Link>
          
          <div className="flex gap-4 items-center">
            {session ? (
               <>
                <Link
                  href="/dashboard"
                  className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href="/create"
                  className="bg-slate-900 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-800 transition-all duration-200 shadow-lg shadow-slate-900/20"
                >
                  Create New
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/create"
                  className="bg-slate-900 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-800 transition-all duration-200 shadow-lg shadow-slate-900/20"
                >
                  Start a Draft
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="pt-32 pb-24 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-16 animate-fade-in-up">
             <div className="inline-block px-4 py-1.5 rounded-full bg-violet-50 border border-violet-100 text-violet-600 text-xs font-bold uppercase tracking-wide mb-6">
                Template Gallery
              </div>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">
              Start with a <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600">perfect design</span>.
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Choose from our collection of professionally designed templates for weddings, parties, classrooms, and more.
            </p>
          </div>

          <section className="mb-16 animate-fade-in-up animation-delay-100">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900">Popular bingo card templates</h2>
                <p className="mt-2 text-slate-600 max-w-2xl">
                  Start with a ready-made idea, customize the squares, then print a PDF or share the card online.
                </p>
              </div>
              <Link href="/create" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
                Start from a blank card
              </Link>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {INDEXABLE_TEMPLATES.map((template) => (
                <article key={template.slug} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
                  <div className="p-5 bg-slate-50 border-b border-slate-100">
                    <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-white p-2 shadow-sm" aria-label={`${template.title} preview`}>
                      {template.cells.map((cell, index) => (
                        <div
                          key={`${template.slug}-${cell}-${index}`}
                          className="aspect-square flex items-center justify-center text-center text-[9px] leading-tight font-semibold rounded-md p-1 overflow-hidden"
                          style={{
                            backgroundColor: template.style.backgroundColor || "#ffffff",
                            color: template.style.textColor || "#334155",
                            border: `1px solid ${template.style.borderColor || "#e2e8f0"}`,
                          }}
                        >
                          {cell}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-5 flex flex-col flex-grow">
                    <div className="text-xs font-bold uppercase tracking-wide text-indigo-600 mb-2">
                      {getCategoryName(template.category)}
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">{template.title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed mb-5 flex-grow">{template.description}</p>
                    <Link
                      href={getIndexableTemplateHref(template)}
                      className="w-full bg-white text-indigo-600 border border-indigo-200 px-4 py-2.5 rounded-xl hover:bg-indigo-50 hover:border-indigo-300 transition-all font-semibold text-sm shadow-sm text-center"
                    >
                      Use This Template
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* Filters and Search */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-12 animate-fade-in-up animation-delay-100">
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              {/* Search */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search templates..."
                  className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200"
                />
              </div>

              {/* Premium-tag filter */}
              <div className="flex items-center">
                <label className="flex items-center p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors w-full md:w-auto">
                  <input
                    type="checkbox"
                    checked={showPremiumOnly}
                    onChange={(e) => setShowPremiumOnly(e.target.checked)}
                    className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <span className="ml-3 text-sm font-medium text-slate-700">Show premium-tagged templates only</span>
                </label>
              </div>
            </div>

            {/* Category Tabs */}
            <div className="flex flex-wrap gap-2 pb-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    selectedCategory === cat.id
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                      : "bg-white text-slate-600 hover:bg-slate-50 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Empty state */}
          {status !== "loading" && templates.length === 0 && (
            <div className="text-center py-16 bg-gradient-to-br from-violet-50 to-indigo-50 rounded-3xl border border-indigo-100 mb-12">
              <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-200">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">Templates are loading</h3>
              <p className="text-slate-600 max-w-md mx-auto mb-6">
                Template access is included right now. Start from a blank card while the gallery refreshes.
              </p>
              <Link
                href="/create"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/20 hover:-translate-y-0.5 transition-all"
              >
                Start from blank
              </Link>
            </div>
          )}

          {/* Templates Grid */}
          {loading ? (
            <div className="text-center py-24">
              <div className="inline-block w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-slate-500 font-medium">Loading more templates...</p>
            </div>
          ) : filteredTemplates.length === 0 && templates.length > 0 ? (
            <div className="text-center py-24 bg-white rounded-3xl border border-slate-200 border-dashed">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                 <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">No templates found</h3>
              <p className="text-slate-500">
                Try adjusting your search or filters to find what you're looking for.
              </p>
              <button
                onClick={() => {setSelectedCategory("all"); setSearchQuery(""); setShowPremiumOnly(false);}}
                className="mt-6 text-indigo-600 font-medium hover:text-indigo-700 hover:underline"
              >
                Clear all filters
              </button>
            </div>
          ) : templates.length > 0 ? (
            <>
              <div className="mb-6 text-sm font-medium text-slate-500 animate-fade-in-up animation-delay-200">
                Showing {filteredTemplates.length} template{filteredTemplates.length !== 1 ? "s" : ""}
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 animate-fade-in-up animation-delay-300">
                {filteredTemplates.map(renderTemplateCard)}
              </div>
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}
