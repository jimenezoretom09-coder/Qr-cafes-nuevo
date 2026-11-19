/**
 * Tarjetas QR tematicas "Alicia en el pais de las maravillas" (para cafes como El Sombrerero).
 *
 * Los dibujos son propios y las frases estan adaptadas del libro de Lewis Carroll (1865), que es
 * de dominio publico. No se usa nada de la pelicula de Disney (personajes, colores ni dibujos):
 * eso si tiene derechos de autor.
 */

const GOLD = "#b8893b";
const CREAM = "#f6eedb";

const emblems: Record<string, (p: string) => string> = {
  sombrerero: (p) => `
    <ellipse cx="100" cy="150" rx="74" ry="15" fill="${p}"/>
    <path d="M64 147 L54 58 Q100 46 146 58 L136 147 Z" fill="${p}"/>
    <ellipse cx="100" cy="58" rx="46" ry="10" fill="${p}" stroke="${GOLD}" stroke-width="2.5"/>
    <path d="M61 118 L139 118 L137 135 L63 135 Z" fill="${GOLD}"/>
    <g transform="rotate(14 128 100)">
      <rect x="110" y="86" width="40" height="27" rx="2" fill="${CREAM}" stroke="${p}" stroke-width="2"/>
      <text x="130" y="105" text-anchor="middle" font-family="IM Fell English" font-size="15" fill="${p}">10/6</text>
    </g>
    <path d="M104 84 L114 92" stroke="${CREAM}" stroke-width="1.5"/>`,

  conejo: (p) => {
    const ticks = Array.from({ length: 12 }, (_, i) => {
      const a = (i * Math.PI) / 6;
      const r1 = 44, r2 = i % 3 === 0 ? 36 : 40;
      return `<line x1="${100 + r1 * Math.sin(a)}" y1="${124 - r1 * Math.cos(a)}" x2="${100 + r2 * Math.sin(a)}" y2="${124 - r2 * Math.cos(a)}" stroke="${p}" stroke-width="${i % 3 === 0 ? 3 : 1.5}"/>`;
    }).join("");
    return `
    <g transform="rotate(-14 74 50)"><ellipse cx="74" cy="50" rx="14" ry="38" fill="${CREAM}" stroke="${p}" stroke-width="3"/><ellipse cx="74" cy="54" rx="6" ry="26" fill="${GOLD}" opacity=".55"/></g>
    <g transform="rotate(14 126 50)"><ellipse cx="126" cy="50" rx="14" ry="38" fill="${CREAM}" stroke="${p}" stroke-width="3"/><ellipse cx="126" cy="54" rx="6" ry="26" fill="${GOLD}" opacity=".55"/></g>
    <circle cx="100" cy="58" r="7" fill="none" stroke="${GOLD}" stroke-width="3"/>
    <rect x="94" y="62" width="12" height="9" rx="2" fill="${GOLD}"/>
    <circle cx="100" cy="124" r="56" fill="${CREAM}" stroke="${p}" stroke-width="5"/>
    <circle cx="100" cy="124" r="49" fill="none" stroke="${GOLD}" stroke-width="2"/>
    ${ticks}
    <text x="100" y="98" text-anchor="middle" font-family="IM Fell English" font-size="12" fill="${p}">XII</text>
    <text x="128" y="128" text-anchor="middle" font-family="IM Fell English" font-size="12" fill="${p}">III</text>
    <text x="100" y="157" text-anchor="middle" font-family="IM Fell English" font-size="12" fill="${p}">VI</text>
    <text x="72" y="128" text-anchor="middle" font-family="IM Fell English" font-size="12" fill="${p}">IX</text>
    <line x1="100" y1="124" x2="86" y2="97" stroke="${p}" stroke-width="3" stroke-linecap="round"/>
    <line x1="100" y1="124" x2="98" y2="104" stroke="${p}" stroke-width="4.5" stroke-linecap="round"/>
    <circle cx="100" cy="124" r="4" fill="${GOLD}"/>`;
  },

  cheshire: (p) => {
    const teeth = Array.from({ length: 9 }, (_, k) => {
      const t = (k + 1) / 10;
      const x = 36 + 128 * t;
      return `<line x1="${x}" y1="${104 + 48 * t * (1 - t)}" x2="${x}" y2="${104 + 156 * t * (1 - t)}" stroke="${p}" stroke-width="2"/>`;
    }).join("");
    return `
    <circle cx="100" cy="100" r="86" fill="none" stroke="${p}" stroke-width="2" stroke-dasharray="3 9" opacity=".35"/>
    <circle cx="100" cy="100" r="74" fill="none" stroke="${GOLD}" stroke-width="1.5" stroke-dasharray="2 10" opacity=".45"/>
    <path d="M48 70 Q70 48 92 70 Q70 90 48 70 Z" fill="${GOLD}" stroke="${p}" stroke-width="3"/>
    <ellipse cx="70" cy="70" rx="3.5" ry="11" fill="${p}"/>
    <path d="M108 70 Q130 48 152 70 Q130 90 108 70 Z" fill="${GOLD}" stroke="${p}" stroke-width="3"/>
    <ellipse cx="130" cy="70" rx="3.5" ry="11" fill="${p}"/>
    <path d="M36 104 Q100 182 164 104 Q100 128 36 104 Z" fill="${CREAM}" stroke="${p}" stroke-width="4" stroke-linejoin="round"/>
    ${teeth}
    <path d="M30 100 Q34 96 38 104" fill="none" stroke="${p}" stroke-width="3" stroke-linecap="round"/>
    <path d="M170 100 Q166 96 162 104" fill="none" stroke="${p}" stroke-width="3" stroke-linecap="round"/>`;
  },

  reina: (p) => `
    <path d="M62 66 L68 28 L86 50 L100 20 L114 50 L132 28 L138 66 Z" fill="${GOLD}" stroke="${p}" stroke-width="3" stroke-linejoin="round"/>
    <rect x="60" y="64" width="80" height="11" rx="2" fill="${GOLD}" stroke="${p}" stroke-width="3"/>
    <circle cx="68" cy="27" r="5" fill="${p}"/><circle cx="100" cy="19" r="5" fill="${p}"/><circle cx="132" cy="27" r="5" fill="${p}"/>
    <path d="M100 52 l5 6 -5 6 -5 -6z" fill="${p}"/>
    <path d="M100 182 C 30 134, 45 84, 82 88 C 94 90, 100 102, 100 108 C 100 102, 106 90, 118 88 C 155 84, 170 134, 100 182 Z" fill="${p}"/>
    <path d="M78 104 C 66 108, 62 122, 68 134" fill="none" stroke="${CREAM}" stroke-width="3" stroke-linecap="round" opacity=".7"/>`,

  alicia: (p) => {
    const star = (x: number, y: number, s: number) => `<path d="M${x} ${y - s} L${x + s * 0.28} ${y - s * 0.28} L${x + s} ${y} L${x + s * 0.28} ${y + s * 0.28} L${x} ${y + s} L${x - s * 0.28} ${y + s * 0.28} L${x - s} ${y} L${x - s * 0.28} ${y - s * 0.28} Z" fill="${GOLD}"/>`;
    return `
    ${star(46, 70, 9)}${star(156, 58, 7)}${star(160, 140, 10)}${star(40, 150, 6)}
    <rect x="89" y="30" width="22" height="20" rx="4" fill="${GOLD}" stroke="${p}" stroke-width="2.5"/>
    <path d="M88 50 L112 50 L112 80 L124 90 Q132 96 132 110 L132 168 Q132 178 122 178 L78 178 Q68 178 68 168 L68 110 Q68 96 76 90 L88 80 Z" fill="${CREAM}" stroke="${p}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M72 124 Q100 116 128 124 L128 166 Q128 173 121 173 L79 173 Q72 173 72 166 Z" fill="${p}" opacity=".85"/>
    <rect x="76" y="132" width="48" height="24" rx="3" fill="${CREAM}" stroke="${GOLD}" stroke-width="2"/>
    <text x="100" y="149" text-anchor="middle" font-family="IM Fell English SC" font-size="13" fill="${p}">Bébeme</text>
    <path d="M80 96 Q78 104 80 112" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/>`;
  },

  oruga: (p) => `
    <ellipse cx="96" cy="50" rx="13" ry="8" fill="none" stroke="${p}" stroke-width="3" opacity=".75"/>
    <ellipse cx="118" cy="32" rx="17" ry="10" fill="none" stroke="${p}" stroke-width="3" opacity=".5"/>
    <ellipse cx="144" cy="17" rx="21" ry="12" fill="none" stroke="${p}" stroke-width="3" opacity=".3"/>
    <path d="M86 122 Q82 160 76 178 L124 178 Q118 160 114 122 Z" fill="${CREAM}" stroke="${p}" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M36 122 Q36 70 100 64 Q164 70 164 122 Z" fill="${p}"/>
    <ellipse cx="100" cy="122" rx="64" ry="9" fill="${GOLD}" stroke="${p}" stroke-width="2.5"/>
    <circle cx="72" cy="94" r="9" fill="${CREAM}"/><circle cx="104" cy="80" r="7" fill="${CREAM}"/>
    <circle cx="134" cy="98" r="10" fill="${CREAM}"/><circle cx="96" cy="106" r="5" fill="${CREAM}"/>
    <path d="M60 178 Q100 170 140 178" stroke="${GOLD}" stroke-width="3" fill="none" stroke-linecap="round"/>`,

  liron: (p) => `
    <text x="150" y="52" font-family="IM Fell English" font-style="italic" font-size="22" fill="${GOLD}">z</text>
    <text x="164" y="36" font-family="IM Fell English" font-style="italic" font-size="17" fill="${GOLD}" opacity=".8">z</text>
    <text x="175" y="22" font-family="IM Fell English" font-style="italic" font-size="13" fill="${GOLD}" opacity=".6">z</text>
    <circle cx="86" cy="64" r="7" fill="${CREAM}" stroke="${p}" stroke-width="2.5"/>
    <circle cx="112" cy="64" r="7" fill="${CREAM}" stroke="${p}" stroke-width="2.5"/>
    <circle cx="99" cy="80" r="17" fill="${CREAM}" stroke="${p}" stroke-width="3"/>
    <path d="M90 78 q3 3 6 0 M102 78 q3 3 6 0" stroke="${p}" stroke-width="2" fill="none" stroke-linecap="round"/>
    <circle cx="99" cy="86" r="2" fill="${p}"/>
    <path d="M140 124 Q170 112 172 86 L163 86 Q160 108 138 112 Z" fill="${p}"/>
    <path d="M50 108 Q16 122 50 156" stroke="${p}" stroke-width="8" fill="none" stroke-linecap="round"/>
    <ellipse cx="96" cy="132" rx="52" ry="42" fill="${p}"/>
    <path d="M60 96 Q99 74 136 96 L132 100 L64 100 Z" fill="${GOLD}" stroke="${p}" stroke-width="2.5"/>
    <path d="M50 134 Q62 126 74 134 T98 134 T122 134 T146 134" stroke="${GOLD}" stroke-width="3" fill="none"/>
    <ellipse cx="96" cy="174" rx="36" ry="6" fill="${GOLD}"/>`,

  liebre: (p) => `
    <g transform="rotate(-16 76 58)"><ellipse cx="76" cy="58" rx="12" ry="42" fill="${CREAM}" stroke="${p}" stroke-width="3"/><ellipse cx="76" cy="62" rx="5" ry="30" fill="${GOLD}" opacity=".55"/></g>
    <g transform="rotate(16 124 58)"><ellipse cx="124" cy="58" rx="12" ry="42" fill="${CREAM}" stroke="${p}" stroke-width="3"/><ellipse cx="124" cy="62" rx="5" ry="30" fill="${GOLD}" opacity=".55"/></g>
    <path d="M100 96 Q92 84 100 72 Q108 60 100 48" stroke="${GOLD}" stroke-width="3" fill="none" stroke-linecap="round"/>
    <ellipse cx="100" cy="176" rx="74" ry="11" fill="${GOLD}" stroke="${p}" stroke-width="3"/>
    <path d="M148 118 Q180 118 170 142 Q162 156 140 150" stroke="${p}" stroke-width="8" fill="none" stroke-linecap="round"/>
    <path d="M46 108 L154 108 Q150 164 100 170 Q50 164 46 108 Z" fill="${p}"/>
    <ellipse cx="100" cy="108" rx="54" ry="10" fill="${CREAM}" stroke="${p}" stroke-width="3"/>
    <path d="M52 130 Q100 140 148 130" stroke="${GOLD}" stroke-width="3" fill="none"/>
    <path d="M100 146 l4 5 -4 5 -4 -5z" fill="${GOLD}"/>`,

  // Rey de Corazones: un naipe K de corazones.
  rey: (p) => `
    <g transform="rotate(-6 100 104)">
      <rect x="56" y="30" width="88" height="140" rx="10" fill="${CREAM}" stroke="${p}" stroke-width="4"/>
      <rect x="64" y="38" width="72" height="124" rx="6" fill="none" stroke="${GOLD}" stroke-width="2"/>
      <text x="72" y="62" font-family="IM Fell English" font-size="22" fill="#8f1d2c">K</text>
      <text x="128" y="156" font-family="IM Fell English" font-size="22" fill="#8f1d2c" text-anchor="end" transform="rotate(180 121 149)">K</text>
      <path d="M100 136 C 72 116, 78 92, 92 94 C 96 95, 100 100, 100 103 C 100 100, 104 95, 108 94 C 122 92, 128 116, 100 136 Z" fill="#8f1d2c"/>
      <path d="M80 86 L84 70 L92 80 L100 66 L108 80 L116 70 L120 86 Z" fill="${GOLD}" stroke="${p}" stroke-width="2"/>
    </g>`,

  // Los jardineros naipes, pintando las rosas de rojo.
  naipes: (p) => {
    const card = (rot: number, suit: string, color: string) => `
      <g transform="rotate(${rot} 100 170)">
        <rect x="70" y="52" width="60" height="96" rx="7" fill="${CREAM}" stroke="${p}" stroke-width="3"/>
        <text x="100" y="112" text-anchor="middle" font-family="DejaVu Serif, serif" font-size="34" fill="${color}">${suit}</text>
      </g>`;
    return `${card(-24, "♠", p)}${card(0, "♣", p)}${card(24, "♠", p)}
      <circle cx="150" cy="54" r="16" fill="#8f1d2c"/>
      <path d="M150 42 q-8 6 0 12 q8 6 0 12 M140 52 q10 -4 20 0" stroke="${CREAM}" stroke-width="2" fill="none"/>
      <path d="M146 70 Q140 86 132 96" stroke="${p}" stroke-width="3" fill="none"/>
      <path d="M40 60 L64 84" stroke="${GOLD}" stroke-width="6" stroke-linecap="round"/>
      <path d="M36 56 l8 -2 2 8 z" fill="#8f1d2c"/>`;
  },

  // La llave dorada y la puerta pequeña.
  llave: (p) => `
    <path d="M52 176 L52 96 Q52 52 100 52 Q148 52 148 96 L148 176 Z" fill="${p}"/>
    <path d="M62 176 L62 98 Q62 62 100 62 Q138 62 138 98 L138 176" fill="none" stroke="${GOLD}" stroke-width="2"/>
    <circle cx="124" cy="126" r="5" fill="${GOLD}"/>
    <g transform="rotate(-30 100 120)">
      <circle cx="70" cy="120" r="16" fill="none" stroke="${GOLD}" stroke-width="7"/>
      <circle cx="70" cy="120" r="5" fill="${p}"/>
      <rect x="84" y="116" width="72" height="8" rx="3" fill="${GOLD}"/>
      <rect x="138" y="124" width="7" height="14" fill="${GOLD}"/>
      <rect x="150" y="124" width="6" height="10" fill="${GOLD}"/>
    </g>`,

  // El pastelito "Cómeme".
  pastel: (p) => `
    <path d="M100 26 q6 10 0 16 q-6 -6 0 -16" fill="${GOLD}"/>
    <rect x="97" y="40" width="6" height="20" rx="2" fill="${CREAM}" stroke="${p}" stroke-width="2"/>
    <path d="M44 100 Q100 64 156 100 L156 112 L44 112 Z" fill="${CREAM}" stroke="${p}" stroke-width="3"/>
    <path d="M44 104 q10 14 20 0 q10 14 20 0 q10 14 20 0 q10 14 20 0 q10 14 20 0 q8 12 12 2" fill="${CREAM}" stroke="${p}" stroke-width="3"/>
    <rect x="44" y="110" width="112" height="56" rx="4" fill="${p}"/>
    <rect x="62" y="124" width="76" height="26" rx="3" fill="${CREAM}" stroke="${GOLD}" stroke-width="2"/>
    <text x="100" y="143" text-anchor="middle" font-family="IM Fell English SC" font-size="15" fill="${p}">Cómeme</text>
    <ellipse cx="100" cy="172" rx="70" ry="8" fill="${GOLD}"/>
    <circle cx="74" cy="92" r="5" fill="#8f1d2c"/><circle cx="126" cy="92" r="5" fill="#8f1d2c"/>`,
};

