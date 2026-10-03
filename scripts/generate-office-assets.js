import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'public', 'office');

const dirs = [
  path.join(outDir, 'environment'),
  path.join(outDir, 'furniture'),
  path.join(outDir, 'characters'),
];

for (const d of dirs) {
  fs.mkdirSync(d, { recursive: true });
}

// 1. Environment Assets
const floorTileSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="32" viewBox="0 0 64 32">
  <polygon points="32,0 64,16 32,32 0,16" fill="#f8f5ee" stroke="#e6decb" stroke-width="1"/>
  <polygon points="32,2 62,16 32,30 2,16" fill="#fdfbf7" fill-opacity="0.6"/>
</svg>`;

const wallStraightSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <!-- Isometric Wall facing South-West -->
  <polygon points="0,16 32,0 32,48 0,64" fill="#ede4d0" stroke="#d5c7ab" stroke-width="1"/>
  <polygon points="32,0 64,16 64,64 32,48" fill="#e2d6be" stroke="#cbbca0" stroke-width="1"/>
  <polygon points="0,16 32,0 64,16 32,32" fill="#f8f4ea" stroke="#d5c7ab" stroke-width="1"/>
  <!-- Baseboard trim -->
  <polygon points="0,60 32,44 32,48 0,64" fill="#a48c68"/>
  <polygon points="32,44 64,60 64,64 32,48" fill="#8c7554"/>
</svg>`;

const makeRug = (primary, border) => `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="64" viewBox="0 0 128 64">
  <polygon points="64,0 128,32 64,64 0,32" fill="${border}" fill-opacity="0.3"/>
  <polygon points="64,4 120,32 64,60 8,32" fill="${primary}" fill-opacity="0.25"/>
  <polygon points="64,8 112,32 64,56 16,32" fill="${primary}" fill-opacity="0.4" stroke="${border}" stroke-width="1.5" stroke-dasharray="4,2"/>
</svg>`;

// 2. Furniture Assets
const deskExecutiveSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="64" viewBox="0 0 80 64">
  <!-- Desk Base -->
  <polygon points="10,36 40,21 70,36 40,51" fill="#784725"/>
  <polygon points="10,36 40,51 40,59 10,44" fill="#583115"/>
  <polygon points="40,51 70,36 70,44 40,59" fill="#44240e"/>
  <!-- Desk Top (Rich Walnut) -->
  <polygon points="10,32 40,17 70,32 40,47" fill="#8d562e" stroke="#583115" stroke-width="1"/>
  <polygon points="10,32 40,47 40,50 10,35" fill="#6d401e"/>
  <polygon points="40,47 70,32 70,35 40,50" fill="#583115"/>
  <!-- Laptop on desk -->
  <polygon points="32,28 42,23 48,26 38,31" fill="#cbd5e1"/>
  <polygon points="38,31 48,26 46,20 36,25" fill="#334155"/>
  <!-- Brass Desk Lamp -->
  <circle cx="56" cy="28" r="4" fill="#fbbf24"/>
  <line x1="56" y1="28" x2="56" y2="34" stroke="#d97706" stroke-width="2"/>
</svg>`;

const deskFinanceSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="64" viewBox="0 0 80 64">
  <!-- Desk Top (Light Oak) -->
  <polygon points="10,32 40,17 70,32 40,47" fill="#dfbe99" stroke="#b08b5e" stroke-width="1"/>
  <polygon points="10,32 40,47 40,50 10,35" fill="#b08b5e"/>
  <polygon points="40,47 70,32 70,35 40,50" fill="#8e6a41"/>
  <!-- Desk Legs -->
  <line x1="12" y1="35" x2="12" y2="52" stroke="#475569" stroke-width="3"/>
  <line x1="68" y1="35" x2="68" y2="52" stroke="#475569" stroke-width="3"/>
  <line x1="40" y1="50" x2="40" y2="58" stroke="#334155" stroke-width="3"/>
  <!-- Dual Finance Monitors (Ledger Green) -->
  <polygon points="26,20 38,14 38,24 26,30" fill="#10b981" stroke="#065f46" stroke-width="1"/>
  <polygon points="42,16 54,10 54,20 42,26" fill="#10b981" stroke="#065f46" stroke-width="1"/>
  <!-- Calculator & Ledger -->
  <polygon points="28,34 34,31 38,33 32,36" fill="#fef08a"/>
</svg>`;

const deskEngineeringSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="64" viewBox="0 0 80 64">
  <!-- Tech Desk Top (Matte Slate / Dark Oak) -->
  <polygon points="10,32 40,17 70,32 40,47" fill="#334155" stroke="#1e293b" stroke-width="1"/>
  <polygon points="10,32 40,47 40,50 10,35" fill="#1e293b"/>
  <polygon points="40,47 70,32 70,35 40,50" fill="#0f172a"/>
  <!-- Steel Legs -->
  <line x1="12" y1="35" x2="12" y2="52" stroke="#64748b" stroke-width="3"/>
  <line x1="68" y1="35" x2="68" y2="52" stroke="#64748b" stroke-width="3"/>
  <!-- Ultrawide Curved Monitor (Cyan Glow) -->
  <polygon points="25,18 45,8 55,13 35,23" fill="#38bdf8" stroke="#0284c7" stroke-width="1.5"/>
  <line x1="40" y1="18" x2="40" y2="28" stroke="#94a3b8" stroke-width="2"/>
  <!-- Mechanical Keyboard (RGB) -->
  <polygon points="30,34 40,29 46,32 36,37" fill="#0f172a" stroke="#818cf8" stroke-width="1"/>
</svg>`;

const chairOfficeSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="54" viewBox="0 0 48 54">
  <!-- Star Base -->
  <line x1="24" y1="46" x2="14" y2="50" stroke="#334155" stroke-width="2"/>
  <line x1="24" y1="46" x2="34" y2="50" stroke="#334155" stroke-width="2"/>
  <line x1="24" y1="46" x2="24" y2="52" stroke="#1e293b" stroke-width="2"/>
  <circle cx="24" cy="46" r="3" fill="#0f172a"/>
  <!-- Pneumatic Post -->
  <line x1="24" y1="36" x2="24" y2="46" stroke="#64748b" stroke-width="3"/>
  <!-- Seat Cushion -->
  <polygon points="12,30 24,24 36,30 24,36" fill="#1e293b" stroke="#0f172a" stroke-width="1"/>
  <!-- Mesh Backrest -->
  <polygon points="14,14 24,9 34,14 24,19" fill="#334155" stroke="#1e293b" stroke-width="1"/>
  <polygon points="14,14 24,19 24,29 14,24" fill="#1e293b"/>
  <polygon points="24,19 34,14 34,24 24,29" fill="#0f172a"/>
</svg>`;

const tableMeetingSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="80" viewBox="0 0 128 80">
  <!-- Conference Table Top -->
  <polygon points="16,40 64,16 112,40 64,64" fill="#a47148" stroke="#6b4423" stroke-width="1.5"/>
  <polygon points="16,40 64,64 64,69 16,45" fill="#6b4423"/>
  <polygon points="64,64 112,40 112,45 64,69" fill="#533217"/>
  <!-- Inset Glass / Cable Runner -->
  <polygon points="36,40 64,26 92,40 64,54" fill="#38bdf8" fill-opacity="0.3" stroke="#0284c7" stroke-width="1"/>
  <!-- Twin Pedestal Bases -->
  <polygon points="36,54 44,50 44,68 36,72" fill="#334155"/>
  <polygon points="84,54 92,50 92,68 84,72" fill="#334155"/>
