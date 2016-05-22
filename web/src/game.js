var game = new Phaser.Game(1400, 980, Phaser.AUTO, 'phaser-example', {
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

    game.load.spritesheet('controller-indicator', 'assets/sprites/controller-indicator.png', 16, 16);
}

var pad1;
var pad2;

var indicator1;
var indicator2;

var player1;
var player2;

var players = [player1, player2];

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
    game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
    game.scale.pageAlignHorizontally = true;
    game.scale.pageAlignVertically = true;

    game.world.setBounds(0, 0, 1400, 980);

    game.physics.startSystem(Phaser.Physics.P2JS);

    field = game.add.tileSprite(0, 0, 1400, 980, 'field');
    field.fixedToCamera = true;

    game.input.gamepad.start();

    indicator1 = game.add.sprite(32, 64, 'controller-indicator');
    indicator1.scale.x = indicator1.scale.y = 2;
    indicator1.animations.frame = 1;

    indicator2 = game.add.sprite(1340, 64, 'controller-indicator');
    indicator2.scale.x = indicator2.scale.y = 2;
    indicator2.animations.frame = 1;


    player1 = new Car({
        x: 300,
        y: 490
    }, game.input.gamepad.pad1);
    
    // Ball
    ball = game.add.sprite(700, 490, 'ball');
    ball.scale.setTo(0.8, 0.8);
    game.physics.p2.enable(ball, false);

    ball.body.clearShapes();
    ball.body.addCircle(18);

    ball.body.mass = 0.5;

    // Collisions
    var ballMaterial = game.physics.p2.createMaterial('ballMaterial', ball.body);
    var worldMaterial = game.physics.p2.createMaterial('worldMaterial');

    game.physics.p2.setWorldMaterial(worldMaterial, true, true, true, true);
    var ballVsWorld = game.physics.p2.createContactMaterial(ballMaterial, worldMaterial);

    ballVsWorld.friction = 1.0;
    ballVsWorld.restitution = 0.75;

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

    // Pad "connected or not" indicator
    if (game.input.gamepad.supported && game.input.gamepad.active && game.input.gamepad.pad1.connected) {
        indicator1.animations.frame = 0;
    } else {
        indicator1.animations.frame = 1;
    }
    if (game.input.gamepad.supported && game.input.gamepad.active && game.input.gamepad.pad2.connected) {
        indicator2.animations.frame = 0;
    } else {
        indicator2.animations.frame = 1;
    }

    player1.update();



    // if (!isKickingLeft && !isKickingRight) {
    //     if (cursors.left.isDown) {
    //         car.body.rotateLeft(100);
    //     } else if (cursors.right.isDown) {
    //         car.body.rotateRight(100);
    //     } else {
    //         car.body.setZeroRotation();
    //     }

    //     if (cursors.up.isDown || isBoosting) {
    //         car.body.thrust(thrust);
    //     } else if (cursors.down.isDown) {
    //         car.body.reverse(thrust);
    //     }
    // }

    // if (isKickingRight) {
    //     car.body.rotateRight(500);
    //     if (car.rotation > kickEndRotation) {
    //         isKickingRight = false;
    //     }
    // }

    // if (isKickingLeft) {
    //     car.body.rotateLeft(500);
    //     if (car.rotation < kickEndRotation) {
    //         isKickingLeft = false;
    //     }
    // }

    if (!game.camera.atLimit.x) {
        field.tilePosition.x -= (car.body.velocity.x * game.time.physicsElapsed);
    }

    if (!game.camera.atLimit.y) {
        field.tilePosition.y -= (car.body.velocity.y * game.time.physicsElapsed);
    }
}


function render() {

    game.debug.text("Thrust: " + player1.thrust, 32, 32);
    // game.debug.text("Rotation: " + car.rotation, 32, 64);
    // game.debug.text("EndRotation: " + kickEndRotation, 32, 84);

}

function Car(startPosition, controller) {


    function addButtons() {
        leftTriggerButton = this.controller.getButton(Phaser.Gamepad.XBOX360_LEFT_TRIGGER);
        console.log(leftTriggerButton);
    }

    this.controller = controller;
    this.controller.addCallbacks(this, { onConnect: addButtons });

    // Shadow
    this.shadow = game.add.sprite(startPosition.x, startPosition.y, 'car');
    this.shadow.anchor.set(0.5, 0.2);
    this.shadow.tint = 0x000000;
    this.shadow.alpha = 0.8;

    // Car
    this.car = game.add.sprite(startPosition.x, startPosition.y, 'car');
    this.car.scale.setTo(1, 1.5);

    game.physics.p2.enable(this.car, true);

    this.car.body.damping = 0.95;
    this.car.body.angularDamping = 0.95;

    // Rocket Trail
    this.emitter = game.add.emitter(game.world.centerX, 500, 200);
    this.emitter.makeParticles(['fire1', 'fire2', 'fire3']);

    this.emitter.setRotation(0, 0);
    this.emitter.setAlpha(0.7, 0.2);
    this.emitter.setScale(0.8, 0, 0.8, 0, 3000);
    this.emitter.gravity = 0;

    this.emitter.start(false, 250, 50);
    this.emitter.on = false;

    this.thrust = 0;
    this.totalBoost = 280;

    this.kickRight = function() {
        if (!this.isKickingRight) {
            this.kickEndRotation = (this.car.rotation) + Math.PI * 2;
            this.isKickingRight = true;
        }
    }

    this.kickLeft = function() {
        if (!this.isKickingLeft) {
            this.kickEndRotation = (this.car.rotation) - Math.PI * 2;
            this.isKickingLeft = true;
        }
    }

    this.rightBumper = this.controller.getButton(Phaser.Gamepad.XBOX360_RIGHT_BUMPER);
    this.leftBumper = this.controller.getButton(Phaser.Gamepad.XBOX360_LEFT_BUMPER);
    // this.rightBumper.onDown.add(this.kickRight);
    // this.leftBumper.onDown.add(this.kickLeft);

    this.update = function() {

        this.thrust = 900;
        this.shadow.x = this.car.x;
        this.shadow.y = this.car.y;
        this.shadow.rotation = this.car.rotation;

        this.emitter.x = this.car.x;
        this.emitter.y = this.car.y;

        this.emitter.on = false;

        if (this.controller.isDown(Phaser.Gamepad.XBOX360_DPAD_LEFT) || this.controller.axis(Phaser.Gamepad.XBOX360_STICK_LEFT_X) < -0.1) {
            this.car.body.rotateLeft(100);
        }
        if (this.controller.isDown(Phaser.Gamepad.XBOX360_DPAD_RIGHT) || this.controller.axis(Phaser.Gamepad.XBOX360_STICK_LEFT_X) > 0.1) {
            this.car.body.rotateRight(100);
        }
        if (this.controller.isDown(Phaser.Gamepad.XBOX360_A)) {
            if (this.totalBoost > 0) {
                this.emitter.on = true;
                this.totalBoost = this.totalBoost; // -1;
                //this.boostMeter.width = this.totalBoost;
                isBoosting = true;
                this.thrust = 1800;
            }
        }
        if (this.controller.isDown(Phaser.Gamepad.XBOX360_RIGHT_TRIGGER)){
            this.car.body.thrust(this.thrust)
        }
    }
}