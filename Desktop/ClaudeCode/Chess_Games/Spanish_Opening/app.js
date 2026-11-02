// Ruy Lopez Trainer - Main Application
// For young players (8-9 years, ~1600 ELO)
// UI in Afrikaans, chess notation in English

// ============================================
// CONSTANTS
// ============================================

const MAX_MOVES = 20;
const TARGET_SCORE = 100;
const PLAYERS = ['J', 'L', 'KC', 'CA', 'MB', 'T'];
const STORAGE_PREFIX = 'ruylopez_trainer_';
const BADGE_VERSION = 2;

// A move's score is capped by how much it throws away, whatever its rank or popularity.
// Loss is measured on the win-chance scale Lichess uses for its own move labels (-1 to +1).
// Set for Stockfish at ENGINE_DEPTH, which reads losses a little larger than a deep search does:
// every blunder tested sat at 0.45 or more, and no main-line move above 0.06.
const EVAL_LOSS_BANDS = [
    { minLoss: 0.40, cap: 1, label: 'flater' },
    { minLoss: 0.25, cap: 2, label: 'fout' },
    { minLoss: 0.15, cap: 3, label: 'onakkuraat' }
];

// Hints cost points: the most a move can score after the idea, and after the move itself
const HINT_IDEA_CAP = 4;
const HINT_MOVE_CAP = 3;

// How often Black steers toward a named line this player hasn't earned yet
const STEER_CHANCE = 0.6;

// One engine at one depth for every position, first move to last, so the eval can't jump
// because its source or depth changed
const ENGINE_DEPTH = 14;
const ENGINE_DEPTH_FALLBACK = 10;  // The older JavaScript build is too slow for ENGINE_DEPTH
const ENGINE_TIME_LIMIT = 8000;  // ms, then the search stops and reports what it has
const ENGINE_LOAD_LIMIT = 15000;  // ms to reach uciok before trying the next way of running it
const STOCKFISH_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/';

// The review: how long each step stays up, in ms
const REVIEW_WHITE_MS = 2000;
const REVIEW_BLACK_MS = 1500;
const REVIEW_FORCED_MS = 700;  // The forced opening moves have no choice to look at
const REVIEW_MOVE_MS = 450;    // Room for the piece to slide
const REVIEW_POPUP_MS = 1500;
const REVIEW_PREP_LIMIT = 1500;  // Don't hold the run up for a slow engine
// How close to the engine's top line a move must be (win-chance scale) to get an arrow
const REVIEW_BEST_MARGIN = 0.10;
const REVIEW_OPTION_MARGIN = 0.25;

// Forced opening moves (Ruy Lopez)
const FORCED_MOVES = {
    1: { white: 'e4', black: 'e5' },
    2: { white: 'Nf3', black: 'Nc6' },
    3: { white: 'Bb5', black: null }  // Black's 3rd move is not forced
};

// Named Spanish positions. A badge is earned on reaching the exact position, so any move order
// counts and unrelated lines with the same move at the same move number don't.
const LINE_SPANISH = 'e4 e5 Nf3 Nc6 Bb5';
const LINE_CASTLED = `${LINE_SPANISH} a6 Ba4 Nf6 O-O`;       // after 5.O-O
const LINE_BB3 = `${LINE_CASTLED} Be7 Re1 b5 Bb3`;           // after 7.Bb3
const LINE_H3 = `${LINE_BB3} O-O c3 d6 h3`;                  // after 9.h3, the Closed Spanish tabiya
const LINE_NOAH_SET = `${LINE_SPANISH} a6 Ba4 d6 d4 b5 Bb3 Nxd4 Nxd4 exd4`;
const LINE_NOAH_SPRUNG = `${LINE_NOAH_SET} Qxd4 c5 Qd5 Be6 Qc6+ Bd7 Qd5 c4`;

const BADGE_LINES = {
    morphy: [`${LINE_SPANISH} a6`],
    berlin: [`${LINE_SPANISH} Nf6`],
    bird: [`${LINE_SPANISH} Nd4`],
    steinitz: [`${LINE_SPANISH} d6`],
    schliemann: [`${LINE_SPANISH} f5`],
    cozio: [`${LINE_SPANISH} Nge7`],
    classical: [`${LINE_SPANISH} Bc5`],
    open: [`${LINE_CASTLED} Nxe4`, `${LINE_CASTLED} b5 Bb3 Nxe4`],
    closed: [`${LINE_CASTLED} Be7`, `${LINE_CASTLED} b5 Bb3 Be7`],
    averbakh: [`${LINE_CASTLED} Be7 Re1 d6`],
    archangel: [`${LINE_CASTLED} b5 Bb3 Bb7`],
    marshall: [`${LINE_BB3} O-O c3 d5`],
    breyer: [`${LINE_H3} Nb8`],
    zaitsev: [`${LINE_H3} Bb7`],
    chigorin: [`${LINE_H3} Na5`],
    smyslov: [`${LINE_H3} h6`],
    kholmov: [`${LINE_H3} Be6`],
    keres: [`${LINE_H3} a5`, `${LINE_H3} Nd7`],
    gajewski: [`${LINE_H3} Na5 Bc2 d5`],
    anti_marshall: [`${LINE_BB3} O-O a4`],
    worrall: [`${LINE_CASTLED} Be7 Qe2`]
};

const boardOf = (fen) => fen.split(' ')[0];

function boardAfterLine(line) {
    const g = new Chess();
    line.split(' ').forEach((san) => g.move(san));
    return boardOf(g.fen());
}

const NOAH_TRAP_BOARD = boardAfterLine(LINE_NOAH_SET);
const LINE_AWARDS = new Map();  // exact position -> badges earned on reaching it
const STEER_MAP = new Map();    // position with Black to move -> [{ san, badge }] toward locked lines
const TRAP_REPLIES = new Map(); // once White takes the poisoned pawn, Black springs the trap

function addSteerEntries(badge, line) {
    const g = new Chess();
    line.split(' ').forEach((san) => {
        if (g.turn() === 'b') {
            const key = boardOf(g.fen());
            if (!STEER_MAP.has(key)) STEER_MAP.set(key, []);
            STEER_MAP.get(key).push({ san, badge });
        }
        g.move(san);
    });
}

Object.entries(BADGE_LINES).forEach(([badge, lines]) => {
    lines.forEach((line) => {
        const end = boardAfterLine(line);
        if (!LINE_AWARDS.has(end)) LINE_AWARDS.set(end, []);
        LINE_AWARDS.get(end).push(badge);
        addSteerEntries(badge, line);
    });
});
addSteerEntries('noahs_ark', LINE_NOAH_SET);  // earned by White's reply, see checkBadges

(() => {
    const g = new Chess();
    const setPlies = LINE_NOAH_SET.split(' ').length;
    LINE_NOAH_SPRUNG.split(' ').forEach((san, ply) => {
        if (ply > setPlies && g.turn() === 'b') TRAP_REPLIES.set(boardOf(g.fen()), san);
        g.move(san);
    });
})();

