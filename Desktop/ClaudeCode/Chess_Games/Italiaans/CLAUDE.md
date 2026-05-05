# CLAUDE.md — Maestro Giacomo se Skaak Akademie

## Projek Oorsig

'n React single-page application (Vite + React) wat op Netlify gehost word. Dit leer drie jong skaakspelers die Italiaanse opening (1.e4 e5 2.Nf3 Nc6 3.Bc4) en 'n volledige 1.e4 repertoire. Die speler speel as Wit teen 'n gesimuleerde ~1700-vlak teenstander.

**Teikengroep:** JPB, WSTB, Nasionale Eenheid (seun, ±9 jaar oud, gradering ~1620)
**Taal:** Afrikaans UI; Italiaanse uitdrukkings van Giacomo (altyd gevolg deur Afrikaanse vertaling in hakies); Engelse skaak terme waar nodig
**Platform:** Netlify (statiese React SPA — geen backend nie)

---

## Tegnologiestapel

```
Frontend:     React 18 + Vite
Skaak logika: chess.js v1 (bewegingsvalidering, spelstaat)
Bord UI:      react-chessboard v4.7.2 (klikbare stukke)
Engine:       Stockfish.js WASM blob-worker
Opening data: Lichess Opening Explorer API + Cloud Eval API
Persistensie: localStorage (3 profiele, badges, beste telling, speel-log)
Hosting:      Netlify (statiese bou)
```

**Geen backend, geen databasis, geen aanmelding.**

Node.js path workaround (Mac): `PATH="/usr/local/opt/node/bin:$PATH"` voor alle `npm`/`npx` opdragte in hierdie projek.

---

## Projekstruktuur

```
/src
  /components
    Board.jsx             — Die skaakbord (react-chessboard)
    BadgePanel.jsx        — Linker paneel: alle 42 badges, 3-kolom rooster
    ScoreBar.jsx          — Bo: speler, telling, skuifteller, laag status
    MovePopup.jsx         — Na elke Wit skuif: punte + Giacomo kommentaar
                            (focus mode van skuif 30+: net punte, geen teks)
    ExplanationModal.jsx  — "Waarom het jy dit gespeel?" modal (skuiwe 1–18)
    PostGame.jsx          — Na-spel opsomming met sleutel oomblikke
    ProfileSelect.jsx     — Begin skerm: kies profiel
    TrophyRoom.jsx        — Alle badges + beste telling per profiel + spele aflaai
    GiacomoFace.jsx       — SVG pixel-art gesig, 9 uitdrukkings + 5 luie animasies
    GameTitle.jsx         — Bo-titel balk
    SuggestionBox.jsx     — Beste skuif aanbeveling (na swak skuif)
    GameScreen.jsx        — Hoof speel skerm, koördineer alle komponente
  /engine
    lichessApi.js         — Lichess Explorer + Cloud Eval API oproepe
    stockfishWorker.js    — Stockfish WASM Web Worker (blob-patroon)
    moveSelector.js       — Kies Black se skuif (Lichess, Stockfish, of beplande onvolmaaktheid)
  /data
    openingTree.js        — Vooraf-gebakte openingsboom (tot ~skuif 20)
    badges.js             — 42 badge definisies (sien Badge Stelsel hieronder)
    giacomoLines.js       — Giacomo se kommentaarlyste per situasie
    scoringRules.js       — Punteberekeningslogika + evalFen()
    gameLogger.js         — Speel-log na localStorage; aflaai as JSON
  /hooks
    useGame.js            — Hoofspelstaat hook (alle spellogika)
    useProfile.js         — localStorage profiel bestuur
    useBadges.js          — Badge verdien logika
  /themes
    base.css              — Alle stile + tema-veranderlikes
  App.jsx
  main.jsx
```

---

## Spelvloei

### 1. Profielkeuse (ProfileSelect.jsx)
- Drie knoppies: **JPB** | **WSTB** | **Nasionale Eenheid**
- Laai profiel uit localStorage (badges, beste telling, spele gespeel)
- "Begin Speel" knoppie → spel begin

### 2. Tema Seleksie
- By elke nuwe spel: `Math.random()` kies een van 4 CSS temas
- Toepass op `<body>` as CSS klas (`theme-flame` / `theme-modern` / `theme-chalk` / `theme-bright`)

### 3. Spelmeganika (per skuif)

