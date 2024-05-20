var audio_status = 0;
var a = {};
var sample = 0;
var SAMPLE_RATE = 48000;

a.playing = false;
a.continuous = false;
a.filter = null;
a.filter_volume = 0;

var ERROR_NONFATAL = '×';
var ERROR_FATAL = '÷'; 

var code = {'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.',
	'F': '..-.', 'G': '--.', 'H': '....', 'I': '..', 'J': '.---',
	'K': '-.-', 'L': '.-..', 'M': '--', 'N': '-.', 'O': '---',
	'P': '.--.', 'Q': '--.-', 'R': '.-.', 'S': '...', 'T': '-',
	'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-', 'Y': '-.--',
	'Z': '--..',
	'0': '-----',           ',': '--..--',
	'1': '.----',           '.': '.-.-.-',
	'2': '..---',           '?': '..--..',
	'3': '...--',           ';': '-.-.-.',
	'4': '....-',           ':': '---...',
	'5': '.....',           "'": '.----.',
	'6': '-....',           '-': '-....-',
	'7': '--...',           '/': '-..-.',
	'8': '---..',           '(': '-.--.-',
	'9': '----.',           ')': '-.--.-',
	' ': ' ',               '_': '..--.-',
	'@': '.--.-.',          '$': '...-..-',
	'&': '.-...',           '!': '-.-.--',
	'\n': '\n',
	'×': 'ee',
	'÷': 'fff',
};

a.code = code;

var nonascii = [
		['çÇ©',        'C'],
		['ñÑ',         'N'],
		['ÁÃÀÂÄáãàâä', 'A'],
		['ÉÈÊËéèêë',   'E'],
		['ÍÌÎÏíìîï',   'I'],
		['ÓÒÔÖÕóòôöõ', 'O'],
		['ÚÙÛÜúùûü',   'U'],
		['',		'AP']];

a.nonascii = nonascii;

function setup_filter()
{
	if (a.filter) {
		return;
	}

	var myvolume = 0;
	a.filter = a.ctx.createScriptProcessor(4096, 1, 1);

	a.filter.onaudioprocess = function(e) {
		var input = e.inputBuffer.getChannelData(0);
		var output = e.outputBuffer.getChannelData(0);
		for (var i = 0; i < 4096; i++) {
			if (myvolume < a.filter_volume) {
				myvolume += 0.0001 * a.filter_volume;
			} else if (myvolume > a.filter_volume) {
				myvolume *= 0.9999;
			}
			output[i] = input[i] + 0.3 * myvolume * Math.random();
		}
	}

	a.lpfilter = a.ctx.createBiquadFilter();
	a.lpfilter.type = "lowpass";
	a.lpfilter.frequency.value = 2000;
	a.lpfilter.Q.value = 4;

	a.filter.connect(a.lpfilter);
	a.lpfilter.connect(a.ctx.destination);
}

function ramp(pos, length, dotlength)
{
	/*
	Generates a fadein/fadeout ramp for sound
	*/

	var rvolume = 1.0;
	var fadein = Math.min(SAMPLE_RATE * 0.002, 0.1 * dotlength);
	var fadeout = length - fadein;
	if (pos < fadein) {
		rvolume = pos / fadein;
	} else if (pos > fadeout) {
		rvolume = (length - pos) / fadein;
	}

	rvolume = Math.sin(Math.PI * rvolume / 2);
	rvolume *= rvolume;
		
	return rvolume;
}

function generate_float_wave(freq, volume, duration, dotduration)
{
	var sduration = Math.floor(SAMPLE_RATE * duration);
	var sdotduration = Math.floor(SAMPLE_RATE * dotduration);
	var samples = a.ctx.createBuffer(1, sduration, SAMPLE_RATE);
	var s = samples.getChannelData(0);

	for (var i = 0; i < sduration; ++i) {
		s[i] = Math.sin(freq * (i / SAMPLE_RATE) * Math.PI * 2) 
			* volume * ramp(i, sduration, sdotduration);
		s[i] += Math.sin(freq * 2 * (i / SAMPLE_RATE) * Math.PI * 2) 
			* volume * ramp(i, sduration, sdotduration) * 0.1;
	}

	return samples;
}

