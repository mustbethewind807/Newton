// define a namespace
const Newton = {
  Vector: {},
  Entity: {},
  Engine: {},
};

// prevents pollution
(function () {
  // Make references to the stuff
  const { Entity, Vector, Engine } = Newton;

  // crappy vector library
  // all functions are static to save memory
  (function () {
    Vector.create = function (x, y) {
      return { x: x || 0, y: y || 0 };
    };

    Vector.add = function (a, b) {
      return { x: a.x + b.x, y: a.y + b.y };
    };

    Vector.sub = function (a, b) {
      return { x: a.x - b.x, y: a.y - b.y };
    };

    Vector.mult = function (a, n) {
      return { x: a.x * n, y: a.y * n };
    };

    Vector.div = function (a, n) {
      return { x: a.x / n, y: a.y / n };
    };

    Vector.magSq = function (v) {
      return v.x * v.x + v.y * v.y;
    };

    Vector.mag = function (v) {
      return Math.sqrt(v.x * v.x + v.y * v.y);
    };

    Vector.normalize = function (v) {
      let m = Vector.mag(v);
      return { x: v.x / m, y: v.y / m };
    };

    Vector.dot = function (a, b) {
      return a.x * b.x + a.y * b.y;
    };

    Vector.cross = function (a, b) {
      return a.x * b.y - a.y * b.x;
    };
    
    Vector.copy = function (v) {
      return { x: v.x, y: v.y };
    };
  })();

  // Adds all the entity stuff
  (function () {
    Entity.create = function (options = {}) {
      // Movement stuff
      let entity = {};
      entity.pos = options.pos || { x: 0, y: 0 };
      entity.vel = options.vel || { x: 0, y: 0 };
      entity.acc = { x: 0, y: 0 };
      entity.w = options.w || 32;
      entity.h = options.h || 32;
      entity.mass = options.mass || 1;

      // Important engine running stuff
      entity.gravityAffected = options.gravityAffected;
      if (options.gravityAffected === undefined) {
        entity.gravityAffected = true;
      }
      entity.restitution = options.restitution || 0;
      entity.collPriority = options.collPriority || 0;
      entity.isStatic = options.isStatic || false;

      // Important stuff
      entity.label = options.label || null; // Classify objects with a tag!
      entity.collLabel = options.collLabel || null;

      // Important function stuff
      entity.applyForce = function (f, globalForce) {
        let force = Vector.copy(f);
        if (!globalForce) {
          force = Vector.div(force, this.mass);
        }
        this.acc = Vector.add(this.acc, force);
      };

      // Extra debug stuff
      entity.render = function () {
        // Temporary
        rectMode(CENTER);
        stroke(0);
        strokeWeight(2);
        noFill();
        rect(this.pos.x, this.pos.y, this.w, this.h);
      };

      return entity;
    };
  })();

  // Engine stuff
  (function () {
    Engine.create = function (options) {
      let engine = {};
      engine._entities = [];
      engine._gravity = { x: 0, y: 0.25 };

      // Actions are how the engine does importants stuff that can't be done on the fly
      engine._actions = [];

      engine.addAction = function (action) {
        this._actions.push(action);
      };
      
      engine.runActions = function () {
        this._actions.sort(function (a, b) {
          return b.priority - a.priority;
        });
        
        for (let action of this._actions) {
          // TODO ---------------------------------------------------------
          // Resolve actions
          // Do stuff
        }
        
        this.clearActions();
      }
      
      engine.clearActions = function () {
        engine._actions = [];
      }

      engine.addEntity = function (obj, value) {
        // something can be either an entity or an array of entities
        if (!Array.isArray(obj)) {
          if (value) {
            this._entities[value] = obj;
            return;
          }
          this._entities.push(obj);
          return;
        }
        for (let e of obj) {
          this._entities.push(e);
        }
      };

      engine.removeEntity = function (obj, priority) {
        if (typeof obj === "number") {
          this.addAction(Engine.createAction("remove", obj, priority || 0));
          return;
        }
        for (let i = 0; i < this._entities; i++) {
          let e = this._entities[i];
          if (e === obj) {
            this.addAction(Engine.createAction("remove", i, priority || 0));
            return;
          }
        }
        console.error('No matching object found');
        console.log(`Object: ${obj}`);
      };

      engine.update = function () {
        // Global stuff
        // Apply gravity
        for (let e of this._entities) {
          if (e.gravityAffected && !e.isStatic) {
            e.applyForce(this._gravity, true);
          }
        }

        // Move and collisions (hopefully)
        for (let e of this._entities) {
          if (e.isStatic) continue;
          e.vel = Vector.add(e.acc, e.vel);
          e.pos = Vector.add(e.vel, e.pos);
          e.acc = Vector.mult(e.acc, 0);
        }
        
        // Action time
        this.runActions();
      };

      return engine;
    };

    // an action has a type, id, and priority
    // it is just a simple object
    Engine.createAction = function (type, id, priority) {
      return { type, id, priority };
    };
  })();
})();