**Wit se beurt (speler):**
1. Speler klik op stuk → klik op bestemming
2. `chess.js` valideer skuif
3. Op sleutelteoretiese posisies (skuiwe 1–18): **ExplanationModal** verskyn
   - Opsies word in willekeurige volgorde gewys (Fisher-Yates skommel)
   - Korrekte rede: +1 bonus punt (kap by 4)
4. **MovePopup** verskyn:
   - Skuiwe 1–2: net punte, geen kommentaar
   - Skuiwe 3–29: punte + Giacomo gesig + kommentaar + variasinaam + laag-aankondiging
   - **Skuiwe 30+: fokus modus** — net punt + sterre, kompakte pil bo-regs, 3 sekondes, geen teks
5. Bord opdateer; laag-status nagegaan

**Swart se beurt (rekenaar):**
1. Fase: `BLACK_THINKING` — Giacomo wys willekeurige denkkommentaar ("Swart krap bietjie kop...", ens.)
2. **Denkpouse:** sien denkvertraging skedule hieronder; na skuif 40: onmiddellik
3. Skuif word gekies (sien Swart Sterkte hieronder)
4. 800ms animasievertraging, dan bord opdateer

**Motiverende boodskappe:**
- 3 willekeurige skuifnommers (8–42) word by spelstart gekies
- By daai skuiwe (gedurende speler se beurt) wys Giacomo 'n motiverende boodskap vir 5 sekondes:
  - "Die een wat die langste dink, wen dikwels."
  - "Ek weet jy kan, ek weet jy kan!" ens.
- Boodskap verdwyn onmiddellik as speler 'n skuif maak

### 4. Spelbeëindiging
Spel eindig wanneer:
- 50 Wit-skuiwe voltooi
- Mat toegedien
- Speler word gemateer
- Patstelling / remise

**Na speleinde:** Bord bly sigbaar vir **5 sekondes** voor oorgang na PostGame.

**Bonusse:**
- +50 punte vir mat aan Swart (gekap deur MAX_SCORE 200)
- Minimum 1 punt per skuif altyd

### 5. Na-Spel Skerm (PostGame.jsx)
- Finale telling (bv. 134/200) met kleurgebaseerde progressie-balk
- Sleutel oomblikke (nooit skuif 1):
  - **Beste oomblik:** laaste 4-punt skuif: "Tot hier het jy mooi by die plan gebly — skuif N."
  - **Swakste oomblik:** laagste-punt skuif (as verskillend van beste)
  - **Val oomblik:** indien val betrokke
- Nuut verdiende badges (glansend) + badge-kas (kompak)
- "Speel Weer" | "Trofee Kamer"

---

## Puntestelsel

### Grondpunte (per Wit skuif)

| Punte | Kriterium |
|-------|-----------|
| **4** | Top Lichess/engine skuif vir die posisie |
| **3** | Tweede beste skuif, of 'n stewige prinsipale skuif |
| **2** | Wettige skuif sonder duidelike plan |
| **1** | Wettige skuif maar duidelik swak |

### Spesiale gevalle
- **Wenk gebruik:** altyd 3 punte (ongeag skuif kwaliteit); geen Giacomo kommentaar
- **Eerste 2 skuiwe:** net punte, geen kommentaar
- **Verklaring bonus:** +1 (kap by 4) as speler korrekte rede kies (skuiwe 1–18)
- **Trap ontwyking:** +3 bonus punte + badge
- **Mat bonus:** +50 punte onmiddellik (gekap deur MAX_SCORE 200)

### Wenk stelsel
- Wenk knoppie sigbaar vir skuiwe 1–10 (eerste gebruik per spel)
- Groen pyl: Italianer aanbeveling (opening boom)
- Oranje pyl: Stockfish beste skuif
- As albei ooreenstem: een pyl

---

## Swart se Sterkte — Volledig Stelsel

### Vaste diepte skedule (skuifnommer = Swart se skuifnommer)

| Skuiwe | Stockfish diepte | Effek |
|--------|-----------------|-------|
| 1–14 | Lichess Explorer (top-4 willekeurig gewog) | Opening teorie |
| 15–24 | Diepte 12 | Sterk spel |
| 25–29 | Diepte 4 | Speler kan pounce |
| 30–35 | Diepte 5 | Effens swakker |
| 36+ | Diepte 12 | Sterk terug |

