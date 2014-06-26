// ==UserScript==
// @name Hider
// @description Hiding excess nodes
// @author https://github.com/ArvenPK
// ==/UserScript==

(function(){

  "use strict";

  function HotKey () {

    var protoKeys = {};
    var pressedKeys = [];

    document.body.addEventListener('keydown', function(e) {
      pressedKeys.push(e.keyCode);
    }, false);

    document.body.addEventListener('keyup', function(e) {
      pressedKeys.splice(pressedKeys.indexOf(e.keyCode), 1);
    }, false);

    document.body.addEventListener('keypress', function() {
      var name = getName(pressedKeys);
      pressedKeys = [];
      if (protoKeys.hasOwnProperty(name)) protoKeys[name].callback();
    }, false);

    function addCombination (comb) {
      if ({}.toString.call(comb.keys) !== '[object Array]' || typeof comb.callback !== 'function') return;
      protoKeys[getName(comb.keys)] = comb;
    }

    function removeCombination (comb) {
      delete protoKeys[getName(comb.keys)];
    }

    function getName (arr) {
      return arr.sort().join('_');
    }

    this.addCombination = addCombination;
    this.removeCombination = removeCombination;

  }

  function Lighter () {

    var ctx = document.createElement('canvas').getContext('2d');
    var img = new Image();
    var colors = {};

    function highlight (elem, to) {
      var from = getCurrentBgColor(elem);
      var opts = {};
      opts.delay = 15;
      opts.duration = 200;
      opts.delta = function(progress) {
        return Math.pow(progress, 3);
      };
      opts.step = function(delta) {
        elem.style.backgroundColor = 'rgb(' +
          Math.max(Math.min(parseInt((delta * (to[0] - from[0])) + from[0], 10), 255), 0) + ',' +
          Math.max(Math.min(parseInt((delta * (to[1] - from[1])) + from[1], 10), 255), 0) + ',' +
          Math.max(Math.min(parseInt((delta * (to[2] - from[2])) + from[2], 10), 255), 0) + ')';
      };
      return animate(opts);
    }

    function getCurrentBgColor(elem) {
      var back;

      while (true) {
        back = getColorFromImage(elem);
        if (back) return back;

        back = getRGBfromHEX(elem);
        if (back) return back;

        if (!elem.parentNode) return [255, 255, 255];
        elem = elem.parentNode;
      }
    }

    function getColorFromImage (elem) {
      try {
        var backImg = elem.currentStyle.backgroundImage;
        var backPos = elem.currentStyle.backgroundPosition;
      } catch (e) {
        return null;
      }

      if (backImg === "none" || backPos !== "0% 0%") return null;

      if (colors.hasOwnProperty(backImg)) return colors[backImg];

      img.onload = function () {
        ctx.drawImage(img, 0, 0, 1, 1);
        try {
          var imgData = ctx.getImageData(0,0,1,1);
          if (imgData) {
            colors[backImg] = [imgData.data[0], imgData.data[1], imgData.data[2]];
          } else {
            delete colors[backImg];
          }
        } catch (e) {
          console.log("Unable to access image data: ");
          console.log(e);
        }
      };
      img.src = backImg.split('"')[1];

      return null;
    }

    function getRGBfromHEX(elem) {
      try {
        var backCol = elem.currentStyle.backgroundColor;
      } catch (e) {
        return null;
      }

      if (backCol === "transparent" || backCol === "inherit") return null;

      if (backCol.charAt(0) !== '#' || backCol.length !== 7) return null;

      var arr = /([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})/g.exec(backCol);
      return (arr) ? [parseInt(arr[1], 16), parseInt(arr[2], 16), parseInt(arr[3], 16)] : null;
    }

    function animate (opts) {
      var timer;
      var start = new Date;
      timer = setInterval(function() {
        var progress = (new Date - start) / opts.duration;
        if (progress > 1) progress = 1;
        opts.step(opts.delta(progress));
        if (progress === 1) clearInterval(timer);
      }, opts.delay || 13);
      return timer;
    }

    this.highlight = highlight;

  }

  function Hider (hotKey, lighter) {

    var isWorking = false;

    var lastTarget = null;
    var lastStyle = "";
    var timer = null;

    var hk = [];
    hk.push({keys:[27], callback:init});
    hk.push({keys:[17,32], callback:hide});

    var listeners = [];
    listeners.push({event:'mouseover', handler:onMouseOver, phase:false});
    listeners.push({event:'click', handler:onClick, phase:false});

    function init (target) {
      if (isWorking) {
        stop();
      } else {
        start(target);
      }
      isWorking = !isWorking;
    }

    function start (target) {
      for (var i = 0; i < listeners.length; i++) {
        document.body.addEventListener(listeners[i].event, listeners[i].handler, listeners[i].phase);
      }
      for (i = 0; i < hk.length; i++) {
        hotKey.addCombination(hk[i]);
      }

      fill(target);
    }

    function stop () {
      cancelFill();

      for (var i = 0; i < listeners.length; i++) {
        document.body.removeEventListener(listeners[i].event, listeners[i].handler, listeners[i].phase);
      }
      for (i = 0; i < hk.length; i++) {
        hotKey.removeCombination(hk[i]);
      }
    }

    function onMouseOver (e) {
      cancelFill();
      fill(e.target);
    }

    function cancelFill () {
      clearInterval(timer);
      if (lastTarget === null) return;
      lastTarget.style.backgroundColor = lastStyle;
      lastTarget = null;
      lastStyle = null;
    }

    function fill (elem) {
      if (elem === null) return;
      lastTarget = elem;
      lastStyle = elem.style.backgroundColor;
      timer = lighter.highlight(elem, [214, 227, 247]);//#D6E3F7
    }

    function onClick (e) {
      e.preventDefault();
      hide();
    }

    function hide () {
      lastTarget.style.display = 'none !important';
    }

    this.init = init;
    this.start = start;
    this.stop = stop;

  }

  document.addEventListener('DOMContentLoaded', function(){

    var target;

    document.body.addEventListener('mousemove', function(e) {
      target = e.target;
    }, false);

    var lighter;
    var hider;
    var hotKey = new HotKey();

    var hkInit = {};
    hkInit.keys = [17,81];
    hkInit.callback = function() {
      if (!lighter) lighter = new Lighter();
      if (!hider) hider = new Hider(hotKey, lighter);
      hider.init(target);
    };

    hotKey.addCombination(hkInit);

  }, false);

})();