// Badge definitions with extended descriptions
const BADGES = {
    // Opening Variation Badges (22)
    morphy: {
        name: 'Morphy',
        icon: '🎩',
        title: 'Morphy Verdediging',
        description: 'Swart speel 3...a6 - die mees gewilde verdediging in die Ruy Lopez. Dit is vernoem na die Amerikaanse skaakgenie Paul Morphy. Die loper word aangeval en kan nie op b5 bly nie: Wit moet op c6 ruil of terugtrek, gewoonlik na a4. Hierdie buigsaamheid maak dit \'n gunsteling onder spelers van alle vlakke.'
    },
    berlin: {
        name: 'Berlin',
        icon: '🐻',
        title: 'Berlin Verdediging',
        description: "Swart speel 3...Nf6 - 'n uiters soliede verdediging wat dikwels tot 'n remise-agtige eindspel lei. Dit het wêreldberoemd geword toe Vladimir Kramnik dit gebruik het om Garry Kasparov se aanvalle af te weer en die wêreldtitel-wedstryd in 2000 te wen. Die Berlin Muur is berug moeilik om te breek!"
    },
    exchange: {
        name: 'Ruil',
        icon: '🤝',
        title: 'Ruil Variasie',
        description: "Wit speel dadelik 4.Bxc6 nadat Swart 3...a6 gespeel het - die egte Ruil Variasie! Wit ruil die loper vir die ridder en vernietig Swart se pionstruktuur met dubbele c-pionne. Bobby Fischer het hierdie plan gereeld gebruik. Die idee is om 'n eenvoudige maar blywende voordeel in die eindspel te kry, danksy Swart se swak pionne."
    },
    open: {
        name: 'Oop',
        icon: '🚪',
        title: 'Oop Spel',
        description: 'Swart speel ...Nxe4 en vang die e4-pion! Dit lei tot \'n oop, taktiese spel vol kombinasies en aanvalle. Wit kry gewoonlik goeie stuk-aktiwiteit as kompensasie. Hierdie lyn vereis presiese spel van beide kante en is vol opwinding!'
    },
    closed: {
        name: 'Geslote',
        icon: '🔐',
        title: 'Geslote Spel',
        description: 'Swart speel ...Be7 - \'n strategiese, geslote posisie waar langtermyn beplanning belangrik is. Die spel ontwikkel stadig met albei kante wat hul stukke herposisioneer. Geduld is die sleutel! Anatoly Karpov was \'n meester van hierdie tipe posisies.'
    },
    bird: {
        name: 'Bird',
        icon: '🦅',
        title: 'Bird se Variasie',
        description: 'Swart speel 3...Nd4 - \'n ongewone maar interessante keuse wat Wit verras! Die ridder spring na d4 en bedreig om na f3 te neem. Dit is vernoem na die Engelse meester Henry Bird. \'n Goeie opsie as jy van jou teenstander se voorbereiding wil wegbeweeg!'
    },
    steinitz: {
        name: 'Steinitz',
        icon: '👑',
        title: 'Steinitz Verdediging',
        description: 'Swart speel 3...d6 - \'n soliede verdediging vernoem na Wilhelm Steinitz, die eerste amptelike Wêreldkampioen van skaak! Die idee is om die e5-pion stewig te verdedig en \'n sterk sentrum te hou. \'n Goeie keuse vir verdedigende spelers.'
    },
    marshall: {
        name: 'Marshall',
        icon: '⚔️',
        title: 'Marshall Aanval',
        description: "Swart offer 'n pion met ...d5 vir 'n kragtige aanval op Wit se koning! Frank Marshall het hierdie gambiet byna 'n dekade lank geheim gehou (so lui die legende!) voordat hy dit in 1918 teen Capablanca gespeel het. Dit is een van die gevaarlikste wapens teen die Ruy Lopez - vol vuur en kombinasies!"
    },
    breyer: {
        name: 'Breyer',
        icon: '🔄',
        title: 'Breyer Variasie',
        description: 'Swart speel 9...Nb8 - die ridder gaan terug om via d7 na \'n beter posisie te gaan! Dit lyk snaaks, maar die idee is diep: die ridder gaan na d7 waar dit meer opsies het. Boris Spassky en Anatoly Karpov het hierdie stelsel gereeld gebruik. Geduld en strategie!'
    },
    zaitsev: {
        name: 'Zaitsev',
        icon: '📖',
        title: 'Zaitsev Variasie',
        description: 'Swart speel 9...Bb7 - fianchetto die loper vir druk op die sentrum en die e4-pion! Hierdie aggressiewe stelsel is vernoem na die Russiese grootmeester Igor Zaitsev. Die loper op b7 skiet diagonaal en ondersteun \'n moontlike ...d5 deurbraak.'
    },
    chigorin: {
        name: 'Chigorin',
        icon: '🎯',
        title: 'Chigorin Druk',
        description: 'Swart speel 9...Na5 en jaag Wit se sterk b3 loper! Mikhail Chigorin, die vader van Russiese skaak, het hierdie idee ontwikkel. Die ridder op a5 lyk onaktief, maar dit bedreig om die loper te ruil en Swart se posisie te vereenvoudig. \'n Praktiese benadering!'
    },
    archangel: {
        name: 'Archangel',
        icon: '👼',
        title: 'Archangel Variasie',
        description: 'Swart kombineer ...b5 met ...Bb7 vir \'n moderne, aggressiewe stelsel! Die naam kom van die Russiese stad Archangelsk. Dit is \'n dinamiese benadering waar Swart vinnig op die damevleuel uitbrei terwyl druk op Wit se sentrum gehou word. Baie populêr in moderne skaak!'
    },
    schliemann: {
        name: 'Schliemann',
        icon: '🎰',
        title: 'Schliemann Gambiet',
        description: "Swart speel 3...f5 - 'n gewaagde gambiet wat onmiddellik Wit se sentrum uitdaag! Dit is vernoem na Adolf Schliemann, 'n Duitse prokureur - nie sy bekende naamgenoot Heinrich wat Troje ontdek het nie! Hierdie Schliemann het eerder deur wetsboeke gegrawe as antieke ruïnes. Die spel word wild en taktiek-vol - net vir die dapperes wat van avontuur hou!"
    },
    cozio: {
        name: 'Cozio',
        icon: '🔭',
        title: 'Cozio Ontdekker',
        description: 'Swart speel 3...Nge7 - \'n skaars maar soliede verdediging uit die 18de eeu! Carlo Cozio van Italië het dit ontwikkel. Die ridder gaan na e7 in plaas van f6, wat verskillende planne moontlik maak. \'n Goeie verrassingswapen omdat min spelers dit ken!'
    },
    classical: {
        name: 'Klassiek',
        icon: '🏛️',
        title: 'Klassieke Verdediging',
        description: 'Swart speel 3...Bc5 - die klassieke ontwikkeling van die loper na \'n aktiewe vierkant! Dit was populêr in die 19de eeu en fokus op vinnige ontwikkeling. Die loper op c5 is aktief en bedreig f2. \'n Eenvoudige maar effektiewe benadering tot die opening!'
    },
    smyslov: {
        name: 'Smyslov',
        icon: '🎭',
        title: 'Smyslov Meester',
        description: 'Swart speel 9...h6 - \'n soliede skuif wat die g5-veld beheer en ...Re8 voorberei. Vasily Smyslov, Wêreldkampioen van 1957-58, het hierdie stelsel geperfekteer. Dit is minder teoreties as ander lyne en gee Swart \'n betroubare posisie. Perfek vir praktiese spelers!'
    },
    kholmov: {
        name: 'Kholmov',
        icon: '💎',
        title: 'Kholmov se Keuse',
        description: 'Swart speel 9...Be6 - direkte ontwikkeling met druk op Wit se sentrum! Ratmir Kholmov was \'n Sowjet-grootmeester wat hierdie aggressiewe stelsel ontwikkel het. Die loper op e6 is aktief en ondersteun \'n moontlike ...d5 aanval. Eenvoudig maar kragtig!'
    },
    keres: {
        name: 'Keres',
        icon: '🌊',
        title: 'Keres Lyn',
        description: "Swart speel 9...a5 (die egte Keres-lyn, vernoem na Paul Keres van Estland) of 9...Nd7 (die Karpov-variasie, vernoem na Anatoly Karpov)! Hierdie kenteken vier altwee dinamiese stelsels onder een naam. Keres was een van die sterkste spelers wat nooit Wêreldkampioen geword het nie, terwyl Karpov self wél kampioen was. Buigsame planne, afhangende van Wit se reaksie!"
    },
    averbakh: {
        name: 'Averbakh',
        icon: '🛡️',
        title: 'Averbakh Verdediging',
        description: 'Swart speel 6...d6 - \'n versigtige verdediging wat eers die sentrum stabiliseer. Yuri Averbakh was \'n Sowjet-grootmeester en bekende eindspel-kenner. Hierdie benadering is solied en verminder Wit se aanvalskanse. Goed vir spelers wat van veilige posisies hou!'
    },
    worrall: {
        name: 'Worrall',
        icon: '👸',
        title: 'Worrall Aanval',
        description: "Wit speel 6.Qe2 - 'n rustiger benadering waar die dame die e4-pion steun in plaas van Re1! Dit is vernoem na die Engelse speler Thomas Worrall. Die idee is om 'n stadige, geduldige aanval op te bou. 'n Goeie keuse as jy van strategiese spel hou!"
    },
    anti_marshall: {
        name: 'Anti-Marshall',
        icon: '🛑',
        title: 'Anti-Marshall Stelsel',
        description: 'Wit speel 8.a4 om die gevaarlike Marshall Aanval te vermy! Baie topspelers verkies hierdie benadering omdat die Marshall so gevaarlik is. Met a4 val Wit die b5-pion aan en hou die spel in rustiger waters. \'n Slim, praktiese keuse wat dikwels in grootmeester-spelle gesien word!'
    },
    delayed_exchange: {
        name: 'Uitg. Ruil',
        icon: '⏳',
        title: 'Uitgestelde Ruil Variasie',
        description: "Wit wag met Bxc6 tot ná 4.Ba4 (of selfs ná ...Nf6 en O-O) voordat die loper op c6 geruil word - later as die vinnige Ruil Variasie! Wit kry steeds Swart se dubbele c-pionne, maar eers nadat ander stukke ontwikkel is. Dit gee 'n effens ander speelplan met dieselfde strategiese idee. Bobby Fischer het ook hierdie stadiger benadering gebruik!"
    },

    // Achievement Badges (13) - Spanish themed with Afrikaans descriptions
    queen_capture: {
        name: 'Paella!',
        icon: '🥘',
        title: 'Dame Gevang - ¡Paella!',
        description: 'Jy het die opponent se dame gevang - ¡Olé! Geniet nou \'n lekker Spaanse paella! Die dame is die kragtigste stuk op die bord (9 punte werd), so hierdie vangs is soos \'n heerlike fees. In Spanje vier hulle sulke oomblikke met \'n groot paella vol rys, seekos en saffraan. ¡Muy delicioso!'
    },
    first_blood: {
        name: 'Toro!',
        icon: '🐂',
        title: 'Eerste Vangs - ¡Toro!',
        description: 'Soos \'n dapper matador in die arena van Sevilla, het jy die eerste stuk gevang! ¡Olé, torero! In \'n bulgeveg moet die matador moedig en vinnig wees - net soos jy nou was. Hierdie kenteken vier jou eerste suksesvolle vangs. Die bul is nie meer so gevaarlik nie!'
    },
    seven_perfect: {
        name: '7 Perfek',
        icon: '🌟',
        title: 'Sewe Sterre - ¡Siete Estrellas!',
        description: 'Jy het 5 punte op 7 verskillende skuiwe gekry - sewe sterre van uitnemendheid! ¡Increíble! Dit wys dat jy konsekwent die beste skuiwe speel. In Spanje sê hulle "siete estrellas" vir iets wat werklik uitmuntend is. Jy speel soos \'n ware meester van die Ruy Lopez!'
    },
    twelve_perfect: {
        name: '12 Perfek',
        icon: '🌠',
        title: 'Twaalf Sterre - ¡Doce Estrellas!',
        description: "Jy het 5 punte op 12 verskillende skuiwe gekry - 'n indrukwekkende prestasie! ¡Magnífico! Jy speel op grootmeester-vlak vir die grootste deel van die spel. Hou so aan en die perfekte spel wag vir jou!"
    },
    perfect_game: {
        name: 'Perfecto!',
        icon: '💯',
        title: 'Perfekte Spel - ¡El Perfecto!',
        description: 'Jy het 100 punte gekry - \'n absoluut perfekte spel! ¡Increíble, muy bien, campeón! Elke enkele skuif was die beste of mees populêre keuse. Dit is uiters moeilik om te bereik en wys dat jy die Ruy Lopez opening werklik verstaan. Jy speel soos \'n ware grootmeester!'
    },
    castled: {
        name: 'Castillo',
        icon: '🏰',
        title: 'Gerokeer - ¡El Castillo!',
        description: 'Jy het gerokeer en jou koning is nou veilig in die kasteel! ¡Muy seguro! Rokering is een van die belangrikste beginsels in skaak - dit beskerm jou koning en aktiveer jou toring. Soos die pragtige Alhambra-kasteel in Granada, is jou koning nou goed beskerm agter sterk mure!'
    },
    center_control: {
        name: 'Sentrum',
        icon: '🌻',
        title: 'Sentrumbeheer - ¡Plaza Mayor!',
        description: 'Jy het pionne op e4 EN d4 - jy beheer die sentrum soos die Plaza Mayor in Madrid! ¡Fantástico! In skaak is sentrumbeheer uiters belangrik. Jou pionne in die middel beheer sleutelvelde en gee jou stukke meer ruimte. Die ou meesters het altyd gesê: beheer die sentrum, beheer die spel!'
    },
    checkmate: {
        name: 'Campeón!',
        icon: '🏆',
        title: 'Skaakmat - ¡El Campeón!',
        description: 'Jy het skaakmat gegee voor skuif 20 - jy is die kampioen! ¡Olé, olé, olé! Dit is \'n groot prestasie om so vinnig te wen. Dit wys dat jy takties baie sterk is. Soos die Real Madrid-spelers wat die Champions League wen, is jy nou El Campeón - die kampioen van hierdie spel!'
    },
    noahs_ark: {
        name: 'Noah\'s Ark',
        icon: '🚢',
        title: 'Ark Oorleef - ¡Arca de Noé!',
        description: "Jy het die beroemde Noah's Ark-val raakgesien en nie die d4-pion met jou dame gevat nie! ¡Muy inteligente! Hierdie ou val lok Wit se dame na d4. Dan speel Swart ...c5 en ...c4, en die loper op b3 sit vas agter die pionne op a6, b5 en c4. Dit is een van die oudste en bekendste valle in die Ruy Lopez. Deur dit te vermy, wys jy dat jy die opening se gevare ken!"
    },
    gajewski: {
        name: 'Fuego!',
        icon: '🔥',
        title: 'Vuur & Passie - ¡Fuego!',
        description: 'Jy het die vurige Gajewski Gambiet posisie bereik - vol vuur en passie! ¡Qué fuego! Hierdie moderne gambiet is vernoem na die Poolse grootmeester Grzegorz Gajewski. Soos die flamenco-dansers van Andalusië wat met vuur dans, is hierdie spel vol energie en opwinding!'
    },
    cinderella: {
        name: 'Flamenco',
        icon: '💃',
        title: 'Dansende Loper - ¡Flamenco!',
        description: "Jou ligte loper voltooi die volle Spaanse dans: Bb5 → a4 → b3 → c2! ¡Qué elegante! Na drie skuiwe terug beland die loper op c2, reg gemik op Swart se koning by h7. Soos 'n flamenco-danser wat drie passe neem voor die groot finale, is hierdie hergroepering vol grasie en verborge krag - dit is die klassieke plan agter baie Ruy Lopez-meesterstukke!"
    },
    carbon: {
        name: 'Carbón',
        icon: '⚫',
        title: 'Steenkool - ¡Carbón!',
        description: 'Jy het minder as 50 punte gekry... soos steenkool in jou kous! In Spanje, op Drie Konings-dag, kry stoute kinders carbón (steenkool) in plaas van geskenke. Maar moenie bekommerd wees nie - elke meester het ook swak spelle gehad! Probeer weer en jy sal beslis beter doen. ¡Ánimo!'
    },
    chorizo: {
        name: 'Chorizo',
        icon: '🌶️',
        title: 'Chorizo Meester - ¡Buen Provecho!',
        description: 'Jy het 5 spelle gespeel en is nou \'n Chorizo-kenner! ¡Buen provecho! Soos die heerlike Spaanse worst wat tyd neem om te maak, het jy tyd belê om die Ruy Lopez te leer. Met elke spel word jy beter en sterker. Hou aan oefen en jy sal binnekort \'n ware grootmeester word!'
    }
};

// Educational messages (rotating) - with Spanish flair
const EDUCATIONAL_MESSAGES = [
    '🇪🇸 Die Ruy Lopez is vernoem na \'n Spaanse priester uit Zafra, Spanje - 16de eeu!',
    '📜 Ruy López de Segura het \'n boek oor skaak geskryf in 1561 - een van die oudste!',
    '⏳ Die Ruy Lopez is een van die oudste en mees gerespekteerde openings in skaak.',
    '♗ Die loper op b5 druk op die c6 ridder, die verdediger van e5. Maar dadelik Bxc6 en Nxe5 wen nog nie \'n pion nie: ...Qd4 vat dit terug!',
    '🎯 Die doel van d4 is om die sentrum te beheer - Plaza Mayor!',
    '🤔 3...a6 val die loper aan, en hy kan nie bly staan nie: ruil op c6, of trek terug na a4.',
    '🐻 Die Berlin Verdediging is baie gewild - selfs Magnus Carlsen speel dit!',
    '⚔️ Frank Marshall het sy gambiet eers in 1918 teen Capablanca gespeel - \'n verrassing!',
    '🚢 Die Noah\'s Ark-val vang Wit se loper met ...a6, ...b5, ...c4. Pasop!',
    '🏰 Rokering is belangrik - beskerm jou koning in die castillo!',
    '🐴 Probeer om jou ridders na die sentrum te bring - hulle is sterker daar.',
    '♟️ Moenie te veel pionne skuiwe in die opening nie - ontwikkel jou stukke!',
    '🎭 Ontwikkel jou stukke voor jy aanval - geduld is \'n deug.',
    '🌻 Beheer die sentrum met jou pionne en stukke - dit is die Plaza Mayor!',
    '🎯 Die Chigorin variasie is vernoem na die Russiese meester Mikhail Chigorin.',
    '🔄 Breyer se idee is om die ridder via d7 te herposisioneer - Nb8-d7!',
    '📖 Die Zaitsev variasie is dinamies en gewild onder moderne grootmeesters.',
    '👑 Anatoly Karpov het baie Ruy Lopez spelle gespeel - \'n ware kenner!',
    '🛑 Garry Kasparov het die Marshall met 8.a4 ontduik toe hy Nigel Short in 1993 geklop het - slim!',
    '🇺🇸 Bobby Fischer het dikwels die Ruil Variasie gespeel met groot sukses.',
    '🎰 Die Schliemann Gambiet (3...f5) is riskant maar skerp - vir die dapperes!',
    '🎯 Wit se strategie behels dikwels die d4-stoot om die sentrum te open.',
    '🛡️ Swart se c6 ridder is \'n belangrike verdediger van die e5 pion.',
    '♗ Die ligte veld loper op b5 is \'n sleutelstuk in die Ruy Lopez.',
    '⚡ Pas op vir taktiek op die e-lêer - dit kan gevaarlik wees!',
    '♟️ Die a6-b5 pion ketting gee Swart ruimte op die damevleuel.',
    '🐴 Wit se maneuver Nbd2-f1-g3 is tipies - die ridder soek \'n beter plek.',
    '🗼 Die Re1-skuif steun die e4 pion en maak f1 oop vir die ridder se reis: Nbd2-f1-g3.',
    '📚 Leer van die grootmeesters deur hul Ruy Lopez spelle te bestudeer!',
    '🧠 Elke skuif tel - dink voordat jy beweeg! ¡Piensa antes de mover!'
];

