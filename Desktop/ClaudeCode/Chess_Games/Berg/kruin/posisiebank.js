// Outomaties gegenereer deur pyplyn/bou-posisiebank.js -- moenie hier met die hand redigeer nie.
// Verifieer/herbou eerder via: node pyplyn/soek-posisies.js && node pyplyn/bou-posisiebank.js
const POSITION_BANK = {
  "version": "1.0.0",
  "rungs": [
    {
      "rung": 1,
      "zone": "moeras",
      "fen": "8/8/8/8/3B4/2K5/3N4/k7 w - - 0 1",
      "dtm_moves": 1,
      "theme": "hoekwerk: die hok toemaak in die regte hoek",
      "swindles": [],
      "hint_square_logic": "oracle"
    },
    {
      "rung": 2,
      "zone": "moeras",
      "fen": "8/8/8/8/7N/8/5K2/5B1k w - - 0 1",
      "dtm_moves": 2,
      "theme": "hoekwerk: die hok toemaak in die regte hoek",
      "swindles": [],
      "hint_square_logic": "oracle"
    },
    {
      "rung": 3,
      "zone": "moeras",
      "fen": "8/8/8/8/8/8/1NK5/k1B5 w - - 0 1",
      "dtm_moves": 3,
      "theme": "hoekwerk: die hok toemaak in die regte hoek",
      "swindles": [],
      "hint_square_logic": "oracle"
    },
    {
      "rung": 4,
      "zone": "moeras",
      "fen": "8/8/8/8/8/8/3B4/kNK5 w - - 0 1",
      "dtm_moves": 4,
      "theme": "hoekwerk: die hok toemaak in die regte hoek",
      "swindles": [],
      "hint_square_logic": "oracle"
    },
    {
      "rung": 5,
      "zone": "moeras",
      "fen": "8/8/8/8/8/4B3/3K4/k3N3 w - - 0 1",
      "dtm_moves": 5,
      "theme": "hoekwerk: die hok toemaak in die regte hoek",
      "swindles": [],
      "hint_square_logic": "oracle"
    },
    {
      "rung": 6,
      "zone": "moeras",
      "fen": "8/8/8/8/8/5N2/8/k2KB3 w - - 0 1",
      "dtm_moves": 6,
      "theme": "hoekwerk: die hok toemaak in die regte hoek",
      "swindles": [],
      "hint_square_logic": "oracle"
    },
    {
      "rung": 7,
      "zone": "woud",
      "fen": "8/8/8/8/7k/4NK2/4B3/8 w - - 0 1",
      "dtm_moves": 7,
      "theme": "randwerk: die kantdans",
      "swindles": [],
      "hint_square_logic": "oracle"
    },
    {
      "rung": 8,
      "zone": "woud",
      "fen": "8/8/8/8/k7/2K5/3B4/3N4 w - - 0 1",
      "dtm_moves": 8,
      "theme": "randwerk: die kantdans",
      "swindles": [],
      "hint_square_logic": "oracle"
    },
    {
      "rung": 9,
      "zone": "woud",
      "fen": "8/8/8/8/k7/1NK5/3B4/8 w - - 0 1",
      "dtm_moves": 9,
      "theme": "randwerk: die kantdans",
      "swindles": [],
      "hint_square_logic": "oracle"
    },
    {
      "rung": 10,
      "zone": "woud",
      "fen": "8/8/8/8/8/4KB2/3N4/4k3 w - - 0 1",
      "dtm_moves": 10,
      "theme": "randwerk: die kantdans",
      "swindles": [],
      "hint_square_logic": "oracle"
    },
    {
      "rung": 11,
      "zone": "woud",
      "fen": "8/8/8/8/8/8/2KN4/3Bk3 w - - 0 1",
      "dtm_moves": 11,
      "theme": "randwerk: die kantdans",
      "swindles": [],
      "hint_square_logic": "oracle"
    },
    {
      "rung": 12,
      "zone": "woud",
      "fen": "8/8/8/8/k7/2B5/2NK4/8 w - - 0 1",
      "dtm_moves": 12,
      "theme": "randwerk: die kantdans",
      "swindles": [],
      "hint_square_logic": "oracle"
    },
    {
      "rung": 13,
      "zone": "woud",
      "fen": "8/8/8/8/7k/8/3N4/3BK3 w - - 0 1",
      "dtm_moves": 13,
      "theme": "randwerk: die kantdans",
      "swindles": [],
      "hint_square_logic": "oracle"
    },
    {
      "rung": 14,
      "zone": "woud",
      "fen": "8/8/8/8/8/8/5BN1/3k1K2 w - - 0 1",
      "dtm_moves": 14,
      "theme": "randwerk: die kantdans",
      "swindles": [],
      "hint_square_logic": "oracle"
    },
    {
      "rung": 15,
      "zone": "rotse",
      "fen": "8/8/8/8/8/2KB4/2N5/2k5 w - - 0 1",
      "dtm_moves": 15,
      "theme": "W-mars: die ruiter se pad word geleer",
      "swindles": [
        {
          "atPly": 6,
          "move": "e1f1",
          "trap": "pat-duik",
          "verkorting_plies": 2,
          "reply_hint": "e3"
        }
      ],
      "hint_square_logic": "oracle"
    },
    {
      "rung": 16,
      "zone": "rotse",
      "fen": "8/8/8/1N6/8/2K5/2B5/2k5 w - - 0 1",
      "dtm_moves": 16,
      "theme": "W-mars: die ruiter se pad word geleer",
      "swindles": [
        {
          "atPly": 4,
          "move": "d1e1",
          "trap": "pat-duik",
          "verkorting_plies": 4,
          "reply_hint": "e2"
        }
      ],
      "hint_square_logic": "oracle"
    },
    {
      "rung": 17,
      "zone": "rotse",
      "fen": "8/8/8/8/5B2/4K2k/4N3/8 w - - 0 1",
      "dtm_moves": 17,
      "theme": "W-mars: die ruiter se pad word geleer",
      "swindles": [
        {
          "atPly": 10,
          "move": "h5h6",
          "trap": "pat-duik",
          "verkorting_plies": 2,
          "reply_hint": "f5"
        }
      ],
      "hint_square_logic": "oracle"
    },
    {
      "rung": 18,
      "zone": "rotse",
      "fen": "8/8/8/8/2N5/2K5/2B5/2k5 w - - 0 1",
      "dtm_moves": 18,
      "theme": "W-mars: die ruiter se pad word geleer",
      "swindles": [
        {
          "atPly": 8,
          "move": "f2e1",
          "trap": "hoekvlug-truuk",
          "verkorting_plies": 2,
          "reply_hint": "f3"
        }
      ],
      "hint_square_logic": "oracle"
    },
    {
      "rung": 19,
      "zone": "rotse",
      "fen": "8/8/8/8/8/4B1N1/5K1k/8 w - - 0 1",
      "dtm_moves": 19,
      "theme": "W-mars: die ruiter se pad word geleer",
      "swindles": [
        {
          "atPly": 10,
          "move": "g6f6",
          "trap": "ruiter-uitval",
          "verkorting_plies": 2,
          "reply_hint": "c5"
        }
      ],
      "hint_square_logic": "oracle"
    },
    {
      "rung": 20,
      "zone": "rotse",
      "fen": "8/8/8/8/2N5/2KB4/8/k7 w - - 0 1",
      "dtm_moves": 20,
      "theme": "W-mars: die ruiter se pad word geleer",
      "swindles": [
        {
          "atPly": 12,
          "move": "b6c6",
          "trap": "ruiter-uitval",
          "verkorting_plies": 2,
          "reply_hint": "f5"
        }
      ],
      "hint_square_logic": "oracle"
    },
    {
      "rung": 21,
      "zone": "rotse",
      "fen": "8/8/8/8/8/8/4K3/4BN1k w - - 0 1",
      "dtm_moves": 21,
      "theme": "W-mars: die ruiter se pad word geleer",
      "swindles": [
        {
          "atPly": 14,
          "move": "g6f6",
          "trap": "ruiter-uitval",
          "verkorting_plies": 2,
          "reply_hint": "c5"
        }
      ],
      "hint_square_logic": "oracle"
    },
    {
      "rung": 22,
      "zone": "rotse",
      "fen": "8/8/8/8/8/8/4N3/4BK1k w - - 0 1",
      "dtm_moves": 22,
      "theme": "W-mars: die ruiter se pad word geleer",
      "swindles": [
        {
          "atPly": 16,
          "move": "g6f6",
          "trap": "ruiter-uitval",
          "verkorting_plies": 2,
          "reply_hint": "c5"
        }
      ],
      "hint_square_logic": "oracle"
    },
    {
      "rung": 23,
      "zone": "sneeu",
      "fen": "8/8/8/8/2N1k3/2K5/4B3/8 w - - 0 1",
      "dtm_moves": 23,
      "theme": "volle eindspel vanaf 'n oop posisie",
      "swindles": [
        {
          "atPly": 2,
          "move": "e4f3",
          "trap": "pat-duik",
          "verkorting_plies": 2,
          "reply_hint": "d4"
        }
      ],
      "hint_square_logic": "oracle"
    },
    {
      "rung": 24,
      "zone": "sneeu",
      "fen": "8/8/8/1N1k4/8/2BK4/8/8 w - - 0 1",
      "dtm_moves": 24,
      "theme": "volle eindspel vanaf 'n oop posisie",
      "swindles": [
        {
          "atPly": 2,
          "move": "d5e6",
          "trap": "pat-duik",
          "verkorting_plies": 2,
          "reply_hint": "e4"
        }
      ],
      "hint_square_logic": "oracle"
    },
    {
      "rung": 25,
      "zone": "sneeu",
      "fen": "8/8/8/8/3k4/1B6/2K5/2N5 w - - 0 1",
      "dtm_moves": 25,
      "theme": "volle eindspel vanaf 'n oop posisie",
      "swindles": [
        {
          "atPly": 4,
          "move": "e4f3",
          "trap": "pat-duik",
          "verkorting_plies": 2,
          "reply_hint": "f5"
        }
      ],
      "hint_square_logic": "oracle"
    },
    {
      "rung": 26,
      "zone": "sneeu",
      "fen": "8/8/8/8/4k3/4N3/3K4/4B3 w - - 0 1",
      "dtm_moves": 26,
      "theme": "volle eindspel vanaf 'n oop posisie",
      "swindles": [
        {
          "atPly": 2,
          "move": "e4d4",
          "trap": "ruiter-uitval",
          "verkorting_plies": 2,
          "reply_hint": "d6"
        }
      ],
      "hint_square_logic": "oracle"
    },
    {
      "rung": 27,
      "zone": "sneeu",
      "fen": "8/8/8/4k3/8/4N3/3K4/3B4 w - - 0 1",
      "dtm_moves": 27,
      "theme": "volle eindspel vanaf 'n oop posisie",
      "swindles": [
        {
          "atPly": 4,
          "move": "f6g7",
          "trap": "hoekvlug-truuk",
          "verkorting_plies": 2,
          "reply_hint": "f5"
        }
      ],
      "hint_square_logic": "oracle"
    },
    {
      "rung": 28,
      "zone": "sneeu",
      "fen": "8/8/8/3k4/8/8/3N1B2/4K3 w - - 0 1",
      "dtm_moves": 28,
      "theme": "volle eindspel vanaf 'n oop posisie",
      "swindles": [
        {
          "atPly": 4,
          "move": "e5f5",
          "trap": "pat-duik",
          "verkorting_plies": 2,
          "reply_hint": "g3"
        }
      ],
      "hint_square_logic": "oracle"
    },
    {
      "rung": 29,
      "zone": "sneeu",
      "fen": "8/8/8/4k3/8/8/8/1BKN4 w - - 0 1",
      "dtm_moves": 29,
      "theme": "volle eindspel vanaf 'n oop posisie",
      "swindles": [
        {
          "atPly": 6,
          "move": "g7h8",
          "trap": "hoekvlug-truuk",
          "verkorting_plies": 2,
          "reply_hint": "g5"
        }
      ],
      "hint_square_logic": "oracle"
    },
    {
      "rung": 30,
      "zone": "sneeu",
      "fen": "8/8/8/4k3/8/8/2N5/1KB5 w - - 0 1",
      "dtm_moves": 30,
      "theme": "volle eindspel vanaf 'n oop posisie",
      "swindles": [
        {
          "atPly": 4,
          "move": "f5e4",
          "trap": "hoekvlug-truuk",
          "verkorting_plies": 2,
          "reply_hint": "b4"
        }
      ],
      "hint_square_logic": "oracle"
    }
  ]
};
