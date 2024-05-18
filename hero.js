var _alphabet = "kmrsuaptlo" +
		 "wi.njef0y," +
		 "vg5/q9zh38" +
		 "b?427c1d6x";

var _alphabet_letters = "abcdefghijklmnopqrstuvwxyz";

var alphabet = _alphabet_letters + _alphabet_letters + _alphabet_letters + _alphabet;

var weight = 0.02;

var IDLE = "idle";
var PLAYING = "playing";
var CHARACTER = "character";
var INPUT = "input";
var CORRECT = "correct";
var INCORRECT = "incorrect";
var TIMEOUT = "timeout";
var ENDGAME = "endgame";

var IDLE_IDLE = { cb: function () {} };
var IDLE_PLAYING = {};
var PLAYING_CHARACTER = {};
var CHARACTER_INPUT = {};
var INPUT_CORRECT = {};
var CORRECT_PLAYING = {};
var INPUT_INCORRECT = {};
var INCORRECT_PLAYING = {};
var INCORRECT_ENDGAME = {};
var INPUT_TIMEOUT = {};
var TIMEOUT_ENDGAME = {};
var ENDGAME_PLAYING = {};

var valid_transitions = [
	[IDLE, IDLE, IDLE_IDLE],
	[IDLE, PLAYING, IDLE_PLAYING],
	[PLAYING, CHARACTER, PLAYING_CHARACTER],
	[CHARACTER, INPUT, CHARACTER_INPUT],
	[INPUT, CORRECT, INPUT_CORRECT],
	[CORRECT, PLAYING, CORRECT_PLAYING],
	[INPUT, INCORRECT, INPUT_INCORRECT],
	[INCORRECT, PLAYING, INCORRECT_PLAYING],
	[INCORRECT, ENDGAME, INCORRECT_ENDGAME],
	[INPUT, TIMEOUT, INPUT_TIMEOUT],
	[TIMEOUT, ENDGAME, TIMEOUT_ENDGAME],
	[ENDGAME, PLAYING, ENDGAME_PLAYING],
	];

var _sm = IDLE;

var message = $("#message");
var score = $("#score");
var delay = $("#delay");
var hitrate = $("#hitrate");

function go_state(new_state, soft, arg) {
	for (var i = 0; i < valid_transitions.length; ++i) {
		if (valid_transitions[i][0] === _sm && valid_transitions[i][1] === new_state) {
			console.log("State: " + _sm + " -> " + new_state);
			_sm = new_state;
			if (valid_transitions[i][2].cb) {
				valid_transitions[i][2].cb(arg);
			} else {
				console.log("	warning: no sm handler");
			}
			return true;
		}
	}
	if (soft) {
		console.log("did not change state " + _sm + " -> " + new_state);
	} else {
		console.log("warning: cannot change state: " + _sm + " -> " + new_state);
	}
	return false;
}

function is_state(st) {
	return _sm === st;
}

go_state(IDLE);

var configs = {};

function config_params()
{
	var memory = recover_memory();
	console.log(memory);

	if (! memory.tone) {
		memory.tone = 800;
	}
	if (! memory.volume) {
		memory.volume = 25;
	}
	if (! memory.farns) {
		memory.farns = 20;
	}

	var tone_el = document.getElementById("tone");
	var tone = parseFloat(tone_el.value);
	if (! tone || tone < 20 || tone > 22000) {
		tone_el.value = memory.tone;
		tone = memory.tone;
	}

	var volume_el = document.getElementById("volume");
	var volume = parseFloat(volume_el.value);
	if (! volume || volume > 100 || volume <= 0) {
		volume_el.value = memory.volume;
		volume = memory.volume;
	}

	var farns_el = document.getElementById("farns");
	var farns = parseFloat(farns_el.value);
	if (! farns || farns > 100 || farns < 1) {
		farns_el.value = memory.farns;
		farns = memory.farns;
	}

	save_memory({"farns": farns, "wpm": farns,
			"volume": volume, "tone": tone});

	configs['farns'] = farns;
	configs['wpm'] = farns;
	configs['volume'] = volume;
	configs['tone'] = tone;
}

function _play(s, cb)
{
	a.input = s;
	a.morse = encode_morse(a.input);

	config(configs['tone'], configs['volume'] / 100, configs['wpm'],
		configs['farns'], 3, 0.6, 2, 3);

	gen_timeline(a.morse[1]);
	start_schedule(cb);
}