export interface AliceCharacter {
  key: string;
  pre: string;
  name: string;
  color: string;
  quote: string;
  sub: string;
}

/** Un personaje por mesa, en este orden. Si hay mas mesas que personajes, se repiten. */
export const ALICE_CHARACTERS: AliceCharacter[] = [
  { key: "sombrerero", pre: "Mesa del", name: "Sombrerero", color: "#1f4d47", quote: "¿Por qué un cuervo se parece a un escritorio?", sub: "Aquí siempre es la hora del té." },
  { key: "conejo", pre: "Mesa del", name: "Conejo Blanco", color: "#23305e", quote: "¡Ay, ay, que llego tarde!", sub: "Tu pedido no: síguelo en vivo desde aquí." },
  { key: "cheshire", pre: "Mesa del", name: "Gato de Cheshire", color: "#4e2552", quote: "Aquí todos estamos locos.", sub: "Escanea y verás aparecer la carta." },
  { key: "reina", pre: "Mesa de la", name: "Reina de Corazones", color: "#8f1d2c", quote: "¡Que le corten la cabeza!", sub: "…o mejor, que te traigan el postre." },
  { key: "alicia", pre: "Mesa de", name: "Alicia", color: "#2f5d73", quote: "¡Cada vez más curioso!", sub: "Mira cada plato en video antes de pedirlo." },
  { key: "oruga", pre: "Mesa de la", name: "Oruga Azul", color: "#2c3e7a", quote: "¿Y tú… quién eres?", sub: "Dinos tu nombre al escanear." },
  { key: "liron", pre: "Mesa del", name: "Lirón", color: "#5a3a22", quote: "Brilla, brilla, murcielaguito…", sub: "Pide otra taza sin levantarte de la silla." },
  { key: "liebre", pre: "Mesa de la", name: "Liebre de Marzo", color: "#6b2f45", quote: "¡No hay sitio! ¡No hay sitio!", sub: "Para ti sí: pide desde tu mesa." },
  { key: "rey", pre: "Mesa del", name: "Rey de Corazones", color: "#3d2b52", quote: "Empieza por el principio…", sub: "…y pide tu cuenta cuando llegues al final." },
  { key: "naipes", pre: "Mesa de los", name: "Jardineros", color: "#2f4a2a", quote: "¡Pintemos las rosas de rojo!", sub: "Aquí lo único que pintamos es tu café." },
  { key: "llave", pre: "Mesa de la", name: "Llave Dorada", color: "#264653", quote: "Una puerta muy pequeñita…", sub: "Este QR abre la carta de la casa." },
  { key: "pastel", pre: "Mesa del", name: "Pastelito Cómeme", color: "#7a3b2e", quote: "Decía “Cómeme” en letras de pasas.", sub: "Pregunta por la repostería del día." },
];

