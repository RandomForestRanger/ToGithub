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
const BADGE_VERSION = 1;

// Forced opening moves (Ruy Lopez)
const FORCED_MOVES = {
    1: { white: 'e4', black: 'e5' },
    2: { white: 'Nf3', black: 'Nc6' },
    3: { white: 'Bb5', black: null }  // Black's 3rd move is not forced
};

// Badge definitions with extended descriptions
const BADGES = {
    // Opening Variation Badges (20)
    morphy: {
        name: 'Morphy',
        icon: '🏰',
        title: 'Morphy Verdediging',
        description: 'Swart speel 3...a6 - die mees gewilde verdediging in die Ruy Lopez. Dit is vernoem na die Amerikaanse skaakgenie Paul Morphy. Die skuif dwing Wit se loper om te besluit: bly op b5, ruil op c6, of terugtrek na a4. Hierdie buigsaamheid maak dit \'n gunsteling onder spelers van alle vlakke.'
    },
    berlin: {
        name: 'Berlin',
        icon: '🐻',
        title: 'Berlin Verdediging',
        description: 'Swart speel 3...Nf6 - \'n uiters soliede verdediging wat dikwels tot \'n remise-agtige eindspel lei. Dit het beroemd geword toe Vladimir Kramnik dit gebruik het om Garry Kasparov te klop in 2000. Die "Berlin Muur" is berug moeilik om te breek!'
    },
    exchange: {
        name: 'Ruil',
        icon: '🔄',
        title: 'Ruil Variasie',
        description: 'Wit speel Bxc6 en vernietig Swart se pion struktuur deur dubbele pionne te skep. Bobby Fischer het hierdie variasie gereeld gespeel. Die idee is om \'n eenvoudige maar blywende voordeel te kry in die eindspel danksy Swart se swak pionne.'
    },
    open: {
        name: 'Oop',
        icon: '🚪',
        title: 'Oop Spel',
        description: 'Swart speel ...Nxe4 en vang die e4-pion! Dit lei tot \'n oop, taktiese spel vol kombinasies en aanvalle. Wit kry gewoonlik goeie stuk-aktiwiteit as kompensasie. Hierdie lyn vereis presiese spel van beide kante en is vol opwinding!'
    },
    closed: {
        name: 'Geslote',
        icon: '🔒',
        title: 'Geslote Spel',
        description: 'Swart speel ...Be7 - \'n strategiese, geslote posisie waar langtermyn beplanning belangrik is. Die spel ontwikkel stadig met albei kante wat hul stukke herposisioneer. Geduld is die sleutel! Anatoly Karpov was \'n meester van hierdie tipe posisies.'
    },
    bird: {
        name: 'Bird',
        icon: '🐦',
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
        description: 'Swart offer \'n pion met ...d5 vir \'n kragtige aanval op Wit se koning! Frank Marshall het hierdie gambiet 8 jaar lank geheim gehou voordat hy dit in 1918 teen Capablanca gespeel het. Dit is een van die gevaarlikste wapens teen die Ruy Lopez - vol vuur en kombinasies!'
    },
    breyer: {
        name: 'Breyer',
        icon: '🔙',
        title: 'Breyer Variasie',
        description: 'Swart speel 9...Nb8 - die ridder gaan terug om via d7 na \'n beter posisie te gaan! Dit lyk snaaks, maar die idee is diep: die ridder gaan na d7 waar dit meer opsies het. Boris Spassky en Anatoly Karpov het hierdie stelsel gereeld gebruik. Geduld en strategie!'
    },
    zaitsev: {
        name: 'Zaitsev',
        icon: '📚',
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
        icon: '🎲',
        title: 'Schliemann Gambiet',
        description: 'Swart speel 3...f5 - \'n gewaagde gambiet wat onmiddellik Wit se sentrum uitdaag! Dit is vernoem na die Duitse argeoloog Adolf Schliemann (wat ook Troje ontdek het!). Die spel word wild en taktiek-vol. Net vir die dapperes wat van avontuur hou!'
    },
    cozio: {
        name: 'Cozio',
        icon: '🔍',
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
        icon: '🌟',
        title: 'Keres Lyn',
        description: 'Swart speel 9...Nd7 of 9...a5 - dinamiese opsies vernoem na Paul Keres van Estland! Keres was een van die sterkste spelers wat nooit Wêreldkampioen geword het nie. Hierdie buigsame stelsels gee Swart verskeie planne afhangende van Wit se reaksie.'
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
        description: 'Wit speel 6.Qe2 - \'n rustiger benadering waar die dame die e4-pion steun! Dit is vernoem na die Engelse speler Thomas Worrall. Die idee is om vinnig te rokeer en dan \'n langsame aanval te bou. \'n Goeie keuse as jy van strategiese spel hou!'
    },

    // Achievement Badges (10) - Spanish themed
    queen_capture: {
        name: 'Paella!',
        icon: '🥘',
        title: 'Paella! Dame Gevang!',
        description: 'Jy het Swart se dame gevang - die kragtigste stuk op die bord! Soos \'n heerlike Spaanse paella vol lekker bestanddele, is hierdie oorwinning \'n fees vir jou spel. Die dame is 9 punte werd, so dit is \'n groot prestasie! Olé!'
    },
    first_blood: {
        name: 'Toro!',
        icon: '🐂',
        title: 'Toro! Eerste Bloed',
        description: 'Soos \'n matador in die arena van Sevilla, het jy die eerste stuk van die spel gevang! In skaak is dit belangrik om materiaal te wen wanneer jy kan. Hierdie kenteken vier jou eerste suksesvolle vangs in die spel. ¡Olé, torero!'
    },
    seven_perfect: {
        name: '7 Perfek',
        icon: '🌟',
        title: 'Siete Estrellas!',
        description: 'Jy het 5 punte op 7 verskillende skuiwe gekry - sewe sterre van uitnemendheid! Dit wys dat jy konsekwent die beste of mees populêre skuiwe speel. In Spanje sê hulle "siete estrellas" vir iets wat werklik uitmuntend is. Jy speel soos \'n meester!'
    },
    perfect_game: {
        name: 'Perfecto!',
        icon: '💯',
        title: 'El Perfecto!',
        description: 'Jy het 100 punte gekry - \'n absoluut perfekte spel! Elke skuif was die beste of mees populêre keuse. Dit is uiters moeilik om te bereik en wys dat jy die Ruy Lopez werklik verstaan. ¡Muy bien, campeón! Jy speel soos \'n grootmeester!'
    },
    castled: {
        name: 'Castillo',
        icon: '🏰',
        title: 'El Castillo',
        description: 'Jy het gerokeer en jou koning is nou veilig in die kasteel! Rokering is een van die belangrikste beginsels in skaak - dit beskerm jou koning en aktiveer jou toring. Soos die pragtige kastele van Spanje (soos die Alhambra), is jou koning nou goed beskerm!'
    },
    center_control: {
        name: 'Sentrum',
        icon: '🌻',
        title: 'Plaza Mayor',
        description: 'Jy het pionne op e4 EN d4 - jy beheer die sentrum soos die Plaza Mayor in Madrid! In skaak is sentrumbeheer uiters belangrik. Jou pionne in die middel beheer sleutelvelde en gee jou stukke meer ruimte en aktiwiteit. \'n Klassieke strategie van die ou meesters!'
    },
    checkmate: {
        name: 'Campeón!',
        icon: '🏆',
        title: 'El Campeón!',
        description: 'Jy het skaakmat gegee voor skuif 20 - jy is die kampioen! Dit is \'n groot prestasie om so vinnig te wen. Dit wys dat jy takties sterk is en kanse kan raaksien. Soos die Real Madrid-spelers wat die Champions League wen, is jy nou El Campeón van hierdie spel!'
    },
    noahs_ark: {
        name: 'Noah\'s Ark',
        icon: '🚢',
        title: 'Arca de Noé',
        description: 'Jy het die beroemde Noah\'s Ark-val vermy en jou loper gered! Hierdie val vang Wit se loper met ...a6, ...b5, en ...c4. Dit is een van die oudste en bekendste valle in die Ruy Lopez. Deur dit te vermy, wys jy dat jy die opening se gevare ken. Slim gespeel!'
    },
    gajewski: {
        name: 'Fuego!',
        icon: '🔥',
        title: 'Fuego! Gajewski Gambiet',
        description: 'Jy het die vurige Gajewski Gambiet posisie bereik - vol vuur en passie! Hierdie moderne gambiet is vernoem na die Poolse grootmeester Grzegorz Gajewski. Dit offer materiaal vir inisiatief en aanvalskanse. Soos die flamenco-dansers van Andalusië, is hierdie spel vol energie!'
    },
    cinderella: {
        name: 'Flamenco',
        icon: '💃',
        title: 'Flamenco Loper',
        description: 'Jou ligte loper dans soos \'n flamenco-danser na a5 of a6 met tempo! Hierdie maneuver is elegant en effektief - die loper bereik \'n aktiewe vierkant terwyl dit \'n bedreiging maak. Soos die pragtige flamenco-dans van Spanje, is hierdie skuif vol grasie en krag!'
    },
    carbon: {
        name: 'Carbón',
        icon: '⚫',
        title: 'Carbón - Steenkool',
        description: 'Jy het minder as 50 punte gekry... soos steenkool in jou kous op Drie Konings-dag! In Spanje kry stoute kinders carbón (steenkool) in plaas van geskenke. Maar moenie moed verloor nie - elke spel is \'n leerervaring. Probeer weer en verbeter jou telling!'
    },
    chorizo: {
        name: 'Chorizo',
        icon: '🌶️',
        title: 'Chorizo Meester',
        description: 'Jy het 5 spelle gespeel en is nou \'n Chorizo-kenner! Soos die heerlike Spaanse worst wat tyd neem om te maak, het jy tyd belê om die Ruy Lopez te leer. Met elke spel word jy beter. Hou aan oefen en jy sal binnekort \'n ware meester word! ¡Buen provecho!'
    }
};

