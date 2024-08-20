function createEnemy(x, y, template) {
  var e = new Enemy(x, y);
  // Fill in all keys
  template = typeof template === "undefined" ? {} : template;
  var keys = Object.keys(template);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    e[key] = template[key];
  }
  if (mapdiff == 3 && e.name === "boss") {
    e.health = 75000; //75000
  }
  if (mapdiff == 4 && e.name === "boss") {
    e.health = 50000;
  }
  e.onCreate();
  return e;
}
function createTempEnemy(x, y, template) {
  var e = new Enemy(x, y);
  // Fill in all keys
  template = typeof template === "undefined" ? {} : template;
  var keys = Object.keys(template);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    e[key] = template[key];
  }
  if (mapdiff == 1) {
    e.cash = e.cash - 1;
    if (e.cash < 1) {
      e.cash = 1;
    }
  }
  if (mapdiff == 2) {
    e.cash = e.cash - 4;
    if (e.cash < 1) {
      e.cash = 1;
    }
  }
  if (mapdiff == 3) {
    e.cash = e.cash - 5;
    if (e.cash < 1) {
      e.cash = 1;
    }
  }
  if (mapdiff == 4) {
    e.cash = e.cash - 10;
    if (e.cash < 1) {
      e.cash = 1;
    }
  }
  e.onCreate();
  return e;
}

var enemy = {};

enemy.weak = {
  // Display
  color: [189, 195, 199],
  // Misc
  name: "weak",
  // Stats
  cash: 1,
  health: 35,
  rarity: 1
};

enemy.strong = {
  // Display
  color: [108, 122, 137],
  radius: 0.6,
  // Misc
  name: "strong",
  // Stats
  cash: 1,
  health: 75,
  rarity: 1
};

enemy.fast = {
  // Display
  color: [61, 251, 255],
  // Misc
  name: "fast",
  // Stats
  cash: 2,
  health: 75,
  speed: 2,
  rarity: 1,
  // Methods
  draw: function () {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.vel.heading());

    stroke(0);
    fill(this.getColor());
    var back = (-0.55 * ts) / 3;
    var front = back + 0.55 * ts;
    var side = (0.8 * ts) / 2;
    quad(back, -side, 0, 0, back, side, front, 0);

    pop();
  }
};

enemy.strongFast = {
  // Display
  color: [30, 139, 195],
  // Misc
  name: "strongFast",
  // Stats
  cash: 2,
  health: 135,
  speed: 2,
  rarity: 2,
  // Methods
  draw: function () {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.vel.heading());

    stroke(0);
    fill(this.getColor());
    var back = (-0.8 * ts) / 3;
    var front = back + 0.8 * ts;
    var side = ts / 2;
    quad(back, -side, 0, 0, back, side, front, 0);

    pop();
  }
};

enemy.medic = {
  // Display
  color: [192, 57, 43],
  radius: 0.7,
  // Misc
  name: "medic",
  // Stats
  cash: 4,
  health: 500,
  immune: ["regen"],
  rarity: 3,
  // Methods
  onTick: function () {
    var affected = getInRange(this.pos.x, this.pos.y, 2, enemies);
    for (var i = 0; i < affected.length; i++) {
      affected[i].applyEffect("regen", 25);
    }
  }
};

enemy.stronger = {
  // Display
  color: [52, 73, 94],
  radius: 0.8,
  // Misc
  name: "stronger",
  // Stats
  rarity: 4,
  cash: 4,
  health: 750
};
enemy.strongest = {
  // Display
  color: [52, 73, 94],
  radius: 0.8,
  // Misc
  name: "strongest",
  // Stats
  rarity: 4,
  cash: 5,
  health: 3000,
  draw: function () {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.vel.heading());

    stroke(0);
    fill(this.getColor());
    ellipse(0, 0, 0.3 * ts * 2, 0.3 * ts * 2);
    fill([62, 83, 104]);
    ellipse(3, 3, 0.2 * ts * 2, 0.2 * ts * 2);
    ellipse(-3, -3, 0.2 * ts * 2, 0.2 * ts * 2);

    pop();
  }
};

enemy.faster = {
  // Display
  color: [249, 105, 14],
  // Misc
  name: "faster",
  // Stats
  cash: 4,
  health: 500,
  rarity: 4,
  speed: 4,
  // Methods
  draw: function () {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.vel.heading());

    stroke(0);
    fill(this.getColor());
    var back = (-0.7 * ts) / 3;
    var front = back + 0.7 * ts;
    var side = (0.9 * ts) / 2;
    quad(back, -side, 0, 0, back, side, front, 0);

    pop();
  }
};