// ============================================
// GAME STATE
// ============================================

let game;
let board;
let stockfishEngine = null;
let stockfishReady = false;
let activeCallback = null;  // The single in-flight request's UCI line handler
let engineBusy = Promise.resolve();  // Promise-chain mutex serialising engine access
let engineDepth = ENGINE_DEPTH;
let engineStale = 0;  // 1: a search was abandoned and is still running. 2: swallow one more bestmove.
let markEngineSettled;
const engineSettled = new Promise((resolve) => { markEngineSettled = resolve; });  // Stockfish loaded, or failed to

// Runs fn (a zero-arg function returning a Promise) once the engine is free,
// queuing it behind any request already in flight so UCI commands never interleave.
function withEngine(fn) {
    const run = engineBusy.then(fn, fn);
    engineBusy = run.catch(() => {});  // keep the chain alive on failure
    return run;
}

// API response cache to reduce duplicate calls
const apiCache = {
    lichess: new Map(),
    engineEval: new Map()  // fen -> { multiPv, search }, one search per position per game
};
const CACHE_MAX_SIZE = 50;
const CACHE_TTL = 300000; // 5 minutes

let currentPlayer = 'J';
let currentMoveNumber = 0;
let gameGeneration = 0;  // Bumped on every Nuwe Spel; stale async callbacks bail when this changes
let currentScore = 0;
let highScore = 0;
let earnedBadges = [];
let sessionBadges = [];  // Badges earned this game

let moveHistory = [];
let positionHistory = [];
let isGameActive = false;
let isReviewMode = false;
let reviewRun = 0;  // Bumped to stop a running review
let reviewArrows = [];  // What's on the board now, redrawn if the board resizes
let gameBadgeLog = [];  // { ply, badge } for every badge this game touched, earned before or not

let selectedSquare = null;  // For tap-to-move
let firstCaptureOccurred = false;
let perfectMoves = 0;
let lastHintInfo = null;  // Hint state for the current position: { fen, stage, engineMoves, ... }
let lastMoveNote = null;  // Why the last move's score was capped: { evalLabel, hintCapped }

// Track specific variations
let variationState = {
    morphyPlayed: false
};

// ============================================
// INITIALIZATION
// ============================================

$(document).ready(function() {
    initGame();
    initStockfish();
    setupEventListeners();
    loadPlayerData();
    updateBadgeDisplay();
    showEducationalMessage();
});

// ============================================
// UNIT TESTS - Run with runEvaluationTests() in console
// ============================================

async function runEvaluationTests() {
    console.log('========================================');
    console.log('RUYLOPEZ EVALUATION UNIT TESTS');
    console.log('========================================\n');

    let passed = 0;
    let failed = 0;

    // Test 1: Lichess Opening Explorer API
    console.log('Test 1: Lichess Opening Explorer API');
    try {
        const startFen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
        const result = await getLichessPopularity(startFen);
        if (result && result.moves && result.moves.length > 0) {
            console.log('  ✅ PASSED - Got', result.moves.length, 'moves from Lichess Explorer');
            console.log('  Top move:', result.moves[0].san, 'with', result.moves[0].white + result.moves[0].draws + result.moves[0].black, 'games');
            passed++;
        } else {
            console.log('  ❌ FAILED - No moves returned from Lichess Explorer');
            failed++;
        }
    } catch (e) {
        console.log('  ❌ FAILED - Error:', e.message);
        failed++;
    }

    // Test 2: Engine eval (Stockfish, or cloud eval if Stockfish couldn't load)
    console.log('\nTest 2: Engine eval');
    try {
        const ruyFen = 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3';
        const result = await getStockfishEval(ruyFen, 2);
        if (result && result.moves && result.moves.length > 0) {
            console.log('  ✅ PASSED - Got', result.moves.length, 'moves from', result.source || 'unknown source');
            console.log('  Top moves:', result.moves.map(m => m.san).join(', '));
            passed++;
        } else {
            console.log('  ⚠️ WARNING - No cloud eval data (may need local Stockfish)');
            // Check if local Stockfish is available
            if (stockfishEngine && stockfishReady) {
                console.log('  Local Stockfish is available as fallback');
                passed++;
            } else {
                console.log('  ❌ FAILED - No evaluation source available');
                failed++;
            }
        }
    } catch (e) {
        console.log('  ❌ FAILED - Error:', e.message);
        failed++;
    }

    // Test 3: Local Stockfish (if available)
    console.log('\nTest 3: Local Stockfish.js Engine');
    if (stockfishEngine && stockfishReady) {
        try {
            const testFen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
            const result = await getLocalStockfishEval(testFen, 8, 2);
            if (result && result.length > 0) {
                console.log('  ✅ PASSED - Local Stockfish returned', result.length, 'moves');
                console.log('  Best move (UCI):', result[0].moves);
                passed++;
            } else {
                console.log('  ❌ FAILED - Local Stockfish returned no moves');
                failed++;
            }
        } catch (e) {
            console.log('  ❌ FAILED - Error:', e.message);
            failed++;
        }
    } else {
        console.log('  ⚠️ SKIPPED - Local Stockfish not ready');
        console.log('  stockfishEngine:', !!stockfishEngine);
        console.log('  stockfishReady:', stockfishReady);
    }

    // Test 4: UCI to SAN conversion
    console.log('\nTest 4: UCI to SAN Conversion');
    try {
        const testFen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
        const testPvs = [{ moves: 'e7e5' }, { moves: 'c7c5' }];
        const converted = convertPvsToMoves(testPvs, testFen);
        if (converted.length === 2 && converted[0].san === 'e5' && converted[1].san === 'c5') {
            console.log('  ✅ PASSED - Correctly converted e7e5 → e5, c7c5 → c5');
            passed++;
        } else {
            console.log('  ❌ FAILED - Conversion incorrect:', converted);
            failed++;
        }
    } catch (e) {
        console.log('  ❌ FAILED - Error:', e.message);
        failed++;
    }

    // Test 5: Score Move function
    console.log('\nTest 5: Score Move Function');
    try {
        const testGame = new Chess();
        testGame.move('e4');
        const positionBefore = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        const move = { san: 'e4', lan: 'e2e4' };

        // Temporarily replace game
        const originalGame = game;
        game = testGame;

        const score = await scoreMove(move, positionBefore);
        game = originalGame;

        if (score >= 1 && score <= 5) {
            console.log('  ✅ PASSED - e4 scored', score, 'points (valid range 1-5)');
            passed++;
        } else {
            console.log('  ❌ FAILED - Invalid score:', score);
            failed++;
        }
    } catch (e) {
        console.log('  ❌ FAILED - Error:', e.message);
        failed++;
    }

    // Summary
    console.log('\n========================================');
    console.log('RESULTS:', passed, 'passed,', failed, 'failed');
    console.log('========================================');

    return { passed, failed };
}

// Make test function available globally
window.runEvaluationTests = runEvaluationTests;

function initGame() {
    game = new Chess();

    board = Chessboard('board', {
        position: 'start',
        draggable: false,  // Click-only, no dragging
        pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png',
        moveSpeed: 250,     // Faster, smoother movement
        snapbackSpeed: 200,
        snapSpeed: 100,
        appearSpeed: 200
    });

    // Click-to-move only
    $('#board').on('click', '.square-55d63', handleSquareClick);

    $(window).resize(function() {
        board.resize();
        if (isReviewMode) drawReviewArrows(reviewArrows);
    });

    // Auto-start a new game when app loads
    setTimeout(() => {
        startNewGame();
    }, 100);
}

function initStockfish() {
    $('#loading-overlay').removeClass('hidden');
    startEngine(typeof WebAssembly === 'object');
}

// The WebAssembly build is the same Stockfish and searches the same moves, but it is around ten
// times faster and has no slow warm-up. The older JavaScript build is the fallback.
async function loadEngineWorker(useWasm) {
    const response = await fetch(STOCKFISH_CDN + (useWasm ? 'stockfish.wasm.js' : 'stockfish.js'));
    if (!response.ok) throw new Error('Network error');

    // Load as a blob worker to avoid CORS issues. From a blob, the WebAssembly build can't
    // work out where its .wasm file lives, so point its fetch at the CDN.
    const parts = [await response.blob()];
    if (useWasm) {
        parts.unshift(`(function(){var f=self.fetch;self.fetch=function(u,o){return f(String(u).indexOf('stockfish.wasm')>=0?'${STOCKFISH_CDN}stockfish.wasm':u,o)}})();\n`);
    }
    return new Worker(URL.createObjectURL(new Blob(parts, { type: 'application/javascript' })));
}

function startEngine(useWasm) {
    let settled = false;
    let loadTimer = null;

    const fail = (reason) => {
        if (settled) return;
        settled = true;
        clearTimeout(loadTimer);
        console.error('Stockfish failed to start:', reason);
        if (stockfishEngine) stockfishEngine.terminate();
        stockfishEngine = null;
        if (useWasm) {
            startEngine(false);
        } else {
            markEngineSettled();
            $('#loading-overlay').addClass('hidden');
        }
    };

    loadTimer = setTimeout(() => fail('timed out'), ENGINE_LOAD_LIMIT);

    loadEngineWorker(useWasm).then((worker) => {
        if (settled) {
            worker.terminate();
            return;
        }
        stockfishEngine = worker;

        worker.onmessage = function(event) {
            const line = event.data;

            // A new search takes over a running one, and the engine then answers with two bestmoves.
            // Without this the second would end whichever search comes next.
            if (engineStale > 0 && typeof line === 'string' && line.startsWith('bestmove')) {
                if (engineStale === 2 || !activeCallback) {
                    engineStale = 0;
                    return;
                }
                engineStale = 2;
            }

            // Pass message to whichever request currently owns the engine
            if (activeCallback) {
                activeCallback(line);
            }

            if (line === 'uciok' && !settled) {
                settled = true;
                clearTimeout(loadTimer);

                // Stockfish 10's default contempt tilts its score toward whichever side is
                // to move, so the eval saw-tooths by about a pawn every half-move
                worker.postMessage('setoption name Contempt value 0');
                engineDepth = useWasm ? ENGINE_DEPTH : ENGINE_DEPTH_FALLBACK;
                stockfishReady = true;
                markEngineSettled();
                console.log('Stockfish ready:', useWasm ? 'WebAssembly' : 'JavaScript');

                // The eval for the starting position, before the loading screen goes
                getStockfishEval(new Chess().fen(), 4).finally(() => {
                    $('#loading-overlay').addClass('hidden');
                });
            }
        };

        worker.onerror = function(error) {
            console.error('Stockfish worker error:', error);
            if (settled) {
                stockfishEngine = null;  // Crashed mid-game: the rest of it uses cloud eval
                stockfishReady = false;
            } else {
                fail('worker error');
            }
        };

        worker.postMessage('uci');
    }).catch((error) => fail(error.message));
}

// One Stockfish search, at most ENGINE_TIME_LIMIT long. cp and mate are side-to-move.
function getLocalStockfishEval(fen, depth = engineDepth, multipv = 2) {
    if (!stockfishEngine || !stockfishReady) {
        console.log('Stockfish engine not available');
        return Promise.resolve(null);
    }

    return withEngine(() => new Promise((resolve) => {
        const results = [];
        let resolved = false;
        let softStop = null;
        let hardStop = null;

        const finish = () => {
            if (resolved) return;
            resolved = true;
            activeCallback = null;
            clearTimeout(softStop);
            clearTimeout(hardStop);
            results.sort((a, b) => a.multipv - b.multipv);
            resolve(results.length > 0 ? results : null);
        };

        // This request now owns the engine
        activeCallback = (line) => {
            if (typeof line !== 'string') return;

            // Bound lines are provisional scores from an unfinished search of that move
            if (line.startsWith('info') && line.includes(' pv ') && !line.includes('bound')) {
                const multipvMatch = line.match(/multipv (\d+)/);
                const scoreMatch = line.match(/score (cp|mate) (-?\d+)/);
                const pvMatch = line.match(/ pv (\S+)/);

                if (pvMatch && scoreMatch) {
                    const mpv = multipvMatch ? parseInt(multipvMatch[1]) : 1;
                    const value = parseInt(scoreMatch[2]);
                    const result = {
                        multipv: mpv,
                        moves: pvMatch[1],
                        cp: scoreMatch[1] === 'cp' ? value : undefined,
                        mate: scoreMatch[1] === 'mate' ? value : undefined
                    };
                    const existingIdx = results.findIndex(r => r.multipv === mpv);
                    if (existingIdx >= 0) {
                        results[existingIdx] = result;
                    } else {
                        results.push(result);
                    }
                }
            }

            // Bestmove signals end of analysis
            if (line.startsWith('bestmove')) {
                finish();
            }
        };

        stockfishEngine.postMessage(`setoption name MultiPV value ${multipv}`);
        stockfishEngine.postMessage(`position fen ${fen}`);
        stockfishEngine.postMessage(`go depth ${depth}`);

        // A stopped search still answers with bestmove. Waiting for it keeps that line from
        // ending the next search. The hard stop is for an engine too busy to answer in time.
        softStop = setTimeout(() => {
            if (!resolved && stockfishEngine) stockfishEngine.postMessage('stop');
        }, ENGINE_TIME_LIMIT);
        hardStop = setTimeout(() => {
            engineStale = 1;
            finish();
        }, ENGINE_TIME_LIMIT + 2000);
    }));
}

