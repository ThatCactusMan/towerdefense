var enemies = [];
var projectiles = [];
var systems = [];
var towers = [];
var newEnemies = [];
var newProjectiles = [];
var newTowers = [];

var cols;
var rows;
var tileZoom = 2;
var ts = 24; // tile size
var zoomDefault = ts;

var particleAmt = 32; // number of particles to draw per explosion

var tempSpawnCount = 40;

var custom; // custom map JSON
var display; // graphical display tiles
var displayDir; // direction display tiles are facing
// (0 = none, 1 = left, 2 = up, 3 = right, 4 = down)
var dists; // distance to exit
var grid; // tile type
// (0 = empty, 1 = wall, 2 = path, 3 = tower,
//  4 = enemy-only pathing)
var metadata; // tile metadata
var paths; // direction to reach exit
var visitMap; // whether exit can be reached
var walkMap; // walkability map

var exit;
var spawnpoints = [];
var tempSpawns = [];

var cash;
var health;
var maxHealth;
var wave;
var difficulty = "standard";
var mapdiff = 1;

var spawnCool; // number of ticks between spawning enemies

var bg; // background color
var border; // color to draw on tile borders
var borderAlpha; // alpha of tile borders

var selected;
var towerType;

var sounds; // dict of all sounds
var boomSound; // explosion sound effect

// TODO add more functionality to god mode
var godMode = false; // make player immortal for test purposes
var healthBar = true; // display enemy health bar
var muteSounds = false; // whether to mute sounds
var paused; // whether to update or not
var randomWaves = true; // whether to do random or custom waves
var scd; // number of ticks until next spawn cycle
var showEffects = true; // whether or not to display particle effects
var showFPS = false; // whether or not to display FPS
var skipToNext = false; // whether or not to immediately start next wave
var stopFiring = false; // whether or not to pause towers firing
var toCooldown; // flag to reset spawning cooldown
var toPathfind; // flag to update enemy pathfinding
var toPlace; // flag to place a tower
var toWait; // flag to wait before next wave
var wcd; // number of ticks until next wave

var avgFPS = 0; // current average of all FPS values
var numFPS = 0; // number of FPS values calculated so far

var minDist = 15; // minimum distance between spawnpoint and exit
var resistance = 0.7; // percentage of damage blocked by resistance
var sellConst = 0.8; // ratio of tower cost to sell price
var wallCover = 0.1; // percentage of map covered by walls
var waveCool = 120; // number of ticks between waves
var weakness = 0.5; // damage increase from weakness

// Misc functions

// Spawn a group of enemies, alternating if multiple types
function addGroup(group) {
  var count = group.pop();
  for (var i = 0; i < count; i++) {
    for (var j = 0; j < group.length; j++) {
      newEnemies.push(group[j]);
    }
  }
}

// Prepare a wave
function addWave(pattern) {
  spawnCool = pattern.shift();
  for (var i = 0; i < pattern.length; i++) {
    addGroup(pattern[i]);
  }
}

// Buy and place a tower if player has enough money
function buy(t) {
  if (godMode || cash >= t.cost) {
    if (!godMode) {
      cash -= t.cost;
      toPlace = false;
    }
    selected = t;
    if (grid[t.gridPos.x][t.gridPos.y] === 0) toPathfind = true;
    updateInfo(t);
    newTowers.push(t);
  }
}

// Calculate and display current and average FPS
function calcFPS() {
  var fps = frameRate();
  avgFPS += (fps - avgFPS) / ++numFPS;

  // Draw black rect under text
  noStroke();
  fill(0);
  rect(0, height - 40, 70, 40);

  // Update FPS meter
  fill(255);
  var fpsText = "FPS: " + fps.toFixed(2) + "\nAvg: " + avgFPS.toFixed(2);
  text(fpsText, 5, height - 25);
}

// Check if all conditions for placing a tower are true
function canPlace(col, row) {
  if (!toPlace) return false;
  var g = grid[col][row];
  if (g === 3) return true;
  if (g === 1 || g === 2 || g === 4) return false;
  if (!empty(col, row) || !placeable(col, row)) return false;
  return true;
}

// Check if spawn cooldown is done and enemies are available to spawn
function canSpawn() {
  return newEnemies.length > 0 && scd === 0;
}

// Clear tower information
function clearInfo() {
  document.getElementById("info-div").style.display = "none";
}

// TODO implement
function customWave() {}

// Check if all conditions for showing a range are true
function doRange() {
  return mouseInMap() && toPlace && typeof towerType !== "undefined";
}

// Check if tile is empty
function empty(col, row) {
  // Check if not walkable
  if (!walkable(col, row)) return false;

  // Check if spawnpoint
  for (var i = 0; i < spawnpoints.length; i++) {
    var s = spawnpoints[i];
    if (s.x === col && s.y === row) return false;
  }

  // Check if exit
  if (typeof exit !== "undefined") {
    if (exit.x === col && exit.y === row) return false;
  }

  return true;
}

// Return map string
function exportMap() {
  // Convert spawnpoints into a JSON-friendly format
  var spawns = [];
  for (var i = 0; i < spawnpoints.length; i++) {
    var s = spawnpoints[i];
    spawns.push([s.x, s.y]);
  }
  return LZString.compressToBase64(
    JSON.stringify({
      // Grids
      display: display,
      displayDir: displayDir,
      grid: grid,
      metadata: metadata,
      paths: paths,
      // Important tiles
      exit: [exit.x, exit.y],
      spawnpoints: spawns,
      // Colors
      bg: bg,
      border: border,
      borderAlpha,
      borderAlpha,
      // Misc
      cols: cols,
      rows: rows
    })
  );
}