function recover_memory()
{
	var mem = {};
	var ck = document.cookie.split(';');

	for (var f = 0; f < ck.length; ++f) {
		var cv = ck[f].split('=');
		if (cv.length != 2) {
			continue;
		}
		cv[0] = trim(cv[0]);
		cv[1] = trim(cv[1]);
		if (cv[0] != 'hero') {
			continue;
	        }
		var sm = cv[1].split(' ');
		for (var e = 0; e < sm.length; ++e) {
			var smpair = sm[e].split(':');
			if (smpair.length == 2) {
				mem[smpair[0]] = smpair[1];
			}
		}
	}

	return mem;
}

function save_memory(params)
{
	var expires = new Date();
	expires.setTime(expires.getTime() + 30*24*60*60*1000);
	// timezone irrelevant
	var sm = "hero=";
	for (var nam in params) {
		if (typeof params[nam] !== "function") {
			sm += nam + ":" + params[nam] + " ";
		}
	}
	sm += "; expires=" + expires.toGMTString() + "; path=/";
	document.cookie = sm;
}

function trim(stringToTrim) {
	return stringToTrim.replace(/^\s+|\s+$/g,"");
}

function play_button()
{
	if (is_state(IDLE) || is_state(ENDGAME)) {
		go_state(PLAYING, false);
	} else {
		console.log("button: cannot change to play state");
	}
}

var typing_score = 0;
var typing_hitrate = 1; 
var typing_delay = NaN;
var typing_character;
var typing_timeout_handler;
var typing_timestamp;

ENDGAME_PLAYING.cb = IDLE_PLAYING.cb = function () {
	typing_hitrate = 1;
	typing_score = 0;
	typing_delay = NaN;
	setTimeout(function () {
		go_state(CHARACTER);
	}, 3000);
	message.html("Game starting...");
	setup();
	if (audio_status !== 1) {
		bad_browser();
		return;
	}
	start_continuous_mode();
};

CORRECT_PLAYING.cb = INCORRECT_PLAYING.cb = function () {
	go_state(CHARACTER);
};

PLAYING_CHARACTER.cb = function () {
	var k = Math.floor(Math.random() * alphabet.length);
	typing_character = alphabet.charAt(k);
	_play(typing_character, function () {
		go_state(INPUT);
	});
	return true;
};

CHARACTER_INPUT.cb = function() {
	document.getElementById("typehere").focus();
	document.getElementById("typehere").value = "";
	typing_timeout_handler = setTimeout(function () {
		go_state(TIMEOUT);
	}, 10000);
	typing_timestamp = a.ctx.currentTime;
	return true;
};

document.getElementById("typehere").onkeyup = function () {
	if (is_state(INPUT)) {
		var value = document.getElementById("typehere").value;
		if (value.length < 1) {
			return true;
		}
		clearTimeout(typing_timeout_handler);
		check_correctness(value.charAt(0));
	} else {
		document.getElementById("typehere").value = "";
	}
};

function check_correctness(typed_char) {
	if (typed_char.toUpperCase() === typing_character.toUpperCase()) {
		go_state(CORRECT);
	} else {
		go_state(INCORRECT, false, typed_char);
	}
}

function update_scores()
{
	delay.html("Average time: " + (typing_delay * 1000).toFixed(0) + "ms");
	score.html("Score: " + typing_score + " chars");
	hitrate.html("Hit rate: " + (typing_hitrate * 100).toFixed(1) + "%");
}

INPUT_CORRECT.cb = function () {
	var delay = a.ctx.currentTime - typing_timestamp;
	if (typing_delay !== typing_delay) {
		typing_delay = delay;
	}
	typing_delay = (1 - weight) * typing_delay + weight * delay;
	typing_hitrate = (1 - weight) * typing_hitrate + weight * 1;
	typing_score += 1;
	update_scores();
	message.html("correct");
	go_state(PLAYING);
}

INPUT_INCORRECT.cb = function (typed_char) {
	typing_hitrate = (1 - weight) * typing_hitrate;
	update_scores();
	message.html("char was " + typing_character.toUpperCase() +
			", you typed " + typed_char.toUpperCase());
	if (typing_hitrate < 0.9) {
		_play(ERROR_FATAL, function () {
			go_state(ENDGAME);
		});
	} else {
		_play(ERROR_NONFATAL, function () {
			setTimeout(function () {
				go_state(PLAYING);
			}, 400);
		});
	}
};

INPUT_TIMEOUT.cb = function () {
	_play(ERROR_FATAL, function () {
		go_state(ENDGAME);
	});
};

INCORRECT_ENDGAME.cb = function () {
	message.html("Game over: hit rate below 90%");
	setTimeout(function () {
		stop_continuous_mode();
	}, 1000);
};

TIMEOUT_ENDGAME.cb = function () {
	message.html("Game over by timeout.");
	setTimeout(function () {
		stop_continuous_mode();
	}, 1000);
};

config_params();
set_continuous_mode();
