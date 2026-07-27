# Portaal-metadata — Sneeuluiperd se Kruin

Voorbereiding vir wanneer hierdie speletjie by `Speletjies_Altesaam/index.html`
gevoeg word. **Nie outomaties toegevoeg nie** — die spel is nog nêrens ontplooi
nie (geen `netlify.toml`), en die gedeelde portaal-lêer raak 5 ander
speletjies; dit moet doelbewus deur die gebruiker gedoen word sodra 'n regte
URL bestaan.

## Kaart-inligting (volg die portaal se bestaande `CLAUDE.md`-konvensie)

- **Naam:** Sneeuluiperd se Kruin
- **Ikoon:** 🐆 (of 'n klein SVG-sneeuluiperd-silhoeët indien 'n eie ikoon verkies word — sien Kaart 4/5-verslag oor Recraft.ai vir SVG-illustrasie)
- **Beskrywing (kind-vriendelik, 1-2 sinne, soos die portaal se ander kaarte):**
  "Klim die berg saam met Kapok die hondjie en leer hoe 'n loper en 'n ruiter, saam met die koning, mat kan gee."
- **URL:** *(nog nie ontplooi nie — voeg by sodra 'n Netlify-vertoning bestaan)*
- **CSS-kaartklas:** `card--sneeuluiperd` (volg die bestaande `card--chess`/`card--spanish`-ens.-patroon in die portaal se CSS)

## Vorderingsdata (indien die portaal ooit vorderingspersentasies vertoon)

Die huidige portaal (`Speletjies_Altesaam/index.html`, nagegaan 2026-07-27)
vertoon nog geen vorderingspersentasie vir ENIGE van die 6 bestaande
speletjies nie — dis suiwer 'n statiese skakel-rooster. Sneeuluiperd se Kruin
se eie `localStorage`-toestand (`sneeuluiperd_v1`) het reeds alles nodig indien
dit ooit bygevoeg word:

```js
const s = JSON.parse(localStorage.getItem('sneeuluiperd_v1') || '{}');
const persentasie = s.currentRung ? Math.round((s.currentRung / 30) * 100) : 0;
```

Geen verdere werk aan Sneeuluiperd se Kruin self is nodig hiervoor nie.