// Educational messages (rotating) - with Spanish flair
const EDUCATIONAL_MESSAGES = [
    '🇪🇸 Die Ruy Lopez is vernoem na \'n Spaanse priester uit Zafra, Spanje - 16de eeu!',
    '📜 Ruy López de Segura het \'n boek oor skaak geskryf in 1561 - een van die oudste!',
    '⏳ Die Ruy Lopez is een van die oudste en mees gerespekteerde openings in skaak.',
    '♗ Die loper op b5 bedreig om die c6 ridder te neem en die e5 pion te wen.',
    '🎯 Die doel van d4 is om die sentrum te beheer - Plaza Mayor!',
    '🤔 3...a6 dwing die loper om te besluit: bly, ruil, of terugtrek na a4.',
    '🐻 Die Berlin Verdediging is baie gewild - selfs Magnus Carlsen speel dit!',
    '⚔️ Frank Marshall het sy gambiet eers in 1918 teen Capablanca gespeel - \'n verassing!',
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
    '🔥 Garry Kasparov was \'n meester van die Marshall Aanval - vurig!',
    '🇺🇸 Bobby Fischer het dikwels die Ruil Variasie gespeel met groot sukses.',
    '🎰 Die Schliemann Gambiet (3...f5) is riskant maar skerp - vir die dapperes!',
    '🎯 Wit se strategie behels dikwels die d4-stoot om die sentrum te open.',
    '🛡️ Swart se c6 ridder is \'n belangrike verdediger van die e5 pion.',
    '♗ Die ligte veld loper op b5 is \'n sleutelstuk in die Ruy Lopez.',
    '⚡ Pas op vir taktiek op die e-lêer - dit kan gevaarlik wees!',
    '♟️ Die a6-b5 pion ketting gee Swart ruimte op die damevleuel.',
    '🐴 Wit se maneuver Nbd2-f1-g3 is tipies - die ridder soek \'n beter plek.',
    '🗼 Die Re1-skuif steun die e4 pion en bevry die d1-veld vir die dame.',
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
let stockfishQueue = [];

let currentPlayer = 'J';
let currentMoveNumber = 0;
let currentScore = 0;
let highScore = 0;
let earnedBadges = [];
let sessionBadges = [];  // Badges earned this game

let moveHistory = [];
let positionHistory = [];
let isGameActive = false;
let isReviewMode = false;
let reviewPosition = 0;

let selectedSquare = null;  // For tap-to-move
let firstCaptureOccurred = false;
let perfectMoves = 0;

// Track specific variations
let variationState = {
    morphyPlayed: false,
    marshallSequence: [],
    closedReached: false,
    archangelSequence: []
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

    // Test 2: Lichess Cloud Eval API (common position)
    console.log('\nTest 2: Lichess Cloud Eval API');
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
        moveSpeed: 400,     // Slower piece movement
        snapbackSpeed: 300,
        snapSpeed: 150,
        appearSpeed: 300
    });

    // Click-to-move only
    $('#board').on('click', '.square-55d63', handleSquareClick);

    $(window).resize(function() {
        board.resize();
    });

    // Auto-start a new game when app loads
    setTimeout(() => {
        startNewGame();
    }, 100);
}

