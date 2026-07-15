# SPEELTOETS — Skaakmat Afrigter

Een bladsy vir Martin se eie deurspeel voor die spel afgeteken word. Die spel word deur sy afrigter goedgekeur, nie deur sy samesteller nie — hierdie lys is die laaste stap, nie 'n tegniese toets nie.

Speel elke ry hieronder soos dit kom. Waar 'n FEN gegee word, kan jy dit met die blaaier se ontwikkelaarskonsole opstel (`state.currentPuzzle.fen = '...'` werk nie direk nie — speel eerder die genoemde tipe/vlak totdat jy hierdie of 'n soortgelyke posisie kry, of vra vir 'n opgestelde toetsbou). Waar dit saak maak, is die presiese speler-name en swart se voorspelde teenspel hieronder geverifieer met die regte enjin — as swart effens anders speel, bly die *les* dieselfde.

## Deel 1 — Een posisie per tipe (leerwaarde)

| # | Tipe | FEN (brons) | Waarop om te let |
|---|---|---|---|
| 1 | Koning & Koningin teen Koning | `8/8/8/4k3/8/8/8/3K1Q2 w - - 0 1` | Koningin op ridder-afstand hou — nooit raakvatbaar nie |
| 2 | Koning & Kasteel teen Koning | `8/8/8/k7/8/8/1K6/7R w - - 0 1` | Kasteel sny 'n ry/kolom af; koning kom nader |
| 3 | Koning & Twee Biskoppe teen Koning | `k1B5/2B5/2K5/8/8/8/8/8 w - - 0 1` | Twee biskoppe vorm 'n muur; mat altyd in 'n hoek |
| 4 | Koning, Biskop & Ruiter teen Koning | `k1B5/2K5/3N4/8/8/8/8/8 w - - 0 1` | Moet na biskop se EIE kleur-hoek dryf |
| 5 | Koning & Twee Ruiters teen Koning | `1k3N2/8/2p5/1KN5/8/8/8/8 w - - 0 1` | Troitsky: een ruiter blokkeer die pion, dan laat los op die regte oomblik |
| 6 | Koning & Pion teen Koning | `8/3P4/2K5/8/8/8/8/3k4 w - - 0 1` | Sleutelblokkies — koning lei die pion tuis |
| 7 | Verbygeraakte Pion Wedren | `2k5/4P3/4K3/8/8/8/8/8 w - - 0 1` | Tel skuiwe — wen die wedren |
| 8 | Opposisie & Koningaktiwiteit | `8/8/1k6/8/2PK4/8/8/8 w - - 0 1` | Neem die opposisie eerste |
| 9 | Zugzwang | `8/3k4/8/4K3/8/3P4/8/8 w - - 0 1` | Die wagskuif (nie die voor-die-hand-liggende een nie) wen |
| 11 | Piondeurbraak | `8/3k4/ppp5/PPP5/8/3K4/8/8 w - - 0 1` | Offer, moenie net wag nie |
| 12 | Buitenste Verbygeraakte Pion | `8/1pp5/8/3k3P/8/8/1PP5/6K1 w - - 0 1` | Lokaas trek die koning weg, oes aan die ander kant |
| 13 | Lucena-posisie | `3K4/3P4/8/8/8/6k1/r7/3R4 w - - 0 1` | Bou die brug op die 4de ry |
| 14 | Philidor-posisie | `3K4/3P4/8/8/r7/7k/8/3R4 w - - 0 1` | Hou die 6de ry totdat die pion self beweeg |
| 15 | Kasteel Agter Verbygeraakte Pion | `8/8/P7/2K5/8/3k4/8/R7 w - - 0 1` | Kasteel agter die pion, altyd |
| 16 | Aktiewe vs Passiewe Kasteel | `4K3/3P4/5k2/8/R7/8/8/r7 w - - 0 1` | Aktiewe kasteel op die 7de/agtste ry |
| 17 | Goeie Biskop vs Slegte Biskop | `8/8/3k1b2/2p1p3/2P1P3/4B3/4K3/8 w - - 0 1` | Dring in op die kleur wat swart se biskop nie dek nie |
| 18 | Biskop teen Ruiter | `4k1n1/8/P7/2K5/3B4/8/8/8 w - - 0 1` | Twee wyd geskeide pionne — ruiter kan nie altwee keer nie |
| 19 | Verkeerde Kleur Biskop | `8/8/7k/5B1P/P7/8/8/K7 w - - 0 1` | Sonder die redder-pion sou dit net gelykspel wees |
| 20 | Koningin teen Pion op 7de Ry | `8/8/8/8/3K4/8/3pk3/Q7 w - - 0 1` | Dwing die koning weg van sy pion se steun |
| 22 | Koningin teen Kasteel | `8/8/8/6Q1/4K3/4r3/8/4k3 w - - 0 1` | Kasteel langs die koning — vang dadelik |
| 23 | Koningin teen 2 Verbonde Pionne | `8/4Q3/8/8/1pp5/k2K4/8/8 w - - 0 1` | Blokkeer eers, vreet dan |
| 24 | Kasteel teen 2 Verbonde Pionne | `8/4R3/8/8/1pp5/k2K4/8/8 w - - 0 1` | Val van agter/opsy aan |
| 25 | Ruiter-en-Pion teen Ruiter | `7k/2N5/4PK2/8/n7/8/8/8 w - - 0 1` | Skerm die pion se pad |
| 26 | Biskop-en-Pion teen Biskop | `1b4k1/8/3P4/3KB3/8/8/8/8 w - - 0 1` | Dryf die biskop van sy diagonaal af |
| 27 | Teenoorgestelde Biskoppe: Verdedig! | `8/2kB4/8/2p3b1/3K4/8/8/8 w - - 0 1` | Bly op die blokkade — sien Deel 4 vir die teenoorgestelde toets |