function setupEventListeners() {
    $('#player').on('change', function() {
        currentPlayer = $(this).val();
        loadPlayerData();
        updateBadgeDisplay();
    });

    $('#new-game-btn').on('click', startNewGame);
    $('#hint-btn').on('click', showHint);

    $('#modal-new-game-btn').on('click', function() {
        $('#game-over-modal').addClass('hidden');
        startNewGame();
    });

    $('#modal-review-btn').on('click', function() {
        $('#game-over-modal').addClass('hidden');
        enterReviewMode();
    });

    // Leave the review at any time
    $('#review-continue-btn').on('click', startNewGame);

    // Badge hover tooltips
    $('.badge').on('mouseenter', function() {
        const badgeKey = $(this).data('badge');
        const badge = BADGES[badgeKey];
        if (badge) {
            $('#tooltip-text').html(`<strong>${badge.title}</strong><br>${badge.description}`);
        }
    });

    $('.badge').on('mouseleave', function() {
        $('#tooltip-text').text('Beweeg oor \'n kenteken vir meer inligting');
    });
}

// ============================================
// PLAYER DATA MANAGEMENT
// ============================================

let gamesPlayed = 0;

function loadPlayerData() {
    const storageKey = STORAGE_PREFIX + currentPlayer;
    const data = localStorage.getItem(storageKey);

    if (data) {
        const parsed = JSON.parse(data);

        // Check badge version for reset
        if (parsed.badgeVersion !== BADGE_VERSION) {
            earnedBadges = [];
            highScore = parsed.highScore || 0;
            gamesPlayed = parsed.gamesPlayed || 0;
            savePlayerData();
        } else {
            highScore = parsed.highScore || 0;
            earnedBadges = parsed.badgesEarned || [];
            gamesPlayed = parsed.gamesPlayed || 0;
        }
    } else {
        highScore = 0;
        earnedBadges = [];
        gamesPlayed = 0;
    }

    $('#high-score').text(highScore);
    updateBadgeDisplay();
}

function incrementGamesPlayed() {
    gamesPlayed++;

    // Chorizo badge for 5 games played
    if (gamesPlayed >= 5) {
        awardBadge('chorizo');
    }
}

function savePlayerData() {
    const storageKey = STORAGE_PREFIX + currentPlayer;
    const data = {
        username: currentPlayer,
        highScore: highScore,
        gamesPlayed: gamesPlayed,
        badgesEarned: earnedBadges,
        badgeVersion: BADGE_VERSION,
        lastPlayed: new Date().toISOString()
    };
    localStorage.setItem(storageKey, JSON.stringify(data));
}

// ============================================
// GAME FLOW
// ============================================

function startNewGame() {
    gameGeneration++;
    reviewRun++;
    clearReviewArrows();
    showReviewControls(false);
    $('#score-popup').addClass('hidden');
    gameBadgeLog = [];

    game = new Chess();
    board.position('start');

    currentMoveNumber = 0;
    currentScore = 0;
    moveHistory = [];
    positionHistory = [game.fen()];
    sessionBadges = [];
    isGameActive = true;
    lastHintInfo = null;
    lastMoveNote = null;
    isReviewMode = false;
    firstCaptureOccurred = false;
    perfectMoves = 0;
    selectedSquare = null;

    variationState = {
        morphyPlayed: false
    };

    updateUI();
    $('#move-history').empty();
    $('#analysis-panel').removeClass('hidden');
    $('#move-suggestions').html('<p class="waiting-message">Speel e4 om te begin...</p>');
    resetAnalysisPanel();
    $('#hint-btn').prop('disabled', true);

    // Clear API cache for fresh game. The starting position stays: it never changes, and on
    // first load its search may still be running behind the loading screen.
    const startKey = engineKey(new Chess().fen());
    const startSearch = apiCache.engineEval.get(startKey);
    apiCache.engineEval.clear();
    if (startSearch) apiCache.engineEval.set(startKey, startSearch);
    apiCache.lichess.clear();

    if (stockfishEngine && stockfishReady) {
        withEngine(() => {
            stockfishEngine.postMessage('ucinewgame');
            return Promise.resolve();
        });
    }

    // Start with the engine's own eval of the starting position
    updatePositionEval();

    showEducationalMessage();
}

function handleSquareClick(event) {
    if (!isGameActive || isReviewMode || game.game_over()) return;

    const square = $(event.currentTarget).data('square');
    const piece = game.get(square);

    if (selectedSquare) {
        // Try to make the move
        const move = attemptMove(selectedSquare, square);
        if (move) {
            // Clear all highlights and animate
            removeBestMoveHighlights();
            board.position(game.fen(), true);
            handlePlayerMove(move);
        }
        selectedSquare = null;
        removeHighlights();
    } else if (piece && piece.color === 'w') {
        // Select the piece - keep best move highlights visible
        selectedSquare = square;
        highlightSquare(square);
        showLegalMoves(square);
    }
}

function attemptMove(source, target) {
    // Check for pawn promotion
    const piece = game.get(source);
    const isPromotion = piece && piece.type === 'p' &&
        ((piece.color === 'w' && target[1] === '8') ||
         (piece.color === 'b' && target[1] === '1'));

    const move = game.move({
        from: source,
        to: target,
        promotion: isPromotion ? 'q' : undefined
    });

    return move;
}

async function handlePlayerMove(move) {
    const gen = gameGeneration;
    currentMoveNumber++;
    const moveNum = currentMoveNumber;
    const positionBefore = positionHistory[positionHistory.length - 1];

    // Check if forced move (moves 1-3)
    if (moveNum <= 3) {
        const requiredMove = FORCED_MOVES[moveNum].white;
        if (move.san !== requiredMove) {
            // Wrong move for forced opening
            game.undo();
            currentMoveNumber--;
            showMessage(`Speel ${requiredMove} vir die Ruy Lopez opening.`);
            board.position(game.fen());
            return;
        }

        // Correct forced move - auto score 5 points (no popup for forced moves)
        currentScore += 5;
        positionHistory.push(game.fen());

        addMoveToHistory(moveNum, move.san, 5, true);
        updateUI();

        // Update position eval after the move
        updatePositionEval();

        // Check for badges
        checkBadges(move);

        // Auto play black's response for moves 1-2
        if (FORCED_MOVES[moveNum].black) {
            setTimeout(() => {
                if (gen !== gameGeneration) return;
                makeBlackMove(FORCED_MOVES[moveNum].black);
            }, 800);  // Quick response for forced moves
        } else {
            // Move 3 complete - Ruy Lopez reached!
            showMessage('Ruy Lopez bereik! Nou kies jy jou eie skuiwe.');
            setTimeout(() => {
                if (gen !== gameGeneration) return;
                makeAIBlackMove();
            }, 1200);  // Brief pause for message
        }

        return;
    }

    // Moves 4-20: Score and get AI response
    positionHistory.push(game.fen());

    // Show loading state
    $('#move-suggestions').html('<p class="waiting-message">Analise...</p>');

    // Score the move
    const score = await scoreMove(move, positionBefore);
    if (gen !== gameGeneration) return;  // Nuwe Spel happened during scoring
    currentScore += score;

    if (score === 5) perfectMoves++;

    addMoveToHistory(moveNum, move.san, score, false);
    showScorePopup(score);  // Show score popup
    updateUI();

    // Check for badges
    checkBadges(move);

    // Show post-move analysis (async, runs in background)
    showMoveAnalysis(positionBefore, move.san);

    // Check for checkmate (White checkmated Black)
    if (game.in_checkmate()) {
        awardBadge('checkmate');
        endGame('Skaakmat! Jy het gewen! 🏆');
        return;
    }

    // White's move produced stalemate or another draw - game is over, no Black reply to wait for
    if (game.game_over()) {
        endGame(getDrawMessage());
        return;
    }

    // After move 20, Black still gets to respond - checkGameEnd will handle the ending
    // Get black's move after a brief delay
    setTimeout(() => {
        if (gen !== gameGeneration) return;
        makeAIBlackMove();
    }, 1000);  // 1 second - responsive but not rushed
}

function getDrawMessage() {
    if (game.in_stalemate()) return 'Pat! Niemand kan skuif nie - gelykop.';
    if (game.in_threefold_repetition()) return 'Gelykop - dieselfde posisie drie keer herhaal.';
    if (game.insufficient_material()) return 'Gelykop - te min stukke oor om mat te gee.';
    return 'Gelykop deur die 50-skuif-reël.';
}

// ============================================
// SCORING SYSTEM
// ============================================

async function scoreMove(move, positionBefore) {
    lastMoveNote = null;
    try {
        console.log('=== SCORING MOVE ===');
        console.log('Move played:', move.san);
        console.log('Position FEN:', positionBefore);

        // Check if this position matches a recent hint
        const hintMatches = lastHintInfo && lastHintInfo.fen === positionBefore;
        if (hintMatches) {
            console.log('Position MATCHES last hint!');
            console.log('Hint said best engine move was:', lastHintInfo.engineMoves[0]);
            console.log('Player played:', move.san);
            console.log('Player played the #1 engine move?', lastHintInfo.engineMoves[0] === move.san);
        } else if (lastHintInfo) {
            console.log('WARNING: Position does NOT match hint!');
            console.log('Hint FEN:', lastHintInfo.fen);
            console.log('Score FEN:', positionBefore);
        }

        // Get both the engine's analysis and Lichess Opening Explorer data
        const [engineResult, lichessResult] = await Promise.all([
            getStockfishEval(positionBefore, 4),
            getLichessPopularity(positionBefore)
        ]);

        // Extra validation: compare scoring engine result with hint
        if (hintMatches && engineResult?.moves?.length > 0) {
            const scoringBest = engineResult.moves[0].san;
            const hintBest = lastHintInfo.engineMoves[0];
            if (scoringBest !== hintBest) {
                console.log('WARNING: Scoring engine best differs from hint!');
                console.log('Hint best:', hintBest);
                console.log('Scoring best:', scoringBest);
            }
        }

        let engineScore = 0;  // Start at 0, not 1 - we'll set properly below
        let lichessScore = 0;
        let popularBest = null;
        let analysisHtml = '';

        // Score based on the engine's analysis
        if (engineResult && engineResult.moves && engineResult.moves.length > 0) {
            console.log('Engine moves:', engineResult.moves.map(m => m.san).join(', '));
            const moveRank = engineResult.moves.findIndex(m => m.san === move.san);
            console.log('Player move', move.san, 'rank:', moveRank);

            if (moveRank === 0) engineScore = 5;
            else if (moveRank === 1) engineScore = 4;
            else if (moveRank === 2) engineScore = 3;
            else if (moveRank === 3) engineScore = 2;
            else if (moveRank >= 0) engineScore = 1;  // Found but low ranked
            // If moveRank === -1 (not found), engineScore stays 0

            analysisHtml += '<p style="color:var(--spanish-red);margin-bottom:5px;"><strong>Enjin Analise:</strong></p>';
            engineResult.moves.slice(0, 3).forEach((m, i) => {
                const pts = [5, 4, 3][i] || 2;
                const highlight = (m.san === move.san) ? 'style="background:rgba(198,11,30,0.3);"' : '';
                analysisHtml += `<div class="suggestion-row stockfish" ${highlight}>
                    <span class="suggestion-move">${m.san}</span>
                    <span class="suggestion-info">${pts} punte</span>
                </div>`;
            });
        }

        // Score based on Lichess Opening Explorer (popularity)
        if (lichessResult && lichessResult.moves && lichessResult.moves.length > 0) {
            const totalGames = lichessResult.moves.reduce((sum, m) => sum + (m.white + m.draws + m.black), 0);

            // Sort by popularity
            const sortedMoves = [...lichessResult.moves].sort((a, b) =>
                (b.white + b.draws + b.black) - (a.white + a.draws + a.black)
            );

            if (totalGames >= 20 && sortedMoves.length > 0) popularBest = sortedMoves[0].san;

            console.log('Popular moves:', sortedMoves.slice(0, 5).map(m => m.san).join(', '));
            const moveIndex = sortedMoves.findIndex(m => m.san === move.san);
            console.log('Player move', move.san, 'popularity rank:', moveIndex, 'total games:', totalGames);

            // Score based on popularity ranking
            if (totalGames >= 20) {
                if (moveIndex === 0) lichessScore = 5;
                else if (moveIndex <= 2) lichessScore = 4;
                else if (moveIndex <= 4) lichessScore = 3;
                else if (moveIndex <= 6) lichessScore = 2;
                else if (moveIndex >= 0) lichessScore = 1;
                // If moveIndex === -1 (not found), lichessScore stays 0
            } else if (totalGames >= 5 && moveIndex >= 0) {
                // Some data (5-19 games) - only give partial credit if move is top 3
                if (moveIndex === 0) lichessScore = 4;
                else if (moveIndex <= 2) lichessScore = 2;
                else lichessScore = 1;
            }
            // If < 5 games, don't use Lichess data (not reliable)

            if (totalGames >= 5) {
                analysisHtml += '<p style="color:var(--spanish-yellow);margin-top:10px;margin-bottom:5px;"><strong>Populêr:</strong></p>';
                sortedMoves.slice(0, 3).forEach((m, i) => {
                    const games = m.white + m.draws + m.black;
                    const highlight = (m.san === move.san) ? 'style="background:rgba(255,196,0,0.3);"' : '';
                    analysisHtml += `<div class="suggestion-row lichess" ${highlight}>
                        <span class="suggestion-move">${m.san}</span>
                        <span class="suggestion-info">${games} spelle</span>
                    </div>`;
                });
            }
        }

        // Take the MAX of the two scores
        let finalScore;
        if (engineScore === 0 && lichessScore === 0) {
            // No data from either source - this shouldn't happen often
            // Give minimum score since we can't verify the move quality
            finalScore = 1;
            console.log('WARNING: No data from either source, giving 1 point');
        } else {
            finalScore = Math.max(engineScore, lichessScore);
            // If move wasn't found in any ranking, give 1 point
            if (finalScore === 0) finalScore = 1;
        }

        // Eval-loss cap: rank and popularity can't hide a move that throws the position away
        // (8.Qxd4 in the Noah's Ark line is the most played move there, and it loses a bishop)
        const evalLoss = await assessEvalLoss(move.san, engineResult, positionBefore);
        const evalLabel = evalLoss && evalLoss.band ? evalLoss.band.label : null;
        if (evalLabel && evalLoss.band.cap < finalScore) {
            console.log('Eval loss', evalLoss.loss.toFixed(2), '- capping', finalScore, 'to', evalLoss.band.cap);
            finalScore = evalLoss.band.cap;
        }

        const rawScore = finalScore;  // What the move itself earned, before any hint cost

        // Hint cost: a hinted move can never be a perfect move. Playing the suggested best move
        // still earns the full capped score, even if this scoring call ranks it differently.
        let hintCapped = false;
        if (hintMatches && lastHintInfo.stage > 0) {
            const hintCap = lastHintInfo.stage === 2 ? HINT_MOVE_CAP : HINT_IDEA_CAP;
            if (lastHintInfo.engineMoves[0] === move.san || finalScore > hintCap) {
                finalScore = hintCap;
                hintCapped = true;
            }
        }
        lastMoveNote = { evalLabel, hintCapped, rawScore, popularBest, hintStage: hintMatches ? lastHintInfo.stage : 0 };

        console.log('Final score:', finalScore, '(engine:', engineScore, ', lichess:', lichessScore, ')');

        // Show analysis
        if (analysisHtml) {
            analysisHtml += evalLossNote(evalLoss);
            analysisHtml += `<p style="margin-top:10px;color:var(--spanish-yellow);"><strong>Jou telling: ${finalScore}</strong></p>`;
            $('#move-suggestions').html(analysisHtml);
        } else {
            // No data from either source - give benefit of doubt
            $('#move-suggestions').html(`<p>Telling: ${finalScore} (geen databasis data)</p>`);
        }

        // Update position eval
        await updatePositionEval();

        // Clear any previous best move highlights
        removeBestMoveHighlights();

        return finalScore;

    } catch (error) {
        console.error('Scoring error:', error);
        return 1; // Minimum score on error - we can't verify move quality
    }
}

