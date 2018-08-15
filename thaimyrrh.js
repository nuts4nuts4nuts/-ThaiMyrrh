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
var currentCameraY;

var prevPointerY = 0;
var gameHidden = false;
var scrollingEnabled = true;

var timer;

var editGroup;
var editWidth;
var editOptionsX;
var editOptionsWidth;
var editTextHour;
var editTextMinute;
var editTextSecond;
var scrollerHour;
var scrollerMinute;
var scrollerSecond;

var fontSizeTime = Math.floor(64 * scaleFactor);
var fontSizeText = Math.floor(32 * scaleFactor);

function preload ()
{
    this.load.image('timerBG', 'assets/timerBG.png');
    this.load.image('timerCenter', 'assets/timerCenter.png');
}

function create ()
{
    //Don't know why the actual centerY doesn't properly update?!?!?!?
    currentCameraY = this.cameras.main.centerY;

    var worldCenterX = window.innerWidth / 2;
    var worldCenterY = currentCameraY;

    editGroup = this.add.group();
    function makeScroller(context, color, x, y, width, height)
    {
        var scroller = context.add.graphics();
        scroller.fillStyle(color, 1);
        scroller.fillRect(x, y, width, height);
        scroller.setInteractive(new Phaser.Geom.Rectangle(x, y, width, height), Phaser.Geom.Rectangle.Contains);

        function setValueBasedOnHeight (y, maxTime)
        {
            //Short circuit to imitate optional arg maxTime = 23
            maxTime = maxTime || 23;

            let heightFromBottom = height - y;
            let portionOfHeight = heightFromBottom / height;
            let portionOfMaxTime = portionOfHeight * maxTime;

            scroller.setAlpha(portionOfHeight);
        }

        scroller.on("pointerdown", function (pointer) {
            setValueBasedOnHeight(pointer.y);
        }, this);
        scroller.on("pointermove", function (pointer) {

            if(pointer.isDown)
            {
                setValueBasedOnHeight(pointer.y);
            }

        }, this);

        editGroup.add(scroller);

        return scroller;
    }

    editWidth = window.innerWidth * 7 / 8;
    editOptionsX = editWidth;
    editOptionsWidth = window.innerWidth - editOptionsX;

    scrollerHour   = makeScroller(this, 0xff0000, 0, 0, editWidth/3, window.innerHeight);
    scrollerMinute = makeScroller(this, 0x00ff00, editWidth/3, 0, editWidth/3, window.innerHeight);
    scrollerSecond = makeScroller(this, 0x0000ff, editWidth*2/3, 0, editWidth/3, window.innerHeight);
    Phaser.Actions.SetAlpha(editGroup.getChildren(), 0);

    //Floating edit text
    editTextMinute = this.add.text(worldCenterX, worldCenterY, ':00:', {fontFamily: 'Arial', fontSize: fontSizeTime});
    editTextMinute.setOrigin(0.5);
    editTextMinute.setAlpha(0);

    editTextHour = this.add.text(worldCenterX, worldCenterY, '00', {fontFamily: 'Arial', fontSize: fontSizeTime});
    editTextHour.setOrigin(0.5);
    editTextHour.setPosition(editTextHour.x - editTextHour.displayWidth / 2 - editTextMinute.displayWidth / 2, editTextHour.y);
    editTextHour.setAlpha(0);

    editTextSecond = this.add.text(worldCenterX, worldCenterY, '00', {fontFamily: 'Arial', fontSize: fontSizeTime});
    editTextSecond.setOrigin(0.5);
    editTextSecond.setPosition(editTextSecond.x + editTextSecond.displayWidth / 2 + editTextMinute.displayWidth / 2, editTextSecond.y);
    editTextSecond.setAlpha(0);

    editTextMinute.setText("00");

    timer = createTimer(worldCenterX, worldCenterY, scaleFactor, 0x0ff000, this);

    //Make camera to scroll around
    var interpMethod = 'Cubic.easeOut';
    // Set up input
    this.input.on("pointerdown", function (pointer) {
        prevPointerY = pointer.y;
    }, this);
    this.input.on("pointermove", function (pointer) {
        if(scrollingEnabled && pointer.isDown && pointer.y != prevPointerY)
        {
            let newToOldMouseY = prevPointerY - pointer.y;
            let newPos = currentCameraY + newToOldMouseY;
            this.cameras.main.pan(worldCenterX, newPos, 100, interpMethod, true);

            prevPointerY = pointer.y;
            currentCameraY = newPos;
        }
    }, this);
    this.input.on("pointerup", function (pointer) {
        //Kinetic, baby
        if(scrollingEnabled && pointer.y != prevPointerY)
        {
            let newToOldMouseY = prevPointerY - pointer.y;
            let newPos = currentCameraY + newToOldMouseY * 16;
            this.cameras.main.pan(worldCenterX, newPos, 400, interpMethod, true);

            prevPointerY = pointer.y;
            currentCameraY = newPos;
        }
    }, this);
}

