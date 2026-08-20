# CLAUDE.md — Sneeuluiperd se Kruin
### 'n Afrikaanse skaakafrigter vir die loper-en-ruiter-mat (KLR v K)

**Projek:** Sewende afrigter in die Blokkie-wêreld-suite van Afrikaanse skaakwebtoepassings.
**Teikenspeler:** 'n Baie intelligente 8-jarige wat reeds die Skaakmat Afrigter bemeester het.
**Doel:** Diep, oordraagbare begrip van die loper-en-ruiter-mat — nie 'n gememoriseerde skuifreeks nie. Die W-struktuur is die leerplan; die hokkleuring (Delétang-by-stealth) is die begripsmeganisme; die berg is die vorderings-UI.
**Vorm:** Enkellêer HTML/JS in die familie-styl. Geen eksterne enjin nie. Volledig Afrikaans.

---

## Vordering (bygewerk 2026-08-12)

**Al ses kaarte is voltooi en gecommit** op tak `add-RandomForestRanger`. 'n Ongeplande Kaart 7 (kunswerk-integrasie, weergawe 1) is sedertdien ook voltooi — sien hieronder.

| Kaart | Status | Waar |
|---|---|---|
| 1 — Die Orakel | ✅ Voltooi | `Berg/orakel/` (`orakel-core.js`, `orakel-worker.js`, `orakel.js`, `orakel-toets.html`) |
| 2 — Die Spel-enjin | ✅ Voltooi | `Berg/kruin/` (`kruin.html`, `app.js`, `posisiebank.js`, bou-pyplyn in `kruin/pyplyn/`) |
| 3 — Hokkleuring/Vervaag-in/Wenke | ✅ Voltooi | Uitgebrei binne `Berg/kruin/app.js` |
| 4 — Die Berg | ✅ Voltooi | `Berg/berg/berg.js` — begin as selfstandige demo (`berg-demo.html`), **nou volledig geïntegreer in kruin.html sedert Kaart 5** |
| 5 — Die Wêreld | ✅ Voltooi | `Berg/kruin/jorka.js` (teksbank), `Berg/kruin/klank.js` (klank), Kapok-gedrag uitgebrei in `Berg/berg/berg.js` |
| 6 — Oudit en Sertifisering | ✅ Voltooi | `Berg/kruin/pyplyn/kaart6/` (oudit-skrifte); verslag as kommentaarblok bo in `kruin.html` |

