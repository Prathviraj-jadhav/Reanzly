/* ============================================================
   savage-placeholders.ts
   A library of witty, savage, teasing placeholder strings.
   Tone: a smart-aleck ops buddy who gently roasts the user for
   procrastinating, being lazy, or entering dumb data.
   PG-rated. Witty, never abusive.

   Used by:
   • <SavageInput category="gst" /> / <SavageTextarea category="remarks" />
   • Header search bar (search category)
   • Chat composer (chat category)
   • Rean AI composer (rean category)
   • Empty states (emptyState category)
   • Loading skeletons (loading category)

   Strict monochrome - copy only, no styling concerns here.
   ============================================================ */

/** Returns a random element from the given array. */
export function pick<T>(arr: readonly T[]): T {
  if (arr.length === 0) {
    throw new Error("pick() was called with an empty array");
  }
  return arr[Math.floor(Math.random() * arr.length)];
}

// ===== Global header search / command palette =====
export const searchPlaceholders: readonly string[] = [
  "Type something. Anything. We're begging.",
  "Looking for that trip you forgot to close?",
  "Search before your boss asks where it is.",
  "Find it before Rean finds it first.",
  "Your inbox called. It's laughing.",
  "Search. Or pretend you remembered the LR number.",
  "Lost? We've all been there. Type a hint.",
  "What are we pretending to find today?",
  "Ctrl+F, but for your whole operation.",
  "Type a plate, a name, a city. We'll do the rest.",
  "That invoice isn't going to find itself.",
  "Search before the customer calls. Again.",
  "Type to search. Or don't. Rean will.",
  "Procrastination has a search bar now.",
  "Find the trip, the truck, the truth.",
  "Search it. The data's hiding in plain sight.",
  "Your fleet has questions. Start typing answers.",
  "One keystroke closer to closing that LR.",
];

// ===== Chat composer =====
export const chatComposerPlaceholders: readonly string[] = [
  "Say something witty. Or just 'k'.",
  "Your silence is louder than your fleet's horn.",
  "Type a message. The group chat is judging you.",
  "Send. Then regret. Then edit. Classic.",
  "Words. Use them.",
  "Rean's listening. Try to make sense.",
  "Compose a thought. We'll deliver it.",
  "Type @ to ping someone who's also pretending to work.",
  "Broadcast your brilliance. Or your status update.",
  "Say it like you mean it. Or like HR is watching.",
  "Loose lips sink ships. Typed ones get screenshotted.",
  "Press Enter to commit. To the chat, that is.",
  "Type here. The unread count is watching.",
  "Compose. The conversation is paused on you.",
];

// ===== Rean AI composer =====
export const reanComposerPlaceholders: readonly string[] = [
  "Ask Rean. She knows your numbers better than you do.",
  "Rean doesn't bite. Much.",
  "Stuck? Rean has opinions. Many of them.",
  "Type a question. Get a sentence. Or a manifesto.",
  "Rean's been counting your deadhead miles. Ask why.",
  "Ask about margin, route, fuel, or that one driver.",
  "Rean will answer. Whether you like it is another matter.",
  "Whisper 'GST' and watch Rean light up.",
  "Curious about overdue invoices? Rean is too.",
  "Rean has predictions. You have doubts. Begin.",
  "Ask Rean what she'd do. Then ignore it. Your call.",
  "Prompt her with a problem, not a wish.",
  "Ask Rean. She's already drafted three answers.",
  "Rean is polite. Her findings, less so.",
];

