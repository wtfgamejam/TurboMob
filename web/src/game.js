var game = new Phaser.Game(1400, 980, Phaser.AUTO, 'phaser-example', {
    preload: preload,
    create: create,
    update: update,
    render: render
});

WebFontConfig = {

    //  'active' means all requested fonts have finished loading
    //  We set a 1 second delay before calling 'createText'.
    //  For some reason if we don't the browser cannot render the text the first time it's created.
    active: function() {
        game.time.events.add(Phaser.Timer.SECOND, addUI, this);
    },

    //  The Google Fonts we want to load (specify as many as you like in the array)
    google: {
        families: ['Revalia']
    }

};

function preload() {

    game.load.image('field', 'assets/background/soccer_field.jpg');
    game.load.image('car', 'assets/sprites/car.png');
    game.load.image('ball', 'assets/sprites/steel-ball.png');
    game.load.image('goalPosts', 'assets/sprites/goalPosts.png');
    game.load.image('goalArea', 'assets/sprites/goalArea.png');

    game.load.image('fire1', 'assets/particles/fire1.png');
    game.load.image('fire2', 'assets/particles/fire2.png');
    game.load.image('fire3', 'assets/particles/fire3.png');

    game.load.audio('engineLoop', 'assets/sound/engine-loop.wav');
    game.load.audio('boost', 'assets/sound/boost.wav');

    this.game.load.physics('goalPosts', 'assets/physics/goalPosts.json');

    game.load.spritesheet('controller-indicator', 'assets/sprites/controller-indicator.png', 16, 16);

    game.load.script('webfont', '//ajax.googleapis.com/ajax/libs/webfont/1.4.7/webfont.js');
}

var pad1;
var pad2;

var indicator1;
var indicator2;

var player1;
var player2;

var player1Score;
var player2Score;

var goal1;
var goal2;

var ball;

var em;