enemy.fastest = {
  // Display
  color: [110, 44, 191],
  // Misc
  name: "fastest",
  // Stats
  cash: 6,
  health: 4250,
  rarity: 4,
  immune: ["slow"],
  resistant: ["explosion"],
  speed: 5,
  // Methods
  draw: function () {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.vel.heading());

    stroke(0);
    fill(this.getColor());
    var back = (-0.7 * ts) / 3;
    var front = back + 0.7 * ts;
    var side = (0.9 * ts) / 2;
    quad(back, -side, 0, 0, back, side, front, 0);

    pop();
  }
};

enemy.tank = {
  // Display
  color: [30, 130, 76],
  radius: 1,
  // Misc
  name: "tank",
  // Stats
  cash: 4,
  rarity: 5,
  health: 1100,
  immune: ["poison", "slow", "energy"],
  resistant: ["piercing"],
  weak: ["physical"],
  speed: 2,
  // Methods
  draw: function () {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.vel.heading());

    stroke(0);
    fill(this.getColor());
    var front = (this.radius * ts) / 2;
    var side = (0.7 * ts) / 2;
    var barrel = (0.15 * ts) / 2;
    var length = 0.7 * ts;
    var curve = 0.2 * ts;
    rect(-front, -side, front * 2, side * 2, curve);
    fill(149, 165, 166);
    rect(0, -barrel, length, barrel * 2);
    ellipse(0, 0, 0.2 * ts * 2, 0.2 * ts * 2);

    pop();
  }
};

enemy.megaTank = {
  // Display
  color: [130, 21, 17],
  radius: 1,
  // Misc
  name: "megaTank",
  // Stats
  cash: 5,
  rarity: 5,
  health: 4000,
  immune: ["poison", "slow", "superpoison"],
  resistant: ["piercing", "energy"],
  speed: 2,
  // Methods
  draw: function () {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.vel.heading());

    stroke(0);
    fill(this.getColor());
    var front = (this.radius * ts) / 2;
    var side = (0.7 * ts) / 2;
    var barrel = (0.15 * ts) / 2;
    var length = 0.7 * ts;
    var curve = 0.2 * ts;
    rect(-front, -side, front * 2, side * 2, curve);
    fill(149, 165, 166);
    rect(0, -barrel, length, barrel * 2);
    ellipse(0, 0, 0.2 * ts * 2, 0.2 * ts * 2);

    pop();
  }
};

enemy.taunt = {
  // Display
  color: [102, 51, 153],
  radius: 0.8,
  // Misc
  name: "taunt",
  sound: "taunt",
  // Stats
  speed: 0.8,
  cash: 8,
  rarity: 6,
  health: 1500,
  immune: ["poison", "slow"],
  resistant: ["energy", "physical"],
  taunt: true,
  // Methods
  draw: function () {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.vel.heading());

    stroke(0);
    fill(this.getColor());
    var edge = (this.radius * ts) / 2;
    rect(-edge, -edge, this.radius * ts, this.radius * ts);
    stroke(232, 126, 4);
    noFill();
    rect(-0.3 * ts, -0.3 * ts, 0.6 * ts, 0.6 * ts);
    rect(-0.2 * ts, -0.2 * ts, 0.4 * ts, 0.4 * ts);

    pop();
  }
};

enemy.spawner = {
  // Display
  color: [244, 232, 66],
  radius: 0.7,
  // Misc
  name: "spawner",
  // Stats
  cash: 10,
  rarity: 6,
  health: 750, //750
  // Methods
  onKilled: function () {
    if (this.alive) {
      cash += this.cash;
      this.kill();

      // Add new temporary spawnpoint
      var c = gridPos(this.pos.x, this.pos.y);
      if (c.equals(exit)) return;
      for (var i = 0; i < tempSpawns.length; i++) {
        if (c.equals(tempSpawns[i][0])) return;
      }
      tempSpawns.push([createVector(c.x, c.y), tempSpawnCount]);
    }
  }
};
enemy.boss = {
  // Display
  color: [229, 0, 31],
  radius: 1,
  // Misc
  name: "boss",
  // Stats
  rarity: 7,
  damage: 999,
  speed: 0.4,
  cash: 500,
  immune: ["poison", "slow", "superpoison", "superslow"],
  health: 100000
};

enemy.megaBoss = {
  // Display
  color: [235, 64, 52],
  radius: 1,
  // Misc
  name: "megaBoss",
  // Stats
  rarity: 7,
  damage: 999,
  speed: 0.5,
  cash: 250,
  immune: ["slow", "superslow"],
  health: 750000,
  draw: function () {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.vel.heading());

    stroke(0);
    fill(this.getColor());
    ellipse(0, 0, 0.3 * ts * 2, 0.3 * ts * 2);
    fill([191, 46, 68]);
    ellipse(0, 0, 0.2 * ts * 2, 0.2 * ts * 2);
    fill([112, 27, 53]);
    ellipse(0, 0, 0.1 * ts * 2, 0.1 * ts * 2);
    pop();
  }
};