// Get an empty tile
function getEmpty() {
  while (true) {
    var t = randomTile();
    if (empty(t.x, t.y)) return t;
  }
}

// Find tower at specific tile, otherwise return null
function getTower(col, row) {
  for (var i = 0; i < towers.length; i++) {
    var t = towers[i];
    if (t.gridPos.x === col && t.gridPos.y === row) return t;
  }
  return null;
}

// Return map of visitability
function getVisitMap(walkMap) {
  var frontier = [];
  var target = vts(exit);
  frontier.push(target);
  var visited = {};
  visited[target] = true;

  // Fill visited for every tile
  while (frontier.length !== 0) {
    var current = frontier.shift();
    var t = stv(current);
    var adj = neighbors(walkMap, t.x, t.y, true);

    for (var i = 0; i < adj.length; i++) {
      var next = adj[i];
      if (!(next in visited)) {
        frontier.push(next);
        visited[next] = true;
      }
    }
  }

  return visited;
}

// Return walkability map
function getWalkMap() {
  var walkMap = [];
  for (var x = 0; x < cols; x++) {
    walkMap[x] = [];
    for (var y = 0; y < rows; y++) {
      walkMap[x][y] = walkable(x, y);
    }
  }
  return walkMap;
}

// Load a map from a map string
function importMap(str) {
  try {
    custom = JSON.parse(LZString.decompressFromBase64(str));
    document.getElementById("custom").selected = true;
    resetGame();
  } catch (err) {}
}

// Check if wave is at least min and less than max
function isWave(min, max) {
  if (typeof max === "undefined") return wave >= min;
  return wave >= min && wave < max;
}

// Load map from template
// Always have an exit and spawnpoints if you do not have a premade grid
// TODO health and money by map
function loadMap() {
  var name = document.getElementById("map").value;
  if (name === "ring") {
    mapdiff = 1;
  } else if (name === "easy") {
    mapdiff = 1;
  } else if (name === "sea") {
    mapdiff = 1;
  } else if (name === "divide") {
    mapdiff = 2;
  } else if (name === "uturn") {
    mapdiff = 3;
  } else if (name === "fourspawn") {
    mapdiff = 4;
  } else if (name === "park") {
    mapdiff = 4;
  }

  health = 40;
  cash = 55;

  if (name === "custom" && custom) {
    // Grids
    display = copyArray(custom.display);
    displayDir = copyArray(custom.displayDir);
    grid = copyArray(custom.grid);
    metadata = copyArray(custom.metadata);
    paths = copyArray(custom.paths);
    // Important tiles
    exit = createVector(custom.exit[0], custom.exit[1]);
    spawnpoints = [];
    for (var i = 0; i < custom.spawnpoints.length; i++) {
      var s = custom.spawnpoints[i];
      spawnpoints.push(createVector(s[0], s[1]));
    }
    // Colors
    bg = custom.bg;
    border = custom.border;
    borderAlpha = custom.borderAlpha;
    // Misc
    cols = custom.cols;
    rows = custom.rows;

    resizeFit();
  } else if (name in maps) {
    var m = maps[name];

    // Grids
    display = copyArray(m.display);
    displayDir = copyArray(m.displayDir);
    grid = copyArray(m.grid);
    metadata = copyArray(m.metadata);
    paths = copyArray(m.paths);
    // Important tiles
    exit = createVector(m.exit[0], m.exit[1]);
    spawnpoints = [];
    for (var i = 0; i < m.spawnpoints.length; i++) {
      var s = m.spawnpoints[i];
      spawnpoints.push(createVector(s[0], s[1]));
    }
    // Colors
    bg = m.bg;
    border = m.border;
    borderAlpha = m.borderAlpha;
    // Misc
    cols = m.cols;
    rows = m.rows;

    resizeFit();
  } else {
    resizeMax();
    var numSpawns;
    wallCover = 0.1;
    if (name[name.length - 1] === "3") {
      cash = 65;
      numSpawns = 3;
    } else {
      numSpawns = 2;
    }
    if (name === "empty2" || name === "empty3") {
      wallCover = 0;
    }
    if (name === "sparse2" || name === "sparse3") {
      wallCover = 0.1;
    }
    if (name === "dense2" || name === "dense3") {
      wallCover = 0.2;
    }
    if (name === "solid2" || name === "solid3") {
      wallCover = 0.3;
    }
    randomMap(numSpawns);
    display = replaceArray(
      grid,
      [0, 1, 2, 3, 4],
      ["empty", "wall", "empty", "tower", "empty"]
    );
    displayDir = buildArray(cols, rows, 0);
    // Colors
    bg = [0, 0, 0];
    border = 255;
    borderAlpha = 31;
    // Misc
    metadata = buildArray(cols, rows, null);
  }

  tempSpawns = [];

  recalculate();
}

// Load all sounds

// Increment wave counter and prepare wave
function nextWave() {
  infoScreenUpdate();
  addWave(randomWaves ? randomWave() : customWave());
  wave++;
}

// Check if no more enemies
function noMoreEnemies() {
  return enemies.length === 0 && newEnemies.length === 0;
}