**Bekende spesifikasie-gaping:** §1.4 verwys na §4.4 vir hoe die ruiter se W-pad geleer word, maar §4 gaan net tot §4.2 — §4.3/§4.4 bestaan nie in hierdie dokument nie. Opgelos deur die "ideale W-pad" direk uit die orakel af te lei (die volledig-optimale hoofllyn vanaf 'n sport se wortelposisie) eerder as 'n hardgekodeerde meetkundige patroon (sien `berekenIdealePad` in `app.js`). Hersien indien §4.4 se inhoud ooit opgespoor/herbevestig word.

**Kaart 6 (2026-07-30):** 1128/1128 outomatiese toetse geslaag — posisie-oudit (240 posisies), slinkse-lyne-oudit (16 lyne), geskripte deurspeel-toets (optimale klim 1→30 + elke mislukkingsklas), en die volle regressielys. Geen fout is in die geskeepte kode gevind nie; twee foute is in die oudit-skrifte self reggestel voor die finale pas. **Metodologie-let wel:** hierdie sessie het geen blaaier-outomatisering gehad nie (Claude-in-Chrome nie geïnstalleer nie), dus is die oudit op reëls-enjin-vlak gedoen (Node `vm`, werklike produksielêers ongewysig gelaai) eerder as 'n volle Chromium/Playwright-DOM-pas soos Kaarte 1–5. Volledige verslag: sien die kommentaarblok bo in `kruin/kruin.html` en `kruin/pyplyn/kaart6/oudit-verslag.json`. Voor Kaart 6 begin het, is ook 'n regte gebruiker-gerapporteerde fout herstel: `beginPoging()` is nooit ná 'n geslaagde klim weer geroep nie (die bord het nie vir die nuwe sport opgestel nie) — herstel in `voltooiUitkomste()`, deur die gebruiker in die blaaier bevestig.

**Let wel oor masjienlas:** die orakel se bou-tyd kan onder swaar onverwante CPU-las tydelik ver bo die 15s-plafon meet (tot 30s+ waargeneem) — 'n omgewingskwessie, nie 'n kode-regressie nie. Loop prestasietoetse verkieslik 'n paar keer, of op 'n rustige stelsel, voordat enige bou-tyd-bevinding as 'n regte probleem aangeteken word. (Bevestig weer tydens Kaart 6: Node se `vm.runInContext`-sandboks voeg sy eie ~2-3x stadigheidskoste by bo suiwer Node — irrelevant vir die werklike blaaier-looptyd, wat nooit deur `vm` gaan nie.)

---

## Kaart 7 — Kunswerk-integrasie, weergawe 1: kinders-kolaz (2026-08-12)

**Status: ✅ Voltooi.** Nie een van die oorspronklike ses kaarte nie — nuwe omvang wat ontstaan het toe die gebruiker vier landskap-kolaz-blaaie (`Berg/berg/1_sneeu.png` .. `4_moeras.png`) gedeel het wat sy kinders self gemaak het, en gevra is of dit as agtergrond kon werk.

**Herkoms — belangrik vir toekomstige sessies:** hierdie kolaz is **nie** die gekommissioneerde illustreerder se werk nie (sien §Kaart 8 hieronder vir daardie brief). Die gebruiker het uitdruklik gevra dat dit as **weergawe 1** van die berg-kuns dien, met die verwagting dat die gekommissioneerde weergawe later as **weergawe 2** bykom. Die twee weergawes moet apart bly — geen kode of koördinate hieronder mag aanvaar dat daar net een weergawe sal wees nie.

**Bevinding voor die integrasie begin het:** toe die vier blaaie in volgorde (Sneeu bo, Rotse, Woud, Moeras onder — soos in die kunstenaarsbrief se stapelvolgorde) saamgevoeg is, het dit uit sigself 'n deurlopende, redelik skoon diagonaal gevorm (lug links, wydte krimp van ~67% bo na ~10-15% onder; berg/terrein regs, groei omgekeerd). Dit is met 'n regte pixel-vlak seam-toets bevestig (grens-x binne ~2-7% van beeldwydte tussen elke naat). **Gevolg:** die bestaande diagonale kamera-argitektuur (kruin regs-bo, voet links-onder, §4.1/§4.2) hoef nié na 'n regop-uitleg te verander soos oorspronklik in hierdie dokument aanvaar is nie (sien die verouderde besluit hieronder, nou vervang).

**Wat gebou is:**
- `Berg/berg/berg-agtergrond.jpg` — die vier blaaie herskaal na 720px breed (2036px totale hoogte), saamgevoeg in stapelvolgorde, JPEG q=84 (~412 KB). Sone-nate lê by y=509 (sneeu/rotse), y=1018 (rotse/woud), y=1527 (woud/moeras).
- `Berg/kruin/kruin.html` — die handgetekende SVG-terrein (`#lug`, `#verre-pieke`, `#terrein`-strata, `lugGradient`) is vervang met 'n enkele `<image>`-laag wat `berg-agtergrond.jpg` dek; die SVG se `viewBox` skuif van `0 0 1200 800` na `0 0 720 2036` (die agtergrondbeeld se eie pixelruimte). `#roete` se Bézier-pad en die drie `#sone-grense`-sirkels is herkoördineer om met die kolaz se werklike sigbare diagonaal te pas (pad bly deurgaans op die terrein-kant, nooit oor die lug-kant nie — geverifieer deur al 30 merkerposisies + kamera-vensters teen die werklike beeld te render, sien hieronder). `#merkers`/`#bewoners`/`#klimmer`-groepe (deur `berg.js` gevul) is ongeskonde.
- `Berg/berg/berg.js` — enjin-argitektuur ongeskonde; net `VENSTER_W/H` (340×260 → 360×280), `kruinView()`, en `bewonerOnthulling()` se `nabyBewoner`-venster is herskaal na die nuwe wêreldruimte. Die nuwe waardes is toevallig soortgelyk in grootte-orde aan die oues (die gekose beeldresolusie het min of meer met die ou hand-SVG se skaal ooreengekom), dus was min afstemming nodig.
- **Geen "weergawe-wisselaar" in-game gebou nie** (gebruiker se uitdruklike keuse) — weergawe 1 is tans die enigste/verstek-kuns, maar agtergrond-beeld + roete/merker/sone-koördinate + kamera-konstantes is almal in `berg-agtergrond.jpg`/`kruin.html`/`berg.js` gehou as 'n samehangende, herhaalbare stel wysigings — as weergawe 2 later bykom, behoort dit dieselfde patroon te volg (nuwe beeld-lêer, nuwe koördinate, geen ander enjin-verandering) sonder om weergawe 1 aan te raak.
- **Bewoner-plekhouers (Kaart 4 se kleur+letter-sirkels) is ongeskonde/onveranderd** — dié 10 diere-plekhouers is glad nie deel van hierdie kolaz nie (die kolaz se toevallige foto's — arend, luiperd, olifante — is dekoratiewe teksture in die agtergrond, nié die aangewese Akkedis/Aksolotl/ens.-bewoners nie). Regte bewoner-kuns bly toekomstige werk, ongeag watter agtergrond-weergawe.

**Verifikasie:** geen blaaier-outomatisering beskikbaar hierdie sessie nie (Claude-in-Chrome deur die gebruiker afgewys). In plaas daarvan is die werklike `d`-pad-wiskunde en kamera-vensterformules in Python herbou en teen die werklike `berg-agtergrond.jpg`-pixels gerender (al 30 merkers + 5 kamera-vensterstate: sport 1, 15, 23, 30, kruinView) om te bevestig dat elke merker op sigbare terrein land en elke venster 'n sinvolle landskap-crop gee. SVG-elementstruktuur onafhanklik bevestig as welgevormd (kommentare bevat doelbewus " -- " soos elders in hierdie kodebasis se styl — dis 'n vals-alarm vir streng-XML-ontleders, nie 'n regte fout nie, aangesien blaaiers HTML-kommentaar-ontleding gebruik). **Ná hierdie statiese verifikasie het die gebruiker self die speletjie oor `python3 -m http.server` in 'n regte blaaier oopgemaak en bevestig dat dit werk** (agtergrond, roete, merkers, kamera-beweging) — dus is die "steeds aanbeveel"-DOM-pas hierbo intussen informeel deur die gebruiker self gedoen, al is dit nie 'n outomatiese Playwright-pas nie.

`Berg/berg/berg-demo.html` (die ou Kaart 4-selfstandige demo, nie deur `kruin.html` gebruik nie) is doelbewus ongeraak gelaat — dit het steeds die ou 1200×800 hand-SVG. Nie 'n probleem nie (dooie kode, buite die speletjie se werklike pad), maar hersien/verwyder as dit ooit verwarring veroorsaak.

---

## Kaart 7-vervolg — karakter-kuns geïntegreer (2026-08-13)

**Status: ✅ Voltooi.** Die gebruiker het vier stelle karakter-kuns opgelaai (selfde konstruksie as die kolaz-agtergrond se bronlêers: plat sel-skadu's + harige lynwerk, `viewBox="0 0 1408 768"`, geen gradiënte/raster nie) en gevra dit word werklik in die spel gedraad, nie net as 'n konsepblad nie:
- `Berg/Kapok/4_vlekkies.svg` — Kapok se vier posisies (draf, bly/sprong, twee klim-rame).
- `Berg/Yorka.svg` — Oom Jorka, een posisie.
- `Berg/Sneeuluiperd.svg` — die Sneeuluiperd, een posisie (sit, kyk terug).
- `Berg/four creatures.svg` — vier bewoner-diere, een per sone: Aksolotl (Moeras), Apie (Woud), Ibeks (Rotse), Sneeuhaas (Sneeu). Presies een dier per sone, soos deur die gebruiker gevra; die ander ses bewoners (Akkedis/Papegaai/Klipdassie/Bergkraai/Lammergier + geen tweede Sneeu-dier bo Sneeuhaas nie) het nog geen kuns nie en bly die Kaart 4-plekhouer (kleur-sirkel + letter).

**Argitektuur:** al vier bronlêers is by geleentheid "een gedeelde vlak-pad per kleur, meer as een figuur op een canvas" (Kapok se 4 posisies deel 3 paaie; die vier bewoner-diere deel 4 paaie) — dieselfde patroon as die kolaz-agtergrond se seams. Uitgesny per figuur/posisie via `viewBox`-crops op ongewysigde pad-data, geen pixel herteken nie (dieselfde tegniek as die agtergrond-seam-verifikasie in Kaart 7).

**Twee regte foute is tydens hierdie kaart gevind en reggestel (deur die gebruiker self, in die regte blaaier) — albei die moeite werd om te onthou:**

1. **Die "agtergrond-was"-fout ("amateuragtige wit blok" om Kapok).** Al vier bronlêers se naby-wit/-romerige vlak (Kapok se `#fcfcfb`, Yorka se `#ffffff`, Sneeuluiperd se `#feffff`, die diere se `#f9faf6`) is **nie** 'n netjiese figuur-silhoeët nie — dis 'n ondeurskynende laag wat byna die hele 1408×768-doek dek (bevestig deur alfa-kanaal-steekproewe in al vier hoeke van elke bronlêer: deurgaans 255/ondeurskynend, ver van enige werklike figuur). Toe 'n posisie/dier per `viewBox`-crop uitgesny is, het hierdie vlak dus as 'n reghoekige wit blok om die figuur gewys. **Regstelling:** die hele vlak word doelbewus **nie** gebruik nie — slegs die buitelyn- en aksentkleur-vlakke bly, deursigtig oral elders. Werk goed vir Yorka/Sneeuluiperd/Aksolotl/Apie/Ibeks (hul liggame se sigbare vorm kom reeds van ander vlakke). **Kapok (en die Sneeuhaas) se vagsel bly egter self ook deursigtig** — hulle het geen ander vlak wat hul lywe vul nie. 'n Opvolgpoging om dit reg te stel (ontleed die "wit vlak" se tientalle **subpaaie** om die een kanvas-omvattende agtergrond-subpad te vind en uit te sluit terwyl die res — klein hoogtepunt-strepies, nie 'n soliede vorm nie — behou word; plus twee handgeplaaste wit ellipse-vorms per posisie (lyf + kop) as 'n nuwe `kapok-fur`/`sneeuhaas-fur`-vlak) is deur die gebruiker as onbevredigend beoordeel ("dit het nie gewerk nie") en **volledig teruggerol**. Kapok en die Sneeuhaas se vagsel is dus tans **doelbewus deursigtig** (net buitelyn + skakering/aksentkleure sigbaar, geen "wit blok" nie, maar ook nie 'n solied wit lyf nie) tot 'n regte kunsredigering (nie 'n kode-fix nie) dit oplos. Die gebruiker is na 'n eksterne redigeerdiens/instrument verwys om die bronlêer self reg te maak eerder as verder kode-gebaseerde raaiwerk.
2. **Kuns wat glad nie gewys het nie (Aksolotl bly 'n plekhouer-sirkel).** Die oorspronklike weergawe het `berg/kuns-bates.svg` by looptyd met `fetch()` + `DOMParser()` + `document.importNode()` ingebring. Die presiese oorsaak kon nie deur hierdie sessie (geen blaaier-outomatisering) bevestig word nie, maar eerder as verder te raai, is die hele laai-pyplyn **laat vaar ten gunste van 'n eenvoudiger, minder-brekbare ontwerp**: die kuns staan nou **staties ingebed** as een `<defs>`-blok reg in `kruin.html` en `berg-demo2.html` se eie SVG-merkup — geen netwerk-oproep, XML-ontleding, of dokument-invoer op looptyd nie. `BergEngine.init()` is weer sinchroon (`bepaalKunsGereed()` is nou net 'n `querySelector('#kapok-outline')`-teenwoordigheid-toets, geen laai nie), al gee dit steeds 'n `Promise` terug (`Promise.resolve()`) sodat `app.js` se bestaande `.then(...)`-ketting ongewysig kon bly. `Berg/berg/kuns-bates.svg` bly bestaan as 'n **referensie-bondel** (die kanonieke plek om al die kuns saam te sien / waaruit die twee HTML-lêers se `<defs>` gegenereer is) maar is nie meer 'n looptyd-afhanklikheid nie.
3. **Selfveroorsaakte regex-korrupsie (twee keer, tydens die opvolg-regstelling hierbo).** Toe die `<defs>`-blok se inhoud met 'n Python `re.search(r'<defs>.*?</defs>', ...)` opgespoor en vervang is om die nuwe `kapok-fur`/`sneeuhaas-fur`-vorms by te voeg, het die patroon per ongeluk gepas by die **letterlike teks "`<defs>`" binne 'n verduidelikende HTML-kommentaar** bo die regte `<defs>`-merker (dieselfde soort vals-alarm as die " -- "-in-XML-kommentaar-issue van vroeër in Kaart 7, maar hierdie keer 'n regte skade, nie net 'n vals-positiewe toets nie) — die niegierige soektog het toe deurgeloop tot by die regte `</defs>` ver later, en alles daartussenin (die kommentaar se stert, die werklike ou `<defs>`, ends. `<image>`/roete/merkers vir `berg-demo2.html`) is vervang/vernietig. Dit het **twee keer** gebeur (`kruin.html` én `berg-demo2.html`) voor dit raakgesien is, deur presies te soek na "is die nuwe `<defs>`-merker per ongeluk binne 'n oop kommentaar?" (`html.rfind("<!--", 0, defs_idx) > html.rfind("-->", 0, defs_idx)`). **Les:** gebruik nooit weer 'n generiese `<defs>`/`<svg>`-regex op 'n lêer wat self kommentare bevat wat daardie tekens noem nie — gebruik 'n unieke, ondubbelsinnige plekhouerstring (soos `<!-- KARAKTER_KUNS_DEFS_PLACEHOLDER -->`, nou in `berg-demo2.html` se bronkopie) of presiese byte-omvang-snitte met eksplisiete verifikasie ná elke vervanging.

**Kapok se posisiewisseling:** die basis (`#kapok-sprite`) wys "draf" as verstek. `klim()` wissel na "klim-onder" (voorpote teen die rots) vir die duur van die klim-animasie en keer terug na "draf". `kapokTolVanVreugde()` (mat-vreugde) wissel na "bly" (sprong) met 'n klein bons i.p.v. die vorige 360°-rotasie (rondom-draai lyk vreemd op gedetailleerde, nie-simmetriese kuns). `kapokBlaf()`, `kapokOreVlat()`, en die vier `kapokKunsie()`-truuks bly presies dieselfde CSS-transforms as voorheen — dié werk op enige onderliggende kuns (of die plekhouer) omdat hulle die hele `#kapok-sprite`-groep transformeer, nie die kuns self herteken nie.

**Skilder-volgorde (gebruiker-versoek):** `#klimmer` (en dus Kapok) moet altyd bo die roetemerkers/bewoners lê. Die statiese merkup het dit reeds so (laaste kind van `#bergSvg`), maar `init()` doen nou ook 'n eksplisiete `svg.appendChild(klimmerEl)` aan die einde — 'n bestaande element skuif (nie dupliseer nie) na die einde van sy ouer se kinderlys, wat top-z-order waarborg ongeag toekomstige merkup-herrangskikking.

**Oorblywende gapings (nog nie kuns vir nie):**
- Kapok se "ore-plat/hartseer" (konseptuele mislukking) en "sit-by-wenk"-oomblikke het geen toegewyde posisie in die opgelaaide vier nie — `kapokOreVlat()` pas dus net sy ou squash-transform toe op watter kuns-posisie ook al tans wys, sonder toegewyde kuns.
- Ses van die tien bewoners (Akkedis, Papegaai, Klipdassie, Bergkraai, Lammergier) het nog geen kuns nie — bly die Kaart 4-kleursirkel-plekhouer tot kuns daarvoor opgelaai word. `BEWONER_KUNS` in `berg.js` is die enigste plek wat 'n nuwe inskrywing nodig het wanneer dit gebeur.

**Oom Jorka se portret:** nuwe plasing (hy het voorheen géén visuele teenwoordigheid gehad nie) — 'n 44×44px afgeronde portret langs `#jorkaTeks` in die statuspaneel (`kruin.html`/`styles.css`), 'n kop-en-skouers-crop van `#yorka-figure`. Suiwer HTML/CSS; geen kamera- of SVG-laag-verandering nodig nie, presies soos in die vooraf-hersieningsblad ooreengekom.

**`Berg/berg/berg-demo2.html`** (nuut) — selfde gees as die ou Kaart 4 `berg-demo.html`-selfstandige-demo, maar loop nou teen die werklike Kaart 7-bates (raster-agtergrond + staties-ingebedde karakter-kuns) i.p.v. plekhouers, met ekstra knoppies om Kapok se reaksies (blaf/bly/ore-plat) op aanvraag te toets, en 'n statusreël wat "Kuns gereed: ja/nee" wys. Nie deur `kruin.html` gebruik nie — suiwer 'n bewys-/oefenblad, soos sy voorganger.

**Verifikasie hierdie sessie:** geen blaaier-outomatisering beskikbaar nie (die gebruiker het Claude-in-Chrome van die hand gewys). Al die SVG-merkup (na elke wysiging) se XML-welgevormdheid (met kommentare uitgehaal, `xml.etree`) en `node --check` op al die JS is bevestig; elke uitgesnyde posisie (Kapok x4, bewoner-diere x4, Yorka, Sneeuluiperd) is via `cairosvg` gerender en visueel nagegaan, insluitend teen 'n skaakbord-agtergrond spesifiek om deursigtigheid ná die agtergrond-was-regstelling te bevestig. **Geen werklike blaaier-DOM-toets is gedoen nie** — die gebruiker het self twee regte foute gevind deur dit in die regte blaaier te toets (sien die twee genommerde foute hierbo); 'n regte Chromium-pas word steeds sterk aanbeveel sodra blaaier-outomatisering weer beskikbaar is.

### Kapok se vagsel opgelos (2026-08-18)

**Status: ✅ Opgelos vir Kapok.** Die bug #1-oorblyfsel hierbo ("Kapok se vagsel bly egter self ook deursigtig") is reggestel — anders as die teruggerolde poging (handgeraaide ellipse-koördinate, deur die gebruiker as onbevredigend beoordeel).

**Metode (masjienleesbaar geverifieer, nie geraai nie):** die gebruiker het probeer om dit self reg te teken in 'n eksterne redigeerder ("dit werk nie regtig nie"), waarna gevra is of dit outomaties gedoen kon word. Aangesien beeld-render-en-visueel-nagaan (via `cairosvg` + Read-gereedskap se beeldweergawe) nou wél beskikbaar was hierdie sessie (anders as die vorige opvolgpoging, wat blind op koördinate staatgemaak het), is 'n nuwe benadering gevolg:
1. Render **net** die outline-vlak (`#181815`, geen was, geen skade) teen 4× resolusie met `cairosvg`, alfa-kanaal as "muur"-masker.
2. `scipy.ndimage.binary_closing` (klein struktuurelement) oorbrug enige mikroskopiese hairline-nate in die harige lynwerk, dan `scipy.ndimage.binary_fill_holes` vul elke omsluite binneruimte — dit volg dus die kunstenaar se **werklike** geslote lyne, nie 'n aangenome liggaamsvorm nie. Bene/stert/ore wat deur agtergrond geskei word, bly korrek geskei (nie omsluit nie, dus nie gevul nie).
3. Elke los-verbonde streek (16 in totaal: 4 hondliggame + 12 klein interne besonderhede) is via `skimage.measure.find_contours` + `approximate_polygon` (Douglas-Peucker, toleransie 1.2px@4×) teruggevektoriseer na 'n enkele nuwe `<path id="kapok-fur" fill="#fcfcfb">` met 16 subpaaie.
4. Voor dit ingebak is: **elke stap visueel bevestig** — die gevulde masker as PNG, die finale vektorpad teen 'n magenta agtergrond (om te bewys dit nêrens die volle doek dek nie, ánders as die oorspronklike was-vlak), en al vier posisies presies soos `berg.js` se werklike `KAPOK_POSES`-crop-rehoeke dit sou sny, gerender direk vanaf die **werklike, reeds-gewysigde** `kruin.html`-lêerinhoud (nie 'n los toetslêer nie).

**Wysigings:**
- `Berg/kruin/kruin.html`, `Berg/berg/berg-demo2.html`, `Berg/berg/kuns-bates.svg` — nuwe `<path id="kapok-fur">` bygevoeg in `<defs>`, net voor die bestaande `kapok-outline`. (Invoeg via presiese, unieke string-merker `<defs><path id="kapok-outline"` — die generiese-regex-slaggat van bug #3 hierbo doelbewus vermy.)
- `Berg/berg/berg.js` — `KAPOK_USE_IDS` is nou `['kapok-fur', 'kapok-shade', 'kapok-outline']` (vagsel agter, skakering, dan buitelyn bo-op — verf-volgorde = array-volgorde in `bouKunsSnit()`); kommentaarblok bygewerk om die ou "bly deursigtig"-nota te vervang.
- Die **Sneeuhaas se vagsel bly steeds deursigtig** — geen ekwivalente bronlêer vir die Sneeuhaas is opgelaai nie (die tegniek hierbo sou net so goed daarop werk sodra 'n bronlêer bestaan met 'n skoon `#181815`-buitelynvlak).
- `Kapok/4_vlekkies.svg` (deur die gebruiker herop­gelaai) is bevestig **identies** (byte-vir-byte pad-data) aan die reeds-ingebedde `kapok-outline`/`kapok-shade` — dis dieselfde bronlêer, nie 'n nuwe weergawe nie; die derde vlak daarin (`#fcfcfb`) is steeds dieselfde canvas-dekkende was en is nie gebruik nie. `4_vlekkiesB.svg` (los lêer by die Berg-wortel) is ondersoek en verwerp — dieselfde was-probleem, plus onvoorspelbare gate.

### Stapper Seun geïntegreer (2026-08-18)

**Status: ✅ Voltooi.** Die klimmer self (voorheen net `<circle id="klimmer-lyf">`, 'n grys plekhouer-sirkel) het nou werklike kuns: `Stapper_seun.jpg`, vier uitrustings in een JPEG (Moeras: notaboek+kamera; Woud: tou+spies-paal; Rotse: kremetart-hoed, waai; Sneeu: volle winter-bergklim-toerusting, ysbyle), een per sone, deur die gebruiker gevra as "ons werklike karakter".

**Ander bronmateriaal, ander tegniek as Kapok:** `Stapper_seun.jpg` is 'n plat, reeds-volledig-geverfde JPEG-illustrasie op 'n amper-suiwer-wit agtergrond (border-steekproef: gemiddeld ~254.7/255, std <1) — nie 'n SVG met 'n bruikbare buitelynlaag nie, dus was kapok-fur se "render-net-die-buitelyn-en-vul-holtes"-tegniek nie van toepassing nie. In plaas daarvan:
1. Kleursleutel: alfa = afstand-tot-suiwer-wit (`√Σ(kanaal-255)²`), sagte helling tussen afstand 20 (deursigtig) en 55 (ondeurskynend).
2. **Globaal toegepas, nie net aan die raam se rand gekoppel nie** — 'n eerste poging wat net wit-gekoppel-aan-die-buiterand verwyder het, het lelike reghoekige wit kolle gelaat waar die illustrasie self toevallig 'n omsluite wit gaping het (die tou-lus in die Woud-posisie, die ysbyl-band in Sneeu). Geverifieer dat 'n globale sleutel dit oplos sonder om werklike buiswit kostuum-elemente (kraag, kremetart-hoed, pelsrand) te vreet — dié is almal aansienlik minder-as-suiwer-wit (afstand 77–95+) danksy die illustrasie se deurgaanse halftoon-skakering, ver bo die 20–55-drempel.
3. Elke uitrusting outomaties uitgeknip (verbonde-komponent-ontleding op die alfa-kanaal, 4 groepe geskei deur x-gapings), afgeskaal na 220px hoogte, as PNG (nie SVG-pad nie — dis 'n volledig geverfde illustrasie, nie plat lynwerk om te vektoriseer nie), base64-ingebed as vier aparte `<image id="stapper-<sone>">`-elemente in `<defs>` (~227 KB totaal oor 4 beelde).
4. Geverifieer teen 'n saturated-blou toetsagtergrond (geen wit-omranding sigbaar nie) én teen 'n werklike terrein-crop, en — soos met kapok-fur — 'n finale render direk vanaf die **werklike, reeds-gewysigde** `kruin.html`-inhoud (die regte `#klimmer`-groep, Stapper Seun + Kapok saam, op al vier sones) voor dit as afgehandel beskou is.

**Argitektuur (`berg/berg.js`):** anders as Kapok se een-gedeelde-canvas-plus-viewBox-crop (`bouKunsSnit`/`KAPOK_USE_IDS`) is elke Stapper Seun-uitrusting 'n volledige, aparte raster-beeld — geen crop-venster nodig nie. `STAPPER_ZONE_IDS` koppel sone-naam → `<defs>`-beeld-id; `stelStapperPos(sone)` lees daardie beeld se `href`/intrinsieke-afmetings af en pas dit toe op die sigbare `<image id="stapper-sprite">` (wat `init()` in die plek van `<circle id="klimmer-lyf">` skuif, presies soos Kapok se kuns die `kapok-lyf`-sirkel vervang — die sirkel bly plekhouer as die kuns ontbreek). Anker: voete op die roetelyn (`y=0`), gesentreer horisontaal. `STAPPER_ICON_MAXDIM = 54` (groter as Kapok se 38 — hy's die hoofkarakter, sonder om die roetemerkers/Kapok te oorheers).

**Sone-wisseling (gebruiker-versoek: outomaties, sone-gebaseer, onafhanklik van enigiets anders):** `stelStapperPos(ZONE_OF(rung))` word geroep in `init()` (beginRung), `openingsAfkoms()` (landings-rung), `klim()` en `daal()` (bestemmings-rung) — dus wissel sy uitrusting elke keer die huidige sport se sone verander, ongeag hoe die klimmer daar gekom het. Geen `app.js`-wysiging nodig nie — alles selfbevat binne `berg.js`.

**Kapok-plasing (gebruiker-versoek: Kapok bly onveranderd):** `#kapok-sprite`se bestaande `translate(16,8)`-verset (t.o.v. die klimmer-groep se oorsprong) is nie aangeraak nie. Toevallig werk dit steeds goed met die groter Stapper Seun (wie se voete nou by `y=0` staan, kop opwaarts na `y=-54`) — Kapok land netjies langs sy voete, effens agter/onderkant, soos 'n trotterende hond. Geverifieer visueel (sien hierbo).

**Style-noot:** die gebruiker is uitdruklik gevra of die gemeng van hierdie halftoon-geverfde stroomprentstyl met die plat "ligne claire"-styl van Kapok/Yorka/Sneeuluiperd/die bewoners 'n probleem is — antwoord: nee, aangesien die agtergrond self reeds 'n kinders-fotokolaz is (Kaart 7 v1), is 'n derde, andersoortige styl vir die hoofkarakter nie 'n groter clash nie. Geen verdere aksie geneem nie.

---

### Vier bewoners geïntegreer + twee hernoem (2026-08-19)

**Status: ✅ Voltooi.** `Four_animals_additional.jpg` (selfde konstruksie as `Stapper_seun.jpg`: 'n plat, reeds-geverfde JPEG, vier diere langs mekaar, amper-suiwer-wit agtergrond) het vier van die ses nog-kunslose bewoners van kuns voorsien: 'n padda, 'n papegaai, 'n klipdassie, en 'n sneeuman. Slegs **Bergkraai** het nou nog geen kuns nie.

**Twee van die vier is inhoud-wysigings, nie net kuns nie (gebruiker-versoek):** die padda vervang **Akkedis** (sport 3, Moeras) en die sneeuman vervang **Lammergier** (sport 27, Sneeu) — 'n akkedis is 'n akkedis, 'n padda is nie; 'n lammergier is 'n baardaasvoël, 'n sneeuman glad nie 'n voël nie. Op uitdruklike versoek is `BEWONER_INFO` se `naam`/`letter` reggestel om te pas (Akkedis/Ak → **Padda**/Pd; Lammergier/Lg → **Sneeuman**/Sm). Laag risiko: `naam` word net as 'n verborge `data-naam`-DOM-attribuut gestel, nooit deur enige dialoog in `jorka.js` aangehaal nie (bevestig deur soektog voor die hernoeming). Die ander twee (papegaai, klipdassie) is suiwer kuns vir reeds-bestaande, korrek-benoemde bewoners (**Papegaai**, sport 9; **Klipdassie**, sport 15) — geen hernoeming nodig nie, die diere pas presies.

**Selfde pyplyn as Stapper Seun, met een belangrike aanpassing wat eers ontdek moes word:** 'n eerste poging het die identiese globale kleursleutel-tegniek (afstand-tot-suiwer-wit, sonder randverbondenheids-beperking) van Stapper Seun hergebruik — en dit het die **sneeuman se pels en die papegaai se kopvere laat vergrys** teen 'n donker agtergrond. Oorsaak: anders as Stapper Seun se kostuum (deurgaans dof-genoeg-om-suiwer-wit-doeltreffend-te-onderskei), is die sneeuman se ysige pels self opsetlik amper-suiwer-wit as ontwerpkeuse (steekproef: pelshoogtepunte tot afstand-tot-wit ≈ 7, mediaan ≈ 44 — reg binne die 20–55-vervagingsone wat vir Stapper Seun veilig was) — kleur alleen kan dit nie van die ware agtergrond (afstand ≈ 0) onderskei nie. **Regstelling:** wissel na rand-verbondenheid (soos die heel eerste Stapper Seun-poging, wat toe verwerp is oor die tou-lus-gaping-probleem) — slegs suiwer-wit wat aan die beeld se buiterand raak (via verbonde-komponent-ontleding vanaf die rand) tel as agtergrond; suiwer-wit binne 'n geslote silhoeët (die pels, die papegaai se kop) bly ondeurskynend, ongeag hoe naby dit aan suiwer wit is. Al vier diere is ná die wisseling teen 'n magenta toetsagtergrond nagegaan — geen vergryssing, geen oorblywende wit kolle (die enigste vorige rand-verbondenheids-gebreke — Stapper Seun se tou-lus/ysbylband — was uniek aan daardie illustrasie se ontwerp; hierdie vier het geen ekwivalente omsluite-gaping-probleem nie). **Les vir toekomstige agtergrond-verwyderings:** toets eers of die karakter se eie kleurpalet werklik ver van suiwer wit lê voordat 'n globale sleutel gebruik word; gebruik rand-verbondenheid as verstek en wissel net na 'n globale sleutel as spesifieke omsluite gapings (soos Stapper Seun s'n) dit vereis.

**Segmentering:** die padda en papegaai se boks-omvattings oorvleuel effens in x (die papegaai se perk-toutjies/die padda se tak-stompies raak amper aanmekaar) — kolom-projeksie (soos vir Stapper Seun gebruik) sou dit verkeerd geknip het. In plaas daarvan: verbonde-komponent-ontleding, elke komponent se sentroïde gebruik om dit aan die regte dier toe te ken (die padda se tak het 'n paar los, klein sub-100px-satelliet-fragmente onderkant die hoofliggaam — almal aan "padda" toegewys via nabyheid), dan die unie-omvattende-boks per dier gebruik om te sny.

**Argitektuur (`berg/berg.js`):** nuwe `BEWONER_KUNS`-tipe `'raster'` (naas die bestaande `'crop'`/`'group'`), bedien deur `bouRasterSnit(imgDefId, maxDim)` — analoog aan `stelStapperPos()`, maar gee 'n `<image>`-element (gesentreer, nie voete-op-lyn-geanker soos Stapper Seun nie — bewoners staan vas by hul mylpaal-posisie, geen looppad-konteks nie) terug, of `null` as die `<defs>`-beeld ontbreek (roeper val dan terug op die kleursirkel-plekhouer, presies soos die bestaande `'crop'`/`'group'`-paaie by ontbrekende kuns sou vasval, al is daardie geval nooit eksplisiet getoets nie omdat hul bronne altyd teenwoordig is). Skaal: `maxDim: 42` vir al vier, dieselfde as die bestaande vier `'crop'`-diere (Aksolotl/Apie/Ibeks/Sneeuhaas) — op die gebruiker se versoek, sodat die sneeuman (wat as 'n regop mensfiguur maklik kon oorheers) nie die Sneeuluiperd se sport-30-onthulling (`maxDim: 56`) as die visuele hoogtepunt verdring nie.

**Verifikasie:** dieselfde patroon as Stapper Seun — elke dier teen 'n magenta toetsagtergrond bevestig (geen kolle/vergryssing), en 'n finale render van al vier presies soos `bouRasterSnit()` dit by `maxDim=42` sou vertoon, direk vanaf die **werklike, reeds-gewysigde** `kruin.html`-inhoud. Geen werklike blaaier-DOM-toets gedoen nie (steeds geen blaaier-outomatisering hierdie sessie nie) — 'n regte blaaier-pas (klim tot sport 3/9/15/27, bevestig elke bewoner se onthulling) word aanbeveel voor dit as volledig bevestig beskou word, soos met Stapper Seun.

---

### Die eerste vier diere (Aksolotl/Apie/Ibeks/Sneeuhaas) se vagsel opgelos (2026-08-20)

**Status: ✅ Opgelos vir al vier.** Die gebruiker het gevra om terug te gaan na die *oorspronklike* vier "four creatures.svg"-diere en dieselfde kapok-fur-behandeling toe te pas. Aanvanklike aanname (op grond van 'n vorige kaart se nota, "hul liggame se sigbare vorm kom reeds van ander vlakke") was dat net die Sneeuhaas dit nodig het. Eerste implementasie het dus net die Sneeuhaas reggemaak — die gebruiker het toe self in die blaaier opgemerk dat Aksolotl/Apie/Ibeks óók sketterig lyk. **Regte oorsaak (agterna vasgestel):** al vier het dieselfde soort hiaat-in-die-buitelyn as die Sneeuhaas, dit was nooit 'n Sneeuhaas-eiendomlikheid nie — die vorige "lyk goed"-oordeel was op 'n te-klein voorskou-render gebaseer (bevestig met pixel-vlak diff: die "goeie" voorskou was **identies** aan die eintlike, effe-gebreekte lewendige weergawe; die oog het net nie die gapings raakgesien nie).

**Twee nuwe slaggate (bo-op kapok-fur se metode) wat hierdie keer eers ontdek moes word:**
1. **Die raam-kaart-probleem.** Aksolotl/Apie/Ibeks staan elk in 'n omraamde "kaart" in die bronlêer (soos 'n natuurgids-etiket, met 'n titel daaronder); die Sneeuhaas nie. 'n Reguit doekwye `binary_fill_holes` sou elke hele raam-reghoek gevul het (dieselfde "wit blok"-fout as die oorspronklike Kapok-diagnose, net veroorsaak deur 'n raam-lyn i.p.v. 'n was-vlak) — bevestig deur die gevulde fraksie *binne* Aksolotl se bestaande crop-rehoek te meet: 100% by geringe sluiting, oftewel die hele raam-kaart tel as "gevul", nie net die dier nie. **Oplossing:** die WAND-MASKER (die rou buitelyn-alfa, nie eers die eindresultaat nie) word EERS na elke dier se eie crop-rehoek (+12px marge) uitgeknip, VOORDAT `binary_closing`/`binary_fill_holes` loop — die raam se lynwerk bestaan dan letterlik nie in die berekening nie, dus kan dit nooit die vulling insleep nie. (Vir die Sneeuhaas, wat vroeër slegs die *eindresultaat* uitgeknip is, was dit toevallig nie 'n probleem nie, aangesien hy geen raam het nie — maar die voor-uitknip-metode is nou eenvormig oor al vier toegepas.)
2. **Elke dier het sy eie minimum sluitings-hoeveelheid.** `binary_closing`-iterasies getoets oor 'n reeks (0, 2, 4, 6, 8, 12, 16) per dier, soekend na die sprong-en-plato in gevulde fraksie (dieselfde metodologie as die Sneeuhaas-ontdekking hieronder, nou konsekwent oor almal toegepas): Aksolotl reeds stabiel by 0 (min. 2 gebruik vir marge), Apie spring by 2, Ibeks spring by 6, Sneeuhaas spring by 6-8. By Ibeks het 'n té-hoë waarde (8, wat aanvanklik vir almal gebruik is) sy liggaam met 'n aparte kaart-basislyn-versiering (~11 300 px, sigbaar as 'n dun horisontale strepie onder sy pote in die volle-doek-aansig) laat saamsmelt tot een enkele gevulde vorm. **Oplossing:** Ibeks se sluitingswaarde na 6 verlaag (net onder die saamsmelt-drempel) plus 'n "hou net die grootste verbonde komponent"-filter (laat die versiering as 'n aparte, kleiner stuk vaar as dit ooit weer saamsmelt) — algemeen op al vier diere toegepas as 'n veiligheidsnet.

**Les vir toekomstige "lyk dit reg?"-oordele:** moenie op 'n enkele voorskou by verkleinde grootte staatmaak nie — steekproef teen die werklike speletjie-ikoon-grootte (`maxDim=42`) EN diff teen 'n bekende-goeie vorige render voordat 'n laag as "reeds korrek" afgeskryf word.

**Wysigings:** `Berg/kruin/kruin.html`, `Berg/berg/berg-demo2.html`, `Berg/berg/kuns-bates.svg` se `creature-fur`-pad (in `<defs>`, voor `creature-tan`) bevat nou 4 subpaaie (een per dier, elk in sy eie deel van die gedeelde doek) i.p.v. net 1 (Sneeuhaas alleen); `Berg/berg/berg.js` se `CREATURE_USE_IDS` het reeds `creature-fur` byderhand gehad (van die Sneeuhaas-opdrag) — slegs die pad-inhoud en die verklarende kommentaar bo `CREATURE_USE_IDS` is verander.

**Verifikasie:** soos deurgaans hierdie kaart — elke stap (wand-masker per dier, gevulde masker, finale vektorpad) gerender en visueel bevestig, insluitend 'n finale render **direk vanaf die werklike, reeds-gewysigde** `kruin.html`-inhoud by die werklike `maxDim=42`-ikoongrootte vir al vier diere saam. Geen werklike blaaier-DOM-toets gedoen nie hierdie sessie (steeds geen blaaier-outomatisering).

---

### Sneeuluiperd verskuif na die roete se ware eindpunt + 20% groter (2026-08-20)

**Status: ✅ Voltooi.** Op versoek sit die Sneeuluiperd nou "net waar die roete eindig", "bo-op die berg, majesteitlik" — nie langer langs merker 30 soos die ander nege bewoners nie.

**Bevinding:** §2.1 se merker-formule (`t = n / (N_RUNGS + 1)`) laat doelbewus 'n klein marge tussen die laaste merker (n=30, t=30/31 ≈ 0.968) en die roete se ware eindpunt (t=1.0) — 'n effektiewe rugsteun-buffer sodat die "kruin" nie presies op merker 30 saamval nie. Die roetepad se ware eindpunt (`kruinPos`, deur `routePath.getPointAtLength(routeLen)` bereken, presies soos elke ander merkerposisie) is ongeveer 67 wêreld-eenhede van merker 30 af, diagonaal op en regs — 'n sigbare, betekenisvolle skuif, nie kosmeties klein nie.

**Wysigings (`berg/berg.js`, geen SVG-defs-verandering nodig nie):**
- Nuwe `kruinPos`-veld (in `init()`, langs die bestaande `routePath`/`routeLen`-opstelling) hou die roete se ware eindpunt.
- `SNEEULUIPERD_VERSET = { x: 0, y: -15 }` — die Sneeuluiperd-spesifieke verset t.o.v. `kruinPos` (nie t.o.v. 'n merker soos elke ander bewoner se vaste `+26,-26`-verset nie). Die bewoners-bou-lus in `init()` en `bewonerOnthulling()` se onthullings-kamera-venster (`nabyBewoner`) is albei spesiaal-geval vir `n === 30` om hierdie plek te gebruik.
- `BEWONER_KUNS[30].maxDim`: 56 → 67 (56 × 1.2 = 67.2, afgerond).
- Onthullingsvenster vir sport 30 herkalibreer (`x: bx-130, y: by-40`, i.p.v. die generiese `x: bx-42, y: by-108` van die ander bewoners) — die generiese venster het by die nuwe, hoër/wyer plek gedeeltelik BUITE die 720×2036-wêreld geval (bo die boonste rand, oor die regterrand), wat 'n leë strook in die onthullingsanimasie sou gewys het. Die nuwe venster is doelbewus binne die wêreldgrense gehou terwyl sy steeds sentraal/majesteitlik binne die raam sit.

**Verifikasie:** die werklike roetepad-wiskunde (via `svgpathtools`, dieselfde metode as die res van hierdie kaart se roete-verifikasies) bevestig `kruinPos ≈ (620, 60)`; die finale plasing is teen die werklike `berg-agtergrond.jpg` gerender — die roetepad eindig letterlik by haar rotsperskie se voorpote, en die onthullingsvenster is bevestig binne wêreldgrense te bly. Geen werklike blaaier-DOM-toets gedoen nie hierdie sessie.

**Opvolg-verfyning (2026-08-20, dieselfde sessie):** die gebruiker het gevra vir nóg 20% groter en 'n verdere skuif hoër ("net 'n bietjie"). Finale waardes: `maxDim: 67 → 80` (67 × 1.2 = 80.4, afgerond); `SNEEULUIPERD_VERSET.y: -15 → -35` (nog 20 wêreld-eenhede opwaarts — dieselfde koördinaatruimte as `VENSTER_W/H` se 360×280-kamera-venster, dus ~5.5% van die sigbare vensterwydte, 'n werklik sigbare skuif). By hierdie grootte/plek raak haar ore net-net aan die wêreld se boonste rand (y=0) binne haar eie crop-rehoek se koördinate — geen werklike afsnyding nie, aangesien die crop self marge bo die ink het (bevestig deur te render, nie net deur die rehoek-wiskunde nie). Onthullingsvenster se y-verset ooreenstemmend verklein (`by-40` → `by-20`) om binne wêreldgrense te bly.

**Tweede opvolg — 4 eenhede afwaarts + haar vagsel opgelos (2026-08-20, dieselfde sessie):**
1. `SNEEULUIPERD_VERSET.y: -35 → -31 → -28` (twee opeenvolgende "'n bietjie laer"-versoeke, 4 dan nog 3 wêreld-eenhede afwaarts).
2. **Die Sneeuluiperd se vagsel het dieselfde soort gapings gehad as die vier ander diere hierbo** — die gebruiker het blou lugkolle deur haar rug/lyf sien deurskyn in die regte blaaier. Dieselfde stale aanname as by Aksolotl/Apie/Ibeks (bug #1 se ou nota: "Werk goed vir Yorka/Sneeuluiperd/...") was dus ook hier verkeerd. **Argitektuur-verskil van die ander bewoners:** `sneeuluiperd-figure` is nie 'n gedeelde-canvas 3-4-vlak-illustrasie soos Kapok/die vier diere nie — dis 'n volledige 6-laag-illustrasie (`sl-0`..`sl-5`, elk sy eie toonkleur: `#a3a8a7` rots, `#1e1b17` buitelyn, `#4b473f` donker vlekke, `#dfe1dd` ligte vagsel-basis, `#c1bcb1`/`#918c82` mid-toon skakerings) wat die meeste van haar lyf reeds korrek vul — die gapings was spesifieke ontbrekende hoogtepunt-plekke (rug/skouers, en die stert se binne-lus), nie 'n heeltemal ontbrekende vlak nie. Dieselfde tegniek (buitelyn `sl-1` hoë-resolusie gerender, `binary_closing`(4 iterasies — reeds stabiel selfs sonder sluiting, geen dramatiese sprong soos by die vorige diere nie) + `binary_fill_holes`, vektorisering) is toegepas, maar as 'n **nuwe `sl-fur`-pad wat as die EERSTE kind van die groep ingevoeg is** (dus heel eerste geverf, agter al 6 bestaande vlakke) i.p.v. 'n vervanging — waar die bestaande 6 vlakke reeds dek, verf hulle eenvoudig oor die nuwe vlak; die nuwe vlak word slegs sigbaar in presies die gapings. Kleur: `#dfe1dd` (dieselfde bestaande ligte-vagsel-basistoon — op die gebruiker se versoek vir 'n "ligte af-wit" gekies, en toevallig reeds die presiese kleur wat die res van haar vagsel-basis gebruik, dus naatlose vermenging).
3. **Verifikasie:** teen 'n blou toetsagtergrond (presies die kleur wat die gebruiker beskryf het) sowel as magenta bevestig — geen kolle oor nie; 'n finale render direk vanaf die **werklike, reeds-gewysigde** `kruin.html`-inhoud (regte crop, regte grootte 80, regte plasing, regte agtergrond) bevestig ook. Geen ander bewoner het hierdie tegniek nog nodig gehad om weer toegepas te word nie — slegs die Sneeuluiperd was hier ter sprake.

---

## Kaart 8 (toekomstig) — gekommissioneerde illustreerder-weergawe / weergawe-keuse

'n Menslike illustreerder word vroeg-Augustus 2026 gekontrakteer om die berg met die hand te teken — sien `Berg/kunstenaar-brief.txt` (deur die gebruiker in 'n Word-dokument aangepas voor dit gestuur is; die `.txt` weerspieël dus nie noodwendig die finale weergawe wat die kunstenaar ontvang nie). Vier landskap-A4-blaaie (Sneeu bo, dan Rotse, Woud, Moeras onder), regstreeks op mekaar gestapel — presies dieselfde stapelvolgorde as die kinders-kolaz hierbo.

**Hersiene verwagting (2026-08-12, ná Kaart 7):** die oorspronklike aanname hieronder was dat 'n regop (reguit dwarssnit) uitleg nodig sou wees omdat die diagonale hand-SVG nie sou pas nie. Kaart 7 het bewys dat 'n vier-blad-stapel in hierdie volgorde uit sigself 'n bruikbare diagonaal gee — dit **kan** dus wees dat die gekommissioneerde weergawe dieselfde diagonale integrasiepatroon kan volg (nuwe `berg-agtergrond-v2.jpg` of eendersgenaamd, eie roete/sone/kamera-koördinate, geen ander enjin-verandering). Bevestig dit egter eers visueel wanneer die regte kuns ontvang word — moenie aanvaar dit sal dieselfde diagonaal-verhouding hê nie; die kinders-kolaz s'n was gelukkige toeval, nie ontwerp nie.

**Nog nie besluit nie (wag vir hierdie kaart):** hoe die twee weergawes (kinders-kolaz vs. gekommissioneerde kuns) uiteindelik aan die speler blootgestel word. Kaart 7 het doelbewus geen wisselaar gebou nie (op die gebruiker se instruksie); wanneer weergawe 2 bestaan, moet 'n eerste-beginsel-besluit geneem word (instelling-wisselaar? outomaties die jongste weergawe? albei permanent langs mekaar?) — nie vooruitgeloop nie.

**Integrasiebesluit (oorspronklik geneem voordat enige kuns bestaan het — eerste twee punte deur Kaart 7 uitgevoer vir weergawe 1, derde punt deur Kaart 7 se bevinding vervang):**
- **Gelaagde benadering**, nie hertekening/vektorisering nie: die kuns word 'n rasterbeeld-agtergrond; die bestaande interaktiewe elemente (30 sportmerkers, roetepad-oorlegsel, kamera-`viewBox`-pan, bewoner-verskynings) bly 'n aparte deursigtige SVG-laag bo-oor die beeld. ✅ Presies so gebou in Kaart 7 vir weergawe 1 — behoort dieselfde te werk vir weergawe 2.
- Dit was 'n bewuste **afwyking van die destydse `berg/berg.js`-argitektuur**, waar terrein en interaktiewe elemente almal een handgeboude SVG was. ✅ Kaart 7 het hierdie oorgang gedoen (rasterbeeld + SVG-oorlegsel vir alles interaktief).
- ~~Die berg word ook **regop** (reguit dwarssnit, Sneeu bo tot Moeras onder) eerder as die diagonale SVG-uitleg.~~ **Vervang deur Kaart 7 se bevinding:** die diagonale uitleg (kruin regs-bo, voet links-onder) is behou, nie na regop verander nie — sien "Hersiene verwagting" hierbo. Bevestig weer vir weergawe 2 wanneer daardie kuns ontvang word; moenie aanvaar dieselfde diagonaal sal weer toevallig werk nie.

**Wat NIE nou gedoen kan word nie (wag vir die kuns):** enige herkoördinering van sportmerkers, roetepad, of bewonerposisies — dit hang af van presies waar die kunstenaar die pad en terreinkenmerke plaas. Geen kodeverandering hieraan voor die geskandeerde kuns ontvang is nie.

**Karakters as aparte bates:** Oom Jorka, Kapok, en die sneeuluiperd word **nie** in die 4 agtergrondblaaie ingeteken nie — hulle is aparte, standalone tekeninge (sien brief) sodat hulle onafhanklik beweeg/verskyn/verdwyn kan word (veral die sneeuluiperd, wat by sport 30 moet invervaag as 'n los laag).

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
- **Derde mislukking op dieselfde sport** → by die kritieke oomblik gloei **twee** blokke sag (spookblok-gloed, blou — `#3498db`, dieselfde familie-standaard-wenkblou as elders): die **vertrekblok** (watter stuk moet trek) én die **bestemmingsblok**. (Herroep 2026-08-14, op gebruikersversoek: was voorheen net die bestemming, geel — dikwels dubbelsinnig, aangesien meer as een stuk soms na dieselfde bestemming kan trek.) Kapok draf soontoe en sit.
- 'n Sport wat **met 'n wenk** geslaag word, vereis **een skoon styging** van daardie sport voordat die klim voortgaan. (Herroep 2026-08-14: was voorheen twee.) Die kind verdien steeds die sport; hy word net nie alleen teen 'n geslote deur gelos nie.
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
