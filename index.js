var stop_sch_ui = function ()
{
	document.getElementById("button").innerHTML = "Play audio";
}

var start_sch_ui = function ()
{
	document.getElementById("button").innerHTML = "Stop audio";
}

var configs = {};

function config_params()
{
	var tone_el = document.getElementById("tone");
	var tone = parseFloat(tone_el.value, 10);
	if (! tone || tone < 20 || tone > 22000) {
		tone_el.value = 800;
		tone = 800;
	}

	var volume_el = document.getElementById("volume");
	var volume = parseFloat(volume_el.value);
	if (! volume || volume > 100 || volume <= 0) {
		volume_el.value = 25;
		volume = 25;
	}

	var wpm_el = document.getElementById("wpm");
	var wpm = parseFloat(wpm_el.value);
	if (! wpm || wpm > 100 || wpm < 1) {
		wpm_el.value = 12;
		wpm = 12;
	}

	var farns_el = document.getElementById("farns");
	var farns = parseFloat(farns_el.value);
	if (! farns || farns > 100 || farns < 1 || farns < wpm) {
		farns_el.value = Math.max(20, wpm);
		farns = Math.max(20, wpm);
	}

	configs['farns'] = farns;
	configs['wpm'] = wpm;
	configs['volume'] = volume;
	configs['tone'] = tone;
}

function encode()
{
	a.input = document.getElementById("input").value;
	a.morse = encode_morse(a.input);
	// document.getElementById("input").value = a.morse[0];
	document.getElementById("output").value = a.morse[1];

	return true;
}

function play()
{
	document.getElementById("player_div").innerHTML = "";

	if (a.playing) {
		a.timeline = [];
		return;
	}

	encode();

	setup();
	if (audio_status !== 1) {
		bad_browser();
		return;
	}

	config(configs['tone'], configs['volume'] / 100, configs['wpm'],
		configs['farns'], 3, 0.6, 2, 3);

	gen_timeline(a.morse[1]);
	start_sch_ui();
	start_schedule(stop_sch_ui);

	return true;
}

function genwav()
{
	document.getElementById("player_div").innerHTML = "";

	if (a.playing) {
		a.timeline = [];
		return;
	}

	encode();
	gen_timeline(a.morse[1]);
	generate_wav();

	return true;
}

// Based on https://www.sk89q.com/playground/jswav/ code

function generate_wav()
{
	var bitsPerSample = 16;
	var fdata = [];
	var mytime = 0;
	var vol = cfg["volume"];
	var border = 1.5 * SAMPLE_RATE;

	for (var i = 0; i < border; i++) {
		var volup = vol * i / border;
		fdata.push(Math.random() * 0.3 * volup);
	}
   
	for (var i = 0; i < a.timeline.length; i++) {
		var bit_samples = a.timeline[i][0].getChannelData(0);
		var bit_attime = a.timeline[i][1];

		/* silence */
		if (mytime < bit_attime) {
			for (var k = 0; k < (SAMPLE_RATE * (bit_attime - mytime)); ++k) {
				fdata.push(Math.random() * 0.3 * vol);
			}
		}
		mytime = bit_attime;

		/* sample copying */
		for (var j = 0; j < bit_samples.length; ++j) {
			fdata.push(bit_samples[j] + Math.random() * 0.3 * vol);
		}
		mytime += bit_samples.length / SAMPLE_RATE;
	}

	for (var i = 0; i < border / 2; i++) {
		fdata.push(Math.random() * 0.3 * vol);
	}
	for (var i = 0; i < border / 2; i++) {
		var voldown = vol - 2 * vol * i / border;
		fdata.push(Math.random() * 0.3 * voldown);
	}
	for (var i = 0; i < border / 2; i++) {
		fdata.push(0);
	}

   	var samples = fdata.length;

	if (! window.OfflineAudioContext) {
		window.OfflineAudioContext = window.webkitOfflineAudioContext;
	}
	var octx = new window.OfflineAudioContext(1, samples, SAMPLE_RATE);
	var abuf = octx.createBuffer(1, samples, SAMPLE_RATE);
	var abufdata = abuf.getChannelData(0);
	for (var i = 0; i < samples; i++) {
		abufdata[i] = fdata[i];
	}
	delete fdata;

	var source = octx.createBufferSource();
	source.buffer = abuf;

	var lpfilter = octx.createBiquadFilter();
	lpfilter.type = "lowpass";
	lpfilter.frequency.value = 2000;
	lpfilter.Q.value = 4;

	source.connect(lpfilter);
	lpfilter.connect(octx.destination);
	source.start();

	let res = octx.startRendering();
	if (res && res.then) {
		res.then(function (resbuf) {
			generate_wav_complete(resbuf.getChannelData(0), SAMPLE_RATE);
		});
	} else {
		octx.oncomplete = function (e) {
			let resbuf = e.renderedBuffer;
			generate_wav_complete(resbuf.getChannelData(0), SAMPLE_RATE);
		}
	}
}