function infoScreenUpdate() {
  if (difficulty == "standard") {
    if (wave == 2) {
      document.getElementById("infotext").innerHTML =
        "A new enemy called a strong is coming in this next round, and it has more health then a weak. Really nothing else to it.";
      document.getElementById("infopopup").style.display = "block";
      pause();
    } else if (wave == 5) {
      document.getElementById("infotext").innerHTML =
        "In this next round, you'll meet your first fast enemy. It has the health of a strong, but with double the speed.";
      document.getElementById("infopopup").style.display = "block";
      pause();
    } else if (wave == 8) {
      document.getElementById("infotext").innerHTML =
        "Now you'll see your first strong and fast enemy. It's, well, stronger and faster than a normal enemy.";
      document.getElementById("infopopup").style.display = "block";
      pause();
    } else if (wave == 11) {
      document.getElementById("infotext").innerHTML =
        "The next new enemy is the medic, it's tanky and heals enemies around it. Good luck.";
      document.getElementById("infopopup").style.display = "block";
      pause();
    } else if (wave == 15) {
      document.getElementById("infotext").innerHTML =
        "Now we have the stronger, it has a ton of health and is probably one of the worse enemies in the roster.";
      document.getElementById("infopopup").style.display = "block";
      pause();
    } else if (wave == 19) {
      document.getElementById("infotext").innerHTML =
        "There's a stronger, so there must be a faster, right? Fasters have more health than a fast and strong enemy, and it's resistant to explosion damage. Have fun.";
      document.getElementById("infopopup").style.display = "block";
      pause();
    } else if (wave == 23) {
      document.getElementById("infotext").innerHTML =
        "You know how I used 'tanky' as a word for high health? Well yeah, this is them. The tank is totally immune to poison and slow, it's resistant to physical and energy attacks, and it's weak to explosion and peircing attacks. Oh, and it also has really high health.";
      document.getElementById("infopopup").style.display = "block";
      pause();
    } else if (wave == 28) {
      document.getElementById("infotext").innerHTML =
        "Up next is the taunter. Taunters draw the attention of your towers and make them focus on them instead of anything else, and it has even more health than a tank. It's also immune to poison and getting slowed, and it's resistant to physical and energy attacks.";
      document.getElementById("infopopup").style.display = "block";
      pause();
    } else if (wave == 35) {
      document.getElementById("infotext").innerHTML =
        "Next round has the first spawner enemy. Spawners have pretty high health, and when it dies it leaves behind a temporary spawn point where enemies will spawn out of.";
      document.getElementById("infopopup").style.display = "block";
      pause();
    } else if (wave == 38) {
      document.getElementById("infotext").innerHTML =
        "Welcome to the penultimate round. Good luck, you're going to need it.";
      document.getElementById("infopopup").style.display = "block";
      pause();
    } else if (wave == 39) {
      document.getElementById("infotext").innerHTML =
        "Here we go, the final round. Get ready for the boss enemy, with 100,000 total health. Good luck!";
      document.getElementById("infopopup").style.display = "block";
      pause();
    }
  }
  if (difficulty == "expert") {
    if (wave == 1) {
      document.getElementById("infotext").innerHTML =
        "I don't think you know what you're getting yourself into.";
      document.getElementById("infopopup").style.display = "block";
      pause();
    } else if (wave == 3) {
      document.getElementById("infotext").innerHTML =
        "Suprise, your first fast enemy! I hope you don't need me telling you when new enemies come in, because this is the last time I'm warning you about standard enemies.";
      document.getElementById("infopopup").style.display = "block";
      pause();
    } else if (wave == 20) {
      document.getElementById("infotext").innerHTML =
        "I really hope you have a solid defense right around this point.";
      document.getElementById("infopopup").style.display = "block";
      pause();
    } else if (wave == 20) {
      document.getElementById("infotext").innerHTML =
        "I really hope you have a solid defense right around this point.";
      document.getElementById("infopopup").style.display = "block";
      pause();
    } else if (wave == 25) {
      document.getElementById("infotext").innerHTML =
        "Suprise. I hope you're ready.";
      document.getElementById("infopopup").style.display = "block";
      pause();
    } else if (wave == 29) {
      document.getElementById("infotext").innerHTML =
        "There's a new enemy coming up this round. You may be thinking that you've seen all of them. Nope, because here's the strongest.";
      document.getElementById("infopopup").style.display = "block";
      pause();
    } else if (wave == 34) {
      document.getElementById("infotext").innerHTML =
        "Another new enemy coming up. Do you like the tank? Good. I call these mega tanks. Over 3 times the health of a normal tank.";
      document.getElementById("infopopup").style.display = "block";
      pause();
    } else if (wave == 39) {
      document.getElementById("infotext").innerHTML =
        "It's time for the final enemy in the roster. No matter how good you are at a game, there's always that enemy. In Doom, it's the Archvile. Ultrakill has the Mindflayer. This game? This game has the fastest.";
      document.getElementById("infopopup").style.display = "block";
      pause();
    } else if (wave == 42) {
      document.getElementById("infotext").innerHTML =
        "Here it is. The second hardest round in the game. Good luck, because this round has 180 total spawners, which is more spawners in one round than the entirety of the standard rounds.";
      document.getElementById("infopopup").style.display = "block";
      pause();
    } else if (wave == 43) {
      document.getElementById("infotext").innerHTML =
        "After that, you might be wondering what the hardest round in the game is like. Well here's your answer. The Mega Boss. No one gets out alive.";
      document.getElementById("infopopup").style.display = "block";
      pause();
    }
  }
}

function outsideMap(e) {
  return outsideRect(e.pos.x, e.pos.y, 0, 0, width, height);
}

// Toggle pause state
function pause() {
  paused = !paused;
}