// One line of engine output as a single cp number. Mate uses the same 10000-based scale
// as updatePositionEval.
function pvToCp(pv) {
    if (!pv) return null;
    if (pv.mate !== undefined && pv.mate !== null) {
        return pv.mate > 0 ? 10000 - pv.mate * 10 : -10000 - pv.mate * 10;
    }
    return pv.cp !== undefined ? pv.cp : null;
}

// Lichess's win-chance curve: -1 (Black winning) to +1 (White winning)
function winChance(cp) {
    const clamped = Math.max(-1000, Math.min(1000, cp));
    return 2 / (1 + Math.exp(-0.00368208 * clamped)) - 1;
}

function formatEval(cp) {
    if (Math.abs(cp) >= 9000) return cp > 0 ? '+mat' : '-mat';
    return `${cp >= 0 ? '+' : ''}${(cp / 100).toFixed(1)}`;
}

// Eval of a position from White's side. White-to-move positions ask for the same four-line
// search that scoring and hints use, so all of them show the same number.
async function getWhitePovEval(fen) {
    const result = await getStockfishEval(fen, fen.includes(' w ') ? 4 : 1);
    if (!result || !result.moves || result.moves.length === 0) return null;
    const cp = pvToCp(result.moves[0]);
    if (cp === null) return null;
    // Cloud eval is already White-POV; raw UCI scores are side-to-move
    const flip = result.source === 'local' && fen.includes(' b ');
    return { cp: flip ? -cp : cp, source: result.source };
}

// The position after a move, from White's side
async function evalAfterMove(fen, san) {
    const after = new Chess(fen);
    if (!after.move(san)) return null;
    if (after.in_checkmate()) return { cp: 10000 };
    if (after.game_over()) return { cp: 0 };
    return getWhitePovEval(after.fen());
}

// How much a move gives away compared with the engine's best, comparing the position after each,
// searched alike. Comparing with the score at the root reads too harshly, because the root search
// ends a half-move earlier.
async function moveLoss(fen, bestSan, san) {
    const [afterBest, afterMove] = await Promise.all([evalAfterMove(fen, bestSan), evalAfterMove(fen, san)]);
    if (!afterBest || !afterMove) return null;
    return { loss: winChance(afterBest.cp) - winChance(afterMove.cp), afterCp: afterMove.cp };
}

// Returns null when there is nothing to compare, or the move is the engine's best. afterCp is the
// same search the Evaluering display shows after this move, so the two always agree.
async function assessEvalLoss(san, engineResult, positionBefore) {
    const top = engineResult && engineResult.moves;
    if (!top || top.length === 0 || top[0].san === san) return null;

    const rootCp = pvToCp(top[0]);
    const result = await moveLoss(positionBefore, top[0].san, san);
    if (rootCp === null || !result) return null;

    const band = EVAL_LOSS_BANDS.find((b) => result.loss >= b.minLoss) || null;
    return { bestCp: rootCp, afterCp: result.afterCp, loss: result.loss, band };
}

// The move a hint's idea is about: what strong players choose, if the engine finds it sound
// (the same test scoring uses), so a hint keeps him on the main line. Otherwise the engine's best.
async function pickIdeaMove(fen, engineBest, popularBest) {
    if (!engineBest || !popularBest || engineBest === popularBest) return engineBest || popularBest;
    const result = await moveLoss(fen, engineBest, popularBest);
    const smallestBand = EVAL_LOSS_BANDS[EVAL_LOSS_BANDS.length - 1].minLoss;
    return result && result.loss < smallestBand ? popularBest : engineBest;
}

function evalLossNote(evalLoss) {
    if (!evalLoss || !evalLoss.band) return '';
    const from = formatEval(evalLoss.bestCp);
    const to = formatEval(evalLoss.afterCp);
    let text = `Die evaluering sak van ${from} na ${to}.`;
    if (evalLoss.band.label === 'flater') text = `Flater! Die evaluering val van ${from} na ${to}.`;
    if (evalLoss.band.label === 'fout') text = `Dit kos jou: die evaluering val van ${from} na ${to}.`;
    return `<p style="margin-top:10px;color:var(--spanish-yellow);"><strong>${text}</strong></p>`;
}

function engineKey(fen) {
    return fen.split(' ').slice(0, 4).join(' ');
}

// The engine's view of a position: Stockfish at ENGINE_DEPTH, first move to last. Each position
// is searched once, and the eval display, scoring, hints and analysis all share that search.
// Lines carry cp/mate side-to-move, so a Black-to-move fen needs getWhitePovEval for its number.
async function getStockfishEval(fen, multiPv = 4) {
    const key = engineKey(fen);
    const known = apiCache.engineEval.get(key);
    if (known && known.multiPv >= multiPv) {
        return known.search;
    }

    const search = runEngineSearch(fen, multiPv);
    apiCache.engineEval.set(key, { multiPv, search });
    search.then((result) => {
        if (!result) apiCache.engineEval.delete(key);  // Let a failed search be retried
    });
    return search;
}

async function runEngineSearch(fen, multiPv) {
    await engineSettled;

    if (stockfishEngine && stockfishReady) {
        try {
            const results = await getLocalStockfishEval(fen, engineDepth, multiPv);
            if (results && results.length > 0) {
                const moves = convertPvsToMoves(results, fen);
                if (moves.length > 0) return { moves, source: 'local' };
            }
        } catch (e) {
            console.error('Local Stockfish error:', e);
        }
    }

    // Only if Stockfish couldn't load: Lichess Cloud Eval, which is White-POV
    try {
        const response = await fetch(`https://lichess.org/api/cloud-eval?fen=${encodeURIComponent(fen)}&multiPv=${multiPv}`);
        if (response.ok) {
            const data = await response.json();
            if (data.pvs && data.pvs.length > 0) {
                const moves = convertPvsToMoves(data.pvs, fen);
                if (moves.length > 0) return { moves, source: 'cloud' };
            }
        }
    } catch (e) {
        console.log('Cloud eval failed:', e.message);
    }

    return null;
}

const CASTLING_UCI = { e1h1: 'e1g1', e1a1: 'e1c1', e8h8: 'e8g8', e8a8: 'e8c8' };

// Convert PV data (with UCI moves) to moves array with SAN
function convertPvsToMoves(pvs, fen) {
    const moves = [];

    for (const pv of pvs) {
        let uciMove = pv.moves ? pv.moves.split(' ')[0] : null;
        if (uciMove && uciMove.length >= 4) {
            const tempGame = new Chess(fen);

            // Cloud eval writes castling as king-takes-rook (e1h1). chess.js rejects that, so
            // castling used to vanish from the engine's list, even when it was the best move.
            const kingOnFrom = tempGame.get(uciMove.substring(0, 2));
            if (kingOnFrom && kingOnFrom.type === 'k' && CASTLING_UCI[uciMove]) {
                uciMove = CASTLING_UCI[uciMove];
            }

            const from = uciMove.substring(0, 2);
            const to = uciMove.substring(2, 4);
            const promotion = uciMove.length > 4 ? uciMove[4] : undefined;

            // Convert UCI to SAN
            const move = tempGame.move({ from, to, promotion });
            if (move) {
                moves.push({
                    move: uciMove,
                    san: move.san,
                    cp: pv.cp,
                    mate: pv.mate
                });
            }
        }
    }

    return moves;
}

function resetAnalysisPanel() {
    const sf = document.getElementById('stockfish-analysis');
    const lc = document.getElementById('lichess-analysis');
    const ym = document.getElementById('your-move-analysis-section');
    if (sf) sf.innerHTML = '<p class="analysis-placeholder">Speel \'n skuif...</p>';
    if (lc) lc.innerHTML = '<p class="analysis-placeholder">Speel \'n skuif...</p>';
    if (ym) ym.style.display = 'none';
}

async function showMoveAnalysis(fenBeforeMove, playedMove) {
    const note = lastMoveNote;
    const sfDiv = document.getElementById('stockfish-analysis');
    const lcDiv = document.getElementById('lichess-analysis');
    const ymSection = document.getElementById('your-move-analysis-section');
    const ymInfo = document.getElementById('your-move-analysis-info');
    if (!sfDiv || !lcDiv) return;

    sfDiv.innerHTML = '<p class="analysis-placeholder">Laai...</p>';
    lcDiv.innerHTML = '<p class="analysis-placeholder">Laai...</p>';

    let sfMoves = [];
    let lcMoves = [];

    // Stockfish top moves (cache shared with scoring call)
    try {
        const result = await getStockfishEval(fenBeforeMove, 4);
        if (result && result.moves && result.moves.length > 0) {
            sfMoves = result.moves.slice(0, 2).map(m => {
                const cp = pvToCp(m);
                return { san: m.san, eval: cp !== null ? formatEval(cp) : '?' };
            });
        }
    } catch (e) {
        console.error('showMoveAnalysis Stockfish error:', e);
    }

    // Lichess popular moves (cache shared with scoring call)
    try {
        const data = await getLichessPopularity(fenBeforeMove);
        if (data && data.moves && data.moves.length > 0) {
            const sorted = [...data.moves].sort((a, b) =>
                (b.white + b.draws + b.black) - (a.white + a.draws + a.black)
            );
            lcMoves = sorted.slice(0, 2).map(m => {
                const games = m.white + m.draws + m.black;
                const winRate = games > 0 ? ((m.white / games) * 100).toFixed(0) : 0;
                return { san: m.san, games, winRate };
            });
        }
    } catch (e) {
        console.error('showMoveAnalysis Lichess error:', e);
    }

    // Render Stockfish moves
    sfDiv.innerHTML = sfMoves.length > 0
        ? sfMoves.map((m, i) => `
            <div class="analysis-move-item rank-${i + 1}">
                <span class="analysis-move-san">${m.san}</span>
                <span class="analysis-move-info">${m.eval}</span>
            </div>`).join('')
        : '<p class="analysis-placeholder">Geen data</p>';

    // Render Lichess moves
    lcDiv.innerHTML = lcMoves.length > 0
        ? lcMoves.map((m, i) => `
            <div class="analysis-move-item rank-${i + 1}">
                <span class="analysis-move-san">${m.san}</span>
                <span class="analysis-move-info">${m.games.toLocaleString()} spele (${m.winRate}%)</span>
            </div>`).join('')
        : '<p class="analysis-placeholder">Geen data</p>';

    // Compare player's move against top suggestions
    if (playedMove && ymSection && ymInfo) {
        ymSection.style.display = 'block';
        const inSf = sfMoves.some(m => m.san === playedMove);
        const inLc = lcMoves.some(m => m.san === playedMove);
        let cls, text;
        if (inSf && inLc) {
            cls = 'your-move-good';
            text = `<strong>${playedMove}</strong> — Uitstekend! Top in beide.`;
        } else if (inSf) {
            cls = 'your-move-good';
            text = `<strong>${playedMove}</strong> — Top enjin skuif!`;
        } else if (inLc) {
            cls = 'your-move-ok';
            text = `<strong>${playedMove}</strong> — Gewilde keuse.`;
        } else if (sfMoves.length === 0 && lcMoves.length === 0) {
            cls = 'your-move-ok';
            text = `<strong>${playedMove}</strong> — Geen vergelykingsdata.`;
        } else {
            cls = 'your-move-weak';
            text = `<strong>${playedMove}</strong> — Nie in top 2 nie.`;
        }
        if (note && note.evalLabel) {
            const popular = inLc ? 'gewild, maar ' : '';
            const verdicts = { flater: "'n flater!", fout: 'dit kos jou.', onakkuraat: 'die evaluering sak effens.' };
            cls = note.evalLabel === 'onakkuraat' ? 'your-move-ok' : 'your-move-weak';
            text = `<strong>${playedMove}</strong>: ${popular}${verdicts[note.evalLabel]}`;
        }
        ymInfo.innerHTML = `<span class="${cls}">${text}</span>`;
    }
}

