function createEffect(duration, template) {
  var e = new Effect(duration);
  // Fill in all keys
  template = typeof template === "undefined" ? {} : template;
  var keys = Object.keys(template);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    e[key] = template[key];
  }
  return e;
}

var effects = {};

effects.slow = {
  // Display
  color: [68, 108, 179],
  // Misc
  name: "slow",
  // Methods
  onEnd: function (e) {
    e.speed = this.oldSpeed;
  },
  onStart: function (e) {
    this.oldSpeed = e.speed;
    this.speed = e.speed / 2;
    e.speed = this.speed;
  }
};

effects.superslow = {
  // Display
  color: [68, 108, 179],
  // Misc
  name: "slow",
  // Methods
  onEnd: function (e) {
    e.speed = this.oldSpeed;
  },
  onStart: function (e) {
    this.oldSpeed = e.speed;
    this.speed = e.speed / 4;
    e.speed = this.speed;
  }
};

effects.poison = {
  // Display
  color: [102, 204, 26],
  // Misc
  name: "poison",
  // Methods
  onTick: function (e) {
    e.dealDamage(1, "poison");
  }
};
effects.superpoison = {
  // Display
  color: [102, 204, 26],
  // Misc
  name: "superpoison",
  // Methods
  onTick: function (e) {
    e.dealDamage(5, "superpoison");
  }
};

effects.megapoison = {
  // Display
  color: [102, 204, 26],
  // Misc
  name: "superpoison",
  // Methods
  onTick: function (e) {
    e.dealDamage(20, "superpoison");
  }
};

effects.regen = {
  // Display
  color: [210, 82, 127],
  // Misc
  name: "regen",
  // Methods
  onTick: function (e) {
    if (e.health < e.maxHealth && random() < 0.2) e.health = +25;
  }
};