// Return false if blocking a tile would invalidate paths to exit
function placeable(col, row) {
  var walkMap = getWalkMap();
  walkMap[col][row] = false;
  var visitMap = getVisitMap(walkMap);

  // Check spawnpoints
  for (var i = 0; i < spawnpoints.length; i++) {
    if (!visitMap[vts(spawnpoints[i])]) return false;
  }

  // Check each enemy
  for (var i = 0; i < enemies.length; i++) {
    var e = enemies[i];
    var p = gridPos(e.pos.x, e.pos.y);
    if (p.equals(col, row)) continue;
    if (!visitMap[vts(p)]) return false;
  }

  return true;
}

// Generate random map
function randomMap(numSpawns) {
  // Generate empty tiles and walls
  grid = [];
  for (var x = 0; x < cols; x++) {
    grid[x] = [];
    for (var y = 0; y < rows; y++) {
      grid[x][y] = random() < wallCover ? 1 : 0;
    }
  }
  walkMap = getWalkMap();

  // Generate exit and remove walls that are adjacent
  exit = getEmpty();
  var adj = neighbors(walkMap, exit.x, exit.y, false);
  for (var i = 0; i < adj.length; i++) {
    var n = stv(adj[i]);
    grid[n.x][n.y] = 0;
  }

  // Generate enemy spawnpoints and ensure exit is possible
  spawnpoints = [];
  visitMap = getVisitMap(walkMap);
  for (var i = 0; i < numSpawns; i++) {
    var s;
    // Try to place spawnpoint
    for (var j = 0; j < 100; j++) {
      s = getEmpty();
      while (!visitMap[vts(s)]) s = getEmpty();
      if (s.dist(exit) >= minDist) break;
    }
    spawnpoints.push(s);
  }
}

// Random grid coordinate
function randomTile() {
  return createVector(randint(cols), randint(rows));
}

