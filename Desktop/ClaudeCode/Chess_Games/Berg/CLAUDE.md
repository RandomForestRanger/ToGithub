# CLAUDE.md — Sneeuluiperd se Kruin
### 'n Afrikaanse skaakafrigter vir die loper-en-ruiter-mat (KLR v K)

**Projek:** Sewende afrigter in die Blokkie-wêreld-suite van Afrikaanse skaakwebtoepassings.
**Teikenspeler:** 'n Baie intelligente 8-jarige wat reeds die Skaakmat Afrigter bemeester het.
**Doel:** Diep, oordraagbare begrip van die loper-en-ruiter-mat — nie 'n gememoriseerde skuifreeks nie. Die W-struktuur is die leerplan; die hokkleuring (Delétang-by-stealth) is die begripsmeganisme; die berg is die vorderings-UI.
**Vorm:** Enkellêer HTML/JS in die familie-styl. Geen eksterne enjin nie. Volledig Afrikaans.

---

## 0. Ontwerpsfilosofie (lees eers, bou dan)

1. **Die berg onthou.** Vordering is Markoviaans met behoud: misluk jy sport 25, val jy na 24 — nooit verder nie. Môre begin jy by 24. Die ergste moontlike sessie eindig een tree onder waar dit begin het.
2. **Die berg spot nooit nie.** Mislukking is 'n rustige tree af, nie 'n tuimeling nie. Geen hartseer musiek, geen rooi flitse nie.
3. **Begrip bo optimaliteit.** Tempo-verlies word verskoon (genadevenster); konseptuele foute (koning ontsnap, pat, stuk verloor) beëindig die sport onmiddellik. Die orakel definieer die verskil.
4. **Die skavot vervaag met hoogte.** Hokkleuring verskyn ná 'n wagperiode wat met die klim verleng. Dink eers, sien tweede. Die speler wat vinniger as die kleure is, verdien spoorafdrukke.
5. **Simmetrie ontmasker memorisering.** Elke sport se posisie word in agt gedaantes bedien. Wie verstaan, slaag almal sonder om dit agter te kom.
6. **Die berg is die koppelvlak.** Een SVG-berg, diagonaal oor die skerm, is terselfdertyd agtergrond, vorderingsleer, versamelmuur, en kinematiese verhoog.

---

## 1. Die wêreld

### 1.1 Titel en toon
**Sneeuluiperd se Kruin.** Die atmosfeer is dié van 'n groot bergverhaal — wit vlaktes, 'n getroue geselskap, 'n geheimsinnige dier wat eindelik gesien word. Die verwysing na daardie stemming is eerbetoon, nie ontlening nie: **geen bestaande karakters, name, of beeldmateriaal uit enige gepubliseerde werk nie.** Alle karakters is oorspronklik.

### 1.2 Die rolverdeling
- **Die gids: 'n jak (yak) genaamd Oom Jorka.** Verweerde, bedaard, praat in kort bergwyshede. Hy lewer alle afrigtingsteks. Register: warm maar droog; nooit soetsappig nie. Voorbeelde van sy stem (Kaart 5 brei uit):
  - By mislukking: *"Die berg is môre nog hier."*
  - By die hek-insig: *"Die loper kies die tronk. Onthou dit."*
  - By 'n omweggie: *"Ons stap 'n draai, maar ons stap nog boontoe."*
- **Die metgesel: 'n klein wit terriërhondjie genaamd Kapok.** (Karo-woord vir sneeu; klink soos 'n blaf.) Kapok praat nie — hy *doen*: draf vooruit op die roete, blaf een keer wanneer die hokkleure inskakel, tol van vreugde by mat, sit ore-plat by 'n konseptuele fout. Skoon-pote-stygings leer hom kunsies (§5.4).
- **Die sneeuluiperd.** Praat nooit. Verskyn slegs by sport 30 as die tiende bergbewoner — 'n getuie, nie 'n eindbaas nie. By haar verskyning sê Oom Jorka slegs: *"Kyk. Sy het jou die hele pad dopgehou."*