### Beplande onvolmaaktheid (per spel, willekeurig gekies)
Vier onvolmaakthede word by spelstart geskedule via `imperfectionsRef`:

| Naam | Skuif | Gedrag |
|------|-------|--------|
| `earlySuboptimalAt` | 10–12 (willekeurig) | Speel die 3de beste skuif |
| `suboptimalAt` | 15–20 (willekeurig) | Speel die 3de beste skuif |
| `randomAt` | 20–25 (willekeurig) | Speel enige wettige skuif |
| `lateRandomAt` | 40 (altyd) | Speel enige wettige skuif |

`forceRandom` het prioriteit bo `forceSuboptimal`. As beide sou val op dieselfde skuif, wen `forceRandom`.

### Dinamiese moeilikheidsgraad (na skuif 20, agtergrond eval)
Eval word bepaal na elke Swart skuif. `blackModeRef` word opdateer:

| Modus | Trigger | Effek |
|-------|---------|-------|
| `fighting` | Wit staan 5+ pawns voor (cp > 500) | Diepte 12 altyd |
| `coasting` | Swart staan 5+ pawns voor (cp < -500) | Diepte 5 altyd |
| `null` (normaal) | Anders (of as modus sou omskep) | Skedule hierbo |

Alle modi is tydelik — hulle reset as die evaluasie verskuif. `fighting` verdwyn as Swart opkom bo cp -500; `coasting` verdwyn as Wit herstel bo cp -500.

---

## Swart se Denkvertraging

Implementeer in `_playBlackMove` met `Promise.all` — skuif-seleksie en denkpouse loop parallel, geen ekstra wag nie.

### Denkvertraging skedule

| Skuiwe | Vertraging |
|--------|-----------|
| 1–4 | 3s (opening, vinnig) |
| 5 | 10–20s (toernooi-pas) |
| 6–10 | 7s (vroeë middelspel, kort) |
| 11–30 | 10–20s (volle toernooi-pas) |
| 31–39 | 1–10s willekeurig (eindspel-dringendheid) |
| 40+ | Onmiddellik (geen pouse) |

---

## Giacomo se Kommentaar (giacomoLines.js)

### Reëls
- Max ~20 woorde per lyn
- **Italiaanse frases ALTYD gevolg deur Afrikaanse vertaling in hakies:** bv. "Perfetto! (Perfek!)"
- Geen godslastering nie — gebruik "O ertappel", "O pampoen-pizza", "O aarde" in plaas van "Mio Dio"
- Eerste 2 skuiwe: stil (geen kommentaar)

### Kommentaar kategorieë (sleutels in `LINES` objek)
| Sleutel | Gebruik |
|---------|---------|
| `4` | 4-punt skuif |
| `3` | 3-punt skuif |
| `2` | 2-punt skuif |
| `1` | 1-punt skuif |
| `celebrating` | Mat toegedien |
| `draw` | Remise |
| `black_mates_white` | Speler is gemateer |
| `moves_complete` | 50 skuiwe klaar |
| `trap_warning` | Voor Swart se valskuif |
| `trap_escaped` | Speler het val ontsnap |
| `trap_fell` | Speler het in val gestap |
| `layer1_complete` / `layer2_complete` / `layer3_complete` | Laag bereik |
| `black_thinking` | Swart se denkpouse kommentaar |
| `motivational` | Willekeurige motiverende boodskappe (3× per spel) |
| `variation_reached` | Variasinaam aankondiging (gebruik `{variation}` token) |

### Laag-aankondigings (LAYER_ANNOUNCEMENTS uitvoer)
Verskyn in MovePopup as uitgebreide paneel (28 sekondes) — verduidelik strategiese waarde:
- **Laag 1:** Bc4 + Nf3 + d3 — "Die Vlag is Geplant"
- **Laag 2:** c3 + ruiter keuse — "Die Ruiterpad is Gekies"
- **Laag 3:** c3–d4 breuk — "Die Sentrum is Joune"

Laag-aankondigings verskyn **elke keer** as 'n laag bereik word (selfs al is die badge al verdiend).

### Middelspel Tema Panele (MIDGAME_PANELS uitvoer)
Verskyn in MovePopup as uitgebreide paneel (28 sekondes) — elk brand **hoogstens een keer per spel**.
Gesuprimeer in fokus modus (skuif 30+) en wyk vir 'n laag-aankondiging as beide op dieselfde skuif val.