function generate_wav_complete(fdata, sample_rate)
{
	var samples = fdata.length;
	var channels = 1;
	var bitsPerSample = 16;
	var data = [];
	for (var i = 0; i < samples; ++i) {
		data.push(pack("v", fdata[i] * 32767));
	}
	delete fdata;
	
	data = data.join('');
	
	// Format sub-chunk
	var chunk1 = [
		"fmt ", // Sub-chunk identifier
		pack("V", 16), // Chunk length
		pack("v", 1), // Audio format (1 is linear quantization)
		pack("v", channels),
		pack("V", sample_rate),
		pack("V", sample_rate * channels * bitsPerSample / 8), // Byte rate
		pack("v", channels * bitsPerSample / 8),
		pack("v", bitsPerSample)
		].join('');

	// Data sub-chunk (contains the sound)
	var chunk2 = [
		"data", // Sub-chunk identifier
		pack("V", samples * channels * bitsPerSample / 8), // Chunk length
		data
		].join('');
	
  	// Header
	var header = [
		"RIFF",
		pack("V", 4 + (8 + chunk1.length) + (8 + chunk2.length)), // Length
		"WAVE"
		].join('');

	var out = [header, chunk1, chunk2].join('');
	var dataURI = "data:audio/wav;base64," + escape(btoa(out));

	document.getElementById("player_div").innerHTML =
			'<a href="' + dataURI + '"' +
			'" download="morse.wav">download WAV</a>';

	/*
	var player = new Audio(dataURI);
	player.setAttribute("controls", "controls");
	document.getElementById('player_div').appendChild(player);
	*/
}

// Base 64 encoding function, for browsers that do not support btoa()
// by Tyler Akins (http://rumkin.com), available in the public domain
if (!window.btoa) {
	function btoa(input) {
		var keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

		var output = "";
		var chr1, chr2, chr3;
		var enc1, enc2, enc3, enc4;
		var i = 0;

		do {
			chr1 = input.charCodeAt(i++);
			chr2 = input.charCodeAt(i++);
			chr3 = input.charCodeAt(i++);

			enc1 = chr1 >> 2;
			enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
			enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
			enc4 = chr3 & 63;

			if (isNaN(chr2)) {
				enc3 = enc4 = 64;
			} else if (isNaN(chr3)) {
				enc4 = 64;
			}

			output = output + keyStr.charAt(enc1) + keyStr.charAt(enc2) + 
					 keyStr.charAt(enc3) + keyStr.charAt(enc4);
		} while (i < input.length);

		return output;
	}
}

// pack() emulation (from the PHP version), for binary crunching
function pack(fmt) {
	var output = '';
	
	var argi = 1;
	for (var i = 0; i < fmt.length; i++) {
		var c = fmt.charAt(i);
		var arg = arguments[argi];
		argi++;
		
		switch (c) {
			case "a":
				output += arg[0] + "\0";
				break;
			case "A":
				output += arg[0] + " ";
				break;
			case "C":
			case "c":
				output += String.fromCharCode(arg);
				break;
			case "n":
				output += String.fromCharCode((arg >> 8) & 255, arg & 255);
				break;
			case "v":
				output += String.fromCharCode(arg & 255, (arg >> 8) & 255);
				break;
			case "N":
				output += String.fromCharCode((arg >> 24) & 255, (arg >> 16) & 255, (arg >> 8) & 255, arg & 255);
				break;
			case "V":
				output += String.fromCharCode(arg & 255, (arg >> 8) & 255, (arg >> 16) & 255, (arg >> 24) & 255);
				break;
			case "x":
				argi--;
				output += "\0";
				break;
			default:
				throw new Error("Unknown pack format character '"+c+"'");
		}
	}
	
	return output;
}

config_params();