// Generate a random wave
function randomWave() {
  var waves = [];
  if (difficulty == "standard") {
    if (wave == 0) {
      waves.push([40, ["weak", 40]]); //40 weak, 25
    }
    if (wave == 1) {
      waves.push([20, ["weak", 15]]);
    }
    if (wave == 2) {
      waves.push([40, ["weak", 30], ["strong", 10]]);
    }
    if (wave == 3) {
      waves.push([30, ["weak", "strong", 25]]);
    }
    if (wave == 4) {
      waves.push([20, ["strong", 15]]);
    }
    if (wave == 5) {
      waves.push([40, ["fast", 20]]);
    }
    if (wave == 6) {
      waves.push([20, ["strong", 25], ["fast", 20]]);
    }
    if (wave == 7) {
      waves.push([30, ["strong", "strong", "fast", 25]]);
    }
    if (wave == 8) {
      waves.push([20, ["strongFast", 30]]);
    }
    if (wave == 9) {
      waves.push([5, ["strong", 40]]);
    }
    if (wave == 10) {
      waves.push([
        15,
        ["weak", 20],
        ["strong", 20],
        ["fast", 20],
        ["strongFast", 30]
      ]);
    }
    if (wave == 11) {
      waves.push([30, ["strong", "medic", "strong", 10]]);
    }
    if (wave == 12) {
      waves.push([5, ["strong", 25]]);
    }
    if (wave == 13) {
      waves.push([
        15,
        ["strongFast", 20],
        ["strong", "medic", 10],
        ["fast", 35]
      ]);
    }
    if (wave == 14) {
      waves.push([2, ["weak", 75], ["strongFast", 10]]);
    }
    if (wave == 15) {
      waves.push([35, ["strong", "strong", "stronger", 15]]);
    }
    if (wave == 16) {
      waves.push([5, ["strongFast", "fast", 25]]);
    }
    if (wave == 17) {
      waves.push([
        25,
        ["strongFast", "stronger", 5],
        ["strong", "medic", "strong", 10],
        ["stronger", "medic", 5]
      ]);
    }
    if (wave == 18) {
      waves.push([
        5,
        ["strongFast", 20],
        ["stronger", 10],
        ["strongFast", 20],
        ["stronger", 10]
      ]);
    }
    if (wave == 19) {
      waves.push([30, ["fast", 10], ["strongFast", 10], ["faster", 10]]);
    }
    if (wave == 20) {
      waves.push([2, ["stronger", 20], ["faster", 10]]);
    }
    if (wave == 21) {
      waves.push([
        20,
        ["faster", 10],
        ["stronger", "medic", 25],
        ["faster", 15]
      ]);
    }
    if (wave == 22) {
      waves.push([30, ["faster", "medic", "stronger", "strongFast", 25]]);
    }
    if (wave == 23) {
      waves.push([50, ["strong", 15], ["tank", 25]]);
    }
    if (wave == 24) {
      waves.push([
        20,
        [
          "stronger",
          "faster",
          "stronger",
          "faster",
          "tank",
          "stronger",
          "faster",
          "stronger",
          "faster",
          5
        ],
        ["tank", 20]
      ]);
    }
    if (wave == 25) {
      waves.push([10, ["tank", 20], ["faster", 40]]);
    }
    if (wave == 26) {
      waves.push([
        25,
        ["stronger", "tank", 20],
        ["fast", "strongFast", "faster", 10]
      ]);
    }
    if (wave == 27) {
      waves.push([5, ["stronger", 35], ["tank", 10]]);
    }
    if (wave == 28) {
      waves.push([10, ["taunt", 2], ["faster", 15]]);
    }
    if (wave == 29) {
      waves.push([10, ["tank", "medic", 20], ["faster", "taunt", 5]]);
    }
    if (wave == 30) {
      waves.push([
        15,
        ["weak", 20],
        ["strong", 20],
        ["fast", 20],
        ["strongFast", 20],
        ["medic", 20],
        ["stronger", 20],
        ["faster", 25],
        ["tank", 30],
        ["taunt", 15]
      ]);
    }
    if (wave == 31) {
      waves.push([5, ["taunt", 5], ["faster", 50]]);
    }
    if (wave == 32) {
      waves.push([30, ["medic", "taunt", "medic", 10]]);
    }
    if (wave == 33) {
      waves.push([1, ["taunt", 7], ["strongFast", 100]]);
    }
    if (wave == 34) {
      waves.push([5, ["taunt", "stronger", 20]]);
    }
    if (wave == 35) {
      waves.push([40, ["spawner", 5], ["faster", 15]]);
    }
    if (wave == 36) {
      waves.push([20, ["spawner", "tank", 5], ["faster", 25]]);
    }
    if (wave == 37) {
      waves.push([30, ["spawner", 5], ["taunt", "faster", 30]]);
    }
    if (wave == 38) {
      waves.push([
        5,
        ["spawner", 5],
        ["weak", 25],
        ["spawner", 5],
        ["strong", 25],
        ["spawner", 5],
        ["fast", 25],
        ["spawner", 5],
        ["strongFast", 25],
        ["spawner", 5],
        ["medic", 25],
        ["spawner", 5],
        ["stronger", 25],
        ["spawner", 5],
        ["faster", 25],
        ["spawner", 10],
        ["tank", 50],
        ["taunt", 50]
      ]);
    }
    if (wave == 39) {
      waves.push([10, ["boss", 1]]);
    }
  }

  if (difficulty == "expert") {
    if (wave == 0) {
      waves.push([20, ["weak", 25]]); //weak, 25
    }
    if (wave == 1) {
      waves.push([25, ["weak", "strong", 15]]);
    }
    if (wave == 2) {
      waves.push([20, ["weak", "strong", 20], ["strong", 10]]);
    }
    if (wave == 3) {
      waves.push([10, ["weak", "strong", 10], ["fast", 10]]);
    }
    if (wave == 4) {
      waves.push([5, ["strong", 40]]);
    }
    if (wave == 5) {
      waves.push([15, ["fast", "strong", 20]]);
    }
    if (wave == 6) {
      waves.push([10, ["strong", 35], ["fast", 40]]);
    }
    if (wave == 7) {
      waves.push([10, ["fast", "strong", 25], ["strongFast", 35]]);
    }
    if (wave == 8) {
      waves.push([5, ["strong", 25], ["strongFast", 20], ["strong", 25]]);
    }
    if (wave == 9) {
      waves.push([5, ["strongFast", 40], ["medic", 15]]);
    }
    if (wave == 10) {
      waves.push([
        10,
        ["medic", 25],
        ["strong", 20],
        ["fast", 25],
        ["strongFast", 35]
      ]);
    }
    if (wave == 11) {
      waves.push([5, ["medic", 10], ["medic", "strongFast", 50]]);
    }
    if (wave == 12) {
      waves.push([1, ["medic", 40]]);
    }
    if (wave == 13) {
      waves.push([
        10,
        ["strongFast", 20],
        ["medic", "stronger", 20],
        ["stronger", 15]
      ]);
    }
    if (wave == 14) {
      waves.push([2, ["stronger", "strongFast", 50]]);
    }
    if (wave == 15) {
      waves.push([10, ["stronger", 35], ["strongFast", 40]]);
    }
    if (wave == 16) {
      waves.push([
        5,
        ["strongFast", "stronger", "medic", 25],
        ["stronger", 30]
      ]);
    }
    if (wave == 17) {
      waves.push([
        5,
        ["strongFast", "stronger", 5],
        ["spawner", 5],
        ["stronger", "medic", 30]
      ]);
    }
    if (wave == 18) {
      waves.push([2, ["stronger", 40], ["faster", 20]]);
    }
    if (wave == 19) {
      waves.push([10, ["faster", 20], ["spawner", 5], ["stronger", 50]]);
    }
    if (wave == 20) {
      waves.push([1, ["stronger", "faster", 30], ["faster", 15]]);
    }
    if (wave == 21) {
      waves.push([
        2,
        ["stronger", 15],
        ["faster", 5],
        ["stronger", 15],
        ["spawner", 15],
        ["faster", 20],
        ["stronger", 40]
      ]);
    }
    if (wave == 22) {
      waves.push([
        15,
        ["stronger", 15],
        ["tank", 25],
        ["spawner", 5],
        ["tank", 10]
      ]);
    }
    if (wave == 23) {
      waves.push([5, ["tank", 35], ["faster", 20]]);
    }
    if (wave == 24) {
      waves.push([
        2,
        [
          "tank",
          "tank",
          "tank",
          "spawner",
          "spawner",
          "faster",
          "faster",
          "tank",
          "tank",
          7
        ],
        ["tank", 20]
      ]);
    }
    if (wave == 25) {
      waves.push([10, ["tank", 15], ["faster", 10], ["boss", 1]]);
    }
    if (wave == 26) {
      waves.push([5, ["taunt", 30], ["spawner", 15], ["faster", 30]]);
    }
    if (wave == 27) {
      waves.push([10, ["taunt", "tank", 25], ["faster", 35]]);
    }
    if (wave == 28) {
      waves.push([
        10,
        ["spawner", 15],
        ["faster", 15],
        ["spawner", 15],
        ["faster", 15],
        ["spawner", 15],
        ["faster", 25]
      ]);
    }
    if (wave == 29) {
      waves.push([5, ["tank", "taunt", 20], ["faster", 50], ["strongest", 20]]);
    }
    if (wave == 30) {
      waves.push([5, ["strongest", "faster", 35]]);
    }
    if (wave == 31) {
      waves.push([
        10,
        ["taunt", 10],
        ["spawner", 15],
        ["strongest", 15],
        ["spawner", 15],
        ["strongest", 15],
        ["spawner", 15],
        ["faster", 30]
      ]);
    }
    if (wave == 32) {
      waves.push([15, ["spawner", 60], ["strongest", 30]]);
    }
    if (wave == 33) {
      waves.push([1, ["taunt", 25], ["faster", 100], ["strongest", 40]]);
    }
    if (wave == 34) {
      waves.push([5, ["taunt", 35], ["megaTank", 45]]);
    }
    if (wave == 35) {
      waves.push([
        1,
        ["strongest", 15],
        ["megaTank", 15],
        ["strongest", 15],
        ["megaTank", 15]
      ]);
    }
    if (wave == 36) {
      waves.push([
        15,
        ["megaTank", "tank", 15],
        ["spawner", 15],
        ["megaTank", 20]
      ]);
    }
    if (wave == 37) {
      waves.push([5, ["spawner", 30], ["megaTank", 45]]);
    }
    if (wave == 38) {
      waves.push([1, ["strongest", 25], ["megaTank", 50]]);
    }
    if (wave == 39) {
      waves.push([30, ["fastest", 25]]);
    }
    if (wave == 40) {
      waves.push([15, ["spawner", 25], ["megaTank", 15], ["fastest", 25]]);
    }
    if (wave == 41) {
      waves.push([20, ["boss", 1], ["fastest", 25]]);
    }
    if (wave == 42) {
      waves.push([
        10,
        ["spawner", 15],
        ["weak", 15],
        ["spawner", 15],
        ["strong", 15],
        ["spawner", 15],
        ["fast", 15],
        ["spawner", 15],
        ["strongFast", 15],
        ["spawner", 15],
        ["medic", 15],
        ["spawner", 15],
        ["stronger", 15],
        ["spawner", 15],
        ["faster", 15],
        ["spawner", 15],
        ["tank", 25],
        ["spawner", 15],
        ["taunter", 25],
        ["spawner", 15],
        ["strongest", 30],
        ["spawner", 15],
        ["megaTank", 35],
        ["spawner", 15],
        ["fastest", 40]
      ]);
    }
    if (wave == 43) {
      waves.push([5, ["megaBoss", 1]]);
    }
  }

  return random(waves);
}

