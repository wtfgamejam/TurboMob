create: function() {
    this.game.physics.startSystem(Phaser.Physics.P2JS);
    for (var i = 0; i < 10; i++) {
        var x = (Math.random() * this.game.width) | 0,
            y = (Math.random() * this.game.height) | 0,
            d = 30;
        var s = this.game.add.sprite(x, y, '');
        s.anchor.set(0.5, 0.5);
        this.game.physics.p2.enable(s);
        var p2Shape = s.body.addCircle(d, 0, 0, 0);
        s.body.debug = true;
        this.objects.push({
            sprite: s,
            physicShape: p2Shape
        });
    }
},
update: function() {
    for (var i = 0; i < this.objects.length; i++) {
        var o = this.objects[i]; // same result            //o.sprite.body.setCircle(o.physicShape.radius + 0.1, 0, 0, 0);            o.physicShape.radius += 0.1;            o.physicShape.boundingRadius = o.physicShape.radius;        }    }