function setTimer(remaining, secondText, minuteText, hourText)
{
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
    let minuteString = timeFormat(minutes);
    let hourString = timeFormat(hours);

    secondText.setText(secondString);
    minuteText.setText(minuteString);
    hourText.setText(hourString);

    let timeString = hourString + minuteString + secondString;
    if (minutes < 1) {
        timeString = timeString.substr(6, 2);
    }
    else if (hours < 1) {
        timeString = timeString.substr(3, 5);
    }

    return timeString;
}

function update ()
{
    let remaining = timer.getRemainingTime();

    let timeString = setTimer(remaining, timer.secondText, timer.minuteText, timer.hourText);

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
}

function createTimer(centerX, centerY, scaleFactor, color, context)
{
    var timer = {
        duration: 1500000
        ,startTime: 0
        ,pauseTime: 0
        ,isPaused: function () {
            return this.pauseTime > 0;
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

    function placeTimerText(timerText, posX, posY)
    {
        timerText.setOrigin(0.5);
        timerText.setPosition(posX, posY);
        timerText.setTint(color);
        timer.group.add(timerText);
    }

    timer.minuteText = context.add.text(centerX, centerY, ':00:', {fontFamily: 'Arial', fontSize: fontSizeTime});
    placeTimerText(timer.minuteText, centerX, centerY);

    timer.hourText = context.add.text(centerX, centerY, '00', {fontFamily: 'Arial', fontSize: fontSizeTime});
    placeTimerText(timer.hourText, timer.hourText.x - timer.hourText.displayWidth/2 - timer.minuteText.displayWidth / 2, timer.hourText.y);

    timer.secondText = context.add.text(centerX, centerY, '00', {fontFamily: 'Arial', fontSize: fontSizeTime});
    placeTimerText(timer.secondText, timer.secondText.x + timer.secondText.displayWidth/2 + timer.minuteText.displayWidth / 2, timer.secondText.y);

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

        scrollingEnabled = false;
        function setupEditText(editText, textToMimic)
        {
            editText.setPosition(textToMimic.x, textToMimic.y);
            editText.setAlpha(1);
            editText.setTint(color)
            textToMimic.setAlpha(0);
        }

        setupEditText(editTextSecond, timer.secondText);
        setupEditText(editTextMinute, timer.minuteText);
        setupEditText(editTextHour, timer.hourText);

        setTimer(timer.getRemainingTime(), editTextSecond, editTextMinute, editTextHour);

        let editCenterX = editWidth / 2;

        context.tweens.add({
            targets: editTextSecond
            ,x: editCenterX * 5 / 3
            ,y: centerY
            ,duration: 500
            ,ease: "Cubic.easeOut"
        });

        context.tweens.add({
            targets: editTextMinute
            ,x: editCenterX
            ,y: centerY
            ,duration: 500
            ,ease: "Cubic.easeOut"
        });

        context.tweens.add({
            targets: editTextHour
            ,x: editCenterX / 3
            ,y: centerY
            ,duration: 500
            ,ease: "Cubic.easeOut"
        });

        [editTextSecond, editTextMinute, editTextHour].forEach(function (item)
        {
            item.setTint(0xffffff);
        });

        context.tweens.add({
            targets: timer.group.getChildren()
            ,alpha: 0
            ,duration: 700
            ,ease: "Cubic.easeOut"
        });

        context.tweens.add({
            targets: editGroup.getChildren()
            ,alpha: 1
            ,duration: 700
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