function freeplayWave() {
  var enempool = [];
  var totalenem = wave * 1.5;
  var enempattemp = [];

  if (wave > 40 && wave < 54) {
    enempool.push("faster");
    enempool.push("stronger");
    enempool.push("medic");
  }
}

// Recalculate pathfinding maps
// Algorithm from https://www.redblobgames.com/pathfinding/tower-defense/
function recalculate() {
  walkMap = getWalkMap();
  var frontier = [];
  var target = vts(exit);
  frontier.push(target);
  var cameFrom = {};
  var distance = {};
  cameFrom[target] = null;
  distance[target] = 0;

  // Fill cameFrom and distance for every tile
  while (frontier.length !== 0) {
    var current = frontier.shift();
    var t = stv(current);
    var adj = neighbors(walkMap, t.x, t.y, true);

    for (var i = 0; i < adj.length; i++) {
      var next = adj[i];
      if (!(next in cameFrom) || !(next in distance)) {
        frontier.push(next);
        cameFrom[next] = current;
        distance[next] = distance[current] + 1;
      }
    }
  }

  // Generate usable maps
  dists = buildArray(cols, rows, null);
  var newPaths = buildArray(cols, rows, 0);
  var keys = Object.keys(cameFrom);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var current = stv(key);

    // Distance map
    dists[current.x][current.y] = distance[key];

    // Generate path direction for every tile
    var val = cameFrom[key];
    if (val !== null) {
      // Subtract vectors to determine direction
      var next = stv(val);
      var dir = next.sub(current);
      // Fill tile with direction
      if (dir.x < 0) newPaths[current.x][current.y] = 1;
      if (dir.y < 0) newPaths[current.x][current.y] = 2;
      if (dir.x > 0) newPaths[current.x][current.y] = 3;
      if (dir.y > 0) newPaths[current.x][current.y] = 4;
    }
  }

  // Preserve old paths on path tiles
  for (var x = 0; x < cols; x++) {
    for (var y = 0; y < rows; y++) {
      if (grid[x][y] === 2) newPaths[x][y] = paths[x][y];
    }
  }

  paths = newPaths;
}

// TODO vary health based on map
function resetGame() {
  loadMap();
  // Clear all entities
  enemies = [];
  projectiles = [];
  systems = [];
  towers = [];
  newEnemies = [];
  newProjectiles = [];
  newTowers = [];
  // Reset all stats
  health = 40;
  maxHealth = health;
  wave = 0;
  // Reset all flags
  paused = true;
  scd = 0;
  toCooldown = false;
  toPathfind = false;
  toPlace = false;
  // Start game
  document.getElementById("skillpopup").style.display = "block";
  nextWave();
}

// Changes tile size to fit everything onscreen
function resizeFit() {
  var div = document.getElementById("sketch-holder");
  var ts1 = floor(div.offsetWidth / cols);
  var ts2 = floor(div.offsetHeight / rows);
  ts = Math.min(ts1, ts2);
  resizeCanvas(cols * ts, rows * ts, true);
}

// Resizes cols, rows, and canvas based on tile size
function resizeMax() {
  var div = document.getElementById("sketch-holder");
  cols = floor(div.offsetWidth / ts);
  rows = floor(div.offsetHeight / ts);
  resizeCanvas(cols * ts, rows * ts, true);
}