## Deel 2 — Die drie wenvoorwaardes (Uitslag → Herspeel → Kenteken, Opdrag 9 §1)

Speel elkeen tot die einde. Bevestig by elkeen: **Uitslag-skerm verskyn eers** (nie reguit na kenteken nie), dan **Herspeel** ("Sterk spel/omskakeling/verdediging..."), dan eers die kenteken-ontsluitskerm (of terug na Kentekens as dit nie 'n nuwe kenteken is nie).

- **Mate:** Tipe 1, brons (`8/8/8/4k3/8/8/8/3K1Q2 w - - 0 1`) — speel tot skaakmat. Verwag: "Skaakmat! 🎉".
- **Promote:** Tipe 6, brons (`8/3P4/2K5/8/8/8/8/3k4 w - - 0 1`) — bevorder die pion. Verwag: "Promosie!" 👑.
- **Hold:** Tipe 27, brons #2 (`b7/8/1B6/1k1p4/3K4/8/8/8 w - - 0 1`) — moenie wegbeweeg nie, oorleef die volle 12 skuiwe. Verwag: "Vesting Gehou!" 🛡️.

## Deel 3 — Doelbewuste pat (om die "Pat!"-boodskap te sien)

Vanaf Tipe 1 se brons-posisie (`8/8/8/4k3/8/8/8/3K1Q2 w - - 0 1`), geverifieer met die enjin: speel `1.Qf3 Ke6 2.Qe4+ Kf7 3.Qc6 Ke7 4.Kc2 Kf7 5.Qd6 Kg7 6.Qe6 Kh7 7.Qf6 Kg8 8.Qe7 Kh8`, en speel dan doelbewus **9.Qf7??** (nie 'n wen-skuif nie — dis die punt). As swart effens anders speel, mik vir dieselfde patroon: dryf die koning in 'n hoek, plaas dan die koningin 'n ridder-sprong daarvandaan sonder om skaak te gee. Verwag: "Pat!" met 'n rooi opskrif, ronde tel as misluk, herspeel volg outomaties.

## Deel 4 — Hou-modus verlies (om die adjudikasie te sien)

Vanaf Tipe 27, brons #3 (`8/8/8/1p3b2/K7/8/2kB4/8 w - - 0 1`), speel doelbewus **1.Ka3??** (die geïdentifiseerde verlies-skuif — tabelbasis bevestig dit gee swart 'n gedwonge wen). Geverifieer: die stelling stort ineen na −762cp dadelik, mat-gedwonge teen skuif 10, werklike skaakmat teen skuif 21 in regte enjin-teen-enjin-spel. Verwag: die vroeë-beoordeling vuur binne 'n paar swart-skuiwe met "Die vesting het geval ná Ka3 — Swart breek nou deur. Probeer weer!" (nie eers wag vir werklike skaakmat nie).

## Deel 5 — Fase-ontsluiting

Verdien brons op Tipe 1, 2, én 3 (al drie posisies in Deel 1 hierbo, of enige brons-posisie van daardie tipes). Sodra die derde een verdien is, behoort Fase 2 ("Pioneindspele") outomaties oop te gaan. Verwag: die kenteken-ontsluitskerm vir Tipe 3 se brons, gevolg deur **"Nuwe Fase Ontsluit!"** vir Fase 2 — nie gelyktydig nie, die een ná die ander.

---

*Onthou: as enigiets hier voel of dit die verkeerde les leer — nie net "werk nie" nie, maar voel PEDAGOGIES verkeerd — is dit belangriker as enige groen kolletjie in 'n verifikasieverslag. Jy is die afrigter.*