async function getLichessPopularity(fen) {
    // Check cache first
    const cacheKey = fen.split(' ').slice(0, 4).join(' '); // Normalize FEN for caching
    const cached = apiCache.lichess.get(cacheKey);
    if (cached && Date.now() - cached.time < CACHE_TTL) {
        return cached.data;
    }

    try {
        // Explorer genuinely requires auth (verified: a missing header and an empty
        // "Bearer " header both 401 identically) - but never send a malformed empty
        // Bearer header regardless, since window.LICHESS_TOKEN can legitimately be unset.
        const headers = window.LICHESS_TOKEN
            ? { 'Authorization': 'Bearer ' + window.LICHESS_TOKEN }
            : {};
        const response = await fetch(
            `https://explorer.lichess.ovh/lichess?variant=standard&speeds=blitz,rapid,classical&ratings=1600,2000,2500&fen=${encodeURIComponent(fen)}`,
            { headers }
        );
        if (response.ok) {
            const data = await response.json();
            // Cache the result
            if (apiCache.lichess.size >= CACHE_MAX_SIZE) {
                const firstKey = apiCache.lichess.keys().next().value;
                apiCache.lichess.delete(firstKey);
            }
            apiCache.lichess.set(cacheKey, { data, time: Date.now() });
            return data;
        }
    } catch (e) {
        console.log('Lichess explorer failed:', e);
    }
    return null;
}

// A position's eval from White's side. Uses the same search as scoring.
async function positionEvalCp(position) {
    if (position.in_checkmate()) return position.turn() === 'b' ? 10000 : -10000;
    if (position.game_over()) return 0;
    const result = await getWhitePovEval(position.fen());
    return result ? result.cp : null;
}

function showPositionEval(evalCp) {
    if (evalCp !== null) {
        $('#position-eval').text(formatEval(evalCp));
        $('#position-eval').removeClass('positive negative');
        $('#position-eval').addClass(evalCp >= 0 ? 'positive' : 'negative');
    } else {
        $('#position-eval').text('...');
        $('#position-eval').removeClass('positive negative');
    }
}

// The Evaluering display during play
async function updatePositionEval() {
    const fen = game.fen();
    const evalCp = await positionEvalCp(game);
    if (fen !== game.fen()) return;  // The game has moved on; a newer eval is coming
    showPositionEval(evalCp);
}

// ============================================
// BLACK'S MOVE LOGIC
// ============================================

function makeBlackMove(san) {
    const move = game.move(san);
    if (move) {
        positionHistory.push(game.fen());
        board.position(game.fen(), true);  // true enables animation

        const lastMoveNum = moveHistory.length > 0 ? moveHistory[moveHistory.length - 1].moveNum : currentMoveNumber;
        updateMoveHistoryWithBlack(lastMoveNum, san);

        checkBadges(move, true); // Check badges for black's move too

        // Update eval after Black's move
        updatePositionEval();

        // Re-enable hint button now that it's White's turn again
        updateUI();
    }
}

async function makeAIBlackMove() {
    if (!isGameActive || game.game_over()) return;

    const gen = gameGeneration;
    const fen = game.fen();

    // Steer toward a named line this player hasn't earned yet
    const steerSan = pickSteerMove();
    if (steerSan) {
        const move = game.move(steerSan);
        if (move) {
            positionHistory.push(game.fen());
            board.position(game.fen(), true);  // Animate

            const lastMoveNum = moveHistory.length > 0 ? moveHistory[moveHistory.length - 1].moveNum : currentMoveNumber;
            updateMoveHistoryWithBlack(lastMoveNum, move.san);

            checkBadges(move, true);
            updatePositionEval();  // Update eval after Black's move
            updateUI();  // Re-enable hint button now that it's White's turn again
            checkGameEnd();
            return;
        }
    }

    // Try Lichess explorer first
    try {
        const lichessData = await getLichessPopularity(fen);
        if (gen !== gameGeneration) return;  // Nuwe Spel happened during the fetch

        if (lichessData && lichessData.moves && lichessData.moves.length > 0) {
            // Get top 5 moves by popularity
            const sortedMoves = [...lichessData.moves]
                .sort((a, b) => (b.white + b.draws + b.black) - (a.white + a.draws + a.black))
                .slice(0, 5);

            // Weighted random selection
            const totalGames = sortedMoves.reduce((sum, m) => sum + m.white + m.draws + m.black, 0);
            let random = Math.random() * totalGames;

            for (const m of sortedMoves) {
                const games = m.white + m.draws + m.black;
                random -= games;
                if (random <= 0) {
                    const move = game.move(m.san);
                    if (move) {
                        positionHistory.push(game.fen());
                        board.position(game.fen(), true);  // Animate

                        const lastMoveNum = moveHistory.length > 0 ? moveHistory[moveHistory.length - 1].moveNum : currentMoveNumber;
                        updateMoveHistoryWithBlack(lastMoveNum, m.san);

                        checkBadges(move, true);
                        updatePositionEval();  // Update eval after Black's move
                        updateUI();  // Re-enable hint button now that it's White's turn again
                        checkGameEnd();
                        return;
                    }
                }
            }
        }
    } catch (e) {
        console.log('Lichess explorer failed for black move:', e);
    }

    if (gen !== gameGeneration) return;  // Nuwe Spel happened during the fetch or its handling

    // Fall back to Stockfish
    const stockfishResult = await getStockfishEval(fen, 1);
    if (gen !== gameGeneration) return;  // Nuwe Spel happened during the fetch
    if (stockfishResult && stockfishResult.moves && stockfishResult.moves.length > 0) {
        const bestMove = stockfishResult.moves[0].move;

        // Convert UCI to SAN
        const from = bestMove.substring(0, 2);
        const to = bestMove.substring(2, 4);
        const promotion = bestMove.length > 4 ? bestMove[4] : undefined;

        const move = game.move({ from, to, promotion });
        if (move) {
            positionHistory.push(game.fen());
            board.position(game.fen(), true);  // Animate

            const lastMoveNum = moveHistory.length > 0 ? moveHistory[moveHistory.length - 1].moveNum : currentMoveNumber;
            updateMoveHistoryWithBlack(lastMoveNum, move.san);

            checkBadges(move, true);
            updatePositionEval();  // Update eval after Black's move
            updateUI();  // Re-enable hint button now that it's White's turn again
            checkGameEnd();
            return;
        }
    }

    // Last resort: random legal move
    const legalMoves = game.moves();
    if (legalMoves.length > 0) {
        const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
        const move = game.move(randomMove);
        if (move) {
            positionHistory.push(game.fen());
            board.position(game.fen(), true);  // Animate

            const lastMoveNum = moveHistory.length > 0 ? moveHistory[moveHistory.length - 1].moveNum : currentMoveNumber;
            updateMoveHistoryWithBlack(lastMoveNum, randomMove);

            checkBadges(move, true);
            updatePositionEval();  // Update eval after Black's move
            updateUI();  // Re-enable hint button now that it's White's turn again
            checkGameEnd();
        }
    }
}

// Black's next move toward a locked named line, or null to play by popularity as usual.
// Each locked line counts once, so a move leading to many locked badges is more likely.
function pickSteerMove() {
    const key = boardOf(game.fen());
    if (TRAP_REPLIES.has(key)) return TRAP_REPLIES.get(key);

    const locked = (STEER_MAP.get(key) || []).filter((c) => !earnedBadges.includes(c.badge));
    if (locked.length === 0 || Math.random() >= STEER_CHANCE) return null;
    return locked[Math.floor(Math.random() * locked.length)].san;
}

function checkGameEnd() {
    if (game.game_over() || currentMoveNumber >= MAX_MOVES) {
        const gen = gameGeneration;

        // Check for checkmate - capture turn synchronously before any async/setTimeout
        let checkmateMessage = null;
        if (game.in_checkmate()) {
            const blackToMove = game.turn() === 'b';
            if (blackToMove) {
                // Black is checkmated - White wins!
                awardBadge('checkmate');
                checkmateMessage = 'Skaakmat! Jy het gewen! 🏆';
            } else {
                // White is checkmated - Black wins
                checkmateMessage = 'Skaakmat! Swart het gewen.';
            }
        } else if (game.game_over()) {
            // Stalemate or another draw, as opposed to just hitting the move limit
            checkmateMessage = getDrawMessage();
        }

        // Wait 2 seconds after Black's last move before showing modal
        setTimeout(() => {
            if (gen !== gameGeneration) return;
            endGame(checkmateMessage);
        }, 2000);
    }
}


// ============================================
// BADGE SYSTEM
// ============================================

function checkBadges(move, isBlackMove = false) {
    const san = move.san;
    const history = game.history();
    const moveNum = Math.ceil(history.length / 2);

    // Named variations: earned on reaching the exact position (see BADGE_LINES)
    (LINE_AWARDS.get(boardOf(game.fen())) || []).forEach((badge) => awardBadge(badge));

    if (isBlackMove && moveNum === 3 && san === 'a6') {
        variationState.morphyPlayed = true;
    }

    // Achievement badges (White's moves)
    if (!isBlackMove) {
        // First Blood
        if (move.captured && !firstCaptureOccurred) {
            firstCaptureOccurred = true;
            awardBadge('first_blood');
        }

        // Queen Capture
        if (move.captured === 'q') {
            awardBadge('queen_capture');
        }

        // Castled
        if (san === 'O-O' || san === 'O-O-O') {
            awardBadge('castled');
        }

        // Exchange Variation - the textbook 3...a6 4.Bxc6, exactly move 4
        if (san === 'Bxc6' && variationState.morphyPlayed && moveNum === 4) {
            awardBadge('exchange');
        }

        // Delayed Exchange (Bxc6 on moves 5-10, after ...a6 - e.g. 4.Ba4 Nf6 5.Bxc6, or 6.Bxc6 after O-O Be7)
        if (san === 'Bxc6' && variationState.morphyPlayed && moveNum >= 5 && moveNum <= 10) {
            awardBadge('delayed_exchange');
        }

        // Center Control (pawns on e4 AND d4)
        const e4Piece = game.get('e4');
        const d4Piece = game.get('d4');
        if (e4Piece && e4Piece.type === 'p' && e4Piece.color === 'w' &&
            d4Piece && d4Piece.type === 'p' && d4Piece.color === 'w') {
            awardBadge('center_control');
        }

        // The Spanish bishop's full retreat dance: Bb5-a4-b3-c2, completed on reaching c2
        if (san === 'Bc2' && moveNum <= 14) {
            const ba4Idx = history.indexOf('Ba4');
            const bb3Idx = history.indexOf('Bb3');
            if (ba4Idx >= 0 && bb3Idx > ba4Idx) {
                awardBadge('cinderella');
            }
        }

        // Noah's Ark: the trap was set and White left the poisoned d4-pawn alone
        if (moveNum === 8 && san !== 'Qxd4') {
            const before = new Chess();
            history.slice(0, -1).forEach((m) => before.move(m));
            if (boardOf(before.fen()) === NOAH_TRAP_BOARD) {
                awardBadge('noahs_ark');
            }
        }
    }
}

function awardBadge(badgeKey) {
    // The review replays every badge this game touched, earned before or not. Chorizo only counts
    // games played, so it only shows the time it is earned.
    const alreadyLogged = gameBadgeLog.some((entry) => entry.badge === badgeKey);
    if (!alreadyLogged && (badgeKey !== 'chorizo' || !earnedBadges.includes(badgeKey))) {
        gameBadgeLog.push({ ply: game.history().length, badge: badgeKey });
    }

    if (earnedBadges.includes(badgeKey)) return;

    earnedBadges.push(badgeKey);
    sessionBadges.push(badgeKey);
    savePlayerData();

    // Update badge display
    $(`.badge[data-badge="${badgeKey}"]`).removeClass('locked').addClass('unlocked');

    // Show notification
    const badge = BADGES[badgeKey];
    if (badge) {
        showBadgeNotification(badge);
    }
}

function showBadgeNotification(badge) {
    $('#notification-icon').text(badge.icon);
    $('#notification-text').text(`${badge.title} ontsluit!`);

    const notification = $('#badge-notification');
    notification.removeClass('hidden');

    setTimeout(() => {
        notification.addClass('hidden');
    }, 3000);
}

function updateBadgeDisplay() {
    // Reset all badges to locked
    $('.badge').removeClass('unlocked').addClass('locked');

    // Unlock earned badges
    earnedBadges.forEach(badgeKey => {
        $(`.badge[data-badge="${badgeKey}"]`).removeClass('locked').addClass('unlocked');
    });
}

// ============================================
// UI UPDATES
// ============================================