// Sell a tower
function sell(t) {
  selected = null;
  if (grid[t.gridPos.x][t.gridPos.y] === 0) toPathfind = true;
  clearInfo();
  cash += t.sellPrice();
  t.kill();
}

// Set a tower to place
function setPlace(t) {
  towerType = t;
  toPlace = true;
  updateInfo(createTower(0, 0, tower[towerType]));
}

// Visualize range of tower
function showRange(t, cx, cy) {
  stroke(255);
  fill(t.color[0], t.color[1], t.color[2], 63);
  var r = (t.range + 0.5) * ts * 2;
  ellipse(cx, cy, r, r);
}

// Display tower information
// TODO maybe display average DPS
function updateInfo(t) {
  var name = document.getElementById("name");
  name.innerHTML =
    '<span style="color:rgb(' + t.color + ')">' + t.title + "</span>";
  document.getElementById("cost").innerHTML = "Cost: $" + t.totalCost;
  document.getElementById("sellPrice").innerHTML =
    "Sell price: $" + t.sellPrice();
  document.getElementById("upPrice").innerHTML =
    "Upgrade price: " +
    (t.upgrades.length > 0 ? "$" + t.upgrades[0].cost : "N/A");
  document.getElementById("damage").innerHTML = "Damage: " + t.getDamage();
  document.getElementById("type").innerHTML = "Type: " + t.type.toUpperCase();
  document.getElementById("range").innerHTML = "Range: " + t.range;
  document.getElementById("cooldown").innerHTML =
    "Avg. Cooldown: " + t.getCooldown().toFixed(2) + "s";
  var buttons = document.getElementById("info-buttons");
  buttons.style.display = toPlace ? "none" : "flex";
  document.getElementById("info-div").style.display = "block";
}

// Update pause button
function updatePause() {
  document.getElementById("pause").innerHTML = paused ? "Start" : "Pause";
}

// Update game status display with wave, health, and cash
function updateStatus() {
  document.getElementById("wave").innerHTML = "Wave " + wave;
  document.getElementById("health").innerHTML =
    "Health: " + health + "/" + maxHealth;
  document.getElementById("cash").innerHTML = "$" + cash;
}

// Upgrade tower
function upgrade(t) {
  if (godMode || cash >= t.cost) {
    if (!godMode) cash -= t.cost;
    selected.upgrade(t);
    selected.upgrades = t.upgrades ? t.upgrades : [];
    updateInfo(selected);
  }
}

// Return whether tile is walkable
function walkable(col, row) {
  // Check if wall or tower-only tile
  if (grid[col][row] === 1 || grid[col][row] === 3) return false;
  // Check if tower
  if (getTower(col, row)) return false;
  return true;
}

// Main p5 functions

function setup() {
  var div = document.getElementById("sketch-holder");
  var canvas = createCanvas(div.offsetWidth, div.offsetHeight);
  canvas.parent("sketch-holder");
  resetGame();
}

