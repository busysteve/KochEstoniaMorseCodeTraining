/*
var lesson_seq = "kmrsuaptlo" +
		 "wi.njef0y," +
		 "vg5/q9zh38" +
		 "b?427c1d6x";
*/

var lesson_seq = "estonia" +
		 "drmulch" +
		 "wgkbvj" +
		 "zxpyqf" +
		 ".,/?";

var koch_lessons = lesson_seq.length - 1;

var lesson_letters = "abcdefghijklmnopqrstuvwxyz";

var lesson_chars = "";

var IDLE = "idle";
var PLAYING_EXAMPLE = "example";
var STARTING_LESSON = "starting";
var PLAYING_LESSON = "lesson";
var LESSON_CANCELLED = "cancelled";
var LESSON_ENDING = "ending";

var IDLE_IDLE = { cb: function () {} };
var IDLE_PLAYING_EXAMPLE = {};
var PLAYING_EXAMPLE_IDLE = {};
var IDLE_STARTING_LESSON = {};
var STARTING_LESSON_PLAYING_LESSON = {};
var PLAYING_LESSON_LESSON_ENDING = {};
var LESSON_ENDING_IDLE = {};
var STARTING_LESSON_LESSON_CANCELLED = {};
var PLAYING_LESSON_LESSON_CANCELLED = {};
var LESSON_CANCELLED_IDLE = {};

var valid_transitions = [
	[IDLE, IDLE, IDLE_IDLE],
	[IDLE, PLAYING_EXAMPLE, IDLE_PLAYING_EXAMPLE],
	[PLAYING_EXAMPLE, IDLE, PLAYING_EXAMPLE_IDLE],
	[IDLE, STARTING_LESSON, IDLE_STARTING_LESSON],
	[STARTING_LESSON, PLAYING_LESSON, STARTING_LESSON_PLAYING_LESSON],
	[PLAYING_LESSON, LESSON_ENDING, PLAYING_LESSON_LESSON_ENDING],
	[LESSON_ENDING, IDLE, LESSON_ENDING_IDLE],
	[STARTING_LESSON, LESSON_CANCELLED, STARTING_LESSON_LESSON_CANCELLED],
	[PLAYING_LESSON, LESSON_CANCELLED, PLAYING_LESSON_LESSON_CANCELLED],
	[LESSON_CANCELLED, IDLE, LESSON_CANCELLED_IDLE]
	]
var _sm = IDLE;

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

var min_lesson_words = 20;

function setup2()
{
	var select = document.getElementById("lesson");
	var opt = document.createElement('option');
	opt.value = 0;
	opt.innerHTML = "--";
	select.appendChild(opt);

	for (var i = 1; i <= koch_lessons; ++i) {
		opt = document.createElement('option');
		opt.value = i;
		opt.innerHTML = i < 10 ? ("0" + i) : ("" + i);
		select.appendChild(opt);
	}
	opt = document.createElement('option');
	opt.value = 100;
	opt.innerHTML = "Post-training: all chars";
	select.appendChild(opt);

	opt = document.createElement('option');
	opt.value = 101;
	opt.innerHTML = "Post-training: mostly letters";
	select.appendChild(opt);

	select.value = 0;
}

var configs = {};