function updateUI() {
    $('#move-count').text(`${currentMoveNumber}/${MAX_MOVES}`);
    $('#current-score').text(`${currentScore}/${TARGET_SCORE}`);

    // Update progress bar
    const progress = (currentScore / TARGET_SCORE) * 100;
    $('#progress-bar').css('width', `${progress}%`);
    $('#progress-text').text(`${Math.round(progress)}%`);

    // Pulse the high-score display when the running score is on pace to beat it, but don't
    // commit or persist it mid-game - a high score is only earned by finishing (see endGame)
    if (currentScore > highScore) {
        $('#high-score').addClass('high-score-pulse');
        setTimeout(() => $('#high-score').removeClass('high-score-pulse'), 500);
    }

    // Enable hint button after forced moves - only on White's turn, never during Black's reply window
    updateHintButton();
}

function addMoveToHistory(moveNum, san, score, isForced) {
    const scoreClass = isForced ? 'forced' : `score-${score}`;
    const scoreLabel = isForced ? 'OPN' : score;

    const moveRow = $(`
        <div class="move-row" data-move="${moveNum}">
            <span class="move-number">${moveNum}.</span>
            <span class="move-white">${san}</span>
            <span class="move-score ${scoreClass}">${scoreLabel}</span>
            <span class="move-black">...</span>
        </div>
    `);

    $('#move-history').append(moveRow);
    $('#move-history').scrollTop($('#move-history')[0].scrollHeight);

    moveHistory.push({ moveNum, whiteSan: san, blackSan: null, score, isForced, note: isForced ? null : lastMoveNote });
}

function updateMoveHistoryWithBlack(moveNum, san) {
    const moveRow = $(`.move-row[data-move="${moveNum}"]`);
    if (moveRow.length) {
        moveRow.find('.move-black').text(san);
    }

    const historyEntry = moveHistory.find(m => m.moveNum === moveNum);
    if (historyEntry) {
        historyEntry.blackSan = san;
    }
}

function showMessage(text) {
    $('#move-suggestions').html(`<p class="waiting-message">${text}</p>`);
}

function showScorePopup(score) {
    const popup = $('#score-popup');
    const textEl = $('#score-popup-text');

    // Score messages (same as Bird Opening)
    const scoreMessages = {
        5: "Goeie werk! (+5)",
        4: "Interessant (+4)",
        3: "Dalk nie die beste lyn nie (+3)",
        2: "Gewaagd (+2)",
        1: "Jy is rof! (+1)"
    };

    let message = scoreMessages[score] || `+${score}`;
    if (lastMoveNote && lastMoveNote.evalLabel === 'flater') message = `Flater! (+${score})`;
    else if (lastMoveNote && lastMoveNote.evalLabel === 'fout') message = `Dit kos jou (+${score})`;
    else if (lastMoveNote && lastMoveNote.hintCapped) message = `Met 'n wenk (+${score})`;

    textEl.text(message);
    popup.removeClass('score-1 score-2 score-3 score-4 score-5 score-forced').addClass(`score-${score}`);

    // Show popup using requestAnimationFrame for smoother rendering
    requestAnimationFrame(() => {
        popup.removeClass('hidden');
    });

    // Hide after 1.2 seconds
    setTimeout(() => {
        popup.addClass('hidden');
    }, 1200);
}

function showEducationalMessage() {
    const message = EDUCATIONAL_MESSAGES[Math.floor(Math.random() * EDUCATIONAL_MESSAGES.length)];
    $('#educational-message p').text(message);
}

// ============================================
// HINTS
// ============================================

function getHintLimit() {
    // J and L can only use hints until move 10
    // Other players can use hints until move 16
    if (currentPlayer === 'J' || currentPlayer === 'L') {
        return 10;
    }
    return 16;
}

function canUseHint() {
    const hintLimit = getHintLimit();
    return isGameActive && currentMoveNumber >= 3 && currentMoveNumber < hintLimit;
}

// First press: the idea, no move. Second press: the move itself. Both cap the move's score.
async function showHint() {
    if (!canUseHint() || game.turn() !== 'w') {
        const hintLimit = getHintLimit();
        if (currentMoveNumber >= hintLimit) {
            showMessage(`Wenke is nie beskikbaar na skuif ${hintLimit} nie. Jy moet self dink!`);
        }
        return;
    }

    // Use the current game position (should match what will be used for scoring)
    const fen = game.fen();
    const gen = gameGeneration;

    if (lastHintInfo && lastHintInfo.fen === fen && lastHintInfo.stage === 1) {
        revealHintMove();
        return;
    }

    $('#hint-btn').prop('disabled', true);
    showMessage('Soek wenke...');

    try {
        // Get both data sources - use same multiPv=4 as scoring for consistency
        const [engineResult, lichessResult] = await Promise.all([
            getStockfishEval(fen, 4),
            getLichessPopularity(fen)
        ]);
        if (gen !== gameGeneration || game.fen() !== fen) return;  // The position moved on

        const engineMoves = engineResult?.moves?.map(m => m.san) || [];
        const sortedPopular = lichessResult?.moves
            ? [...lichessResult.moves].sort((a, b) => (b.white + b.draws + b.black) - (a.white + a.draws + a.black))
            : [];
        const popularBest = sortedPopular[0] || null;
        const engineBestMove = engineMoves[0] || null;
        const popularBestMove = popularBest ? popularBest.san : null;

        if (!engineBestMove && !popularBestMove) {
            lastHintInfo = null;
            showMessage('Geen wenke beskikbaar nie');
            updateHintButton();
            return;
        }

        const ideaMove = await pickIdeaMove(fen, engineBestMove, popularBestMove);
        if (gen !== gameGeneration || game.fen() !== fen) return;  // The position moved on

        lastHintInfo = {
            fen,
            stage: 1,
            engineMoves,
            lichessMoves: sortedPopular.slice(0, 5).map(m => m.san),
            engineBestMove,
            popularBestMove,
            popularGames: popularBest ? popularBest.white + popularBest.draws + popularBest.black : 0
        };

        showHintMessage(
            `💡 ${describeMoveIdea(fen, ideaMove)}`,
            'idea',
            `Hierdie skuif kan nou hoogstens ${HINT_IDEA_CAP} punte kry. Druk weer vir die skuif self (hoogstens ${HINT_MOVE_CAP}).`
        );
        updateHintButton();

    } catch (e) {
        console.error('Hint error:', e);
        showMessage('Kon nie wenke kry nie');
        updateHintButton();
    }
}

function revealHintMove() {
    const hint = lastHintInfo;
    hint.stage = 2;

    const engineInfo = hint.engineBestMove ? `Enjin: ${hint.engineBestMove}` : '';
    const popularInfo = hint.popularBestMove ? `Populêr: ${hint.popularBestMove} (${hint.popularGames} spelle)` : '';
    const cost = `Hierdie skuif kan nou hoogstens ${HINT_MOVE_CAP} punte kry.`;

    if (hint.engineBestMove && hint.popularBestMove) {
        if (hint.engineBestMove === hint.popularBestMove) {
            showHintMessage(`Beste skuif: ${hint.engineBestMove}`, 'both', cost);
        } else {
            showHintMessage(`${engineInfo} | ${popularInfo}`, 'different', cost);
        }
    } else if (hint.engineBestMove) {
        showHintMessage(engineInfo, 'engine', cost);
    } else {
        showHintMessage(popularInfo, 'popular', cost);
    }

    highlightBestMoves(hint.engineBestMove, hint.popularBestMove);
    updateHintButton();
}

// The thinking behind a move, without naming the move
function describeMoveIdea(fen, san) {
    const fallback = 'Wat wil Swart se laaste skuif doen? Begin daar.';
    const before = new Chess(fen);
    if (before.in_check()) return 'Jy staan in skaak. Watter antwoord is die sterkste?';

    const after = new Chess(fen);
    const move = after.move(san);
    if (!move) return fallback;

    const names = { p: 'pion', n: 'ridder', b: 'loper', r: 'toring', q: 'dame', k: 'koning' };
    const piece = names[move.piece];

    if (after.in_checkmate()) return 'Daar is skaakmat op die bord! Kyk na al jou skake.';
    if (move.captured) return 'Soek \'n vangskuif: watter stuk van Swart kan jy vat?';
    if (after.in_check()) return "'n Skaak kan hier sterk wees. Watter een?";

    // Is the piece that should move under attack right now?
    const parts = fen.split(' ');
    parts[1] = 'b';
    parts[3] = '-';
    const blackView = new Chess(parts.join(' '));
    const attacked = blackView.moves({ verbose: true }).some((m) => m.to === move.from);
    if (attacked && move.piece === 'b') {
        return 'Jou loper word aangeval. Hou hom! In die Spaanse opening is hy een van jou beste stukke.';
    }
    if (attacked) return `Jou ${piece} word aangeval. Waarheen kan hy veilig gaan?`;

    if (san === 'O-O') return 'Jou koning staan nog in die middel. Kry hom veilig agter sy pionne.';
    if (san === 'Re1') return "Jou e4-pion kort nog 'n verdediger. Watter stuk kan hom van ver af help?";
    if (san === 'c3') return 'Berei die d4-stoot voor: watter pion moet eers skuif sodat d4 gesteun word?';
    if (san === 'h3' && before.get('c8') && before.get('c8').type === 'b') {
        return 'Swart se loper op c8 wil dalk na g4 toe kom en jou ridder vaspen. Kan jy dit stop?';
    }
    if (move.piece === 'n' && move.from === 'd2' && move.to === 'f1') {
        return 'Jou ridder is op reis: Nbd2-f1-g3. Wat is die volgende stap?';
    }
    if (move.piece === 'p' && 'de'.includes(move.to[0])) {
        return 'Dink aan die sentrum. Watter pionskuif maak dit joune?';
    }
    const homeSquares = { n: ['b1', 'g1'], b: ['c1', 'f1'] };
    if ((homeSquares[move.piece] || []).includes(move.from)) {
        return 'Watter stuk staan nog by die huis? Bring hom in die spel.';
    }
    if (move.piece === 'r') return "Jou toring wil op 'n oop of half-oop lêer staan. Watter een?";
    if (move.piece === 'p') return "'n Klein pionskuif op die vleuel help hier. Watter een?";
    return `Jou ${piece} kan beter staan. Waar sal hy die meeste doen?`;
}

function updateHintButton() {
    const stage = lastHintInfo && lastHintInfo.fen === game.fen() ? lastHintInfo.stage : 0;
    $('#hint-btn').text(stage === 1 ? 'Wys die skuif' : 'Wenk');
    $('#hint-btn').prop('disabled', !(canUseHint() && game.turn() === 'w' && stage < 2));
}

function showHintMessage(text, type, cost) {
    let bgColor = 'var(--spanish-yellow)';
    let textColor = 'var(--spanish-dark-red)';

    if (type === 'both') {
        bgColor = 'linear-gradient(90deg, #2ecc71, #3498db)';
        textColor = 'white';
    } else if (type === 'engine') {
        bgColor = '#2ecc71';
        textColor = 'white';
    } else if (type === 'popular') {
        bgColor = '#3498db';
        textColor = 'white';
    }

    const legend = type === 'idea'
        ? ''
        : `<p style="text-align: center; font-size: 0.8rem; color: #95a5a6; margin-top: 5px;">
            🟢 Groen = Enjin | 🔵 Blou = Populêr | 🟣 Pers = Albei
        </p>`;

    $('#move-suggestions').html(`
        <div class="hint-prominent" style="
            background: ${bgColor};
            color: ${textColor};
            padding: 15px;
            border-radius: 10px;
            text-align: center;
            font-size: ${type === 'idea' ? '1rem' : '1.2rem'};
            font-weight: bold;
            margin: 10px 0;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        ">
            ${text}
        </div>
        ${legend}
        <p style="text-align: center; font-size: 0.8rem; color: #95a5a6; margin-top: 5px;">${cost}</p>
    `);
}

// ============================================
// GAME END & REVIEW
// ============================================

function endGame(checkmateMessage = null) {
    isGameActive = false;

    // A high score is only earned by finishing the game - commit it here, not mid-game
    const previousHigh = highScore;
    if (currentScore > previousHigh) {
        highScore = currentScore;
        $('#high-score').text(highScore);
    }

    // Check for perfect game badge
    if (currentScore >= 100) {
        awardBadge('perfect_game');
    }

    // Check for 7 perfect moves badge
    if (perfectMoves >= 7) {
        awardBadge('seven_perfect');
    }

    // Check for 12 perfect moves badge
    if (perfectMoves >= 12) {
        awardBadge('twelve_perfect');
    }

    // Carbón badge for low score (less than 50%). Not after mating Black: an early win
    // leaves few moves to score, so the low total says nothing about the play.
    const whiteMatedBlack = game.in_checkmate() && game.turn() === 'b';
    if (currentScore < 50 && !whiteMatedBlack) {
        awardBadge('carbon');
    }

    // Track games played for chorizo badge
    incrementGamesPlayed();

    savePlayerData();
    showGameOverModal(checkmateMessage, previousHigh);
}