function cast_alphabet(input)
{
	/*
	Filters a text message for Morse encoding.
	The input should be Unicode.
	Characters that have no Morse symbol are removed.

	Some Latin characters like "é" are converted to the
	non-accented version ("e") to mitigate the loss. See
	module.nonascii tuple for details.
	*/

	input = input.toUpperCase();
	var output = "";
	for (var i = 0; i < input.length; ++i) {
		var c = input[i];
		for (var j = 0; j < nonascii.length; ++j) {
			var chars = nonascii[j][0];
			var replacement = nonascii[j][1];
			if (chars.indexOf(c) != -1) {
				c = replacement;
				break;
			}
		}
		if (code[c]) {
			output += c;
		}
	}

	return output;
}


var cfg = {};
cfg['.'] = 1.0;

function make_audio_samples()
{
	/*
	Prepares audio samples.
	*/

	var dot_duration = cfg['WPM_DOT_LENGTH'] * cfg['.'];
	var dash_duration = cfg['WPM_DOT_LENGTH'] * cfg['-'];
	var interbit_duration = cfg['WPM_DOT_LENGTH'] * cfg['i'];
	var space_duration = cfg['WPM_DOT_LENGTH'] * cfg[' '];
	var interword_duration = cfg['FARNS_DOT_LENGTH'] * cfg['w'];

	var err_dot_duration =  0.05 * cfg['.'];
	var err_dash_duration = 0.05 * cfg['-'];

	cfg['sample.'] = generate_float_wave(cfg['freq'], cfg['volume'], dot_duration, dot_duration);
	cfg['sample-'] = generate_float_wave(cfg['freq'], cfg['volume'], dash_duration, dot_duration);
	cfg['samplee'] = generate_float_wave(cfg['freq'] / 1.4, cfg['volume'], err_dot_duration, err_dot_duration);
	cfg['samplef'] = generate_float_wave(cfg['freq'] / 1.4, cfg['volume'], err_dash_duration, err_dot_duration);

	cfg['duration.'] = dot_duration;
	cfg['duration-'] = dash_duration;
	cfg['duratione'] = err_dot_duration;
	cfg['durationf'] = err_dash_duration;
	cfg['durationi'] = interbit_duration;
	cfg['duration '] = space_duration;
	cfg['durationw'] = interword_duration;
}

function config(freq, volume, qrn_volume, wpm, farns, dash, interbit, intersymbol, interword)
{
	/*
	Configure Morse code sound and rhythm.

	freq: beep frequency, in Hz. Default 800Hz

	volume: volume between 0.0 and 1.0. Default: 0.25

	wpm: speed in words per minute. Default: 20.0

		 Dot sound length will be made = 1.42 / wpm,
		 so e.g. 20 WPM translates to a dot of ~70ms,
		 and all the rest will be proportional to this.

        farns: Fansworth compression, expressed in wpm

		 Regulates the signalling speed. If hither than wpm,
             the signalling will be played in 'farns' speed but
             the intersymbol space is proportional to 'wpm'.

	dash: dash sound length, in dots. Default: 3 times a dot.

	interbit: silence between Morse dits and dats, in dots. Default: 0.6 dots.

	intersymbol: silence between two letters, in dots. Default: 2 dots.

	interword: silence between two words (space), in dots. Default: 3 dots
	*/

	farns = Math.min(wpm, (farns ? farns : wpm));

	cfg['compensation'] = 1;

	cfg['WPM'] = wpm;
	cfg['FARNS'] = farns;
	cfg['WPM_DOT_LENGTH'] = 1.42 / wpm / cfg['compensation'];
	cfg['FARNS_DOT_LENGTH'] = 1.42 / farns / cfg['compensation'];
	cfg['-'] = dash;
	cfg['i'] = interbit;
	cfg[' '] = intersymbol;
	cfg['w'] = interword;
	cfg['freq'] = freq;
	cfg['volume'] = volume;
	cfg['qrn_volume'] = qrn_volume;

	make_audio_samples();
}