function config_params()
{
	var memory = recover_memory();

	if (! memory.tone) {
		memory.tone = 800;
	}
	if (! memory.volume) {
		memory.volume = 25;
	}
	if (! memory.wpm) {
		memory.wpm = 12;
	}
	if (! memory.lesson) {
		memory.lesson = "1";
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

	var wpm_el = document.getElementById("wpm");
	var wpm = parseFloat(wpm_el.value);
	if (! wpm || wpm > 100 || wpm < 1) {
		wpm_el.value = memory.wpm;
		wpm = memory.wpm;
	}

	if (document.getElementById("lesson").value == 0) {
		document.getElementById("lesson").value = memory.lesson;
	}
	var lesson = parseInt(document.getElementById("lesson").value);

	save_memory({"lesson": lesson, "wpm": wpm,
			"volume": volume, "tone": tone});

	lesson = Math.min(koch_lessons, lesson);

	var characters = document.getElementById("characters");
	characters.innerHTML = "";

	for (var i = 0; i <= lesson; ++i) {
		var c = lesson_seq.charAt(i);
		var morsecode = a.code[c.toUpperCase()];

		var f = function (c, morsecode) {
			var span = document.createElement('span');
			var original = "&nbsp;" + c + "&nbsp;";
			span.innerHTML = original;
			characters.appendChild(span);
			characters.appendChild(document.createTextNode(" "));
			var to = null;

			var click_2 = function () {
				play_example(c);
				sch_restore();
			};

			var sch_restore = function() {
				if (to) {
					clearTimeout(to);
				}
				to = setTimeout(restore, 5000);
			};

			var restore = function () {
				span.innerHTML = original;
				span.style.backgroundColor = "";
				span.onclick = click_1;
			};

			var click_1 = function () {
				span.innerHTML = "&nbsp;" + c + "&nbsp;" +
				morsecode + "&nbsp;";
				span.style.backgroundColor = "#840";
				play_example(" " + c);
				span.onclick = click_2;
				sch_restore();
			};

			span.onclick = click_1;
		};
		f(c, morsecode);
	}

	configs['wpm'] = configs['farns'] = wpm;
	configs['volume'] = volume;
	configs['tone'] = tone;
}

function _play(s, cb, initial_delay)
{
	a.input = s;
	a.morse = encode_morse(a.input);

	setup();
	if (audio_status !== 1) {
		bad_browser();
		return;
	}
	config(configs['tone'], configs['volume'] / 100, configs['wpm'],
		configs['farns'], 3, 0.6, 2, 3);

	gen_timeline(a.morse[1], initial_delay);
	start_schedule(cb);
}

function play_example(s)
{
	go_state(PLAYING_EXAMPLE, true, s);
}

IDLE_PLAYING_EXAMPLE.cb = function (s) {
	_play(s, function () {
		go_state(IDLE);
	}, 0);
};

PLAYING_EXAMPLE_IDLE.cb = function () {};

function play_button()
{
	play();
}

function play()
{
	if (is_state(PLAYING_LESSON) || is_state(STARTING_LESSON)) {
		// equivalent to press Cancel button
		cancel();
		return;
	}

	go_state(STARTING_LESSON, true);
}

IDLE_STARTING_LESSON.cb = function () {
	var results = document.getElementById("results");
	results.innerHTML = "";
	var span = document.createElement('span');
	span.style.color = "cyan";
	span.appendChild(document.createTextNode("Starting in 5 seconds..."));
	results.appendChild(span);

	document.getElementById("input").value = "";
	document.getElementById("input").focus();

	var lesson = parseInt(document.getElementById("lesson").value);
	var alphabet = lesson_seq.substr(0, lesson + 1);
	var lesson_length = min_lesson_words * 3 + Math.min(koch_lessons, lesson);
	var cur_lesson_length = 0;

	if (lesson > 100) {
		alphabet += lesson_letters;
		alphabet += lesson_letters;
		alphabet += lesson_letters;
		alphabet += lesson_letters;
	}

	lesson_chars = "";
	for (var i = 0; i < min_lesson_words || cur_lesson_length < lesson_length; ++i) {
		var word_length = Math.floor(Math.random() * 5) + 1;
		for (var j = 0; j < word_length; ++j) {
			var k = Math.floor(Math.random() * alphabet.length);
			var c = alphabet.charAt(k);
			lesson_chars += c;
			cur_lesson_length += 1;
		}
		lesson_chars += " ";
	}

	if (lesson < 101) {
		// make sure that every char appears at least once
		var dirty = true;
		while (dirty) {
			dirty = false;
			for (i = 0; i < alphabet.length; ++i) {
				c = alphabet.charAt(i);
				if (lesson_chars.indexOf(c) >= 0) {
					continue;
				}
				dirty = true;
				k = Math.floor(Math.random() * lesson_chars.length);
				lesson_chars = lesson_chars.substr(0, k) + c +
					lesson_chars.substr(k + 1);
			}
		}
	}

	console.log("Char count: " + lesson_chars.replace(/\s+/g, '').length);
	console.log(lesson_chars);

	if (is_state(STARTING_LESSON)) {
		go_state(PLAYING_LESSON);
	}

	return true;
};

STARTING_LESSON_PLAYING_LESSON.cb = function () {
	var results = document.getElementById("results");
	results.innerHTML = "";
	var span = document.createElement('span');
	span.style.color = "cyan";
	span.appendChild(document.createTextNode("In progress..."));
	results.appendChild(span);
	_play(lesson_chars, end_lesson, 5);
};

function cancel_button()
{
	cancel();
}

function cancel()
{
	go_state(LESSON_CANCELLED, true);
}

PLAYING_LESSON_LESSON_CANCELLED.cb = function () {
	a.timeline = [];
	go_state(IDLE);
};

STARTING_LESSON_LESSON_CANCELLED.cb = function () {
	go_state(IDLE);
};

var end_lesson = function ()
{
	if (is_state(PLAYING_LESSON)) {
		go_state(LESSON_ENDING);
	}
}

PLAYING_LESSON_LESSON_ENDING.cb = function () {
	var results = document.getElementById("results");

	setTimeout(function () {
		results.innerHTML = "";
		var span = document.createElement('span');
		span.style.color = "cyan";
		span.appendChild(document.createTextNode("Lesson ending..."));
		results.appendChild(span);
	}, 1000);

	setTimeout(function () {
		go_state(IDLE);
	}, 6000);
};

LESSON_CANCELLED_IDLE.cb = function () {
	var results = document.getElementById("results");
	results.innerHTML = "";
	var span = document.createElement('span');
	span.style.color = "cyan";
	span.appendChild(document.createTextNode("Lesson canceled"));
	results.appendChild(span);
	return;
};

LESSON_ENDING_IDLE.cb = function() {
	diagnostics();
};

function diagnostics()
{
	results.innerHTML = "";
	var typed_chars_orig = document.getElementById("input").value.toLowerCase();
	var lesson = parseInt(document.getElementById("lesson").value);

	var diff_orig = JsDiff.diffChars(lesson_chars, typed_chars_orig);

	var lesson_chars_nosp = lesson_chars.replace(/ /g, '');
	var typed_chars_nosp = typed_chars_orig.replace(/ /g, '');
	var diff_nosp = JsDiff.diffChars(lesson_chars_nosp, typed_chars_nosp);
	var added_nosp = 0;
	var removed_nosp = 0;
	var tot_nosp = 0;

	diff_nosp.forEach(function (part) {
		for (var i = 0; i < part.value.length; ++i) {
			var c = part.value.charAt(i);
			// only count errors in non-space chars
			if (part.added) {
				added_nosp += 1;
			} else if (part.removed) {
				removed_nosp += 1;
				tot_nosp += 1;
			} else {
				tot_nosp += 1;
			}
		}
	});

	diff_orig.forEach(function (part) {
		for (var i = 0; i < part.value.length; ++i) {
			var c = part.value.charAt(i);
			var color = part.added ? '#00c000' : part.removed ? 'red' : 'black';
			var bcolor = 'white';

			if (c === ' ') {
				bcolor = part.added ? '#aaffaa' : part.removed ? '#ffaaaa' : '#dddddd';
			}
			var span = document.createElement('span');
			span.style.color = color;
			span.style.backgroundColor = bcolor;
			var core = document.createTextNode(c);
			if (part.added) {
				let outer = document.createElement('s');
				outer.style.color = color;
				outer.style.backgroundColor = bcolor;
				outer.appendChild(core);
				core = outer;
			} else if (part.removed) {
				let outer = document.createElement('u');
				outer.style.color = color;
				outer.style.backgroundColor = bcolor;
				core = document.createTextNode(c.toUpperCase());
				outer.appendChild(core);
				core = outer;
			}
			span.appendChild(core);
			results.appendChild(span);
		}
	});

	console.log("Tot chars " + tot_nosp + " added " + added_nosp + " removed " + removed_nosp);
	var hitrate = 1 - (Math.max(added_nosp, removed_nosp) / tot_nosp);

	results.insertBefore(document.createElement('br'), results.firstChild);
	var msgtext = "" + Math.floor(hitrate * 100) + "% correct";
	if (hitrate > 0.9 && lesson < koch_lessons) {
		msgtext += " - moving to next lesson";
		setTimeout(function () {
			document.getElementById("lesson").value = "" + (lesson + 1);
			config_params();
		}, 200);
	}
	var msg = document.createElement('span');
	msg.innerHTML = msgtext;
	msg.style.color = 'cyan';
	results.insertBefore(msg, results.firstChild);
}

function save_memory(params)
{
	var expires = new Date();
	expires.setTime(expires.getTime() + 30*24*60*60*1000);
	// timezone irrelevant
	var sm = "koch=";
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
		if (cv[0] != 'koch') {
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

setup2();
config_params();