function initStockfish() {
    $('#loading-overlay').removeClass('hidden');

    // Load Stockfish.js from CDN and create blob worker (avoids CORS issues)
    fetch('https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js')
        .then(response => {
            if (!response.ok) throw new Error('Network error');
            return response.blob();
        })
        .then(blob => {
            try {
                const url = URL.createObjectURL(blob);
                stockfishEngine = new Worker(url);

                stockfishEngine.onmessage = function(event) {
                    const line = event.data;

                    if (line === 'uciok') {
                        stockfishReady = true;
                        console.log('Stockfish.js ready!');
                        $('#loading-overlay').addClass('hidden');
                    }

                    // Pass message to all queued callbacks
                    stockfishQueue.forEach(item => {
                        if (item.callback) {
                            item.callback(line);
                        }
                    });
                };

                stockfishEngine.onerror = function(error) {
                    console.error('Stockfish worker error:', error);
                    stockfishEngine = null;
                    $('#loading-overlay').addClass('hidden');
                };

                stockfishEngine.postMessage('uci');
                console.log('Stockfish.js engine loaded...');

            } catch (error) {
                console.error('Failed to create Stockfish worker:', error);
                stockfishEngine = null;
                $('#loading-overlay').addClass('hidden');
            }
        })
        .catch(error => {
            console.error('Failed to fetch Stockfish.js:', error);
            stockfishEngine = null;
            $('#loading-overlay').addClass('hidden');
        });
}