function encode_morse(input)
{
	// Coerce the message into the supported alphabet.
	// See "nonascii" tuple.
	input = cast_alphabet(input);
	var output = "";
	for (var i = 0; i < input.length; ++i) {
		var c = input[i];
		var k = code[c];
		if (! k) {
			continue;
		}
		output += k;
		if (k != ' ') {
			output += ' ';
		}
	}
	return [input, output];
}

function gen_timeline(bits, initial_delay)
{
	if (! initial_delay) {
		initial_delay = 0;
	}
	a.timeline = [];
	var timestamp = initial_delay;
	var lastbit = "#";
	var interword = false;

	for (var i = 0; i < bits.length; ++i) {
		var bit = bits[i];
		if (bit == "\n") {
			bit = " ";
		}
		if (lastbit == "." || lastbit == "-" || lastbit == "e" || lastbit == "f") {
			timestamp += cfg['duration' + 'i'];
		}

		if (cfg['sample' + bit]) {
			a.timeline.push([cfg['sample' + bit], timestamp, cfg['duration' + bit]]);
		}

		if (bit == ' ' && lastbit == ' ') {
			// just add inter-word
			if (!interword) {
				timestamp += cfg['durationw'];
				interword = true;
			}
		} else {
			timestamp += cfg['duration' + bit];
			interword = false;
		}
		lastbit = bit;
	}
}

function schedule()
{
	var now = a.ctx.currentTime;
	// schedule up to 0.33 second ahead current time
	var sch_limit = now + 0.33;
	var last_note_finishes_at = now;

	while (a.timeline_pos < a.timeline.length) {
		var sample = a.timeline[a.timeline_pos][0];
		var timestamp = a.timeline[a.timeline_pos][1] + a.currentTime0;
		var duration = a.timeline[a.timeline_pos][2];

		if (timestamp > sch_limit) {
			// ok, we have scheduled enough
			setTimeout(schedule, 100);
			return;
		} else if (timestamp < now) {
			// we are late! try to compensate that so at least we avoid
			// all samples mounting together immediately
			var delay = now - timestamp + 0.2;
			console.log("Corrective delay " + delay);
			a.currentTime0 += delay;
			timestamp += delay;
		}

		var node = a.ctx.createBufferSource();
		node.buffer = sample;
		node.connect(a.filter);
		node.start ? node.start(timestamp) : node.noteOn(timestamp);
		++a.timeline_pos;
		// console.log(timestamp, sch_limit);

		last_note_finishes_at = timestamp + duration;
	}

	// end of timeline

	setTimeout(function () {
		a.playing = false;
		a.timeline = [];
		if (! a.continuous) {
			stop_filter();
		}
		if (a.end_cb) {
			var cb = a.end_cb;
			a.end_cb = null;
			cb();
		}
	}, 333 + 1000 * (last_note_finishes_at - now));
}

function start_schedule(end_cb)
{
	a.ctx.resume().then(function () {
		start_filter();
		a.currentTime0 = a.ctx.currentTime + (a.continuous ? 0.2 : 0.6);
		a.timeline_pos = 0;
		a.playing = true;
		a.end_cb = end_cb;
		schedule();
	});
}

function start_filter()
{
	setup_filter();
	a.filter_volume = cfg["qrn_volume"];
}

function stop_filter()
{
	a.filter_volume = 0;
}

function start_continuous_mode()
{
	start_filter();
}

function stop_continuous_mode()
{
	stop_filter();
}

function bad_browser()
{
	alert("Your browser does not support Audio API (HTML5).\nPlease use a compatible browser e.g. Chrome with Audio API enabled in page about:flags\n\nMorse encoding to text can still be used.");
}

function setup()
{
	if (audio_status) {
		return;
	}
	
	console.log("setup");

	if (! window.AudioContext) {
		if (! window.webkitAudioContext) {
			audio_status = 2;
			bad_browser();
			return;
		}
		window.AudioContext = window.webkitAudioContext;
		window.AudioNode = window.webkitAudioNode;
	}

	a.ctx = new AudioContext();

	audio_status = 1;
}

function set_continuous_mode()
{
	a.continuous = true;
}
