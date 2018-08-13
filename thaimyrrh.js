//Device scaling stuff
var timerSize = 640;

var windowTimerRatio = window.innerWidth / timerSize;

var numberOfTimersPerRow = Math.floor(windowTimerRatio);
var bufferPortion = windowTimerRatio - numberOfTimersPerRow;
var bufferSize = (bufferPortion * timerSize) / (numberOfTimersPerRow + 1)
var scaleFactor = 1;

//If the screen is not wide enough to fit one timer, have one timer that is scaled down
if(numberOfTimersPerRow == 0)
{
    numberOfTimersPerRow = 1;
    bufferPortion = 0;
    bufferSize = 0;
    scaleFactor = windowTimerRatio;
}

var config = {
    type: Phaser.AUTO
    ,width: window.innerWidth
    ,height: window.innerHeight
    ,scene: {
        preload: preload,
        create: create,
        update: update
    }
};

var game = new Phaser.Game(config);

var prevPointerY = 0;
var gameHidden = false;

var timer;

function preload ()
{
    this.load.image('timerBG', 'assets/timerBG.png');
    this.load.image('timerCenter', 'assets/timerCenter.png');
}

function create ()
{
    var worldCenterX = window.innerWidth / 2;
    var worldCenterY = window.innerHeight / 2;

    //Don't know why the actual centerY doesn't properly update?!?!?!?
    var currentCameraY = this.cameras.main.centerY;
    var canDrag = false;

    timer = createTimer(worldCenterX, worldCenterY, scaleFactor, 0x0ff000, this);

    //Make camera to scroll around
    var interpMethod = 'Cubic.easeOut';
    // Set up input
    this.input.on("pointerdown", function (pointer) {
        prevPointerY = pointer.y;
        canDrag = true;
    }, this);

    this.input.on("pointermove", function (pointer) {
        if(canDrag && pointer.y != prevPointerY)
        {
            let newToOldMouseY = prevPointerY - pointer.y;
            let newPos = currentCameraY + newToOldMouseY;
            this.cameras.main.pan(worldCenterX, newPos, 100, interpMethod, true);

            prevPointerY = pointer.y;
            currentCameraY = newPos;
        }
    }, this);

    this.input.on("pointerup", function (pointer) {
        canDrag = false;

        //Kinetic, baby
        if(pointer.y != prevPointerY)
        {
            let newToOldMouseY = prevPointerY - pointer.y;
            let newPos = currentCameraY + newToOldMouseY * 8;
            this.cameras.main.pan(worldCenterX, newPos, 200, interpMethod, true);

            prevPointerY = pointer.y;
            currentCameraY = newPos;
        }
    }, this);
}

function update ()
{
    let remaining = timer.getRemainingTime();

    //Ceiling so that 00;00 really is 0 and not 0 + some fractional part
    let prettySeconds = Math.ceil(remaining / 1000);

    let seconds = prettySeconds % 60;
    let minutes = (prettySeconds / 60) % 60;
    let hours = (prettySeconds / (60 * 60)) % 24;

    function timeFormat(number) {
        let str;
        let length = 2;

        if(number < 10)
        {
            str = number.toString().substr(0,length - 1);
            str = "0" + str;
        }
        else
        {
            str = number.toString().substr(0,length);
        }

        return str;
    }

    let secondString = timeFormat(seconds);
    let minuteString = ':' + timeFormat(minutes) + ':';
    let hourString = timeFormat(hours);

    timer.secondText.setText(secondString);
    timer.minuteText.setText(minuteString);
    timer.hourText.setText(hourString);

    let timeString = hourString + minuteString + secondString;
    if (minutes < 1) {
        timeString = timeString.substr(6, 2);
    }
    else if (hours < 1) {
        timeString = timeString.substr(3, 5);
    }

    if(timer.isStarted())
    {
        let titleString = "TM - " + timeString;

        if (timer.pauseTime > 0)
        {
            titleString += " [Paused]";
        }
        else if(gameHidden)
        {
            titleString += " [Hidden]"
        }

        window.document.title = titleString;
    }
    else
    {
        window.document.title = "Thai Myrrh";
    }

    Phaser.Actions.SetTint(timer.group.getChildren(), 0x0000ff);
}