var player1Start = {
    x: 500,
    y: 488
}
var player2Start = {
    x: 900,
    y: 488
}

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
    game.physics.p2.setImpactEvents(true);

    field = game.add.tileSprite(0, 0, 1400, 980, 'field');
    field.fixedToCamera = true;

    game.input.gamepad.start();

    game.physics.p2.restitution = 0.8;

    playerCollisionGroup = game.physics.p2.createCollisionGroup();
    goalAreaCollisionGroup = game.physics.p2.createCollisionGroup();
    goalPostsCollisionGroup = game.physics.p2.createCollisionGroup();
    ballCollisionGroup = game.physics.p2.createCollisionGroup();

    // GOALS

    goal1 = new Goal({
        x: 60,
        y: game.world.centerY - 3,
        angle: 0,
        tint: 0x992200,
        debug: false,
        name: "goal1"
    });
    goal2 = new Goal({
        x: 1340,
        y: game.world.centerY - 3,
        angle: 180,
        tint: 0x002277,
        debug: false,
        name: "goal2"
    });


    // PLAYER CARS

    player1 = new Player({
        x: player1Start.x,
        y: player1Start.y,
        angle: 90
    }, game.input.gamepad.pad1);

    player2 = new Player({
        x: player2Start.x,
        y: player2Start.y,
        angle: 270
    }, game.input.gamepad.pad2);

    ball = new Ball();

    // Collision Materials

    var ballMaterial = game.physics.p2.createMaterial('ballMaterial', ball.body);
    var worldMaterial = game.physics.p2.createMaterial('worldMaterial');

    game.physics.p2.setWorldMaterial(worldMaterial, true, true, true, true);
    var ballVsWorld = game.physics.p2.createContactMaterial(ballMaterial, worldMaterial);

    ballVsWorld.friction = 1.0;
    ballVsWorld.restitution = 0.4;

    // Collision Groups

    player1.car.body.setCollisionGroup(playerCollisionGroup);
    player2.car.body.setCollisionGroup(playerCollisionGroup);

    ball.body.setCollisionGroup(ballCollisionGroup);

    goal1.goalArea.body.setCollisionGroup(goalAreaCollisionGroup);
    goal2.goalArea.body.setCollisionGroup(goalAreaCollisionGroup);

    goal1.goalPosts.body.setCollisionGroup(goalPostsCollisionGroup);
    goal2.goalPosts.body.setCollisionGroup(goalPostsCollisionGroup);

    // // Collides

    player1.car.body.collides([ballCollisionGroup, goalPostsCollisionGroup, playerCollisionGroup]);
    player2.car.body.collides([ballCollisionGroup, goalPostsCollisionGroup, playerCollisionGroup]);

    goal1.goalArea.body.collides(ballCollisionGroup, ScoreGoal, this);
    goal2.goalArea.body.collides(ballCollisionGroup, ScoreGoal, this);

    goal1.goalPosts.body.collides([ballCollisionGroup, playerCollisionGroup]);
    goal2.goalPosts.body.collides([ballCollisionGroup, playerCollisionGroup]);

    ball.body.collides([goalAreaCollisionGroup, ballCollisionGroup, playerCollisionGroup, goalPostsCollisionGroup]);
    ball.body.collides(goalAreaCollisionGroup, ScoreGoal, this);

    game.physics.p2.updateBoundsCollisionGroup();


    // UI

    indicator1 = game.add.sprite(32, 64, 'controller-indicator');
    indicator1.scale.x = indicator1.scale.y = 2;
    indicator1.animations.frame = 1;

    indicator2 = game.add.sprite(1340, 64, 'controller-indicator');
    indicator2.scale.x = indicator2.scale.y = 2;
    indicator2.animations.frame = 1;

    em = game.add.emitter(game.world.centerX, game.world.centerY, 200);

    em.makeParticles(['fire1', 'fire2', 'fire3']);

    em.minParticleSpeed.set(0, 0);
    em.maxParticleSpeed.set(0, 0);

    em.setRotation(360, -360);
    em.setAlpha(1, 0.1);
    em.setScale(2, 1, 2, 1);
    em.gravity = 0;

    //  false means don't explode all the sprites at once, but instead release at a rate of one particle per 100ms
    //  The 5000 value is the lifespan of each particle before it's killed
    em.start(true, 50, 10)
    em.on = false;
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
    player2.update();

}


function render() {

    // game.debug.text("Thrust: " + player1.thrust, 32, 32);
    // game.debug.text("Rotation: " + player1.car.rotation, 32, 64);
    // game.debug.text("EndRotation: " + player1.kickEndRotation, 32, 84);
    // game.debug.text("RotationDirection: " + player1.rotationDirection, 32, 104);

    // game.debug.text("RotationDirection: " + player1.rotationDirection, 32, 804);
    // game.debug.text("RotationDirection: " + player1.rotationDirection, 32, 834);

}