// Get analysis from local Stockfish.js
function getLocalStockfishEval(fen, depth = 10, multipv = 2) {
    return new Promise((resolve) => {
        if (!stockfishEngine || !stockfishReady) {
            console.log('Stockfish engine not available');
            resolve(null);
            return;
        }

        let results = [];
        let resolved = false;

        const callback = (line) => {
            if (resolved) return;

            // Parse info lines for PV data
            if (line.startsWith && line.startsWith('info') && line.includes(' pv ')) {
                const depthMatch = line.match(/depth (\d+)/);
                const multipvMatch = line.match(/multipv (\d+)/);
                const scoreMatch = line.match(/score (cp|mate) (-?\d+)/);
                const pvMatch = line.match(/ pv (.+)/);

                if (depthMatch && pvMatch && scoreMatch) {
                    const d = parseInt(depthMatch[1]);
                    const mpv = multipvMatch ? parseInt(multipvMatch[1]) : 1;
                    const scoreType = scoreMatch[1];
                    const scoreValue = parseInt(scoreMatch[2]);
                    const pv = pvMatch[1].split(' ')[0]; // Just first move (UCI)

                    if (d >= depth - 2) {
                        const result = {
                            multipv: mpv,
                            moves: pv,
                            cp: scoreType === 'cp' ? scoreValue : undefined,
                            mate: scoreType === 'mate' ? scoreValue : undefined
                        };

                        const existingIdx = results.findIndex(r => r.multipv === mpv);
                        if (existingIdx >= 0) {
                            results[existingIdx] = result;
                        } else {
                            results.push(result);
                        }
                    }
                }
            }

            // Bestmove signals end of analysis
            if (line.startsWith && line.startsWith('bestmove')) {
                resolved = true;
                const idx = stockfishQueue.findIndex(q => q.callback === callback);
                if (idx >= 0) stockfishQueue.splice(idx, 1);

                if (results.length > 0) {
                    results.sort((a, b) => a.multipv - b.multipv);
                    resolve(results);
                } else {
                    resolve(null);
                }
            }
        };

        // Add to queue
        stockfishQueue.push({ callback });

        // Send commands
        stockfishEngine.postMessage('ucinewgame');
        stockfishEngine.postMessage(`setoption name MultiPV value ${multipv}`);
        stockfishEngine.postMessage(`position fen ${fen}`);
        stockfishEngine.postMessage(`go depth ${depth}`);

        // Timeout after 6 seconds
        setTimeout(() => {
            if (!resolved) {
                resolved = true;
                const idx = stockfishQueue.findIndex(q => q.callback === callback);
                if (idx >= 0) stockfishQueue.splice(idx, 1);
                stockfishEngine.postMessage('stop');

                if (results.length > 0) {
                    results.sort((a, b) => a.multipv - b.multipv);
                    resolve(results);
                } else {
                    resolve(null);
                }
            }
        }, 6000);
    });
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

    // Review controls
    $('#review-start').on('click', () => goToPosition(0));
    $('#review-back').on('click', () => goToPosition(reviewPosition - 1));
    $('#review-forward').on('click', () => goToPosition(reviewPosition + 1));
    $('#review-end').on('click', () => goToPosition(positionHistory.length - 1));

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
    game = new Chess();
    board.position('start');

    currentMoveNumber = 0;
    currentScore = 0;
    moveHistory = [];
    positionHistory = [game.fen()];
    sessionBadges = [];
    isGameActive = true;
    isReviewMode = false;
    firstCaptureOccurred = false;
    perfectMoves = 0;
    selectedSquare = null;

    variationState = {
        morphyPlayed: false,
        marshallSequence: [],
        closedReached: false,
        archangelSequence: []
    };

    updateUI();
    $('#move-history').empty();
    $('#analysis-panel').removeClass('hidden');
    $('#review-panel').addClass('hidden');
    $('#move-suggestions').html('<p class="waiting-message">Speel e4 om te begin...</p>');
    $('#hint-btn').prop('disabled', true);

    showEducationalMessage();
}