| ID | Trigger | Tema |
|----|---------|------|
| `ng5_f7` | `Ng5` in geskiedenis | f7-aanval — Ng5 mik op f7 |
| `rokeer_veilig` | `O-O` in geskiedenis | Rokade — koning veilig, toring aktief |
| `sentrum_breuk` | `c3` + `d4` in geskiedenis, ≥10 halfskuiwe | c3–d4 breuk uitgevoer |
| `biskoppaar` | Wit het 2 biskope + ≥1 ruil al gemaak + ≥12 halfskuiwe | Biskoppaar voordeel |
| `toring_aktief` | `Re1` of `Rd1` in geskiedenis | Toring na oop lêer |

`announcedPanelsRef` (Set) in `useGame.js` hou by watter panele al gewys is. Reset by elke `startGame()`.

---

## GiacomoFace (GiacomoFace.jsx)

SVG pixel-art op 8px rooster, 256×256 viewport. Pure inline SVG (geen afbeeldingslêers).

### Uitdrukkings
`ecstatic` | `pleased` | `neutral` | `frustrated` | `thinking` | `celebrating` | `warning` | `proud` | `waiting`

### Luie animasies
5 animasies speel willekeurig elke 90–150 sekondes (tydens `waiting` uitdrukking):
- `look_up` — oë kyk op
- `look_left` — oë kyk links
- `wine` — Giacomo geniet 'n slukkie wyn
- `dog` — Giacomo kry honde-ore (extras-laag)
- `sneeze` — Giacomo nies (extras-laag)

`dog` en `sneeze` gebruik 'n `extras` laag wat oor vaste elemente verf.

---

## Badge Stelsel (badges.js)

**42 badges totaal.** Elke badge het:
- `id` — localStorage sleutelfragment
- `naam` — vertoonsnaam (altyd sigbaar, ook as gesluit)
- `italiaans` — Giacomo se Italiaanse naam
- `emoji`
- `beskrywing` — een sin (sigbaar as verdiend)
- `wenWenrig` — hoe om te verdien (sigbaar as gesluit)
- `moeilikheid`: `'maklik'` | `'medium'` | `'moeilik'` | `'legendaries'`
- `when`: `'move'` | `'game_end'`
- `criterion`: `(ctx) => boolean`

### Kriteriumkonteks (ctx)
```js
ctx.history          // string[] — SAN geskiedenis
ctx.moveLog          // [{moveNumber, san, score, fen, label}]
ctx.finalScore       // totale telling (0 voor game_end)
ctx.mateDelivered    // boolean
ctx.trapEscaped      // boolean
ctx.trapKey          // string | null
ctx.layerStatus      // 0|1|2|3
ctx.consecutivePerfect // lopende telling van opeenvolgende 4-punt skuiwe
ctx.variationsHit    // Set<string>
ctx.profile          // { speleGespeel, badges, besteTelling }
```

### Maklike Badges (5)
| Emoji | ID | Kriterium |
|-------|----|-----------|
| 🍕 | `il_primo_passo` | Eerste spel voltooi |
| 🎓 | `giacomo_se_student` | 50+ punte |
| 🏰 | `die_italianer` | h[4]==='Bc4' |
| ♟️ | `e4_meester` | e4CorrectStreak >= 3 |
| ⭐ | `honderd_punte` | 100+ punte |

### Medium Badges — Opening kennis (9)
| Emoji | ID | Kriterium |
|-------|----|-----------|
| 🍝 | `giuoco_piano` | h[4]=Bc4, h[5]=Bc5, h[6]=c3 |
| 🧀 | `pianissimo` | h[4]=Bc4, h[6]=c3, h[8]=d3 |
| ⚔️ | `evans_aanvaller` | h[6]=b4, h[7]=Bxb4 |
| 🐴 | `twee_ridders` | h[4]=Bc4, h[5]=Nf6 |
| 🦔 | `hongaarse_wag` | h[4]=Bc4, h[5]=Be7, skuif-4-telling >= 3 |
| 🐉 | `sisiliaanse_slagter` | h[1]=c5, h[2]=Nf3 |
| 🌸 | `franse_verbinding` | h[1]=e6, h[2]=d4 |
| 🛡️ | `caro_kan_kapper` | h[1]=c6, h[2]=d4 |
| 🌊 | `skandinawiese_stop` | h[1]=d5, h[2]=exd5 |