function Player(startPosition, controller) {

    this.soundMaxVolume = 1.0;
    this.soundCurrentVolume = 0.0;

    // Shadow
    this.shadow = game.add.sprite(startPosition.x, startPosition.y, 'car');
    this.shadow.anchor.set(0.5, 0.2);
    this.shadow.tint = 0x000000;
    this.shadow.alpha = 0.8;

    // Car
    this.car = game.add.sprite(startPosition.x, startPosition.y, 'car');
    this.car.scale.setTo(1, 1.5);

    game.physics.p2.enable(this.car, false);

    this.car.body.damping = 0.9;
    this.car.body.angularDamping = 0.9;

    this.car.body.angle = startPosition.angle;
    this.car.mass = 0.1;

    // Engine Sound
    this.engineSound = game.add.audio('engineLoop', this.soundCurrentVolume, 1);
    this.engineSound.play();

    // Boost Sound
    this.boostSound = game.add.audio('boost', 1);

    // Rocket Trail
    this.emitter = game.add.emitter(game.world.centerX, 500, 200);
    this.emitter.makeParticles(['fire1', 'fire2', 'fire3']);

    this.emitter.setRotation(0, 0);
    this.emitter.setAlpha(0.7, 0.2);
    this.emitter.setScale(0.8, 0, 0.8, 0, 3000);
    this.emitter.gravity = 0;

    this.emitter.start(false, 250, 50);

    this.thrust = 0;
    this.totalBoost = 280;
    this.rotationSpeed = 50;

    this.isKicking = false;
    this.rotationDirection = 0; // 1 = right, -1 = left
    this.kickEndRotation = 0;

    self = this;

    this.controller = controller;

    this.update = function() {

        this.car.body.mass = 1;
        this.thrust = 500;
        this.rotationSpeed = 0;
        this.rotationDirection = 0;
        this.shadow.x = this.car.x;
        this.shadow.y = this.car.y;
        this.shadow.rotation = this.car.rotation;

        this.emitter.x = this.car.x;
        this.emitter.y = this.car.y;

        this.emitter.on = false;

        if (this.controller.isDown(Phaser.Gamepad.XBOX360_DPAD_LEFT) || this.controller.axis(Phaser.Gamepad.XBOX360_STICK_LEFT_X) < -0.1) {
            this.rotationSpeed = 50;
            this.rotationDirection = -1;
        }
        if (this.controller.isDown(Phaser.Gamepad.XBOX360_DPAD_RIGHT) || this.controller.axis(Phaser.Gamepad.XBOX360_STICK_LEFT_X) > 0.1) {
            this.rotationSpeed = 50;
            this.rotationDirection = 1;
        }
        if (this.controller.isDown(Phaser.Gamepad.XBOX360_X)) {
            if (!this.isKicking && this.rotationDirection != 0) {
                this.isKicking = true;
                if (this.rotationDirection < 0) {
                    this.kickEndRotation = (this.car.rotation) + (Math.PI * 2);
                }
                if (this.rotationDirection > 0) {
                    this.kickEndRotation = (this.car.rotation) - (Math.PI * 2);
                }

            }
        }

        if (this.isKicking) {
            this.rotationSpeed = 250;
            this.thrust = 700;
            this.car.body.mass = 1;
            if (this.rotationDirection === -1) {
                if (this.car.rotation < this.kickEndRotation) {
                    this.isKicking = false;
                }
            }
            if (this.rotationDirection === 1) {
                if (this.car.rotation > this.kickEndRotation) {
                    this.isKicking = false;
                }
            }
        }

        // Bost

        if (this.controller.isDown(Phaser.Gamepad.XBOX360_A)) {
            if (this.totalBoost > 0) {
                if (!this.boostSound.isPlaying) {
                    this.boostSound.volume = .3;
                    this.boostSound.play();
                }
                this.emitter.on = true;
                this.totalBoost = this.totalBoost; // -1;
                //this.boostMeter.width = this.totalBoost;
                isBoosting = true;
                this.thrust = 1000;
            }
        } else {
            this.boostSound.fadeOut(250);
        }

        this.engineSound.volume = 0
        if (this.controller.isDown(Phaser.Gamepad.XBOX360_RIGHT_TRIGGER)) {
            if (this.engineSound.volume < this.soundMaxVolume) {
                this.engineSound.volume = 0.5;
            }
            this.car.body.thrust(this.thrust)
        };

        if (this.controller.isDown(Phaser.Gamepad.XBOX360_LEFT_TRIGGER)) {
            if (this.engineSound.volume < this.soundMaxVolume) {
                this.engineSound.volume = 0.5;
            }
            this.car.body.reverse(this.thrust)
        };

        // Add rotation
        this.car.body.rotateRight(this.rotationSpeed * this.rotationDirection);
    }

    return this;
}