// ===== Generic input placeholders, grouped by field type =====
export const inputPlaceholders = {
  name: [
    "Name. Like, an actual one.",
    "First name, last name. Not your nickname.",
    "We need a name. Yes, a real one.",
    "Type the name they put on the PAN.",
    "Not 'boss'. Not 'bhai'. The actual name.",
    "Full name. Surname included, please.",
  ],
  phone: [
    "10 digits. We believe in you.",
    "+91 followed by your best guess.",
    "Mobile number. No landlines, this isn't 2004.",
    "Phone. The one you actually answer.",
    "10 digits. Theoretically easy.",
    "Mobile number. The one with WhatsApp.",
  ],
  email: [
    "Email. The one you actually check.",
    "Not 'test@test.com'. We see you.",
    "Email with an @. Radical concept.",
    "Where the spam goes.",
    "Type it twice if you must. We won't judge.",
    "Work email, ideally. Rean hates typos.",
  ],
  gst: [
    "GSTIN. 15 chars. We counted.",
    "GSTIN. State code first, then the alphabet soup.",
    "15 characters of pure tax joy.",
    "GSTIN. Or 'UNREGISTERED'. Your conscience.",
    "GST number. Don't invent one. They check.",
    "GSTIN. 2 state + 10 PAN + 1 entity + 1 Z + 1 checksum.",
  ],
  amount: [
    "₹ amount. Don't be shy.",
    "Numbers only. We don't accept vibes.",
    "How many rupees? Just the digits.",
    "Round number, rounded temper.",
    "₹0 is also an answer. Sort of.",
    "Amount in ₹. Decimals welcome, regret optional.",
  ],
  remarks: [
    "Any excuses? Write them here.",
    "Optional. Like your gym membership.",
    "Notes for whoever reads this later. Probably you.",
    "Type the context. Or pretend there is none.",
    "Say something nice. Or honest. Pick one.",
    "Remarks. Future-you will thank present-you. Maybe.",
  ],
  vehicleNumber: [
    "MH 12 AB 7896. Format, please.",
    "License plate. With the spaces.",
    "Plate number. The one on the RC, not the bumper.",
    "4 wheels, 8 characters, 0 typos.",
    "Vehicle number. Capital letters preferred.",
    "Format: State District Series Number. Spaces help.",
  ],
  consignmentNumber: [
    "Consignment #. From the LR, not memory.",
    "GR/consignment number. Check twice.",
    "The number on the bilti. Not the truck.",
    "Consignment #. Rean will verify. She always does.",
    "Letters, digits, dashes. Whatever the format is.",
    "Consignment number. The consignee has it too.",
  ],
  address: [
    "Full address. Pincode included.",
    "Where the truck actually goes, not where it should.",
    "Address. GPS will second-guess it anyway.",
    "Plot, street, area, city. In that order.",
    "Address. Spelled like the postman expects.",
    "Door, street, area, landmark, city. All of it.",
  ],
  pincode: [
    "6 digits. India has a lot of them.",
    "Pincode. The post office knows it by heart.",
    "6-digit pincode. No, 4 isn't enough.",
    "Pincode. Look it up if unsure.",
    "First 2 = state-ish, last 4 = somewhere.",
    "Pincode. 6 digits, no spaces.",
  ],
  city: [
    "City. Spelled the way India spells it.",
    "Mumbai, not Bombay. Unless you're vintage.",
    "City name. We'll add the chaos.",
    "Pick a city. Any city. Well, any Indian one.",
    "City. The one the truck is heading to.",
    "City. Tier-1, Tier-2, we don't judge.",
  ],
  driverName: [
    "Driver name. The one on the licence.",
    "Who's behind the wheel? Full name, please.",
    "Driver. Not 'Sahi bhai', the actual name.",
    "Name from the RC book. We trust that more.",
    "Driver name. He'll get the SMS too.",
    "Driver's full name. Spelled like the licence.",
  ],
  rate: [
    "₹ per unit. Don't lowball yourself.",
    "Rate. What you'll charge, not what you'll get.",
    "Numbers only. The market doesn't accept emojis.",
    "Rate per ton/km/trip. Pick one, type it.",
    "₹ rate. Round numbers feel honest.",
    "Rate. Higher than fuel, lower than the customer's patience.",
  ],
} as const;

// ===== Empty states =====
export const emptyStateMessages: readonly string[] = [
  "Nothing here. Like your weekend plans.",
  "Crickets. Create something.",
  "This is emptier than a truck on Sunday.",
  "No records. Yet. Hint hint.",
  "Tabula rasa. Now fill it.",
  "Zero results. Either filter less, or do more.",
  "Blank canvas. Pretend it's strategic.",
  "Nothing to show. Rean's disappointed too.",
  "Looks like everyone's on time today. Suspicious.",
  "Page 1 of nothing. Create the first.",
  "No data. Or as we call it: Tuesday morning.",
  "Empty. The DB is judging you.",
  "Nothing yet. Rean says that's a choice.",
  "Zero. Like the truck's fuel gauge, probably.",
];

// ===== Loading states =====
export const loadingMessages: readonly string[] = [
  "Counting wheels…",
  "Bribing the database…",
  "Asking Rean nicely…",
  "Untangling the GST…",
  "Polishing the odometers…",
  "Convincing the GPS to share…",
  "Filling out 27B forms in triplicate…",
  "Chasing the deadline…",
  "Herding trucks…",
  "Reading every invoice. Even the boring ones.",
  "Converting km to rupees to regret…",
  "Loading. Like your drivers, but faster.",
  "Haggling with the API…",
  "Rean is thinking. She does that.",
];

// ===== Category union type for SavageInput / SavageTextarea =====
export type InputCategory = keyof typeof inputPlaceholders;

/** Context categories for non-input surfaces (search bar, chat, rean, etc.). */
export type ContextCategory =
  | "search"
  | "chat"
  | "rean"
  | "emptyState"
  | "loading";

/** All categories accepted by SavageInput / SavageTextarea. */
export type SavageCategory = InputCategory | ContextCategory;

/** Returns the array of strings for the given category. */
export function placeholdersFor(category: SavageCategory): readonly string[] {
  switch (category) {
    case "search":
      return searchPlaceholders;
    case "chat":
      return chatComposerPlaceholders;
    case "rean":
      return reanComposerPlaceholders;
    case "emptyState":
      return emptyStateMessages;
    case "loading":
      return loadingMessages;
    default:
      return inputPlaceholders[category as InputCategory];
  }
}