function onDragStart(source, piece, position, orientation) {
    if (!isGameActive) return false;
    if (isReviewMode) return false;
    if (game.game_over()) return false;
    if (piece.search(/^b/) !== -1) return false; // Only white pieces

    return true;
}

function onDrop(source, target) {
    selectedSquare = null;
    removeHighlights();

    const move = attemptMove(source, target);
    if (move === null) {
        return 'snapback';
    }

    // Handle the move asynchronously
    handlePlayerMove(move);

    // Return undefined to let the board update naturally
    // The board will be synced in onSnapEnd
}

function onSnapEnd() {
    board.position(game.fen(), true);  // Animate
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

        // Check for badges
        checkBadges(move);

        // Auto play black's response for moves 1-2
        if (FORCED_MOVES[moveNum].black) {
            setTimeout(() => {
                makeBlackMove(FORCED_MOVES[moveNum].black);
            }, 1200);  // Smooth delay before opponent responds
        } else {
            // Move 3 complete - Ruy Lopez reached!
            showMessage('Ruy Lopez bereik! Nou kies jy jou eie skuiwe.');
            setTimeout(() => {
                makeAIBlackMove();
            }, 1800);  // Slightly longer for the message to be read
        }

        return;
    }

    // Moves 4-20: Score and get AI response
    positionHistory.push(game.fen());

    // Show loading state
    $('#move-suggestions').html('<p class="waiting-message">Analise...</p>');

    // Score the move
    const score = await scoreMove(move, positionBefore);
    currentScore += score;

    if (score === 5) perfectMoves++;

    addMoveToHistory(moveNum, move.san, score, false);
    showScorePopup(score);  // Show score popup
    updateUI();

    // Check for badges
    checkBadges(move);

    // Check for checkmate
    if (game.in_checkmate()) {
        awardBadge('checkmate');
        endGame();
        return;
    }

    // Check for game end (move 20)
    if (moveNum >= MAX_MOVES) {
        endGame();
        return;
    }

    // Get black's move after a natural delay
    setTimeout(() => {
        makeAIBlackMove();
    }, 1800);  // 1.8 seconds feels natural
}

// ============================================
// SCORING SYSTEM
// ============================================

