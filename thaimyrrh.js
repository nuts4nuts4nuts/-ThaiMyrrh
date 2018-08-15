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
  ,backgroundColor: '#212121'
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

var editModeGroup;
var editWidth;
var editOptionsX;
var editOptionsWidth;
var scrollerHour;
var scrollerMinute;
var scrollerSecond;
var editOK;
var editDel;

var editTextHour;
var editTextMinute;
var editTextSecond;

var editTimer;

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

  editModeGroup = this.add.group(); //For the future maybe this should be a container

  function makeScroller(context, color, x, y, width, height, associatedTimeText, maxTime)
  {
    var scroller = context.add.graphics();
    scroller.fillStyle(color, 1);
    scroller.fillRect(x, y, width, height);
    scroller.setInteractive(new Phaser.Geom.Rectangle(x, y, width, height), Phaser.Geom.Rectangle.Contains);

    function setValueBasedOnHeight (y)
    {
      let heightFromBottom = height - y;
      let portionOfHeight = heightFromBottom / height;
      let portionOfMaxTime = Math.round(portionOfHeight * maxTime);

      scroller.setAlpha(portionOfHeight);
      associatedTimeText.setText(timeFormat(portionOfMaxTime));
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

    editModeGroup.add(scroller);

    return scroller;
  }

  editWidth = window.innerWidth * 7 / 8;
  editOptionsX = editWidth;
  editOptionsWidth = window.innerWidth - editOptionsX;

  editOK = this.add.text(worldCenterX, worldCenterY, 'OK', {fontFamily: 'Arial', fontSize: fontSizeTime});
  editOK.setOrigin(0.5);
  editOK.setPosition(((editOptionsX*2 + editOptionsWidth) / 2), window.innerHeight - editOK.displayHeight/2);
  editOK.setInteractive();
  editOK.on('pointerdown', function()
  {
    leaveEditMode(this);
  }, this);
  editModeGroup.add(editOK);

  //Floating edit text
  editTextMinute = this.add.text(worldCenterX, worldCenterY, ':00:', {fontFamily: 'Arial', fontSize: fontSizeTime});
  editTextMinute.setOrigin(0.5);
  editTextMinute.setAlpha(0);
  editTextMinute.setDepth(1);

  editTextHour = this.add.text(worldCenterX, worldCenterY, '00', {fontFamily: 'Arial', fontSize: fontSizeTime});
  editTextHour.setOrigin(0.5);
  editTextHour.setPosition(editTextHour.x - editTextHour.displayWidth / 2 - editTextMinute.displayWidth / 2, editTextHour.y);
  editTextHour.setAlpha(0);
  editTextHour.setDepth(1);

  editTextSecond = this.add.text(worldCenterX, worldCenterY, '00', {fontFamily: 'Arial', fontSize: fontSizeTime});
  editTextSecond.setOrigin(0.5);
  editTextSecond.setPosition(editTextSecond.x + editTextSecond.displayWidth / 2 + editTextMinute.displayWidth / 2, editTextSecond.y);
  editTextSecond.setAlpha(0);
  editTextSecond.setDepth(1);

  editTextMinute.setText("00");

  scrollerHour   = makeScroller(this, 0xff0000, 0, 0, editWidth/3, window.innerHeight, editTextHour, 23);
  scrollerMinute = makeScroller(this, 0x00ff00, editWidth/3, 0, editWidth/3, window.innerHeight, editTextMinute, 59);
  scrollerSecond = makeScroller(this, 0x0000ff, editWidth*2/3, 0, editWidth/3, window.innerHeight, editTextSecond, 59);

  Phaser.Actions.SetAlpha(editModeGroup.getChildren(), 0);

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

function setTimer(remaining, secondText, minuteText, hourText)
{
  //Ceiling so that 00:00 really is 0 and not 0 + some fractional part
  let prettySeconds = Math.ceil(remaining / 1000);

  let seconds = prettySeconds % 60;
  let minutes = (prettySeconds / 60) % 60;
  let hours = (prettySeconds / (60 * 60)) % 24;

  let secondString = timeFormat(seconds);
  let minuteString = timeFormat(minutes);
  let hourString = timeFormat(hours);

  secondText.setText(secondString);
  minuteText.setText(minuteString);
  hourText.setText(hourString);

  let timeString = hourString + ':' + minuteString + ':' + secondString;
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
    let titleString = "";
    if(timeString === "00")
    {
      titleString = "TM - DONE!";
    }
    else
    {
      titleString = "TM - " + timeString;
      if (timer.pauseTime > 0)
      {
        titleString += " [Paused]";
      }
      else if(gameHidden)
      {
        titleString += " [Hidden]"
      }
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
  let colonL = context.add.text(centerX, centerY, ':', {fontFamily: 'Arial', fontSize: fontSizeTime});
  placeTimerText(colonL, colonL.x + colonL.displayWidth/2 - timer.minuteText.displayWidth / 2, centerY);
  let colonR = context.add.text(centerX, centerY, ':', {fontFamily: 'Arial', fontSize: fontSizeTime});
  placeTimerText(colonR, colonR.x - colonR.displayWidth/2 + timer.minuteText.displayWidth / 2, centerY);

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

    editTimer = timer;

    scrollingEnabled = false;
    function setupEditText(editText, textToMimic)
    {
      editText.setPosition(textToMimic.x, textToMimic.y);
    }

    setupEditText(editTextSecond, timer.secondText);
    setupEditText(editTextMinute, timer.minuteText);
    setupEditText(editTextHour, timer.hourText);

    setTimer(timer.getRemainingTime(), editTextSecond, editTextMinute, editTextHour);

    let editCenterX = editWidth / 2;

    scrollerHour.setPosition(scrollerHour.x, currentCameraY - window.innerHeight/2);
    scrollerMinute.setPosition(scrollerMinute.x, currentCameraY - window.innerHeight/2);
    scrollerSecond.setPosition(scrollerSecond.x, currentCameraY - window.innerHeight/2);
    editOK.setPosition(((editOptionsX*2 + editOptionsWidth) / 2), currentCameraY + window.innerHeight/2 - editOK.displayHeight/2);

    context.tweens.add({
      targets: [editTextSecond, editTextMinute, editTextHour]
      ,alpha: 1
      ,duration: 200
      ,ease: "Cubic.easeOut"
    });

    context.tweens.add({
      targets: timer.group.getChildren()
      ,alpha: 0
      ,duration: 200
      ,ease: "Cubic.easeOut"
      ,onComplete: function()
      {
        context.tweens.add({
          targets: editTextSecond
          ,x: editCenterX * 5 / 3
          ,y: currentCameraY
          ,duration: 200
          ,ease: "Cubic.easeOut"
        });

        context.tweens.add({
          targets: editTextMinute
          ,x: editCenterX
          ,y: currentCameraY
          ,duration: 200
          ,ease: "Cubic.easeOut"
        });

        context.tweens.add({
          targets: editTextHour
          ,x: editCenterX / 3
          ,y: currentCameraY
          ,duration: 200
          ,ease: "Cubic.easeOut"
          ,onComplete: function()
          {
            context.tweens.add({
              targets: scrollerSecond
              ,alpha: Math.max(0.01, parseInt(timer.secondText.text, 10) / 59)
              ,duration: 300
              ,ease: "Cubic.easeOut"
            });
            context.tweens.add({
              targets: scrollerMinute
              ,alpha: Math.max(0.01, parseInt(timer.minuteText.text, 10) / 59)
              ,duration: 300
              ,ease: "Cubic.easeOut"
            });
            context.tweens.add({
              targets: scrollerHour
              ,alpha: Math.max(0.01, parseInt(timer.hourText.text, 10) / 23)
              ,duration: 300
              ,ease: "Cubic.easeOut"
            });
            context.tweens.add({
              targets: editOK
              ,alpha: 1
              ,duration: 300
              ,ease: "Cubic.easeOut"
            });
          }
        });
      }
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

function leaveEditMode(context)
{
  scrollingEnabled = true;

  //Convert edit text back to time remaining
  let seconds = parseInt(editTextSecond.text, 10)
  let minutes = parseInt(editTextMinute.text, 10)
  let hours = parseInt(editTextHour.text, 10)

  let remaining = (seconds * 1000) + (minutes * 60 * 1000) + (hours * 60 * 60 * 1000);

  editTimer.duration = remaining;
  editTimer.startTime = Date.now();
  editTimer.pauseTime = Date.now();

  context.tweens.add({
    targets: editModeGroup.getChildren()
    ,alpha: 0
    ,duration: 200
    ,ease: "Cubic.easeOut"
    ,onComplete: function() {
      context.tweens.add({
        targets: editTextSecond
        ,x: editTimer.secondText.x
        ,y: editTimer.secondText.y
        ,duration: 200
        ,ease: "Cubic.easeOut"
      });

      context.tweens.add({
        targets: editTextMinute
        ,x: editTimer.minuteText.x
        ,y: editTimer.minuteText.y
        ,duration: 200
        ,ease: "Cubic.easeOut"
      });

      context.tweens.add({
        targets: editTextHour
        ,x: editTimer.hourText.x
        ,y: editTimer.hourText.y
        ,duration: 200
        ,ease: "Cubic.easeOut"
        ,onComplete: function()
        {
          context.tweens.add({
            targets: editTimer.group.getChildren()
            ,alpha: 1
            ,duration: 300
            ,ease: "Cubic.easeOut"
          });

          context.tweens.add({
            targets: [editTextHour, editTextMinute, editTextSecond]
            ,alpha: 0
            ,duration: 300
            ,ease: "Cubic.easeOut"
          });
        }
      });
    }
  });
}