function createTimer(centerX, centerY, scaleFactor, color, context)
{
    var timer = {
        duration: 1500000
        ,startTime: 0
        ,pauseTime: 0
        ,isPaused: function () {
            return this.pauseTime > 0;
            return something;
        }
        ,pauseToggle: function () {
            if(!this.isPaused())
            {
                this.pauseTime = Date.now();
            }
            else
            {
                this.startTime += (Date.now() - this.pauseTime);
                this.pauseTime = 0;
            }
        }
        ,getRemainingTime: function () {
            let time;
            if(this.isPaused())
            {
                time = this.duration - (this.pauseTime - this.startTime);
            }
            else
            {
                time = this.duration - (Date.now() - this.startTime);
            }

            return Math.max(time, 0);
        }
        ,isStarted: function () {
            return this.getRemainingTime() < this.duration;
        }

        /*
        bg
        ,center
        ,hourText
        ,minuteText
        ,secondText
        ,resetText
        ,editText
        ,group
        */
    };

    timer.group = context.add.group();

    timer.startTime = Date.now();
    timer.pauseTime = timer.startTime;

    timer.bg = timer.group.create(centerX, centerY, 'timerBG').setScale(scaleFactor);
    timer.bg.setTint(color);

    timer.center = timer.group.create(centerX, centerY, 'timerCenter').setScale(scaleFactor).setInteractive();
    timer.center.setTint(color);
    timer.center.on('pointerdown', function (pointer) {
        timer.pauseToggle();
    });

    let fontSizeTime = Math.floor(64 * scaleFactor);
    let fontSizeText = Math.floor(32 * scaleFactor);
    timer.minuteText = context.add.text(centerX, centerY, ':00:', {fontFamily: 'Arial', fontSize: fontSizeTime});
    timer.minuteText.setPosition(timer.minuteText.x - timer.minuteText.displayWidth / 2, timer.minuteText.y - timer.minuteText.displayHeight / 2);
    timer.minuteText.setTint(color);
    timer.group.add(timer.minuteText);

    timer.hourText = context.add.text(centerX, centerY, '00', {fontFamily: 'Arial', fontSize: fontSizeTime});
    timer.hourText.setPosition(timer.hourText.x - timer.hourText.displayWidth - timer.minuteText.displayWidth / 2, timer.hourText.y - timer.hourText.displayHeight / 2);
    timer.hourText.setTint(color);
    timer.group.add(timer.hourText);

    timer.secondText = context.add.text(centerX, centerY, '00', {fontFamily: 'Arial', fontSize: fontSizeTime});
    timer.secondText.setPosition(timer.secondText.x + timer.minuteText.displayWidth / 2, timer.secondText.y - timer.secondText.displayHeight / 2);
    timer.secondText.setTint(color);
    timer.group.add(timer.secondText);

    //
    let timerEdgeBuffer = timer.bg.displayWidth / 30;
    let timerEdgeSafeWidth = centerX + timer.bg.displayWidth/ 2 - timerEdgeBuffer;
    let timerEdgeSafeHeight = centerY + timer.bg.displayHeight / 2 - timerEdgeBuffer;

    timer.resetText = context.add.text(timerEdgeSafeWidth, timerEdgeSafeHeight, 'reset', {fontFamily: 'Arial', fontSize: fontSizeText}).setInteractive();
    timer.resetText.setPosition(timer.resetText.x - timer.resetText.displayWidth, timer.resetText.y - timer.resetText.displayHeight);
    timer.resetText.setTint(color);
    timer.group.add(timer.resetText);
    timer.resetText.on('pointerdown', function () {
        timer.startTime = Date.now();
        timer.pauseTime = timer.startTime;
    });

    timer.editText = context.add.text(centerX - (timer.bg.displayWidth / 2 - timerEdgeBuffer), timerEdgeSafeHeight, 'edit', {fontFamily: 'Arial', fontSize: fontSizeText}).setInteractive();
    timer.editText.setPosition(timer.editText.x, timer.editText.y - timer.editText.displayHeight);
    timer.editText.setTint(color);
    timer.group.add(timer.editText);
    timer.editText.on('pointerdown', function () {
        //Start edit mode
        let secondX = timer.secondText.x;
        let secondY = timer.secondText.y;

        let minuteX = timer.minuteText.x;
        let minuteY = timer.minuteText.y;

        let hourX = timer.hourText.x;
        let hourY = timer.hourText.y;

        context.tweens.add({
            targets: timer.secondText
            ,x: centerX * 5 / 3 - timer.secondText.displayWidth / 2
            ,y: centerY - timer.secondText.displayHeight / 2
            ,duration: 500
            ,ease: "Cubic.easeOut"
        });

        context.tweens.add({
            targets: timer.minuteText
            ,x: centerX - timer.minuteText.displayWidth / 2
            ,y: centerY - timer.minuteText.displayHeight / 2
            ,duration: 500
            ,ease: "Cubic.easeOut"
        });

        context.tweens.add({
            targets: timer.hourText
            ,x: centerX / 3 - timer.hourText.displayWidth / 2
            ,y: centerY - timer.hourText.displayHeight / 2
            ,duration: 500
            ,ease: "Cubic.easeOut"
        });
    });

    game.events.on('hidden', function(){
        gameHidden = true;
    });
    game.events.on('visible', function() {
        gameHidden = false;
    });

    return timer;
}
