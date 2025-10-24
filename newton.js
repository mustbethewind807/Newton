// define a namespace
const Newton = {
  Camera: {},
  Vector: {},
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
      cam.lerpSpeed = 0.2;
      cam.maxSpeed = options.maxSpeed || 10;
      cam.w = options.w || 400;
      cam.h = options.h || 400;
      cam.linkedEntity = options.linkedEntity || null;
      
      cam.link = function (entity) {
        this.linkedEntity = entity;
      }
      
      cam.unlink = function () {
        this.linkedEntity = null;
      }
      
      cam.applyForce = function (f) {
        this.vel = Vector.add(this.vel, f);
      }
      
      cam.update = function () {
        if (cam.linkedEntity) {
          let wishSpeed = Vector.lerp(this.pos, this.linkedEntity.pos, this.lerpSpeed);
          this.vel = Vector.add(this.vel, wishSpeed);
        }
        
        this.vel = Vector.limit(this.vel, this.maxSpeed);
        this.pos = Vector.add(this.pos, this.vel);
        this.vel = { x: 0, y: 0 };
      }
      
      // TODO: WORK ON RENDERING ENTITIES GIVEN TO THE CAMERA
      return cam;
    }
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
          switch (action.type) {
            case "removeEntity":
              // Remove item
              this._entities.splice(action.options.id, 1);
              break;
            default:
              console.error(`Illegal action type: ${action.type}`);
          }
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

      // TODO: REMOVE THIS AND MOVE THIS TO CAMERA
      engine.render = function () {
        for (let e of this._entities) {
          e.render();

          for (let other of this._entities) {
            if (other === e) continue;
            if (Entity.collide(e, other) {
              fill(255, 0, 0);
              rect(e.pos.x, e.pos.y, e.w, e.h);
            }
          }
        }
      }

      return engine;
    };

    // an action has a type, id, and priority
    // it is just a simple object
    Engine.createAction = function (type, id, priority) {
      return { type, id, priority };
    };
  })();
})();