// Mini sombrero en el centro del QR (el nivel de correccion H tolera hasta ~30% tapado).
const hatLogo = (p: string) => `
  <circle cx="50" cy="50" r="50" fill="#fff"/>
  <circle cx="50" cy="50" r="44" fill="none" stroke="${p}" stroke-width="3"/>
  <ellipse cx="50" cy="66" rx="30" ry="6" fill="${p}"/>
  <path d="M35 65 L30 30 Q50 25 70 30 L65 65 Z" fill="${p}"/>
  <path d="M33 54 L67 54 L66 61 L34 61 Z" fill="${GOLD}"/>`;

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

const paper = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .45  0 0 0 0 .35  0 0 0 0 .2  0 0 0 .07 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`
)}")`;

const CSS = `
@page { size: A4; margin: 8mm; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #e9e4da; font-family: "Cormorant Garamond", serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.sheet { display: grid; grid-template-columns: repeat(2, 95mm); gap: 6mm; justify-content: center; padding: 6mm 0; }
@media print { body { background: none; } .sheet { padding: 0; break-after: page; } .noprint { display: none; } }
.noprint { text-align: center; padding: 12px; font: 14px system-ui; color: #444; }
.card { position: relative; width: 95mm; height: 140mm; overflow: hidden; text-align: center; color: var(--p);
  background: ${paper}, radial-gradient(ellipse at 50% 40%, #fbf6ea 0%, #f3e8cf 70%, #e9dabb 100%);
  padding: 9mm 9mm 0; display: flex; flex-direction: column; align-items: center; break-inside: avoid;
  outline: 0.2mm dashed #bfb6a5; outline-offset: 2mm; }
.frame { position: absolute; inset: 3.2mm; border: 1.1mm solid var(--p); border-radius: 2.5mm; pointer-events: none; }
.frame::after { content: ""; position: absolute; inset: 1.2mm; border: 0.35mm solid ${GOLD}; border-radius: 1.6mm; }
.suit { position: absolute; font-size: 5.2mm; line-height: 1; font-family: "DejaVu Serif", serif; background: #f6eedb; padding: 0 0.6mm; }
.suit.tl { top: 1.6mm; left: 6mm; } .suit.tr { top: 1.6mm; right: 6mm; } .suit.bl { bottom: 1.6mm; left: 6mm; } .suit.br { bottom: 1.6mm; right: 6mm; }
.logo-img { height: 11mm; width: 11mm; object-fit: cover; border-radius: 50%; margin-bottom: 1mm; }
.brand { font-family: "IM Fell English SC", serif; font-size: 6.4mm; letter-spacing: 0.6mm; line-height: 1; }
.tag { font-size: 3mm; letter-spacing: 0.5mm; text-transform: uppercase; color: ${GOLD}; font-weight: 700; margin-top: 1mm; }
.emblem { width: 31mm; height: 31mm; margin: 3mm 0 1mm; }
.with-logo .emblem { width: 26mm; height: 26mm; margin-top: 1.5mm; }
.pre { font-family: "IM Fell English", serif; font-style: italic; font-size: 3.8mm; line-height: 1; color: ${GOLD}; }
h2 { font-family: "IM Fell English", serif; font-weight: 400; font-size: 7.6mm; line-height: 1.05; white-space: nowrap; }
.quote { font-family: "IM Fell English", serif; font-style: italic; font-size: 4.3mm; margin-top: 1.8mm; line-height: 1.15; }
.sub { font-size: 3.6mm; font-weight: 600; color: #4a3f33; margin-top: 0.8mm; line-height: 1.2; max-width: 74mm; margin-bottom: 3mm; }
.qrbox { margin-top: auto; background: #fff; padding: 2.6mm; border-radius: 3mm; border: 0.5mm solid var(--p); box-shadow: 0 0 0 1mm #fff, 0 0 0 1.3mm ${GOLD}; }
.qr { position: relative; width: 33mm; height: 33mm; }
.qr > svg:first-child { width: 100%; height: 100%; display: block; }
.hat { position: absolute; width: 8.5mm; height: 8.5mm; left: 50%; top: 50%; transform: translate(-50%, -50%); }
.how { font-size: 3.15mm; font-weight: 700; margin-top: 3mm; color: var(--p); letter-spacing: 0.15mm; }
.num { font-family: "IM Fell English SC", serif; font-size: 3.6mm; color: ${GOLD}; margin: 1mm 0 6.5mm; }
`;