### 1.3 Die vier sones en tien bergbewoners
Elke derde sport verower (3, 6, 9 … 30) laat 'n dier permanent op die berglandskap verskyn. Die berg vul met lewe as rekord van die klim.

| Sone | Sporte | Terrein | Bewoners (verskyn by sport) |
|---|---|---|---|
| **Moeras** | 1–6 | Skemerig, groen, patstrikke soos dryfsand | Akkedis (3), Aksolotl (6) |
| **Woud** | 7–14 | Digte bos, die kantdans | Papegaai (9), Apie (12) |
| **Rotse** | 15–22 | Grys kranse, die W-mars, tegniese klim | Klipdassie (15)*, Ibeks (18), Bergkraai (21) |
| **Sneeu** | 23–30 | Yl lug, wit vlaktes, lang uitsigte | Sneeuhaas (24), Lammergier (27), **Sneeuluiperd (30)** |

\* Sport 15 in plaas van 'n suiwer veelvoud van 3 by die sone-grens is doelbewus: die klipdassie groet jou by die aankoms in die Rotse. (Implementeer as: bewoners by 3, 6, 9, 12, 15, 18, 21, 24, 27, 30.)

### 1.4 Skaakkartering van die sones
Die geografie **is** die leerplan:
- **Moeras (1–6):** Die hok toemaak in die regte hoek. Kort, forserende matte. Pat-gevaar op sy hoogste — die dryfsandmetafoor werk letterlik.
- **Woud (7–14):** Die kantdans — koning op die rand hou en na die regte hoek begin stuur.
- **Rotse (15–22):** Die W-mars. Die ruiter se W-pad word hier eksplisiet onderrig (§4.4).
- **Sneeu (23–30):** Die volle eindspel vanaf oop posisies; sport 30 = die kanonieke slegste geval.

---

## 2. Kernmeganika

### 2.1 Die leer
- 30 sporte. Sport N bied 'n gekureerde posisie met **presies DTM = N** (mat in N teen optimale verdediging), geverifieer deur die orakel.
- **Slaag:** klim een sport. **Misluk:** daal een sport (minimum sport 1). Toestand word bewaar (§6).
- Kurering: elke sport se posisie is "een koningsblok slegter" as die vorige — die moeilikheidsgradiënt tussen aangrensende sporte is klein, sodat slaagwaarskynlikheid per poging hoog bly.
- **Geen sport 0 nie.** Sporte 1–4 is doelbewus 'n maklike aanloop.

### 2.2 Slaagvoorwaarde: die genadevenster
- **Slaag = mat gelewer binne N + genade totale skuiwe**, ongeag die roete.
- Genade per sone: **Moeras +2, Woud +4, Rotse +6, Sneeu +10.**
- Ergste geval: sport 30 → 40 skuiwe, gemaklik binne die 50-skuifreël. Vertoon nietemin 'n stil skuiftelling ("die horlosie tik") as tematiese teenstander.
- **Die enjin volg werklike DTM, nie 'n naïewe aftelling nie.** As die speler twee tempi mors, is hy in 'n mat-in-N+2; die vertoonde begroting bly eerlik: `skuiwe oor = (N + genade) − skuiwe gespeel`.

### 2.3 Onmiddellike konseptuele mislukking (orakel-gedefinieer)
Die sport eindig dadelik, ongeag begroting, wanneer die orakel een van dié waarneem:
1. **Posisie word remise** — pat, stuk word geslaan/verloor, of enige gelykspel-toestand. (DTM = ∞.)
2. **Groot DTM-sprong:** werklike DTM styg met ≥ 8 bo die waarde vóór die speler se skuif — die operasionele definisie van "die koning het uit die heining ontsnap / na die verkeerde hoek verby die versperring geglip".
3. **Drievoudige herhaling.**
Tempo-verliese (DTM-styging van +1 tot +7 kumulatief binne begroting) word slegs gemerk: Oom Jorka: *"'n Omweggie."* Kapok se ore roer. Geen straf buiten die begroting self nie.