### Medium Badges — Variasies Gespeel (14)
| Emoji | ID | Variasie | Sleutelskuiwe |
|-------|----|----------|---------------|
| 🐎 | `four_knights` | Four Knights Variation | h[4]=Bc4, h[5]=Nf6, h[6]=Nc3 |
| 🔒 | `closed_variation` | Closed Variation | h[4]=Bc4, h[5]=Bc5, h[6]=d3 |
| 🏛️ | `classical_variation` | Classical Variation | h[4]=Bc4, h[5]=Bc5, h[6]=c3, h[8]=d4 |
| ⚡ | `center_attack` | Center Attack | h[4]=Bc4, h[5]=Bc5, h[6]=d4 |
| 🏯 | `albin_gambit` | Albin Gambit | h[4]=Bc4, h[5]=Bc5, h[6]=O-O |
| 🤌 | `semi_italian` | Semi-Italian Opening | h[4]=Bc4, h[5]=Be7 |
| 🌐 | `open_variation` | Open Variation | h[4]=Bc4, h[5]=Bc5, h[6]=c3, h[8]=d4, h[9]=exd4, h[10]=cxd4 |
| 🔭 | `modern_bishops_opening` | Modern Bishop's Opening | h[4]=Bc4, h[5]=Nf6, h[6]=d3 |
| 🧲 | `anti_fried_liver` | Anti-Fried Liver Defense | h[5]=Nf6, h[6]=Ng5, h[7]=Bc5 |
| 🗡️ | `knight_attack` | Knight Attack | h[4]=Bc4, h[5]=Nf6, h[6]=Ng5 |
| 🥃 | `scotch_gambit` | Scotch Gambit | h[2]=Nf3, h[3]=Nc6, h[4]=d4, h[5]=exd4, h[6]=Bc4 |
| 🙅 | `evans_declined` | Evans Gambit Declined | h[6]=b4, h[7]∈{Bb6,Ba5,Bd6,Be7,Bf8} |
| 🌪️ | `hein_countergambit` | Hein Countergambit | h[6]=b4, h[7]=d5 |
| ⛲ | `fontaine_countergambit` | Fontaine Countergambit | h[6]=b4, h[7]=b5 |

*Nota oor variasie-badges: h[] is 0-geïndekseer SAN geskiedenisreeks. h[0]=e4, h[1]=e5, h[2]=Nf3, h[3]=Nc6, h[4]=Bc4 is die Italianer opening.*

### Medium Badges — Struktuur (4)
| Emoji | ID | Vertoonnaam | Kriterium |
|-------|----|-------------|-----------|
| 🔺 | `die_driehoek` | Die Driehoek | layerStatus >= 1 |
| 🗺️ | `perd_pad_meester` | Perd Pad Meester | layerStatus >= 2 |
| 💥 | `sentrum_breuk` | Middelbord | layerStatus >= 3 |
| 🏯 | `laag_drie_bereik` | Laag Drie Bereik | layerStatus >= 3 (game_end) |

`wenWenrig` én `beskrywing` vir hierdie drie bevat pedagogiese verduideliking van die skuiwe/idees, sodat die wenk sigbaar is ongeag of die badge gesluit of verdiend is.

### Moeilike Badges (8)
| Emoji | ID | Kriterium |
|-------|----|-----------|
| 🐟 | `fried_liver_oorlewende` | trapEscaped && trapKey==='fried_liver' |
| 🔓 | `val_breker` | trapEscaped |
| 🕷️ | `val_setter` | history.includes('Ng5') && includes('exd5') |
| 🦅 | `alekhine_temmer` | h[1]=Nf6, h[2]=e5 |
| 🌀 | `pirc_modern_meester` | h[1]∈{g6,d6}, h[2]=d4 |
| 💫 | `teorie_perfeksionis` | consecutivePerfect >= 5 |
| 💎 | `diamant_italianer` | finalScore >= 160 |
| 🤺 | `mattesetter` | mateDelivered |

### Legendariese Badges (2)
| Emoji | ID | Kriterium |
|-------|----|-----------|
| 🏎️ | `giacomo_se_gunsteling` | finalScore >= 180 |
| 👑 | `il_grande_maestro` | Alle 41 ander badges verdien |

---

## BadgePanel (BadgePanel.jsx)

