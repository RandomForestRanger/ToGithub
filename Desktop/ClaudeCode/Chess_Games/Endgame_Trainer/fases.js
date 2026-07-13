// ─── Skaakmat Afrigter — Fase-Poorte (Opdrag 4) ──────────────────────────────
// Data, nie kode nie: die kurrikulum-struktuur wat lottery-volgorde vervang.
// Fase-ontsluiting word AFGELEI (nooit gestoor nie) — sien isFaseUnlocked()
// in app.js. Hierdie lêer bevat GEEN logika nie, net die tipe-groepering.
//
// Tipe 4 (L+R-mat) skuif konseptueel van "basiese mat" na Meesterklas — dis
// wel 'n basiese-materiaal-mat, maar teen DTM tot 33 is dit die moeilikste
// tegniek in die app en hoort aan die einde, nie die begin nie.
//
// Tipe 10 (Driehoeksbeweging) is permanent gesny (Opdrag 6b) — nie net
// "in herbou" nie. Sien CLAUDE.md se grafskrif-paragraaf vir die rede.

const FASES = [
  { id: 1, name: 'Basiese Mats',     types: [1, 2, 3] },
  { id: 2, name: 'Pioneindspele',    types: [6, 7, 8, 9, 11, 12] },
  { id: 3, name: 'Toringeindspele',  types: [13, 14, 15, 16] },
  { id: 4, name: 'Meesterklas',      types: [4, 5, 17, 18, 19, 20] },
  // Fase 5 (Opdrag 8b): gepoort deur Fase 4 se bronse, per die standaardreël
  // in isFaseUnlocked() — geen nuwe logika benodig nie.
  { id: 5, name: 'Fyn Kuns',         types: [22, 23, 24, 25, 26, 27] },
]