function showGameOverModal(checkmateMessage = null, previousHigh = highScore) {
    // Update modal title based on checkmate
    if (checkmateMessage) {
        $('#modal-title').text(checkmateMessage);
    } else {
        $('#modal-title').text('Spel Klaar!');
    }

    // Show score prominently
    $('#final-score').text(currentScore);

    // High score message - strictly greater than the score that stood before this game,
    // so tying your existing high score doesn't falsely claim a new record
    if (currentScore > previousHigh) {
        $('#high-score-message').removeClass('hidden');
    } else {
        $('#high-score-message').addClass('hidden');
    }

    // Show earned badges
    const earnedBadgesContainer = $('#earned-badges');
    earnedBadgesContainer.empty();

    if (sessionBadges.length > 0) {
        sessionBadges.forEach(badgeKey => {
            const badge = BADGES[badgeKey];
            if (badge) {
                earnedBadgesContainer.append(`
                    <div class="earned-badge">
                        <span class="badge-icon">${badge.icon}</span>
                        <span class="badge-name">${badge.name}</span>
                    </div>
                `);
            }
        });
        $('#modal-badges').removeClass('hidden');
    } else {
        $('#modal-badges').addClass('hidden');
    }

    $('#game-over-modal').removeClass('hidden');
}

function enterReviewMode() {
    isReviewMode = true;
    $('#analysis-panel').addClass('hidden');
    showReviewControls(true);
    runReview();
}

function showReviewControls(inReview) {
    $('#review-continue-btn, #review-legend').toggleClass('hidden', !inReview);
    $('#new-game-btn, #hint-btn').toggleClass('hidden', inReview);
}

// The review plays the whole game by itself. Each move: arrows up, a pause, the move plays, then
// any popups it earned. Gaan voort bumps reviewRun, which stops this at its next check.
async function runReview() {
    const run = ++reviewRun;
    const plies = game.history({ verbose: true });
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    // Work out each step just before it's needed, so leaving early leaves little for the engine to finish
    const steps = new Map();
    const stepFor = (ply) => {
        if (!steps.has(ply) && plies[ply]) steps.set(ply, prepareReviewStep(ply, plies[ply]));
        return steps.get(ply);
    };

    // The Evaluering display follows the replay
    let shownPly = 0;
    const showEvalAt = async (ply) => {
        shownPly = ply;
        const evalCp = await positionEvalCp(new Chess(positionHistory[ply]));
        if (run === reviewRun && shownPly === ply) showPositionEval(evalCp);
    };

    clearReviewArrows();
    board.position(positionHistory[0], false);
    showEvalAt(0);

    for (let ply = 0; ply < plies.length; ply++) {
        const move = plies[ply];
        const isWhite = move.color === 'w';
        const record = isWhite ? moveHistory[ply / 2] : null;
        const forced = isWhite ? (!record || record.isForced) : ply < 4;

        stepFor(ply + 1);
        const step = (await Promise.race([stepFor(ply), wait(REVIEW_PREP_LIMIT)])) || {};
        if (run !== reviewRun) return;

        const look = reviewArrowsFor(ply, move, step);
        let legend = '';
        if (isWhite) legend = forced ? '🟢 Jou skuif' : '🟠 Beste skuiwe   🟢 Jou skuif';
        else if (look.length > 0) legend = '🟠 Swart se ander keuses';
        $('#review-legend').text(legend);
        drawReviewArrows(look);

        let pause = REVIEW_FORCED_MS;
        if (isWhite && !forced) pause = REVIEW_WHITE_MS;
        if (!isWhite && look.length > 0) pause = REVIEW_BLACK_MS;
        await wait(pause);
        if (run !== reviewRun) return;

        clearReviewArrows();
        board.position(positionHistory[ply + 1], true);
        showEvalAt(ply + 1);
        await wait(REVIEW_MOVE_MS);
        if (run !== reviewRun) return;

        for (const popup of reviewPopupsFor(ply, record, step)) {
            showReviewPopup(popup);
            await wait(REVIEW_POPUP_MS);
            if (run !== reviewRun) return;
            $('#score-popup').addClass('hidden');
            await wait(150);
            if (run !== reviewRun) return;
        }
    }

    $('#review-legend').text('Klaar!');
}

async function prepareReviewStep(ply, move) {
    const fen = positionHistory[ply];

    if (move.color === 'b') {
        return { others: ply < 4 ? [] : await reviewBlackOptions(fen, move.san) };
    }

    const record = moveHistory[ply / 2];
    if (!record || record.isForced) return { best: [] };

    const note = record.note || {};
    const best = await reviewBestMoves(fen, note);
    const sacrifice = !note.evalLabel && note.rawScore !== 5 && await isSoundSacrifice(fen, move);
    return { best, sacrifice };
}

// The best move or moves, at most three: the engine's lines close to its top line, plus the main-line
// move if it is sound, since that also scores full marks (the same test as scoring and hints).
async function reviewBestMoves(fen, note) {
    const result = await getStockfishEval(fen, 4);
    if (!result || !result.moves || result.moves.length === 0) return [];

    const topCp = pvToCp(result.moves[0]);
    if (topCp === null) return [];
    const best = result.moves
        .filter((line) => {
            const cp = pvToCp(line);
            return cp !== null && winChance(topCp) - winChance(cp) < REVIEW_BEST_MARGIN;
        })
        .map((line) => line.san)
        .slice(0, 3);

    if (note.popularBest && !best.includes(note.popularBest)) {
        const check = await moveLoss(fen, result.moves[0].san, note.popularBest);
        const smallestBand = EVAL_LOSS_BANDS[EVAL_LOSS_BANDS.length - 1].minLoss;
        if (check && check.loss < smallestBand) {
            if (best.length === 3) best[2] = note.popularBest;
            else best.push(note.popularBest);
        }
    }
    return best;
}

// Black's other options, at most two, leaving out anything far worse than the engine's top line
async function reviewBlackOptions(fen, playedSan) {
    const result = await getStockfishEval(fen, 3);
    if (!result || !result.moves || result.moves.length === 0) return [];

    // Scores from Black's side: local lines already are, cloud lines are White-POV
    const sign = result.source === 'cloud' ? -1 : 1;
    const topCp = pvToCp(result.moves[0]);
    if (topCp === null) return [];
    return result.moves
        .filter((line) => {
            const cp = pvToCp(line);
            return cp !== null && line.san !== playedSan &&
                winChance(sign * topCp) - winChance(sign * cp) < REVIEW_OPTION_MARGIN;
        })
        .map((line) => line.san)
        .slice(0, 2);
}

// A "brilliant" move: it gives up material on purpose and the engine still approves. Black's best
// reply takes the piece that just moved, it costs more than it captured, and White can't take back.
async function isSoundSacrifice(fen, move) {
    const after = new Chess(fen);
    if (!after.move(move.san)) return false;

    const reply = await getStockfishEval(after.fen(), 1);
    const answer = reply && reply.moves && reply.moves[0];
    if (!answer || answer.move.substring(2, 4) !== move.to) return false;

    const values = { p: 1, n: 3, b: 3, r: 5, q: 9 };
    const captured = move.captured ? values[move.captured] : 0;
    if (!values[move.piece] || values[move.piece] <= captured) return false;

    if (!after.move(answer.san)) return false;
    return !after.moves({ verbose: true }).some((m) => m.to === move.to && m.captured);
}

function reviewArrowsFor(ply, move, step) {
    const fen = positionHistory[ply];
    const squares = (san) => {
        const m = new Chess(fen).move(san);
        return m ? { from: m.from, to: m.to } : null;
    };
    const orange = (list) => list.map(squares).filter(Boolean).map((a) => ({ ...a, kind: 'best' }));

    if (move.color === 'b') return orange(step.others || []);

    const best = step.best || [];
    return [
        ...orange(best.filter((san) => san !== move.san)),
        // A green arrow edged in orange: he chose one of the best
        { from: move.from, to: move.to, kind: 'chosen', edged: best.includes(move.san) }
    ];
}

function reviewPopupsFor(ply, record, step) {
    const popups = [];
    const note = record && record.note;
    if (note) {
        if (note.evalLabel === 'flater') {
            popups.push({ text: 'Oepsie', kind: 'score-1' });
        } else if (note.hintStage < 2 && (note.rawScore === 5 || step.sacrifice)) {
            popups.push({ text: 'Mooi skuif!', kind: 'score-5' });
        }
    }
    gameBadgeLog
        .filter((entry) => entry.ply === ply + 1)
        .forEach((entry) => {
            const badge = BADGES[entry.badge];
            popups.push({ text: `${badge.icon} ${badge.name} gespeel`, kind: 'score-3' });
        });
    return popups;
}

function showReviewPopup(popup) {
    $('#score-popup-text').text(popup.text);
    $('#score-popup')
        .removeClass('score-1 score-2 score-3 score-4 score-5 score-forced')
        .addClass(popup.kind)
        .removeClass('hidden');
}

function clearReviewArrows() {
    reviewArrows = [];
    const layer = document.getElementById('review-arrows');
    if (layer) {
        layer.innerHTML = '';
        layer.classList.add('hidden');
    }
}

// One arrow as a polygon, on a board 800 units wide (100 a square, a8 at the top left)
function arrowPolygon(from, to, shaft, headWidth, headLength) {
    const centre = (sq) => ({ x: (sq.charCodeAt(0) - 97) * 100 + 50, y: (8 - Number(sq[1])) * 100 + 50 });
    const a = centre(from);
    const b = centre(to);
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    const ux = (b.x - a.x) / length;
    const uy = (b.y - a.y) / length;
    const point = (along, across) => {
        const x = a.x + ux * along - uy * across;
        const y = a.y + uy * along + ux * across;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    };
    const tip = length - 8;
    const neck = tip - headLength;
    return [
        point(18, -shaft / 2), point(neck, -shaft / 2), point(neck, -headWidth / 2),
        point(tip, 0),
        point(neck, headWidth / 2), point(neck, shaft / 2), point(18, shaft / 2)
    ].join(' ');
}

function drawReviewArrows(arrows) {
    reviewArrows = arrows;
    const layer = document.getElementById('review-arrows');
    const a8 = document.querySelector('#board .square-a8');
    const h1 = document.querySelector('#board .square-h1');
    if (!layer || !a8 || !h1) return;

    // Sit exactly over the squares, whatever size the board is
    const box = layer.parentElement.getBoundingClientRect();
    const first = a8.getBoundingClientRect();
    const last = h1.getBoundingClientRect();
    layer.style.left = `${first.left - box.left}px`;
    layer.style.top = `${first.top - box.top}px`;
    layer.style.width = `${last.right - first.left}px`;
    layer.style.height = `${last.bottom - first.top}px`;

    const ORANGE = '#ff9800';
    const GREEN = '#2ecc71';
    const polygon = (arrow, colour, shaft, headWidth, headLength) =>
        `<polygon data-kind="${arrow.kind}" data-from="${arrow.from}" data-to="${arrow.to}" fill="${colour}" fill-opacity="0.9" points="${arrowPolygon(arrow.from, arrow.to, shaft, headWidth, headLength)}"></polygon>`;

    layer.innerHTML = arrows.map((arrow) => {
        if (arrow.kind === 'best') return polygon(arrow, ORANGE, 16, 42, 42);
        const edge = arrow.edged ? polygon({ ...arrow, kind: 'edge' }, ORANGE, 30, 60, 54) : '';
        return edge + polygon(arrow, GREEN, 18, 46, 44);
    }).join('');
    layer.classList.toggle('hidden', arrows.length === 0);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function highlightSquare(square) {
    $(`#board .square-${square}`).addClass('highlight-square');
}

function removeHighlights() {
    $('#board .highlight-square').removeClass('highlight-square');
    $('#board .legal-move-indicator').remove();
}

function removeBestMoveHighlights() {
    $('#board .highlight-engine-best').removeClass('highlight-engine-best');
    $('#board .highlight-popular-best').removeClass('highlight-popular-best');
    $('#board .highlight-both-best').removeClass('highlight-both-best');
}

function highlightBestMoves(engineBestMove, popularBestMove) {
    removeBestMoveHighlights();

    // Extract destination squares from SAN moves
    const engineSquare = engineBestMove ? getMoveDestination(engineBestMove) : null;
    const popularSquare = popularBestMove ? getMoveDestination(popularBestMove) : null;

    if (engineSquare && popularSquare && engineSquare === popularSquare) {
        // Both agree - use combined highlight
        $(`#board .square-${engineSquare}`).addClass('highlight-both-best');
    } else {
        // Different moves - highlight each
        if (engineSquare) {
            $(`#board .square-${engineSquare}`).addClass('highlight-engine-best');
        }
        if (popularSquare) {
            $(`#board .square-${popularSquare}`).addClass('highlight-popular-best');
        }
    }
}

function getMoveDestination(san) {
    // Extract destination square from SAN notation
    // Examples: e4 -> e4, Nf3 -> f3, Bxc6 -> c6, O-O -> g1, O-O-O -> c1, exd5 -> d5

    if (!san) return null;

    // Castling
    if (san === 'O-O') return game.turn() === 'w' ? 'g1' : 'g8';
    if (san === 'O-O-O') return game.turn() === 'w' ? 'c1' : 'c8';

    // Remove check/checkmate symbols and promotion
    san = san.replace(/[+#=QRBN]/g, '');

    // Find the last two characters that look like a square (letter + number)
    const match = san.match(/([a-h][1-8])$/);
    if (match) {
        return match[1];
    }

    return null;
}

function showLegalMoves(square) {
    let moves = game.moves({ square: square, verbose: true });

    // For forced opening moves (1-3), only show the required move
    const nextMoveNum = currentMoveNumber + 1;
    if (nextMoveNum <= 3) {
        const requiredMove = FORCED_MOVES[nextMoveNum].white;
        // Filter to only show the forced move
        moves = moves.filter(move => move.san === requiredMove);
    }

    moves.forEach(move => {
        const targetSquare = move.to;
        $(`#board .square-${targetSquare}`).append('<div class="legal-move-indicator"></div>');
    });
}
