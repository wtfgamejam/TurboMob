var game = new Phaser.Game(800, 600, Phaser.AUTO, 'phaser-example', {
    preload: preload,
    create: create,
    update: update,
    render: render
});

function preload() {

    game.load.image('field', 'assets/background/soccer_field.jpg');
    game.load.image('car', 'assets/sprites/car.png');
    game.load.image('ball', 'assets/sprites/steel-ball.png');

    game.load.image('fire1', 'assets/particles/fire1.png');
    game.load.image('fire2', 'assets/particles/fire2.png');
    game.load.image('fire3', 'assets/particles/fire3.png');
}

var car;
var field;
var cursors;

var boostKey;
var kickKey;

var thrust;
var maxBoost;
var boost;
var offset = new Phaser.Point(0, 0);

var isKickingLeft = false;
var isKickingRight = false;

var kickEndRotation;

function create() {

    game.world.setBounds(0, 0, 1400, 980);

    game.physics.startSystem(Phaser.Physics.P2JS);

    field = game.add.tileSprite(0, 0, 800, 600, 'field');
    field.fixedToCamera = true;

    // Shadow
    shadow = game.add.sprite(300, 300, 'car');
    shadow.anchor.set(0.5, 0.2);
    shadow.tint = 0x000000;
    shadow.alpha = 0.8;

    // Car
    car = game.add.sprite(300, 300, 'car');
    car.scale.setTo(1, 1.5);

    game.physics.p2.enable(car, true);
    car.body.clearShapes();
    car.anchor.setTo(.5, .2);
    car.body.addRectangle(32, 48, 0, 16);

    car.body.damping = 0.95;
    car.body.angularDamping = 0.95;

    game.camera.follow(car);

    // Ball
    ball = game.add.sprite(700, 490, 'ball');
    ball.scale.setTo(0.8, 0.8);
    game.physics.p2.enable(ball, false);

    ball.body.clearShapes();
    ball.body.addCircle(18);

    ball.body.mass = 0.2;


    // Collisions
    var ballMaterial = game.physics.p2.createMaterial('ballMaterial', ball.body);
    var carMaterial = game.physics.p2.createMaterial('carMaterial', car.body);
    var worldMaterial = game.physics.p2.createMaterial('worldMaterial');

    //  4 trues = the 4 faces of the world in left, right, top, bottom order
    game.physics.p2.setWorldMaterial(worldMaterial, true, true, true, true);

    //  Here is the contact material. It's a combination of 2 materials, so whenever shapes with
    //  those 2 materials collide it uses the following settings.
    //  A single material can be used by as many different sprites as you like.
    var ballVsWorld = game.physics.p2.createContactMaterial(ballMaterial, worldMaterial);
    var ballVsCar = game.physics.p2.createContactMaterial(ballMaterial, carMaterial);

    ballVsWorld.friction = 1.0; // Friction to use in the contact of these two materials.
    ballVsWorld.restitution = 0.75; // Restitution (i.e. how bouncy it is!) to use in the contact of these two materials.
    ballVsCar.restitution = 0.5; // Restitution (i.e. how bouncy it is!) to use in the contact of these two materials.

    // Keys
    kickLeftKey = game.input.keyboard.addKey(Phaser.Keyboard.X);
    kickRightKey = game.input.keyboard.addKey(Phaser.Keyboard.Z);
    boostKey = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
    cursors = game.input.keyboard.createCursorKeys();

    kickLeftKey.onDown.add(kickLeft);
    kickRightKey.onDown.add(kickRight);

    // Rocket Trail
    emitter = game.add.emitter(game.world.centerX, 500, 200);
    emitter.makeParticles(['fire1', 'fire2', 'fire3']);

    emitter.setRotation(0, 0);
    emitter.setAlpha(0.7, 0.2);
    emitter.setScale(0.8, 0, 0.8, 0, 3000);
    emitter.gravity = 0;

    emitter.start(false, 250, 50);

    // Boost Meter
    bmd = this.game.add.bitmapData(300, 40);
    bmd.ctx.beginPath();
    bmd.ctx.rect(0, 0, 300, 80);
    bmd.ctx.fillStyle = '#00181e';
    bmd.ctx.fill();

    bgBoost = this.game.add.sprite(170, 30, bmd);
    bgBoost.fixedToCamera = true;
    bgBoost.anchor.set(0.5);

    bmd = this.game.add.bitmapData(280, 30);
    bmd.ctx.beginPath();
    bmd.ctx.rect(0, 0, 300, 80);
    bmd.ctx.fillStyle = '#AF0035';
    bmd.ctx.fill();

    widthBoost = new Phaser.Rectangle(0, 0, bmd.width, bmd.height);
    totalBoost = bmd.width;

    boostMeter = this.game.add.sprite(170 - bgBoost.width / 2 + 10, 30, bmd);
    boostMeter.fixedToCamera = true;
    boostMeter.anchor.y = 0.5;
    boostMeter.cropEnabled = true;
    boostMeter.crop(widthBoost);

}

function update() {

    shadow.x = car.x + offset.x;
    shadow.y = car.y + offset.y;
    emitter.x = car.x;
    emitter.y = car.y;
    shadow.rotation = car.rotation;
    emitter.on = false

    thrust = 600;
    isBoosting = false;

    if (boostKey.isDown) {
        if (totalBoost > 0) {
            emitter.on = true;
            totalBoost = totalBoost; // -1;
            boostMeter.width = totalBoost;
            isBoosting = true;

            thrust = 1800;

        } else {
            thrust = 900;
        }
    }

    if (!isKickingLeft && !isKickingRight) {
        if (cursors.left.isDown) {
            car.body.rotateLeft(100);
        } else if (cursors.right.isDown) {
            car.body.rotateRight(100);
        } else {
            car.body.setZeroRotation();
        }

        if (cursors.up.isDown || isBoosting) {
            car.body.thrust(thrust);
        } else if (cursors.down.isDown) {
            car.body.reverse(thrust);
        }
    }

    if (isKickingRight) {
        car.body.rotateRight(500);
        if (car.rotation > kickEndRotation) {
            isKickingRight = false;
        }
    }

    if (isKickingLeft) {
        car.body.rotateLeft(500);
        if (car.rotation < kickEndRotation) {
            isKickingLeft = false;
        }
    }

    if (!game.camera.atLimit.x) {
        field.tilePosition.x -= (car.body.velocity.x * game.time.physicsElapsed);
    }

    if (!game.camera.atLimit.y) {
        field.tilePosition.y -= (car.body.velocity.y * game.time.physicsElapsed);
    }
}

function kickRight() {
    if (!isKickingRight) {
        kickEndRotation = (car.rotation) + Math.PI * 2;
        isKickingRight = true;
    }
}

function kickLeft() {
    if (!isKickingLeft) {
        kickEndRotation = (car.rotation) - Math.PI * 2;
        isKickingLeft = true;
    }
}

function render() {

    // game.debug.text("Duration: " + isKickingLeft, 32, 32);
    // game.debug.text("Rotation: " + car.rotation, 32, 64);
    // game.debug.text("EndRotation: " + kickEndRotation, 32, 84);

}