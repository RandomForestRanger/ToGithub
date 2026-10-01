// Sneeuluiperd se Kruin — Kaart 5: Oom Jorka se teksbank (§5.1).
// Register: kort bergwyshede, nooit meer as twee sinne, suiwer Afrikaans,
// droë humor toegelaat, spot nooit. Elke gebeurtenis het >=3 variante,
// behalwe die sport-30-seremonie (§5.1/§7 Kaart 5-aanvaarding): net EEN
// vaste sin daar, doelbewus nie 'n lys nie.
//
// Kaart 12 (2026-10-01): volledige hersiening deur die gebruiker (handgeskrewe
// kwinkslae-oudit, sien Jorka_kwinkslae_oudit.txt in die Berg-wortel) hier
// woordeliks ingedra. Sien CLAUDE.md "Kaart 12" vir die volledige
// veranderingslys (insluitend 'n paar doelbewuste afwykings van die
// oorspronklike ontwerp -- bv. die sneeuluiperd-sin het nou twee sinne i.p.v.
// een, en "oorwin" vervang "geken" in die kruin-lys).
(function (root) {
  'use strict';

  const COACH_LINES = {
    // Kaart 7-vervolg (2026-08-21): die tuisblad se groet (welkom.html, vóór
    // 'n speler gekies is) -- nie dieselfde as "welkom" hierbo nie (dié is
    // per-sone, ná 'n speler klaar gekies het en klim). 'n Reisiger wat nog
    // nie 'n naam gekies het nie, kry hierdie in plaas daarvan.
    tuisblad: [
      "Nog 'n reisiger. Sê my jou naam, dan begin ons klim.",
      'Die berg wag rustig. Kies jou naam, dan begin ons.',
      "Elke klim begin met 'n naam. Wat is joune?",
      'Welkom, reisiger. Kies jou naam, en ons vertrek.',
    ],

    welkom: {
      moeras: [
        'Die moeras kan mens flous. Kyk waar jy trap.',
        'Sagte grond, harde les: elke skuif tel.',
        'Hier leer die voete wat die oë nog nie sien nie.',
        'Klein stappies sal ons daar kry.',
      ],
      woud: [
        "Die bos is dig, maar as jy mooi kyk, is daar 'n pad.",
        'Jy begin mooi klim, maar daar is nog baie pad voor ons.',
        "'n Boom se skadu is 'n lekker ding, maar hou aan konsentreer.",
        'Stap stadig, die bos sal altyd hier wees. Geen haas.',
      ],
      rotse: [
        'Hier begin die dinge interessant raak. Die ruiter raak nou baie belangrik.',
        'Rooibruin kranse, harde koppe. Klim stadig.',
        'Jy vorder mooi. Vasbyt!',
        'Klim reg, of klim weer. Die rotse is geduldig.',
      ],
      sneeu: [
        'Die lug raak dun hier bo. Jy doen goed!',
        'Jy vorder nou regtig mooi. Aanhou!',
        'Sneeu onder ons voete. Trap versigtig.',
        'Hier bo speel jy die hele roete van voor af.',
      ],
    },

    slaag: [
      'Goed gedoen. Een tree hoër.',
      'Jy maak my trots. Mooi.',
      'Goed gespeel. Ons klim.',
      'Daai een was joune. Kom, volgende.',
    ],

    misluk: [
      'Toemaar, die berg is môre nog hier.',
      "Elke trappie af is 'n klein lessie.",
      'Nie, nie heeltemal so nie. Kom ons probeer weer.',
      "Ons val 'n tree, ons klim weer twee.",
    ],

    omweggie: [
      "Ons stap 'n draai, maar ons stap nog boontoe.",
      "'n Ompad.",
      "Nie die vinnigste pad nie. Nogtans 'n pad.",
      "Die berg vergewe 'n draai. Net nie 'n val nie.",
    ],

    konseptueleFout: {
      remise: [
        'Die berg het skielik gelyk geword. Dis nie wat ons soek nie.',
        "'n Gelykspel is 'n toe deur. Ons klop weer.",
        'Jy het die stuk laat gaan. Dit kos die sport.',
        "Pat is 'n stil nee. Onthou hom.",
      ],
      dtmSprong: [
        'Die koning het deur ons heining geglip.',
        'Ai man, daar kom die koning weg.',
        'Kom ons leer hoe om die gaping toe te maak.',
        'Ons versperring het gebreek. Kom ons probeer weer.',
      ],
      herhaling: [
        'Ons het drie keer dieselfde plek getrap.',
        'Daar herhaal ons die posisie alweer.',
        'Dieselfde tree, drie keer. Tyd om anders te loop.',
        "Herhaling is soms 'n stilstaan wat lyk soos beweging.",
      ],
    },

    wenkAanbieding: [
      'Kyk daar. Kapok wys jou die plan.',
      "Hier's 'n leidraad. Neem dit.",
      'Ek en Kapok sal jou help.',
      'Die blokke gloei — een vir die stuk, een vir waar dit trek.',
    ],

    kontrolevraagTerugvoer: {
      korrek: [
        "Reg. Jy't die gaatjie gesien.",
        'Presies. Jy verstaan die W.',
        "Daai's dit. Onthou hoe dit voel.",
        'Die loper kies die tronk! Onthou dit.',
      ],
      verkeerd: [
        'Amper. Kyk weer volgende keer.',
        'Nie heeltemal nie. Ons klim in elk geval.',
        "Ander blokkie, 'n ander keer. Dis reg so.",
        'Die W is nuut. Mens leer dit met herhaling.',
      ],
    },

    bewonerOnthulling: [
      'Kyk wie kom kyk hoe jy klim.',
      "Die berg kry nog 'n inwoner! Kyk daarso!",
      "'n Nuwe stel oë op die roete.",
      'Hy was altyd hier. Nou sien jy hom raak.',
    ],

    kruin: [
      'Jy staan waar min mense staan.',
      'Die kruin was nooit die doel nie. Die reis was ons doel!',
      "Van moeras tot sneeu — jy't die hele berg oorwin.",
      'Hier bo is die lug yl en die uitsig ewig.',
    ],

    // Sport 30-seremonie: doelbewus EEN vaste sin, nie 'n lys nie (§7 Kaart 5).
    // Kaart 12: die gebruiker het 'n tweede sin bygevoeg ("Wel gedaan,
    // reisiger.") -- 'n doelbewuste afwyking van die oorspronklike "net een
    // stil, onbeklemtoonde sin"-ontwerp; bly steeds EEN string, nie 'n lys nie.
    sneeuluiperd: 'Kyk. Sy het jou die hele pad dopgehou. Wel gedaan, reisiger.',
  };

  function kiesUitLys(lys) {
    return lys[Math.floor(Math.random() * lys.length)];
  }

  // kies('welkom','moeras') / kies('slaag') / kies('konseptueleFout','dtmSprong') ens.
  function kies(...pad) {
    let node = COACH_LINES;
    for (const sleutel of pad) node = node[sleutel];
    if (Array.isArray(node)) return kiesUitLys(node);
    return node; // die vaste sneeuluiperd-sin
  }

  root.Jorka = { COACH_LINES, kies };
})(typeof window !== 'undefined' ? window : this);