async function scoreMove(move, positionBefore) {
    try {
        // Get both Cloud Eval and Lichess Opening Explorer data
        const [cloudEvalResult, lichessResult] = await Promise.all([
            getStockfishEval(positionBefore, 4),
            getLichessPopularity(positionBefore)
        ]);

        let engineScore = 1;
        let lichessScore = 1;
        let analysisHtml = '';

        // Score based on Lichess Cloud Eval (engine analysis)
        if (cloudEvalResult && cloudEvalResult.moves && cloudEvalResult.moves.length > 0) {
            const moveRank = cloudEvalResult.moves.findIndex(m => m.san === move.san);
            if (moveRank === 0) engineScore = 5;
            else if (moveRank === 1) engineScore = 4;
            else if (moveRank === 2) engineScore = 3;
            else if (moveRank === 3) engineScore = 2;
            else engineScore = 1;

            analysisHtml += '<p style="color:var(--spanish-red);margin-bottom:5px;"><strong>Enjin Analise:</strong></p>';
            cloudEvalResult.moves.slice(0, 3).forEach((m, i) => {
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

            const moveIndex = sortedMoves.findIndex(m => m.san === move.san);

            // Score based on popularity ranking
            if (totalGames >= 20) {
                if (moveIndex === 0) lichessScore = 5;
                else if (moveIndex <= 2) lichessScore = 4;
                else if (moveIndex <= 4) lichessScore = 3;
                else if (moveIndex <= 6) lichessScore = 2;
                else if (moveIndex >= 0) lichessScore = 1;
            } else if (moveIndex >= 0) {
                // Less data, but move is in database - give partial credit
                lichessScore = 3;
            }

            analysisHtml += '<p style="color:var(--spanish-yellow);margin-top:10px;margin-bottom:5px;"><strong>Populêr:</strong></p>';
            sortedMoves.slice(0, 3).forEach((m, i) => {
                const games = m.white + m.draws + m.black;
                const pts = i === 0 ? 5 : (i <= 2 ? 4 : 3);
                const highlight = (m.san === move.san) ? 'style="background:rgba(255,196,0,0.3);"' : '';
                analysisHtml += `<div class="suggestion-row lichess" ${highlight}>
                    <span class="suggestion-move">${m.san}</span>
                    <span class="suggestion-info">${games} spelle</span>
                </div>`;
            });
        }

        // Take the MAX of the two scores
        const finalScore = Math.max(engineScore, lichessScore);

        // Show analysis
        if (analysisHtml) {
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
        return 3; // Default middle score on error
    }
}

async function getStockfishEval(fen, multiPv = 4) {
    // Try Lichess Cloud Eval first (fast, cached positions)
    try {
        const response = await fetch(`https://lichess.org/api/cloud-eval?fen=${encodeURIComponent(fen)}&multiPv=${multiPv}`);
        if (response.ok) {
            const data = await response.json();
            if (data.pvs && data.pvs.length > 0) {
                const moves = convertPvsToMoves(data.pvs, fen);
                if (moves.length > 0) {
                    console.log('Lichess cloud eval:', moves.map(m => m.san).join(', '));
                    return { moves, source: 'cloud' };
                }
            }
        }
    } catch (e) {
        console.log('Cloud eval failed:', e.message);
    }

    // Fallback to local Stockfish.js
    if (stockfishEngine && stockfishReady) {
        try {
            console.log('Using local Stockfish.js...');
            const results = await getLocalStockfishEval(fen, 10, multiPv);
            if (results && results.length > 0) {
                const moves = convertPvsToMoves(results, fen);
                if (moves.length > 0) {
                    console.log('Local Stockfish:', moves.map(m => m.san).join(', '));
                    return { moves, source: 'local' };
                }
            }
        } catch (e) {
            console.error('Local Stockfish error:', e);
        }
    }

    return null;
}

// Convert PV data (with UCI moves) to moves array with SAN
function convertPvsToMoves(pvs, fen) {
    const moves = [];

    for (const pv of pvs) {
        const uciMove = pv.moves ? pv.moves.split(' ')[0] : null;
        if (uciMove && uciMove.length >= 4) {
            const from = uciMove.substring(0, 2);
            const to = uciMove.substring(2, 4);
            const promotion = uciMove.length > 4 ? uciMove[4] : undefined;

            // Convert UCI to SAN
            const tempGame = new Chess(fen);
            const move = tempGame.move({ from, to, promotion });
            if (move) {
                moves.push({
                    move: uciMove,
                    san: move.san,
                    cp: pv.cp
                });
            }
        }
    }

    return moves;
}

async function getLichessPopularity(fen) {
    try {
        const response = await fetch(
            `https://explorer.lichess.ovh/lichess?variant=standard&speeds=blitz,rapid,classical&ratings=1600,2000,2500&fen=${encodeURIComponent(fen)}`
        );
        if (response.ok) {
            return await response.json();
        }
    } catch (e) {
        console.log('Lichess explorer failed:', e);
    }
    return null;
}

async function updatePositionEval() {
    try {
        const response = await fetch(`https://lichess.org/api/cloud-eval?fen=${encodeURIComponent(game.fen())}`);
        if (response.ok) {
            const data = await response.json();
            if (data.pvs && data.pvs[0]) {
                const cp = data.pvs[0].cp;
                if (cp !== undefined) {
                    const evalValue = (cp / 100).toFixed(1);
                    const display = cp >= 0 ? `+${evalValue}` : evalValue;
                    $('#position-eval').text(display);
                    $('#position-eval').removeClass('positive negative');
                    $('#position-eval').addClass(cp >= 0 ? 'positive' : 'negative');
                }
            }
        }
    } catch (e) {
        console.log('Eval update failed');
    }
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
    }
}

async function makeAIBlackMove() {
    if (!isGameActive || game.game_over()) return;

    const fen = game.fen();

    // Try Lichess explorer first
    try {
        const lichessData = await getLichessPopularity(fen);

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
                        checkGameEnd();
                        return;
                    }
                }
            }
        }
    } catch (e) {
        console.log('Lichess explorer failed for black move:', e);
    }

    // Fall back to Stockfish
    const stockfishResult = await getStockfishEval(fen, 1);
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
            checkGameEnd();
        }
    }
}

function checkGameEnd() {
    if (game.game_over() || currentMoveNumber >= MAX_MOVES) {
        if (game.in_checkmate() && game.turn() === 'b') {
            awardBadge('checkmate');
        }
        endGame();
    }
}


// ============================================
// BADGE SYSTEM
// ============================================