export interface AliceCardInput {
  tableLabel: string;
  /** SVG del QR (generado con color oscuro y fondo transparente). */
  qrSvg: string;
  character: AliceCharacter;
}

/** Pagina lista para imprimir: 4 tarjetas de 9,5 x 14 cm por hoja A4, con linea de corte. */
export function buildAliceCardsHtml(params: {
  businessName: string;
  tagline: string;
  logoUrl: string | null;
  cards: AliceCardInput[];
}): string {
  const { businessName, tagline, logoUrl } = params;
  const cardHtml = params.cards.map(({ tableLabel, qrSvg, character: t }) => {
    const suitColor = (s: string) => (s === "♥" || s === "♦" ? "#8f1d2c" : t.color);
    const corner = (cls: string, s: string) => `<span class="suit ${cls}" style="color:${suitColor(s)}">${s}</span>`;
    return `
    <section class="card${logoUrl ? " with-logo" : ""}" style="--p:${t.color}">
      <div class="frame"></div>
      ${corner("tl", "♠")}${corner("tr", "♥")}${corner("bl", "♦")}${corner("br", "♣")}
      <header>
        ${logoUrl ? `<img class="logo-img" src="${esc(logoUrl)}" alt=""/>` : ""}
        <p class="brand">${esc(businessName)}</p>
        ${tagline ? `<p class="tag">${esc(tagline)}</p>` : ""}
      </header>
      <svg class="emblem" viewBox="0 0 200 200">${emblems[t.key](t.color)}</svg>
      <p class="pre">${t.pre}</p>
      <h2>${t.name}</h2>
      <p class="quote">«${t.quote.replace(/^«|»$/g, "")}»</p>
      <p class="sub">${t.sub}</p>
      <div class="qrbox"><div class="qr">${qrSvg}<svg class="hat" viewBox="0 0 100 100">${hatLogo(t.color)}</svg></div></div>
      <p class="how">Escanea con la cámara · Pide · Sigue tu pedido en vivo</p>
      <p class="num">— Mesa ${esc(tableLabel)} —</p>
    </section>`;
  });
  const sheets: string[] = [];
  for (let i = 0; i < cardHtml.length; i += 4) sheets.push(`<div class="sheet">${cardHtml.slice(i, i + 4).join("")}</div>`);

  return `<!doctype html><html lang="es"><head><meta charset="utf-8"/><title>QR de las mesas</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=IM+Fell+English:ital@0;1&family=IM+Fell+English+SC&family=Cormorant+Garamond:wght@500;600;700&display=swap" rel="stylesheet"/>
<style>${CSS}</style></head><body>
<p class="noprint">Imprime en A4, a tamaño real (100%), en cartulina con laminado mate. Corta por la línea punteada.</p>
${sheets.join("")}
<script>document.fonts.ready.then(() => setTimeout(() => window.print(), 400));</script>
</body></html>`;
}