### 2.4 Wenkstelsel (die muur-oplossing)
- **Derde mislukking op dieselfde sport** → by die kritieke oomblik gloei die sleutelblok sag (spookblok-gloed); Kapok draf soontoe en sit.
- 'n Sport wat **met 'n wenk** geslaag word, vereis **twee skoon stygings** van daardie sport voordat die klim voortgaan. Die kind verdien steeds die sport; hy word net nie alleen teen 'n geslote deur gelos nie.
- Wenkgebruik word per sport aangeteken (§6) — dit is telemetrie, nooit skande nie.

### 2.5 Verdedigingsbeleid
- **Verstek: orakel-optimaal** (maksimeer DTM). Gelukkig pedagogies korrek: optimale verdediging vlug na die verkeerde hoek — presies die verdediging wat gedril moet word. By gelyke DTM, kies pseudo-ewekansig (gesaai per poging) sodat herhaalde pogings nie identies verloop nie.
- **Slinkse verdediging** ("skelm-skuiwe"): vooraf-gemerkte lyne — ruiter-uitvalle (koning storm die ruiter), pat-duike, hoekvlug-truuks. Waarskynlikheid per sone: **Moeras 0%, Woud 10%, Rotse 25%, Sneeu 40%.** Slinkse lyne word by bou-tyd geselekteer en gemerk (§3.3), nooit ter plaatse geïmproviseer nie. 'n Slinkse skuif mag nooit die verdediger se DTM met meer as 4 verkort nie (dit moet 'n strik wees, nie selfmoord nie).

### 2.6 Simmetrievariante
- Elke sport se kanonieke posisie word bedien as een van **agt gedaantes**: die vier rotasies en vier refleksies van die bord (die diëdrale groep D4). Let wel: die refleksies ruil die loper se blokkleur om — die donkerhoek-tronk word 'n lighoek-tronk. Een transformasie word ewekansig per **poging** gekies.
- Die orakel en alle logika werk op die getransformeerde posisie direk (die orakel ken alle posisies); die transformasie is suiwer 'n aanbiedingskeuse by posisie-laai.
- Wie die struktuur verstaan, merk skaars die verskil. Wie skuiwe memoriseer, word onmiddellik ontmasker.

### 2.7 Hokkleuring en die vervaag-in
- **Hokkleuring:** skakeer die blokke wat die verdedigende koning **nie kan betree nie** — die loper se diagonale muur, die ruiter se gedekte gate, die eie koning se veld. Wat oorbly, is visueel die huidige insluitingsdriehoek: Delétang se driehoeke sonder om dit ooit as aparte metode te onderrig.
- **Vervaag-in wanneer dit die speler se beurt is:** Moeras ná **3 s**, Woud **5 s**, Rotse **10 s**, Sneeu **15 s**. Sagte 400 ms vervaging; Kapok blaf een keer wanneer die kleure aankom.
- **Spoorafdruk:** 'n skuif gespeel vóór die kleure aankom, verdien 'n klein pootafdruk-ikoon vir daardie skuif. Dit is die kern-telemetrie van internalisering (§6) én die brandstof vir Kapok se kunsies (§5.4). Niks word daardeur gehek nie — die sukkelende kind verloor niks; die vlot kind kry 'n rede om die vervaging te klop eerder as om dit te melk.

### 2.8 Die W-oorlegsel (die leerplan sigbaar gemaak)
- Ná elke geslaagde sport in die **Rotse** (en op versoek elders): 'n kort oorlegsel wat die ruiter se werklike pad teen die ideale W-patroon vertoon.
- Voor die klim-animasie vra Oom Jorka een kontrolevraag met twee of drie tikbare antwoorde: **"Watter gaatjie het daardie skuif toegemaak?"** — die opsies is gemerkte blokke op die bord. Korrekte antwoord: klim. Verkeerde antwoord: kort verduideliking, dan klim in elk geval (die vraag konsolideer; dit hek nie).

---

## 3. Argitektuur

### 3.1 Die orakel: KLR v K-tabelbasis, ter plaatse bereken (benadering "a")
**Kaart 1 se hele taak.** Geen eksterne enjin, geen afgelaaide tabelbasis nie — 'n retrograde-analise in JavaScript by eerste laai, daarna gekas.