</svg>`;

const boardOperationsSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="74" viewBox="0 0 80 74">
  <!-- Stand Legs -->
  <line x1="20" y1="46" x2="16" y2="70" stroke="#78716c" stroke-width="3"/>
  <line x1="60" y1="46" x2="64" y2="70" stroke="#78716c" stroke-width="3"/>
  <!-- Board Frame -->
  <polygon points="10,24 40,9 70,24 40,39" fill="#ca8a04"/>
  <polygon points="10,24 40,39 40,59 10,44" fill="#d97706" stroke="#92400e" stroke-width="1"/>
  <polygon points="40,39 70,24 70,44 40,59" fill="#b45309" stroke="#78350f" stroke-width="1"/>
  <!-- Cork Facing -->
  <polygon points="13,27 38,39 38,55 13,43" fill="#fde68a"/>
  <!-- Pushpin Sticky Notes -->
  <polygon points="16,33 22,30 22,36 16,39" fill="#f43f5e"/>
  <polygon points="26,38 32,35 32,41 26,44" fill="#38bdf8"/>
  <polygon points="18,41 24,38 24,44 18,47" fill="#fbbf24"/>
  <polygon points="28,45 34,42 34,48 28,51" fill="#4ade80"/>
</svg>`;

const deskReviewSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="64" viewBox="0 0 80 64">
  <!-- Desk Top (Amber / Teak) -->
  <polygon points="10,32 40,17 70,32 40,47" fill="#d97706" stroke="#92400e" stroke-width="1"/>
  <polygon points="10,32 40,47 40,50 10,35" fill="#b45309"/>
  <polygon points="40,47 70,32 70,35 40,50" fill="#92400e"/>
  <!-- Legs -->
  <line x1="12" y1="35" x2="12" y2="54" stroke="#451a03" stroke-width="3"/>
  <line x1="68" y1="35" x2="68" y2="54" stroke="#451a03" stroke-width="3"/>
  <!-- In/Out Document Trays (Stacked Amber Trays) -->
  <polygon points="20,28 32,22 36,24 24,30" fill="#fbbf24" stroke="#d97706" stroke-width="1"/>
  <polygon points="20,25 32,19 36,21 24,27" fill="#fef08a" stroke="#d97706" stroke-width="1"/>
  <!-- Review Stamp & Ink Pad -->
  <circle cx="50" cy="27" r="3" fill="#ef4444"/>
  <rect x="56" y="27" width="6" height="4" fill="#1e293b"/>
</svg>`;

const cabinetFilingSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="64" viewBox="0 0 48 64">
  <!-- Isometric 3-Face Filing Cabinet -->
  <polygon points="8,16 24,8 40,16 24,24" fill="#94a3b8" stroke="#64748b" stroke-width="1"/>
  <polygon points="8,16 24,24 24,56 8,48" fill="#64748b" stroke="#475569" stroke-width="1"/>
  <polygon points="24,24 40,16 40,48 24,56" fill="#475569" stroke="#334155" stroke-width="1"/>
  <!-- Drawer Lines & Handles -->
  <line x1="11" y1="28" x2="21" y2="33" stroke="#cbd5e1" stroke-width="1.5"/>
  <line x1="11" y1="38" x2="21" y2="43" stroke="#cbd5e1" stroke-width="1.5"/>
  <line x1="11" y1="48" x2="21" y2="53" stroke="#cbd5e1" stroke-width="1.5"/>
  <circle cx="16" cy="30" r="1.5" fill="#f8fafc"/>
  <circle cx="16" cy="40" r="1.5" fill="#f8fafc"/>
  <circle cx="16" cy="50" r="1.5" fill="#f8fafc"/>
</svg>`;

const rackServerSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="74" viewBox="0 0 48 74">
  <!-- Server Rack Body -->
  <polygon points="8,16 24,8 40,16 24,24" fill="#334155" stroke="#1e293b" stroke-width="1"/>
  <polygon points="8,16 24,24 24,66 8,58" fill="#1e293b" stroke="#0f172a" stroke-width="1"/>
  <polygon points="24,24 40,16 40,58 24,66" fill="#0f172a" stroke="#020617" stroke-width="1"/>
  <!-- Blinking LEDs & Server Units -->
  <circle cx="12" cy="28" r="1.5" fill="#22c55e"/>
  <circle cx="16" cy="30" r="1.5" fill="#38bdf8"/>
  <circle cx="12" cy="38" r="1.5" fill="#22c55e"/>
  <circle cx="16" cy="40" r="1.5" fill="#eab308"/>
  <circle cx="12" cy="48" r="1.5" fill="#38bdf8"/>
  <circle cx="16" cy="50" r="1.5" fill="#22c55e"/>
  <!-- Horizontal vent slots -->
  <line x1="27" y1="28" x2="37" y2="23" stroke="#475569" stroke-width="1"/>
  <line x1="27" y1="36" x2="37" y2="31" stroke="#475569" stroke-width="1"/>
  <line x1="27" y1="44" x2="37" y2="39" stroke="#475569" stroke-width="1"/>
  <line x1="27" y1="52" x2="37" y2="47" stroke="#475569" stroke-width="1"/>