- **475px breed**, 3-kolom CSS rooster
- **Alle badges altyd sigbaar** — gesluit: grys + deursigtig (0.38); verdiend: groen rand
- **Namen altyd sigbaar** (nie "???" nie) — speler leer variasie-name
- Hover: Giacomo se teksblokkie wys naam + beskrywing (verdiend) of wenWenrig (gesluit)
- Nuut verdiend: `badgeUnlock` animasie + heldergroen rand

---

## Trap Stelsel

- By elke nuwe spel: `Math.random() < 0.15` — Swart het 'n val in skedule
- Speler kry 'n Giacomo waarskuwing voor Swart die valskuif speel
- Korrekte ontsnapping: +3 punte + `val_breker` badge
- In die val getrap: spel gaan voort + Giacomo boodskap

### Swart se Trap Repertoire
| Val | Konteks |
|-----|---------|
| Fried Liver | Twee Ridders, na 4.Ng5 d5 5.exd5 Nxd5 |
| Traxler Teen-Aanval | Twee Ridders, 4.Ng5 Bc5 |
| Blackburne-Shilling | Vroeg Italianer, 3...Nd4 |
| Legal se Mat | Vroeg posisie |
| Noah se Ark Val | d3/d4 posisie |

---

## Die Drie-Laag Italiaanse Struktuur

```
LAAG 1 — "Plant die Vlag":     Bc4 + Nf3 + d3
LAAG 2 — "Kies jou Perd Pad": c3 + (Na3 of Nc3)
LAAG 3 — "Eis die Sentrum":   c3–d4 breuk op die regte oomblik
```

Laagvoltooiing word nagegaan na elke Wit skuif via `detectLayerComplete(history)` in `openingTree.js`. Elke nuwe laag los 'n uitgebreide popup (28 sekondes) + Giacomo kommentaar.

---

## Speel-Log Stelsel (gameLogger.js)

```js
logGame(result, playerName)  // voeg by localStorage sleutel 'italiaans_gamelog'
getAllGames()                 // gee reeks terug
downloadGameLog()            // laai JSON-lêer af na gebruiker se rekenaar
```

- Maksimum 500 spele gestoor (oudste verwyder)
- Aflaai-knoppie in TrophyRoom: "⬇ Laai spele af (N)"

---

## Persisensieskema (localStorage)

```javascript
// Profiel sleutel: `profiel_JPB` (ook _WSTB en _NasionaleEenheid)
{
  naam: "JPB",
  besteTelling: 134,
  badges: ["il_primo_passo", "die_italianer", "giuoco_piano"],
  speleGespeel: 7,
  uitlegtellings: 12,    // aantal ExplanationModal antwoorde
  e4CorrectStreak: 2     // opeenvolgende korrekte e4 verklarings
}

// Speel-log sleutel: 'italiaans_gamelog'
// Reeks van { timestamp, playerName, ...spelresultaat }
```

---

## MovePopup Gedrag

| Skuif | Modus | Inhoud | Duur |
|-------|-------|--------|------|
| 1–2 | Stil | Net punte + sterre | 7.5s |
| 3–29 | Normaal | Gesig + kommentaar + variasinaam + laag / middelspel paneel | 7.5s (28s as laag of middelspel paneel; 20s as Italië-feit) |
| 30+ | Fokus | Net `N / 4 ⭐⭐⭐` kompakte pil | 3s |

Fokus modus: geen Giacomo gesig, geen teks, geen variasinaam, geen laag-aankondiging. Die `focusMode: true` vlag in popup data dryf die `move-popup--focus` CSS klas.

**Klik om toe te maak:** `dismissPopup()` in `useGame.js` kanselleer die outomatiese timer via `popupTimerRef` en roep `_afterPopup()` onmiddellik. Die leë `onDismiss` patroon moet NOOIT gebruik word nie — dit sal die spel vaspen.

---

## Spelgrensgeval Hanteer

| Situasie | Reaksie |
|----------|---------|
| Lichess Cloud Eval faal | Val terug na Stockfish |
| Lichess Explorer faal | Val terug na Stockfish |
| Stockfish faal | Eerste wettige skuif |
| Posisie verlaat boom vroeg | Stockfish diepte 12 |
| Speler speel onwettige skuif | Geen reaksie; wag vir wettige skuif |
| Patstelling | Remise-skerm, Giacomo boodskap |
| Speler word gemateer | Minimum 1 pt/skuif, PostGame na 5s |
| Mat toegedien | +50 bonus, bord bly 5s, PostGame |