- **Indeksering:** posisie = (wK, wL, wR, sK, kant-aan-skuif) → indeks in `64⁴ × 2 = 33 554 432`. Twee `Uint8Array`s van 32 MiB elk is oordadig; gebruik **een `Uint8Array(33 554 432)`** met DTM-in-plies (maks ≈ 66 plies vir KLR, pas in 8 bis; reserveer 255 = remise/ongeldig, 254 = onbereken).
- **Algoritme:** standaard retrograde analise. (1) Merk alle terminale posisies: mat (kant-aan-skuif = swart, geskaak, geen wettige skuiwe) = 0 plies; pat en stukverlies-remises = 255. (2) Iteratiewe terugwaartse golwe: wit-aan-skuif posisies kry DTM = min oor opvolgers + 1; swart-aan-skuif kry DTM = maks oor opvolgers + 1 (optimale verdediging), remise as enige opvolger remise is. Herhaal tot vaspunt.
- **Prestasie-teiken:** ≤ 5 s berekening op 'n middelklas-skootrekenaar, in 'n **Web Worker** sodat die openingskinematika (§5.2) intussen speel — die afkoms ís die laaiskerm. Vorderingsbalk as bergmis wat lig.
- **Kas:** die voltooide `Uint8Array` in **IndexedDB** (localStorage is te klein). By volgende besoeke: laai uit kas in < 1 s; herbereken slegs as die kas ontbreek of die weergawe-etiket verskil.
- **Orakel-API (die enigste waarheidsbron):**
  - `dtm(pos)` → plies tot mat, of REMISE
  - `bestMoves(pos)` → alle DTM-optimale skuiwe
  - `defenderMove(pos, beleid)` → optimaal of gemerkte slinkse lyn
  - `cageSquares(pos)` → blokke onbetreebaar vir die verdedigende koning (vir hokkleuring)
  - `isConceptualFail(voorDTM, naDTM)` → §2.3-reëls
- **Selftoets by laai:** verifieer teen 'n dosyn hardgekodeerde bekende waardes (bv. die kanonieke slegste geval, DTM ≈ 33 skuiwe; die basiese hoekmat-in-1s). Faal die toets, weier om te speel en vertoon 'n eerlike foutboodskap.

### 3.2 Posisiepyplyn (bou-tyd, nie looptyd nie)
'n Eenmalige skrip (mag Node wees; uitset word in die HTML ingebak):
1. Genereer kandidaatposisies per sport-DTM.
2. **Kureer** volgens die pedagogiese boog: sporte 1–6 hoekwerk; 7–14 randwerk; 15–22 marsposisies (koning naby verkeerde hoek); 23–30 oop posisies. Kurering is per posisie met die hand bevestig — diepte volg meestal die boog, maar dit word gekontroleer, nie aanvaar nie.
3. Verifieer elke kanonieke posisie se DTM teen die orakel; verwerp enige posisie met DTM ≠ sportnommer.
4. Merk slinkse verdedigingslyne per posisie (Rotse en Sneeu).
5. Bak uit as `POSITION_BANK` JSON in die HTML (§3.3).

### 3.3 Posisiebank-skema (ingebak)
```json
{
  "version": "1.0.0",
  "rungs": [
    {
      "rung": 17,
      "zone": "rotse",
      "fen": "8/8/8/4k3/8/2K5/2B5/3N4 w - - 0 1",
      "dtm_moves": 17,
      "theme": "w-mars: tweede gaatjie",
      "swindles": [
        { "atPly": 6, "move": "e5d4", "trap": "ruiter-uitval", "reply_hint": "c2b3" }
      ],
      "hint_square_logic": "oracle",
      "check_question": {
        "after": true,
        "prompt": "Watter gaatjie het daardie skuif toegemaak?",
        "options_from": "knight_covered_squares"
      }
    }
  ]
}
```
Aantekeninge: `hint_square_logic: "oracle"` beteken die gloeiende blok is die bestemming van die (unieke of eerste) orakel-optimale skuif by die vasval-oomblik; kaarte mag per sport 'n handgekose blok oorheers waar die orakel-keuse pedagogies dof is.

