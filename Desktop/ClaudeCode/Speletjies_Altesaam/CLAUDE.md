# Speletjies Portaal – Bou-instruksies

## Projek-oorsig

Bou 'n enkele HTML-bladsy wat as 'n vriendelike, kleurvolle portaal dien vir 'n versameling bordspeletjies vir jong kinders (ouderdom 5–9). Die bladsy moet heeltemal in **Afrikaans** wees. Wanneer 'n kind op 'n speletjie klik, word hulle direk na die betrokke URL geneem (oopmaak in dieselfde venster).

---

## Speletjies en hul URLs

| Naam | URL |
|---|---|
| Leer die Bird Speel | https://begin-bird-bietjie.netlify.app/ |
| Die Spaanse Opening | https://spaanse-opening-lekkergeit.netlify.app/ |
| Meester Giacomo se Akademie | https://italiaanse-opening.netlify.app/ |
| Vind die Flater | https://flater-vind.netlify.app/ |
| Mat-Kat | https://mat-kat.netlify.app/ |
| Adi – Die Mancala Speletjie | https://adi-joy.netlify.app/ |
| D6 Dynamos | https://indiese-verdediging.netlify.app/ |

---

## Visuele Styl

- **Teikengroep:** Jong kinders (5–9 jaar)
- **Algemene gevoel:** Warm, aards en uitnodigend — dink aan sagte okkers, warm bruins, kruie-groen en goue geel. Nie helder neon nie; eerder die palet van hout, sand en groen gras.
- **Lettertipes:** Groot, ronde, maklik-leesbare lettertipes (bv. `Nunito` of `Fredoka One` via Google Fonts). Geen skryfskrif nie.
- **Ikone / Illustrasies:** Elke speletjie-kaart moet 'n groot, eenvoudige emoji of SVG-ikoon hê wat die speletjie voorstel:
  - Skaakspeletjies: gebruik skaakstuk-emojis (♟️, ♞, ♝, ♛)
  - Adi/Mancala: gebruik 'n komvormige ikoon of klippie-emojis (🪨 of ●●●)
- **Animasie:** Sagte `hover`-animasie op elke kaart — effense opskaal (`transform: scale(1.05)`) en 'n ligter skadu. Geen flitsende of vinnige animasies nie.

---

## Bladsy-uitleg

### Kopskrif
- Groot, vrolike opskrif, bv.: **"Kom Speel Saam! 🎲"**
- Klein ondertitel: **"Kies jou speletjie en begin die pret"**
- Warm agtergrondkleur of sagte tekstuurpatroon (bv. subtiele houtkorrel via CSS of SVG-patroon)

### Speletjie-rooster
- Wys al 6 speletjies as **kaarte** in 'n responsiewe rooster
- Aanbevole uitleg: 3 kolomme op rekenaar, 2 op tablet, 1 op mobiel
- Elke kaart bevat:
  1. 'n Groot ikoon/emoji (sentraal, bo-aan)
  2. Die speletjienaam (vet, groot)
  3. 'n Kort, eenvoudige beskrywing in Afrikaans (1–2 sinne, eenvoudige taal vir kinders)
  4. 'n Groot **"Speel nou!"**-knoppie

### Voettekst
- Eenvoudig: **"Gemaak met ❤️ vir nuuskierige kinders"**

---

## Kaartbeskrywings (Afrikaans, kind-vriendelik)

Gebruik hierdie beskrywings op die kaarte:

- **Leer die Bird Speel** – "Ontdek 'n slim skaakbeweging wat jou vriende sal verbaas!"
- **Die Spaanse Opening** – "Leer hoe grootmeesters die spel begin met die Spaanse opening."
- **Meester Giacomo se Akademie** – "Meester Giacomo leer jou die Italiaanse manier om skaak te speel."
- **Vind die Flater** – "Kan jy die fout raaksien? Vind die flater voor dit te laat is!"
- **Mat-Kat** – "Oefen jou eindspel en leer hoe om mat te gee soos 'n kampioen."
- **Adi – Die Mancala Speletjie** – "Speel Adi, 'n ou Afrika-speletjie met klippies en komme. Baie pret!"
- **D6 Dynamos** – "Speel soos 'n cricket-kampioen en leer die Ou-Indiese verdediging – block elke aanval met jou slim d6-pion!"

---

## Tegniese vereistes

- **Enkel HTML-lêer** – alles (HTML, CSS, JavaScript) in een `index.html`
- **Geen raamwerke nodig** – suiwer HTML/CSS/JS is genoeg
- **Responsief** – moet goed lyk op foon, tablet én rekenaar
- **Geen eksterne afhanklikhede** buiten Google Fonts (via `<link>`)
- Alle skakels moet met `href` direk na die gespesifiseerde URLs verwys
- Die bladsy moet vinnig laai — hou beelde minimaal; gebruik emojis en CSS vir versiering

---

## Kwaliteitskontrolelys

Voordat jy klaar is, gaan die volgende na:

- [ ] Al 6 speletjies is sigbaar met die korrekte URL
- [ ] Alle teks is in Afrikaans
- [ ] Bladsy lyk goed op mobiel (360px breed) én rekenaar (1200px breed)
- [ ] Hover-animasies werk op alle kaarte
- [ ] Lettertipe is groot genoeg vir jong kinders (minimum 16px vir liggaamsteks, 20px+ vir kaarttitels)
- [ ] Kleurpalet bly binne die warm, aardse tema