function Goal(config) {

    this.goalArea = game.add.sprite(config.x, config.y, 'goalArea', true);
    this.goalArea.name = config.name;

    game.physics.p2.enable(this.goalArea, config.debug);

    this.goalArea.anchor.setTo(0.5, 0.5);
    this.goalArea.tint = config.tint;
    this.goalArea.alpha = 0.5;

    this.goalArea.body.static = true;
    this.goalArea.body.clearShapes();
    this.goalArea.body.addRectangle(14, 168, 0);

    this.goalPosts = game.add.sprite(config.x, config.y, 'goalPosts', true);
    this.goalPosts.tint = config.tint;

    game.physics.p2.enable(this.goalPosts, config.debug);
    this.goalPosts.body.clearShapes();
    this.goalPosts.body.loadPolygon('goalPosts', 'goalPosts');
    this.goalPosts.body.static = true;
    this.goalPosts.anchor.setTo(0.5, 0.5);
    this.goalPosts.body.angle = config.angle;

    return this;

}

function Ball(config) {

    // Ball

    this.ball = game.add.sprite(700, 490, 'ball');
    this.ball.scale.setTo(1, 1);
    game.physics.p2.enable(this.ball, false);

    this.ball.body.clearShapes();
    this.ball.body.addCircle(28);

    this.ball.body.mass = 0.1;
    this.ball.body.damping = 0.3;
    this.ball.body.angularDamping = 0.3;

    return this.ball;
}

function BoostMeter(config) {
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

    return this;
}

function ScoreGoal(a, b) {
    ball.visible = false;

    if (a.sprite.name === "goal1") {
        player2Score.text = parseInt(player2Score.text) + 1;
    }
    if (a.sprite.name === "goal2") {
        player1Score.text = parseInt(player1Score.text) + 1;
    }


    game.add.tween(b.sprite.scale).to({
        x: 8,
        y: 8
    }, 150, Phaser.Easing.Linear.None, true);

    ball.body.setCircle(500);
    ball.body.setCollisionGroup(ballCollisionGroup);
    ball.body.velocity.x = 0;
    ball.body.velocity.y = 0;
    ball.body.static = true;

    game.time.events.add(Phaser.Timer.SECOND * 2, ResetGame, this);

    em.x = ball.body.x;
    em.y = ball.body.y;
    em.on = true;

}

function ResetGame() {

    em.on = false;

    ball.body.x = 700;
    ball.body.y = 488;
    ball.body.static = false;
    ball.body.angle = 0;

    ball.body.mass = 0.1;
    ball.body.damping = 0.3;
    ball.body.angularDamping = 0.3;


    ball.scale.setTo(1, 1);
    ball.visible = true;
    ball.body.setCircle(28);
    ball.body.setCollisionGroup(ballCollisionGroup);


    player1.car.body.x = player1Start.x;
    player1.car.body.y = player1Start.y;
    player1.car.body.angle = 90;

    player2.car.body.x = player2Start.x;
    player2.car.body.y = player2Start.y;
    player2.car.body.angle = 270;


}

function addUI() {
    createText({
        x: 100,
        y: 0,
        txt: "P1:",
        color: '#FF4444'
    });
    createText({
        x: 1020,
        y: 0,
        txt: "P2:",
        color: '#4444FF'
    });

    player1Score = createText({
        x: 200,
        y: 0,
        txt: "0",
        color: '#FF4444'
    });
    player2Score = createText({
        x: 1150,
        y: 0,
        txt: "0",
        color: '#4444FF'
    });

}

function createText(data) {

    this.text = game.add.text(data.x, data.y, data.txt);
    //this.text.anchor.setTo(0.5);

    this.text.font = 'Revalia';
    this.text.fontSize = 60;

    //  x0, y0 - x1, y1
    this.grd = this.text.context.createLinearGradient(0, 0, 0, this.text.canvas.height);
    this.grd.addColorStop(0, data.color);
    this.grd.addColorStop(1, data.color);
    this.text.fill = this.grd;

    this.text.align = 'center';
    this.text.stroke = '#000000';
    this.text.strokeThickness = 2;
    this.text.setShadow(5, 5, 'rgba(0,0,0,0.5)', 5);

    return this.text;

}