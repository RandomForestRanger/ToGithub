// Sneeuluiperd se Kruin — Kaart 5: Oom Jorka se teksbank (§5.1).
// Register: kort bergwyshede, nooit meer as twee sinne, suiwer Afrikaans,
// droë humor toegelaat, spot nooit. Elke gebeurtenis het >=3 variante,
// behalwe die sport-30-seremonie (§5.1/§7 Kaart 5-aanvaarding): net EEN
// vaste sin daar, doelbewus nie 'n lys nie.
(function (root) {
  'use strict';

  const COACH_LINES = {
    welkom: {
      moeras: [
        'Die moeras lieg mooi. Kyk waar jy trap.',
        'Sagte grond, harde les: elke hok tel.',
        'Hier leer die voete wat die oë nog nie sien nie.',
        'Klein stappies. Die hoek wag nie haastig nie.',
      ],
      woud: [
        'Die bos is dig, maar die rand wys die pad.',
        'Ons dans nou met die kant. Voete eers, oë tweede.',
        "'n Boom se skadu lieg net so goed soos moeras-grond.",
        'Stap stadig. Die woud onthou elke draai.',
      ],
      rotse: [
        'Hier leer die ruiter sy W. Kyk mooi hoe hy loop.',
        'Grys kranse, harde koppe. Joune ook, vandag.',
        "Die W is nie 'n riel nie. Dis 'n pad. Volg dit.",
        'Klim reg, of klim weer. Die rots is geduldig.',
      ],
      sneeu: [
        'Yl lug hier bo. Elke skuif kos meer asem.',
        'Die uitsig is groot. Die mat is groter.',
        'Sneeu onthou elke spoor. Trap versigtig.',
        'Hier bo speel jy die hele storie, van voor af.',
      ],
    },

    slaag: [
      'Goed gedoen. Een tree hoër.',
      'Die berg het jou gesien klim.',
      'Skoon gespeel. Ons klim.',
      'Daai een was joune. Kom, volgende.',
    ],

    misluk: [
      'Die berg is môre nog hier.',
      'Elke afstap is \'n les wat bly.',
      'Nie vandag nie. Môre, ja.',
      'Ons val \'n tree, ons klim weer twee.',
    ],

    omweggie: [
      'Ons stap \'n draai, maar ons stap nog boontoe.',
      "'n Omweggie.",
      'Nie die vinnigste pad nie. Nogtans \'n pad.',
      "Die berg vergewe 'n draai. Net nie 'n val nie.",
    ],

    konseptueleFout: {
      remise: [
        "Die berg het skielik gelyk geword. Dis nie wat ons soek nie.",
        "'n Gelykspel is 'n toe deur. Ons klop weer.",
        'Jy het die stuk laat gaan. Dit kos die sport.',
        'Pat is \'n stil nee. Onthou hom.',
      ],
      dtmSprong: [
        'Die koning het uit die heining geglip.',
        "Te ver gegee. Hy't die verkeerde hoek gesien.",
        'Groot gaping, groot koning. Ons maak dit weer toe.',
        'Die versperring het gebreek. Terug na die begin.',
      ],
      herhaling: [
        'Ons het drie keer dieselfde plek getrap. Die berg wag nie so nie.',
        "'n Sirkel is nie 'n pad nie.",
        'Dieselfde tree, drie keer. Tyd om anders te loop.',
        'Herhaling is \'n stilstaan wat lyk soos beweging.',
      ],
    },

    wenkAanbieding: [
      'Kyk daar. Kapok wys jou iets.',
      "Hier's 'n leidraad. Neem dit sonder skaamte.",
      'Selfs die berg gee soms \'n hand.',
      "Die blokke gloei -- een vir die stuk, een vir waar dit trek. Dis nie punte-afgetrek nie -- dis net hulp.",
    ],

    kontrolevraagTerugvoer: {
      korrek: [
        "Reg. Jy't die gaatjie gesien.",
        'Presies. Jy verstaan die W.',
        'Daai\'s dit. Onthou hoe dit voel.',
        'Die loper kies die tronk. Onthou dit.',
      ],
      verkeerd: [
        'Amper. Kyk weer volgende keer.',
        'Nie heeltemal nie. Ons klim in elk geval.',
        'Ander blok, ander keer. Dis reg so.',
        'Die W is nuut. Dit kom met herhaling.',
      ],
    },

    bewonerOnthulling: [
      'Kyk wie kom kyk hoe jy klim.',
      'Die berg kry nog \'n inwoner. Jy\'t dit verdien.',
      "'n Nuwe stel oë op die roete.",
      'Hy was altyd hier. Nou sien jy hom raak.',
    ],

    kruin: [
      'Jy staan waar min kinders staan.',
      'Die kruin was nooit die punt nie. Die klim was.',
      "Van moeras tot sneeu -- jy't die hele berg geken.",
      'Hier bo is die lug yl en die uitsig ewig.',
    ],

    // Sport 30-seremonie: doelbewus EEN vaste sin, nie 'n lys nie (§7 Kaart 5).
    sneeuluiperd: 'Kyk. Sy het jou die hele pad dopgehou.',
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