</svg>`;

const plantPottedSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="64" viewBox="0 0 48 64">
  <!-- Terracotta Pot -->
  <polygon points="16,42 24,38 32,42 24,46" fill="#ea580c"/>
  <polygon points="16,42 24,46 22,58 18,58" fill="#c2410c"/>
  <polygon points="24,46 32,42 30,58 22,58" fill="#9a3412"/>
  <!-- Monstera Leaves -->
  <circle cx="24" cy="26" r="12" fill="#15803d"/>
  <circle cx="16" cy="20" r="9" fill="#16a34a"/>
  <circle cx="32" cy="22" r="10" fill="#22c55e"/>
  <circle cx="24" cy="14" r="8" fill="#4ade80"/>
</svg>`;

const sofaLoungeSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="64" viewBox="0 0 96 64">
  <!-- Sofa Base & Cushions (Warm Ochre / Mustard) -->
  <polygon points="12,34 48,16 84,34 48,52" fill="#eab308" stroke="#ca8a04" stroke-width="1.5"/>
  <polygon points="12,34 48,52 48,58 12,40" fill="#ca8a04"/>
  <polygon points="48,52 84,34 84,40 48,58" fill="#a16207"/>
  <!-- Backrest -->
  <polygon points="12,22 48,4 84,22 48,40" fill="#facc15" stroke="#ca8a04" stroke-width="1"/>
  <polygon points="12,22 48,40 48,46 12,28" fill="#ca8a04"/>
  <polygon points="48,40 84,22 84,28 48,46" fill="#a16207"/>
  <!-- Throw Pillow -->
  <polygon points="26,30 36,25 40,29 30,34" fill="#38bdf8"/>
</svg>`;

const coffeeMachineSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="56" viewBox="0 0 48 56">
  <!-- Counter Top -->
  <polygon points="8,26 24,18 40,26 24,34" fill="#e2e8f0" stroke="#cbd5e1" stroke-width="1"/>
  <polygon points="8,26 24,34 24,50 8,42" fill="#94a3b8"/>
  <polygon points="24,34 40,26 40,42 24,50" fill="#64748b"/>
  <!-- Espresso Machine -->
  <rect x="18" y="10" width="12" height="16" rx="2" fill="#dc2626"/>
  <rect x="20" y="20" width="8" height="6" fill="#1e293b"/>
  <!-- Coffee Mug -->
  <circle cx="24" cy="24" r="2.5" fill="#f8fafc"/>
</svg>`;