function checkBadges(move, isBlackMove = false) {
    const san = move.san;
    const history = game.history();
    const moveNum = Math.ceil(history.length / 2);
    const fen = game.fen();

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

        // Exchange Variation (White plays Bxc6)
        if (san === 'Bxc6') {
            awardBadge('exchange');
        }

        // Worrall Attack (6.Qe2)
        if (moveNum === 6 && san === 'Qe2') {
            awardBadge('worrall');
        }

        // Center Control (pawns on e4 AND d4)
        const e4Piece = game.get('e4');
        const d4Piece = game.get('d4');
        if (e4Piece && e4Piece.type === 'p' && e4Piece.color === 'w' &&
            d4Piece && d4Piece.type === 'p' && d4Piece.color === 'w') {
            awardBadge('center_control');
        }

        // Cinderella Bishop (light bishop to a5 or a6 with tempo)
        if ((san === 'Ba5' || san === 'Ba6') && move.piece === 'b') {
            awardBadge('cinderella');
        }
    }

    // Opening Variation badges (Black's moves)
    if (isBlackMove) {
        // Move 3 variations
        if (moveNum === 3 || history.length === 5) {
            if (san === 'a6') awardBadge('morphy');
            if (san === 'Nf6') awardBadge('berlin');
            if (san === 'Nd4') awardBadge('bird');
            if (san === 'd6') awardBadge('steinitz');
            if (san === 'f5') awardBadge('schliemann');
            if (san === 'Nge7') awardBadge('cozio');
            if (san === 'Bc5') awardBadge('classical');
        }

        // Open Game (Black plays ...Nxe4)
        if (san === 'Nxe4') {
            awardBadge('open');
        }

        // Closed Game (Black plays ...Be7)
        if (san === 'Be7') {
            awardBadge('closed');
        }

        // Move 6 Averbakh (6...d6)
        if (moveNum === 6 && san === 'd6') {
            awardBadge('averbakh');
        }

        // Move 9 variations
        if (moveNum === 9) {
            if (san === 'Nb8') awardBadge('breyer');
            if (san === 'Bb7') awardBadge('zaitsev');
            if (san === 'Na5') awardBadge('chigorin');
            if (san === 'h6') awardBadge('smyslov');
            if (san === 'Be6') awardBadge('kholmov');
            if (san === 'Nd7' || san === 'a5') awardBadge('keres');
        }

        // Marshall Attack detection (simplified - after 8...d5)
        if (san === 'd5' && moveNum >= 8) {
            // Check for Marshall structure
            const histStr = history.join(' ');
            if (histStr.includes('O-O') && histStr.includes('c3')) {
                awardBadge('marshall');
            }
        }

        // Archangel Variation (4...Nf6 5.O-O b5 6.Bb3 Bb7 pattern)
        const histStr = history.join(' ');
        if (histStr.includes('b5') && histStr.includes('Bb7') && histStr.includes('Nf6')) {
            awardBadge('archangel');
        }
    }

    // Noah's Ark Survivor - check if White's b5 bishop is still alive after potential trap
    if (!isBlackMove && moveNum >= 8) {
        // If we still have our light-squared bishop and have seen the a6-b5 structure
        const bishops = [];
        const pos = game.board();
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = pos[r][c];
                if (piece && piece.type === 'b' && piece.color === 'w') {
                    bishops.push({ r, c });
                }
            }
        }
        // If white still has 2 bishops, might have escaped Noah's ark
        if (bishops.length === 2) {
            const hist = game.history();
            const histStr = hist.join(' ');
            if (histStr.includes('a6') && histStr.includes('b5') && histStr.includes('Bb3')) {
                awardBadge('noahs_ark');
            }
        }
    }

    // Gajewski Gambit detection
    if (!isBlackMove) {
        const histStr = history.join(' ');
        if (histStr.includes('d5') && histStr.includes('exd5') && histStr.includes('Bg4')) {
            // Simplified Gajewski detection
            awardBadge('gajewski');
        }
    }
}