// TODO show range of selected tower
function draw() {
  background(bg);

  // Update game status
  updatePause();
  updateStatus();

  // Update spawn and wave cooldown
  if (!paused) {
    if (scd > 0) scd--;
    if (wcd > 0 && toWait) wcd--;
  }

  // Draw basic tiles
  for (var x = 0; x < cols; x++) {
    for (var y = 0; y < rows; y++) {
      var t = tiles[display[x][y]];
      if (typeof t === "function") {
        t(x, y, displayDir[x][y]);
      } else {
        stroke(border, borderAlpha);
        t ? fill(t) : noFill();
        rect(x * ts, y * ts, ts, ts);
      }
    }
  }

  // Draw spawnpoints
  for (var i = 0; i < spawnpoints.length; i++) {
    stroke(255);
    fill(0, 230, 64);
    var s = spawnpoints[i];
    rect(s.x * ts, s.y * ts, ts, ts);
  }

  // Draw exit
  stroke(255);
  fill(207, 0, 15);
  rect(exit.x * ts, exit.y * ts, ts, ts);

  // Draw temporary spawnpoints
  for (var i = 0; i < tempSpawns.length; i++) {
    stroke(255);
    fill(155, 32, 141);
    var s = tempSpawns[i][0];
    rect(s.x * ts, s.y * ts, ts, ts);
  }

  // Spawn enemies
  if (canSpawn() && !paused) {
    // Spawn same enemy for each spawnpoint
    var name = newEnemies.shift();
    for (var i = 0; i < spawnpoints.length; i++) {
      var s = spawnpoints[i];
      var c = center(s.x, s.y);
      enemies.push(createEnemy(c.x, c.y, enemy[name]));
    }

    // Temporary spawnpoints
    for (var i = 0; i < tempSpawns.length; i++) {
      var s = tempSpawns[i];
      if (s[1] === 0) continue;
      console.log(enemy[name]);
      if (enemy[name].name === "boss") continue;
      s[1]--;
      var c = center(s[0].x, s[0].y);
      enemies.push(createTempEnemy(c.x, c.y, enemy[name]));
    }

    // Reset cooldown
    toCooldown = true;
  }

  // Update and draw enemies
  for (let i = enemies.length - 1; i >= 0; i--) {
    let e = enemies[i];

    // Update direction and position
    if (!paused) {
      e.steer();
      e.update();
      e.onTick();
    }

    // Kill if outside map
    if (outsideMap(e)) e.kill();

    // If at exit tile, kill and reduce player health
    if (atTileCenter(e.pos.x, e.pos.y, exit.x, exit.y)) e.onExit();

    // Draw
    e.draw();

    if (e.isDead()) enemies.splice(i, 1);
  }

  // Draw health bars
  if (healthBar) {
    for (var i = 0; i < enemies.length; i++) {
      enemies[i].drawHealth();
    }
  }

  // Update and draw towers
  for (let i = towers.length - 1; i >= 0; i--) {
    let t = towers[i];

    // Target enemies and update cooldowns
    if (!paused) {
      t.target(enemies);
      t.update();
    }

    // Kill if outside map
    if (outsideMap(t)) t.kill();

    // Draw
    t.draw();

    if (t.isDead()) towers.splice(i, 1);
  }

  // Update and draw particle systems
  for (let i = systems.length - 1; i >= 0; i--) {
    let ps = systems[i];
    ps.run();
    if (ps.isDead()) systems.splice(i, 1);
  }

  // Update and draw projectiles
  for (let i = projectiles.length - 1; i >= 0; i--) {
    let p = projectiles[i];

    if (!paused) {
      p.steer();
      p.update();
    }

    // Attack target
    if (p.reachedTarget()) p.explode();

    // Kill if outside map
    if (outsideMap(p)) p.kill();

    p.draw();

    if (p.isDead()) projectiles.splice(i, 1);
  }

  // Draw range of tower being placed
  if (doRange()) {
    var p = gridPos(mouseX, mouseY);
    var c = center(p.x, p.y);
    var t = createTower(0, 0, tower[towerType]);
    showRange(t, c.x, c.y);

    // Draw a red X if tower cannot be placed
    if (!canPlace(p.x, p.y)) {
      push();
      translate(c.x, c.y);
      rotate(PI / 4);

      // Draw a red X
      noStroke();
      fill(207, 0, 15);
      var edge = 0.1 * ts;
      var len = (0.9 * ts) / 2;
      rect(-edge, len, edge * 2, -len * 2);
      rotate(PI / 2);
      rect(-edge, len, edge * 2, -len * 2);

      pop();
    }
  }

  // Update FPS meter
  if (showFPS) calcFPS();

  // Show if god mode active
  if (godMode) {
    // Draw black rect under text
    noStroke();
    fill(0);
    rect(0, 0, 102, 22);

    fill(255);
    text("God Mode Active", 5, 15);
  }

  // Show if towers are disabled
  if (stopFiring) {
    // Draw black rect under text
    noStroke();
    fill(0);
    rect(width - 60, 0, 60, 22);

    fill(255);
    text("Firing off", width - 55, 15);
  }

  removeTempSpawns();

  projectiles = projectiles.concat(newProjectiles);
  towers = towers.concat(newTowers);
  newProjectiles = [];
  newTowers = [];

  // If player is dead, reset game
  if (health <= 0) resetGame();

  // Start next wave
  if ((toWait && wcd === 0) || (skipToNext && newEnemies.length === 0)) {
    toWait = false;
    wcd = 0;
    nextWave();
  }

  // Wait for next wave
  if (noMoreEnemies() && !toWait) {
    wcd = waveCool;
    toWait = true;
    cash = cash + 35; //35
  }

  // Reset spawn cooldown
  if (toCooldown) {
    scd = spawnCool;
    toCooldown = false;
  }

  // Recalculate pathfinding
  if (toPathfind) {
    recalculate();
    toPathfind = false;
  }
}

// User input

function keyPressed() {
  switch (keyCode) {
    case 27:
      // Esc
      toPlace = false;
      clearInfo();
      break;
    case 49:
      // 1
      setPlace("gun");
      break;
    case 50:
      // 2
      setPlace("laser");
      break;
    case 51:
      // 3
      setPlace("slow");
      break;
    case 52:
      // 4
      setPlace("sniper");
      break;
    case 53:
      // 5
      setPlace("rocket");
      break;
    case 54:
      // 6
      setPlace("bomb");
      break;
    case 55:
      // 7
      setPlace("tesla");
      break;
    case 70:
      // F
      showFPS = !showFPS;
      break;
    case 71:
      // G
      godMode = !godMode;
      break;
    case 72:
      // H
      healthBar = !healthBar;
      break;
    case 77:
      // M
      importMap(prompt("Input map string:"));
      break;
    case 80:
      // P
      showEffects = !showEffects;
      if (!showEffects) systems = [];
      break;
    case 81:
      // Q
      stopFiring = !stopFiring;
      break;
    case 82:
      // R
      resetGame();
      break;
    case 83:
      // S
      if (selected) sell(selected);
      break;
    case 85:
      // U
      if (selected && selected.upgrades.length > 0) {
        upgrade(selected.upgrades[0]);
      }
      break;
    case 86:
      // V
      muteSounds = !muteSounds;
      break;
    case 87:
      // W
      skipToNext = !skipToNext;
      break;
    case 88:
      // X
      copyToClipboard(exportMap());
      break;
    case 90:
      // Z
      ts = zoomDefault;
      resizeMax();
      resetGame();
      break;
    case 219:
      // Left bracket
      if (ts > 16) {
        ts -= tileZoom;
        resizeMax();
        resetGame();
      }
      break;
    case 221:
      // Right bracket
      if (ts < 40) {
        ts += tileZoom;
        resizeMax();
        resetGame();
      }
      break;
  }
}

function mousePressed() {
  if (!mouseInMap()) return;
  var p = gridPos(mouseX, mouseY);
  var t = getTower(p.x, p.y);

  if (t) {
    // Clicked on tower
    selected = t;
    toPlace = false;
    updateInfo(selected);
  } else if (canPlace(p.x, p.y)) {
    buy(createTower(p.x, p.y, tower[towerType]));
  }
}

// Events

document.getElementById("map").addEventListener("change", resetGame);
