// define a namespace
const Newton = {
  Vector: {},
  Camera: {},
  Entity: {},
  Engine: {},
};

// prevents pollution
(function () {
  // Make references to the stuff
  const { Vector, Camera, Entity, Engine } = Newton;

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

    Vector.limit = function (v, n) {
      if (Vector.magSq(v) < n * n) return v;
      let out = Vector.copy(v);
      out = Vector.normalize(out);
      out = Vector.mult(out, n);
      return out;
    };

    Vector.lerp = function (a, b, t) {
      let c = Vector.sub(b, a);
      c = Vector.mult(c, t);
      return Vector.add(c, a);
    };

    // I give up
    Vector.copy = function (v) {
      return { x: v.x, y: v.y };
    };
  })();

  // Camera module
  // Is a camera that renders things
  // And maybe does other stuff
  (function () {
    Camera.create = function (options = {}) {
      let cam = {};
      cam.pos = options.pos || { x: 0, y: 0 };
      cam.vel = { x: 0, y: 0 };
      cam.posOff = { x: 0, y: 0 };
      cam.lerpSpeed = 1;
      cam.maxSpeed = options.maxSpeed || 10;
      cam.w = options.w || 400;
      cam.h = options.h || 400;
      cam.halfw = cam.w / 2;
      cam.halfh = cam.h / 2;
      cam.linkedEntity = options.linkedEntity || null;

      cam.link = function (entity) {
        this.linkedEntity = entity;
      };

      cam.unlink = function () {
        this.linkedEntity = null;
      };

      cam.update = function () {
        if (this.linkedEntity) {
          this.pos = Vector.lerp(
            this.pos,
            this.linkedEntity.pos,
            this.lerpSpeed
          );
        }

        this.vel = Vector.limit(this.vel, this.maxSpeed);
        this.pos = Vector.add(this.pos, this.vel);
        this.vel = { x: 0, y: 0 };
      };

      cam.render = function (entities) {
        // Only render entities that are within the camera boundary
        let renderedEntities = entities.filter(function (entity) {
          return Entity.checkCollide(cam, entity);
        });
        renderedEntities.sort(function (a, b) {
          return b.displayPriority - a.displayPriority;
        });
        push();
        translate(-this.pos.x + this.halfw, -this.pos.y + this.halfh);
        for (let e of renderedEntities) {
          e.render();
        }
        pop();
      };

      return cam;
    };
  })();

  // Adds all the entity stuff
  // is for a platforming engine so canJump
  (function () {
    Entity.create = function (options = {}) {
      let entity = {};

      // Movement stuff
      entity.pos = options.pos || { x: 0, y: 0 };
      entity.prevPos = Vector.copy(options.pos);
      entity.vel = options.vel || { x: 0, y: 0 };
      entity.acc = { x: 0, y: 0 };
      entity.maxVel = options.maxVel || Infinity;
      entity.w = options.w || 32;
      entity.h = options.h || 32;
      entity.halfw = entity.w * 0.5;
      entity.halfh = entity.h * 0.5;
      entity.friction = 0.3;
      entity.mass = options.mass || 1;
      entity.canJump = false;
      entity.grounded = false;

      // Gameplay stuff
      entity.health = 100;
      entity.rockets = 0;
      entity.rocketCharge = 0;
      entity.rocketChargeLimit = 300; // In frames

      // Important engine running stuff
      entity.gravityAffected = options.gravityAffected;
      if (options.gravityAffected === undefined) {
        entity.gravityAffected = true;
      }
      entity.restitution = options.restitution || 0;
      entity.collPriority = options.collPriority || 0;
      entity.isStatic = options.isStatic || false;
      entity.displayPriority = options.displayPriority || 0;

      // Important stuff
      entity.label = options.label || null; // Classify objects with a tag!
      entity.noColl = options.noColl || []; // What to not check collisions for

      // Important function stuff
      entity.applyForce = function (f, globalForce) {
        let force = Vector.copy(f);
        if (!globalForce) {
          force = Vector.div(force, this.mass);
        }
        this.acc = Vector.add(this.acc, force);
      };

      // old habits
      entity.collide = function (other) {
        // only do collision if you actually collide
        if (!Entity.checkCollide(this, other)) return;

        // collide in y axis

        // very useful for preventing teleportations
        // remove it and see what happens
        let didColl = false;
        (function () {
          // Funny stuff
          // Skips y collision if entity is coming from the side
          if (!(entity.prevPos.x + entity.halfw > other.pos.x - other.halfw &&
        entity.prevPos.x - entity.halfw < other.pos.x + other.halfw)) return;
          if (entity.vel.y < 0) {
            didColl = true;
            entity.pos.y = other.pos.y + other.halfh + entity.halfh;
            entity.vel.y = 0; // arbitrary amount
          } else if (entity.vel.y > 0) {
            didColl = true;
            entity.pos.y = other.pos.y - other.halfh - entity.halfh;
            entity.vel.y = 0;
            entity.canJump = true;
            entity.grounded = true;
          }
        })();
        if (didColl) return;

        // collide in x axis
        (function () {
          if (entity.vel.x < 0) {
            entity.vel.x = 0;
            entity.pos.x = other.pos.x + other.halfw + entity.halfw;
          } else if (entity.vel.x > 0) {
            entity.vel.x = 0;
            entity.pos.x = other.pos.x - other.halfw - entity.halfw;
          }
        })();
      };
      if (options.render) {
        entity.render = options.render;
      } else {
        entity.render = function () {
          rectMode(CENTER);
          noFill();
          stroke(0);
          strokeWeight(2);
          rect(entity.pos.x, entity.pos.y, entity.w, entity.h);
        };
      }

      return entity;
    };

    // TODO: REIMPLEMENT ENTITY.RENDER AND MAKE IT CUSTOMIZABLE WITH OPTIONS AND MAYBE ADD A DEFAULT LIKE THE NORMAL RECTANGLE

    Entity.checkCollide = function (a, b) {
      return (
        a.pos.x + a.halfw > b.pos.x - b.halfw &&
        a.pos.x - a.halfw < b.pos.x + b.halfw &&
        a.pos.y + a.halfh > b.pos.y - b.halfh &&
        a.pos.y - a.halfh < b.pos.y + b.halfh
      );
    };
  })();

  (function () {
    // Actions are how the engine does important stuff that can't be done on the fly (or best not to do on the fly)
    Engine.createAction = function (type, options, priority) {
      return { type, options, priority };
    };

    Engine.create = function (options) {
      let engine = {};
      engine._entities = [];
      engine._gravity = { x: 0, y: 0.25 };
      engine._actions = [];

      engine.addAction = function (action) {
        this._actions.push(action);
      };

      engine.runActions = function () {
        this._actions.sort(function (a, b) {
          return b.priority - a.priority;
        });

        for (let action of this._actions) {
          switch (action.type) {
            case "removeEntity":
              // Remove entity
              this._entities.splice(action.options.id, 1);
              break;
            case "addEntity":
              // Add entity
              this._entities.push(action.options.entity);
              break;
            default:
              console.error(`Illegal action type: ${action.type}`);
          }
        }

        this.clearActions();
      };

      engine.clearActions = function () {
        engine._actions = [];
      };

      engine.addEntity = function (obj) {
        // something can be either an entity or an array of entities
        if (!Array.isArray(obj)) {
          this.addAction(Engine.createAction("addEntity", { entity: obj }, 0));
          return;
        }
        for (let e of obj) {
          this.addAction(Engine.createAction("addEntity", { entity: e }, 0));
        }
      };

      engine.removeEntity = function (obj, priority) {
        if (typeof obj === "number") {
          this.addAction(
            Engine.createAction("removeEntity", { id: obj }, priority || 0)
          );
          return;
        }
        for (let i = 0; i < this._entities.length; i++) {
          let e = this._entities[i];
          if (e === obj) {
            this.addAction(
              Engine.createAction("removeEntity", { id: i }, priority || 0)
            );
            return;
          }
        }
      };

      engine.update = function () {
        // Global stuff
        // Apply gravity
        // And set previous positions
        for (let e of this._entities) {
          e.prevPos = Vector.copy(e.pos);
          if (e.gravityAffected && !e.isStatic) {
            e.applyForce(this._gravity, true);
          }
        }

        // Move and collisions (hopefully)
        for (let e of this._entities) {
          if (e.isStatic) continue;
          e.vel = Vector.add(e.acc, e.vel);
          e.vel = Vector.limit(e.vel, e.maxVel);
          e.pos = Vector.add(e.vel, e.pos);
          e.acc = Vector.mult(e.acc, 0);
          e.grounded = false;
          e.canJump = false;

          if (e.vel.x !== 0) {
            e.vel.x -= Math.sign(e.vel.x) * 0.3;
            if (Math.abs(e.vel.x) < 0.1) {
              e.vel.x = 0;
            }
          }

          for (let other of this._entities) {
            // don't collide with yourself
            if (other === e || other === undefined) continue;
            // don't collide with things of no colliding
            for (let tag of e.noColl) {
              if (other.label === tag) continue;
            }
            // collision time
            e.collide(other);
          }
        }

        // Action time
        this.runActions();
      };

      engine.render = function (cam) {
        cam.render(this._entities);
      };

      return engine;
    };
  })();
})();