---

## Sleutelpedagogiese Beginsels

1. **Nooit straf nie** — minimum 1 punt altyd
2. **Verklaring voor onthulling** — vra hoekom VOOR punt wys (skuiwe 1–18)
3. **Variasinaam aankondiging** — speler weet altyd waar hulle in die boom is
4. **Drielaag struktuur** — visuele vordering + uitgebreide verduideliking by elke laag
5. **Fokus na skuif 30** — geen teks-afleidinge; net punte
6. **Motiverende boodskappe** — 3× per spel, willekeurig
7. **Trap verbaas** — 15% kans, seldsaam maar onvergeetlik
8. **Swart dink** — gedifferensieerde denkpouses per fase (sien denkvertraging skedule)
9. **Badge name altyd sigbaar** — gesluit maar leesbaar; speler leer variasie-name

---

## "Begin oor" Knoppie

Sigbaar slegs tydens `PLAYER_TURN` fase (veilig — geen asinkrone operasies in vlug nie).

**Gedrag:**
1. Roep `onRemoveBadges(sessionBadges)` — verwyder alle badges verdien in hierdie sessie van `profileData` en `localStorage`
2. Roep `resetSession()` — maak `sessionBadges` leeg
3. Roep `startGame()` — herstel alle spelstaat
4. Kies nuwe motiverende skuifnommers

**Waarskuwing:** Enige badges wat die speler in hierdie sessie verdien het, gaan verlore. Die telling, laag-status en spellog word nie gestoor nie. `removeBadges()` in `useProfile.js` doen die omgekeerde van `addBadges()`.

---

## Italië Feite Paasei (Easter Egg)

Slegs op **rekenaar** (`window.matchMedia('(pointer: fine)').matches`). Twee onafhanklike snellers:

### Opsie B — Muisstil (idle)
- Tydens `PLAYER_TURN` fase: as die muis **3 minute** (180 000ms) nie beweeg nie, verskyn 'n klein paneel (`italy-fact-overlay`) onder-regs op die skerm.
- Verdwyn na 18 sekondes, of onmiddellik as die speler klik.
- Muisbeweging reset die timer — brand nooit tydens aktiewe spel nie.
- Implementeer in `GameScreen.jsx` via `idleTimerRef` + `idleDismissRef`.

### Opsie C — Seldsame skuif-sneller
- By elke Wit skuif: **1-in-300 kans** (`Math.random() < 1/300`) dat 'n Italië-feit in die MovePopup verskyn.
- Gesuprimeer in fokus modus (skuif 30+) en by mat.
- Popup duur vergroot na **20 sekondes** as 'n feit ingesluit is.
- Implementeer in `_applyScoreAndContinue` in `useGame.js` via `italyFact` veld in popup data.

### Data
`ITALY_FACTS` (20 feite) en `getRandomItalyFact()` is in `giacomoLines.js`. Elke feit het `{ kategorie, feit }`. Kategorieë: ⛰️ Berge, 🏛️ Geskiedenis, 🏙️ Stede, 🗣️ Taal, 🎭 Kultuur, 🎵 Musiek, 😄 Weet Jy?, ⚽ Sport.

Alle feite is in korrekte Germaanse Afrikaans geskryf — ondergeskikte sinne met werkwoord aan die einde, pronominale bywoorde (`waarvoor`, `waaruit`), dubbele ontkenning, skeibare werkwoorde.

---

## Netlify Ontplooiing

```bash
# Bou (Node.js pad workaround op Mac)
PATH="/usr/local/opt/node/bin:$PATH" npm run build

# netlify.toml
[build]
  publish = "dist"
  command = "npm run build"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

**Omgewingsveranderlikes benodig:** Geen — Lichess API is openbaar; Stockfish is WASM.

Git push na `main` branch aktiveer outomatiese Netlify deploy.

---

## Bekende iPad / Responsiewe Kwessie

Die badgepaneel (475px) + bord (480px) = 955px minimum breedte. Op iPad portrait (768–834px) sal dit oorvloei. Die 520px breekpunt is te nou — 'n ~1050px breekpunt word benodig om die paneel onder die bord te stapel op tablet-formaat. **Hierdie is nog nie geïmplementeer nie** en moet aangespreek word voor mobiele ontplooiing.