// 3. Characters
const makeCharacterSvg = ({ hairColor, skinColor, outfitColor, secondaryColor, accessory = '' }) => {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="64" viewBox="0 0 48 64">
    <!-- Ground Shadow -->
    <ellipse cx="24" cy="58" rx="14" ry="5" fill="#422006" fill-opacity="0.25"/>
    <!-- Feet / Shoes -->
    <ellipse cx="20" cy="56" rx="4" ry="2.5" fill="#1e293b"/>
    <ellipse cx="28" cy="56" rx="4" ry="2.5" fill="#1e293b"/>
    <!-- Legs / Trousers -->
    <line x1="20" y1="46" x2="20" y2="55" stroke="#334155" stroke-width="4" stroke-linecap="round"/>
    <line x1="28" y1="46" x2="28" y2="55" stroke="#334155" stroke-width="4" stroke-linecap="round"/>
    <!-- Body / Outfit -->
    <rect x="14" y="30" width="20" height="18" rx="6" fill="${outfitColor}"/>
    <rect x="18" y="32" width="12" height="14" rx="3" fill="${secondaryColor}"/>
    <!-- Arms -->
    <circle cx="13" cy="38" r="3.5" fill="${outfitColor}"/>
    <circle cx="35" cy="38" r="3.5" fill="${outfitColor}"/>
    <circle cx="13" cy="43" r="2.5" fill="${skinColor}"/>
    <circle cx="35" cy="43" r="2.5" fill="${skinColor}"/>
    <!-- Head -->
    <circle cx="24" cy="20" r="14" fill="${skinColor}"/>
    <!-- Hair -->
    <path d="M12,18 C12,9 17,6 24,6 C31,6 36,9 36,18 C33,12 28,12 24,12 C20,12 15,12 12,18 Z" fill="${hairColor}"/>
    <!-- Face: Eyes & Shine & Blush -->
    <circle cx="20" cy="20" r="2" fill="#1e293b"/>
    <circle cx="28" cy="20" r="2" fill="#1e293b"/>
    <circle cx="19.5" cy="19.5" r="0.6" fill="#ffffff"/>
    <circle cx="27.5" cy="19.5" r="0.6" fill="#ffffff"/>
    <ellipse cx="17" cy="23" rx="2" ry="1" fill="#f43f5e" fill-opacity="0.5"/>
    <ellipse cx="31" cy="23" rx="2" ry="1" fill="#f43f5e" fill-opacity="0.5"/>
    <!-- Smile -->
    <path d="M21,24 Q24,27 27,24" stroke="#78350f" stroke-width="1.2" fill="none" stroke-linecap="round"/>
    ${accessory}
  </svg>`;
};

// Write files
const files = {
  // Environment
  'environment/floor_tile.svg': floorTileSvg,
  'environment/wall_straight.svg': wallStraightSvg,
  'environment/rug_executive.svg': makeRug('#1e3a8a', '#fbbf24'),
  'environment/rug_meeting.svg': makeRug('#312e81', '#38bdf8'),
  'environment/rug_finance.svg': makeRug('#064e3b', '#34d399'),
  'environment/rug_engineering.svg': makeRug('#0f172a', '#38bdf8'),
  'environment/rug_lounge.svg': makeRug('#7c2d12', '#fb923c'),

  // Furniture
  'furniture/desk_executive.svg': deskExecutiveSvg,
  'furniture/desk_finance.svg': deskFinanceSvg,
  'furniture/desk_engineering.svg': deskEngineeringSvg,
  'furniture/chair_office.svg': chairOfficeSvg,
  'furniture/table_meeting.svg': tableMeetingSvg,
  'furniture/board_operations.svg': boardOperationsSvg,
  'furniture/desk_review.svg': deskReviewSvg,
  'furniture/cabinet_filing.svg': cabinetFilingSvg,
  'furniture/rack_server.svg': rackServerSvg,
  'furniture/plant_potted.svg': plantPottedSvg,
  'furniture/sofa_lounge.svg': sofaLoungeSvg,
  'furniture/coffee_machine.svg': coffeeMachineSvg,

  // Characters
  'characters/cos_idle.svg': makeCharacterSvg({
    hairColor: '#3b1d11',
    skinColor: '#fbd5b5',
    outfitColor: '#1e3a8a',
    secondaryColor: '#8b5cf6',
    accessory: '<polygon points="23,34 25,34 26,42 24,44 22,42" fill="#7c3aed"/>' // Tie
  }),
  'characters/cos_walk.svg': makeCharacterSvg({
    hairColor: '#3b1d11',
    skinColor: '#fbd5b5',
    outfitColor: '#1e3a8a',
    secondaryColor: '#8b5cf6',
    accessory: '<polygon points="23,34 25,34 26,42 24,44 22,42" fill="#7c3aed"/>'
  }),
  'characters/cos_sit.svg': makeCharacterSvg({
    hairColor: '#3b1d11',
    skinColor: '#fbd5b5',
    outfitColor: '#1e3a8a',
    secondaryColor: '#8b5cf6',
    accessory: '<polygon points="23,34 25,34 26,42 24,44 22,42" fill="#7c3aed"/>'
  }),

  'characters/accountant_idle.svg': makeCharacterSvg({
    hairColor: '#1e293b',
    skinColor: '#fed7aa',
    outfitColor: '#065f46',
    secondaryColor: '#10b981',
    accessory: '<!-- Glasses --><rect x="17" y="18" width="5" height="4" rx="1" fill="none" stroke="#0f172a" stroke-width="1.2"/><rect x="26" y="18" width="5" height="4" rx="1" fill="none" stroke="#0f172a" stroke-width="1.2"/><line x1="22" y1="20" x2="26" y2="20" stroke="#0f172a" stroke-width="1.2"/>'
  }),
  'characters/accountant_walk.svg': makeCharacterSvg({
    hairColor: '#1e293b',
    skinColor: '#fed7aa',
    outfitColor: '#065f46',
    secondaryColor: '#10b981',
    accessory: '<rect x="17" y="18" width="5" height="4" rx="1" fill="none" stroke="#0f172a" stroke-width="1.2"/><rect x="26" y="18" width="5" height="4" rx="1" fill="none" stroke="#0f172a" stroke-width="1.2"/><line x1="22" y1="20" x2="26" y2="20" stroke="#0f172a" stroke-width="1.2"/>'
  }),
  'characters/accountant_sit.svg': makeCharacterSvg({
    hairColor: '#1e293b',
    skinColor: '#fed7aa',
    outfitColor: '#065f46',
    secondaryColor: '#10b981',
    accessory: '<rect x="17" y="18" width="5" height="4" rx="1" fill="none" stroke="#0f172a" stroke-width="1.2"/><rect x="26" y="18" width="5" height="4" rx="1" fill="none" stroke="#0f172a" stroke-width="1.2"/><line x1="22" y1="20" x2="26" y2="20" stroke="#0f172a" stroke-width="1.2"/>'
  }),

  'characters/developer_idle.svg': makeCharacterSvg({
    hairColor: '#78350f',
    skinColor: '#fecdd3',
    outfitColor: '#0284c7',
    secondaryColor: '#38bdf8',
    accessory: '<!-- Headphones --><path d="M11,18 C11,8 37,8 37,18" fill="none" stroke="#f43f5e" stroke-width="3"/><rect x="9" y="17" width="4" height="7" rx="2" fill="#e11d48"/><rect x="35" y="17" width="4" height="7" rx="2" fill="#e11d48"/>'
  }),
  'characters/developer_walk.svg': makeCharacterSvg({
    hairColor: '#78350f',
    skinColor: '#fecdd3',
    outfitColor: '#0284c7',
    secondaryColor: '#38bdf8',
    accessory: '<path d="M11,18 C11,8 37,8 37,18" fill="none" stroke="#f43f5e" stroke-width="3"/><rect x="9" y="17" width="4" height="7" rx="2" fill="#e11d48"/><rect x="35" y="17" width="4" height="7" rx="2" fill="#e11d48"/>'
  }),
  'characters/developer_sit.svg': makeCharacterSvg({
    hairColor: '#78350f',
    skinColor: '#fecdd3',
    outfitColor: '#0284c7',
    secondaryColor: '#38bdf8',
    accessory: '<path d="M11,18 C11,8 37,8 37,18" fill="none" stroke="#f43f5e" stroke-width="3"/><rect x="9" y="17" width="4" height="7" rx="2" fill="#e11d48"/><rect x="35" y="17" width="4" height="7" rx="2" fill="#e11d48"/>'
  }),
};

for (const [relPath, content] of Object.entries(files)) {
  const fullPath = path.join(outDir, relPath);
  fs.writeFileSync(fullPath, content.trim(), 'utf-8');
}

console.log(`Generated ${Object.keys(files).length} office sprite assets in public/office/`);