### 3.4 Uitleg
- **Die berg-SVG** vul die agtergrond, kruin **regs-bo**, voet **links-onder**; die roete klim die diagonaal. Bord en kontroles leef in die vry driehoek (links-bo se lug en regs-onder se voorgrond) — op smal skerms: berg as boonste band (~40%), bord daaronder.
- Responsief tot op selfoonwydte; bord minstens 320 px; toeganklike fokus-ringe; `prefers-reduced-motion` word gerespekteer (kinematika word 'n stil oorvloei).

---

## 4. Die berg-SVG (Kaart 4 se hart)

### 4.1 Bou-beginsels
- **Een handgeboude, gelaagde SVG.** Geen raster-agtergrond nie. Elke element adresseerbaar per `id`.
- Lae (onder na bo): lug-gradiënt → verre pieke → vier bioomstrata (moerasgroene, woud, grys krans, wit) → die roetepad (een Bézier-`path`) → 30 roetemerkers (`id="merker-1"` … `-30"`) → sone-grens-kentekens (kraaltjie-hek, boomlyn, kranslyn, sneeulyn) → tien dierklankgroepe (`id="bewoner-3"` … `-30"`, `visibility` geskakel deur toestand) → klimmer-en-Kapok-sprite (`id="klimmer"`).
- **Palet:** aardse moeraskleure onder wat na kraakwit bo verloop; die pad 'n warm okerlyn — die een deurlopende draad. Dit is 'n berg vir 'n Tintin-liefhebber: helder ligne-claire-agtige vlakke, skoon buitelyne, geen gradiënt-mistigheid behalwe die lug nie.
- Diere is eenvoudige, kenmerkende silhoeëtte met een aksent elk (papegaai se rooi vlerkstreep, ibeks se horingboog). Voorrang: herkenbaarheid bo detail.

### 4.2 Kamera as vertelling
Alle "kamerabewegings" is `viewBox`-interpolasies met versagting (ease-in-out):
- **Openingsafkoms (elke sessie):** begin styf op die kruin geraam (wind, sneeustuif; die sneeuluiperd se silhoeët ½ s indien reeds ontsluit) → duik diagonaal af langs die roete, versnel verby elke reeds-ontslote bewoner (elkeen draai sy kop soos jy verbygaan) → vertraag en land by die huidige sport, waar die klimmer en Kapok wag; die bord vervaag in. **3–4 s. Een tik = slaan oor.** Sagte windklank (respekteer stilmodus).
- **Klim (slaag):** kamera skuif een merker op terwyl die klimmer dit stap; Kapok tol. ~1,5 s.
- **Daal (misluk):** een rustige tree af. Geen tuimel nie. Oom Jorka: *"Die berg is môre nog hier."*
- **Bewoner-onthulling (elke 3de sport):** kamera pan kort na die dier se plek, die dier vervaag in en bly permanent; pan terug. ~10 s seremonie. By sport 30: die sneeuluiperd op die kruinrant, kyk terug; Oom Jorka se een sin; geen fanfare-teks nie.

---

## 5. Wêreldlaag (Kaart 5)

### 5.1 Oom Jorka se teksbank
Alle afrigtingsteks in een `COACH_LINES`-objek, gesorteer per gebeurtenis (welkom-per-sone, slaag, misluk, omweggie, konseptuele fout per tipe, wenk-aanbieding, kontrolevraag-terugvoer, bewoner-onthulling, kruin). Minstens drie variante per gebeurtenis sodat herhaling vars bly. Register: kort bergwyshede; nooit meer as twee sinne nie; suiwer Afrikaans; droë humor toegelaat, spot nooit.

### 5.2 Laaiskerm = openingsafkoms
Die Web Worker bereken die orakel terwyl die kinematika speel. Indien die orakel klaar is voor die kinematika: niks verander nie. Indien nie: die klimmer "vang sy asem" by die landing (Kapok sit) tot gereed — die metafoor absorbeer die wagtyd.

### 5.3 Kontrolevraag-vloei
Slegs in die Rotse verpligtend ná slaag; elders beskikbaar onder 'n "Wys my die W"-knoppie. Nooit 'n hek nie (§2.8).

### 5.4 Kapok se kunsies (spoorafdruk-beloning)
'n **Skoon-pote-styging** van 'n volle sone (elke slaag-skuif binne daardie styging vóór die vervaag-in gespeel) leer Kapok een nuwe kunsie-animasie: Moeras — modder skud; Woud — stok gaan haal; Rotse — klip-tot-klip spring; Sneeu — sneeuengel. Kunsies speel daarna lukraak by matte. Suiwer kosmeties; niks hek nie.

---

## 6. Toestand en telemetrie

`localStorage` sleutel `sneeuluiperd_v1`:
```json
{
  "version": "1.0.0",
  "currentRung": 24,
  "residents": [3, 6, 9, 12, 15, 18, 21, 24],
  "pawPrints": { "moeras": 14, "woud": 22, "rotse": 9, "sneeu": 0 },
  "cleanZoneAscents": ["moeras"],
  "kapokTricks": ["modder-skud"],
  "hints": { "17": 2, "25": 1 },
  "attempts": { "25": { "tries": 7, "passes": 3 } },
  "lastVisit": "2026-07-17T00:00:00Z"
}
```
- Tabelbasis-kas in **IndexedDB** (`sneeuluiperd_tb_v1`), weergawe-geëtiketteer.
- Portaal-versoenbaar met die suite se bestaande landingsblad-konvensies (naam, ikoon, vordering-persentasie = `currentRung / 30`).
- Spoorafdruk-tempo per sone is die primêre internaliseringsmaatstaf — belangriker as die sportnommer self.

---

## 7. Die ses kaarte

> Elke kaart is 'n selfstandige Claude Code-sessie met streng omvang. Geen kaart raak aan 'n latere kaart se lêers nie. Elke kaart eindig met sy aanvaardingstoetse geslaag en 'n een-paragraaf oorgawe-nota vir die volgende kaart.

### Kaart 1 — Die Orakel
**Bou:** KLR v K-tabelbasis per retrograde analise in 'n Web Worker; IndexedDB-kas; volledige orakel-API (§3.1); selftoets-battery.
**Aanvaarding:**
- Berekening ≤ 5 s (middelklas-toestel), kas-laai ≤ 1 s.
- Selftoets: 12+ bekende posisies (insluitend kanonieke slegste geval en al agt simmetrie-gedaantes van een posisie lewer identiese DTM).
- `cageSquares` gee korrekte onbetreebare blokke vir 5 handgekontroleerde posisies.
- Remise-herkenning: pat en stukverlies-posisies gee REMISE.

### Kaart 2 — Die Spel-enjin
**Bou:** bord-UI (familie-styl), sportlogika, genadevenster met werklike-DTM-begroting, konseptuele-mislukking-deteksie, verdedigingsbeleid met slinkse lyne, simmetrievariante, posisiebank ingebak (met die bou-tyd-pyplyn as bygaande skrip), ±1-vordering met behoud.
**Aanvaarding:**
- Al 30 sporte se DTM geverifieer teen die orakel by laai (weier andersins, met eerlike fout).
- Genadevenster-wiskunde: gesimuleerde tempo-mors op sport 30 misluk presies by skuif 41.
- Konseptuele mislukking vuur binne een skuif vir: pat-toelating, stukverlies, DTM-sprong ≥ 8.
- Agt gedaantes van sport 10 almal speelbaar en korrek.
- Toestand oorleef herlaai.

### Kaart 3 — Hokkleuring, Vervaag-in, Wenke
**Bou:** `cageSquares`-oorlegsel met sone-vertraagde vervaag-in; spoorafdruk-toekenning; wenkstelsel (3de mislukking → gloeiblok; twee-skoon-stygings-reël); W-oorlegsel en kontrolevraag.
**Aanvaarding:**
- Vervaag-tye per sone korrek; Kapok-blaf-oomblik sinchroniseer met kleuraankoms.
- Spoorafdruk slegs vir skuiwe vóór vervaag-in; teller per sone akkuraat.
- Wenk verskyn slegs by 3de mislukking; twee-skoon-stygings-reël afdwingbaar en getoets.
- W-oorlegsel vertoon werklike ruiterpad vs. ideaal; kontrolevraag hek nooit.

### Kaart 4 — Die Berg
**Bou:** die volledige gelaagde SVG (§4.1); kamera-enjin (viewBox-interpolasie); openingsafkoms, klim/daal-bewegings, bewoner-onthullings; responsiewe uitleg; `prefers-reduced-motion`.
**Aanvaarding:**
- Afkoms 3–4 s, oorslaanbaar met een tik; land presies by die huidige merker.
- Al 30 merkers en 10 bewoner-groepe adresseerbaar en korrek geposisioneer per sone.
- Daal-animasie is 'n rustige tree (geen tuimel); reduced-motion gee stil oorvloeie.
- Smal-skerm-uitleg funksioneel op 360 px wydte.

### Kaart 5 — Die Wêreld
**Bou:** Oom Jorka se volledige teksbank (3+ variante per gebeurtenis); Kapok se gedragstelsel en kunsies; bewoner-persoonlikhede (kopdraai in die afkoms); klank (windgeluid, blaf, mat-klokkie; almal demp-baar); portaal-integrasie.
**Aanvaarding:**
- Elke gebeurtenis-tipe het ≥ 3 Afrikaanse variante, taalversorg.
- Sport 30-seremonie: sneeuluiperd-onthulling met slegs die een Jorka-sin.
- Skoon-pote-sone-styging ken die korrekte kunsie toe; kunsies speel by matte.
- Klank respekteer stilmodus en toestel-instellings.

### Kaart 6 — Oudit en Sertifisering
**Bou:** niks nuuts nie — 'n volledige verifikasiepas in die Skaakmat Afrigter-tradisie.
**Aanvaarding:**
- **Posisie-oudit:** al 30 kanonieke posisies × 8 gedaantes = 240 posisies masjien-geverifieer (DTM korrek, wettig, geen onmiddellike pat-eienaardighede).
- **Slinkse lyne-oudit:** elke gemerkte lyn wettig, DTM-verkorting ≤ 4, en die strik het 'n weerlegbare antwoord.
- **Deurspeel-toets:** geskripte optimale speler klim 1→30 sonder mislukking; geskripte foutspeler aktiveer elke mislukkingsklas minstens een keer.
- **Regressie-lys** afgehandel: begroting-af-per-een-foute, simmetrie-blokkleur, IndexedDB-kas-ongeldigmaking, localStorage-migrasie.
- Sertifiseringsverslag as kommentaarblok bo in die HTML: datum, posisietelling, oudit-uitkomste.

---

## 8. Buite omvang (uitdruklik)
- Geen aanlyn-funksies, aanmeldings, of bedieners nie.
- Geen ander eindspele nie (KLR v K alleen).
- Geen Engelse UI nie.
- Geen karakters, name of beelde uit bestaande gepubliseerde werke nie.
- Geen eksterne skaakenjin of afgelaaide tabelbasislêers nie — die orakel word ter plaatse gebou.

## 9. Oop besluite vir die bouer (klein, mag tydens kaarte beslis word)
1. Presiese kleurwaardes van die vier bioomstrata en die hok-skakering (moet kontrasteer met beide bordkleure).
2. Of die skuifbegroting as syfer of as 'n kronkelende tou-ikoon vertoon word (voorstel: tou wat korter word — bergmetafoor, minder syfer-angs).
3. Die presiese vasval-oomblik vir die gloeiwenk op elke sport (verstek: orakel; handoorheersing toegelaat in die posisiebank).

---

*"Die loper kies die tronk. Die ruiter maak die gaatjies toe. Die koning stoot. En die berg — die berg onthou."* — Oom Jorka