function awardBadge(badgeKey) {
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

    // Check for high score
    if (currentScore > highScore) {
        highScore = currentScore;
        $('#high-score').text(highScore);
        $('#high-score').addClass('high-score-pulse');
        setTimeout(() => $('#high-score').removeClass('high-score-pulse'), 500);
        savePlayerData();
    }

    // Enable hint button after forced moves
    $('#hint-btn').prop('disabled', currentMoveNumber < 3 || !isGameActive);
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

    moveHistory.push({ moveNum, whiteSan: san, blackSan: null, score, isForced });
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

function showScorePopup(score, isForced = false) {
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

    const forcedMessage = "Ruy Lopez! (+5)";

    // Set text and class
    if (isForced) {
        textEl.text(forcedMessage);
        popup.removeClass('score-1 score-2 score-3 score-4 score-5').addClass('score-forced');
    } else {
        textEl.text(scoreMessages[score] || `+${score}`);
        popup.removeClass('score-1 score-2 score-3 score-4 score-5 score-forced').addClass(`score-${score}`);
    }

    // Show popup
    popup.removeClass('hidden');

    // Hide after 1.5 seconds
    setTimeout(() => {
        popup.addClass('hidden');
    }, 1500);
}

function showEducationalMessage() {
    const message = EDUCATIONAL_MESSAGES[Math.floor(Math.random() * EDUCATIONAL_MESSAGES.length)];
    $('#educational-message p').text(message);
}

// ============================================
// HINTS
// ============================================

async function showHint() {
    if (!isGameActive || currentMoveNumber < 3) return;

    $('#hint-btn').prop('disabled', true);
    showMessage('Soek wenke...');

    const fen = game.fen();

    try {
        // Get both data sources
        const [engineResult, lichessResult] = await Promise.all([
            getStockfishEval(fen, 2),
            getLichessPopularity(fen)
        ]);

        let engineBestMove = null;
        let popularBestMove = null;
        let engineInfo = '';
        let popularInfo = '';

        // Get engine best move
        if (engineResult && engineResult.moves && engineResult.moves.length > 0) {
            engineBestMove = engineResult.moves[0].san;
            engineInfo = `Enjin: ${engineBestMove}`;
        }

        // Get most popular move
        if (lichessResult && lichessResult.moves && lichessResult.moves.length > 0) {
            const sortedMoves = [...lichessResult.moves].sort((a, b) =>
                (b.white + b.draws + b.black) - (a.white + a.draws + a.black)
            );
            if (sortedMoves.length > 0) {
                popularBestMove = sortedMoves[0].san;
                const games = sortedMoves[0].white + sortedMoves[0].draws + sortedMoves[0].black;
                popularInfo = `Populêr: ${popularBestMove} (${games} spelle)`;
            }
        }

        // Show prominent hint message
        if (engineBestMove && popularBestMove) {
            if (engineBestMove === popularBestMove) {
                showHintMessage(`Beste skuif: ${engineBestMove}`, 'both');
            } else {
                showHintMessage(`${engineInfo} | ${popularInfo}`, 'different');
            }
        } else if (engineBestMove) {
            showHintMessage(engineInfo, 'engine');
        } else if (popularBestMove) {
            showHintMessage(popularInfo, 'popular');
        } else {
            showMessage('Geen wenke beskikbaar nie');
        }

        // Highlight the best moves on the board
        highlightBestMoves(engineBestMove, popularBestMove);

        // Remove highlights after 3 seconds
        setTimeout(() => {
            removeBestMoveHighlights();
            hideHintMessage();
            $('#hint-btn').prop('disabled', false);
        }, 3000);

    } catch (e) {
        console.error('Hint error:', e);
        showMessage('Kon nie wenke kry nie');
        $('#hint-btn').prop('disabled', false);
    }
}

function showHintMessage(text, type) {
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

    $('#move-suggestions').html(`
        <div class="hint-prominent" style="
            background: ${bgColor};
            color: ${textColor};
            padding: 15px;
            border-radius: 10px;
            text-align: center;
            font-size: 1.2rem;
            font-weight: bold;
            margin: 10px 0;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        ">
            ${text}
        </div>
        <p style="text-align: center; font-size: 0.8rem; color: #95a5a6; margin-top: 5px;">
            🟢 Groen = Enjin | 🔵 Blou = Populêr | 🟣 Pers = Albei
        </p>
    `);
}

function hideHintMessage() {
    $('#move-suggestions').html('<p class="waiting-message">Maak jou skuif...</p>');
}

// ============================================
// GAME END & REVIEW
// ============================================

function endGame() {
    isGameActive = false;

    // Check for perfect game badge
    if (currentScore >= TARGET_SCORE) {
        awardBadge('perfect_game');
    }

    // Check for 7 perfect moves badge
    if (perfectMoves >= 7) {
        awardBadge('seven_perfect');
    }

    // Carbón badge for low score (less than 50%)
    if (currentScore < 50) {
        awardBadge('carbon');
    }

    // Track games played for chorizo badge
    incrementGamesPlayed();

    savePlayerData();
    showGameOverModal();
}

function showGameOverModal() {
    $('#final-score').text(currentScore);

    // High score message
    if (currentScore >= highScore && currentScore > 0) {
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
    reviewPosition = 0;

    $('#analysis-panel').addClass('hidden');
    $('#review-panel').removeClass('hidden');

    goToPosition(0);
}

function goToPosition(index) {
    if (index < 0) index = 0;
    if (index >= positionHistory.length) index = positionHistory.length - 1;

    reviewPosition = index;
    board.position(positionHistory[index]);
    $('#review-position').text(`${index}/${positionHistory.length - 1}`);
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
