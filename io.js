function init_titlebar()
{
	var tbar = $("#topbar");
	var socialheader = $("#socialheader");
	var footer = $("#footer");
	var progressbar = $("#progressbar");

	if (! tbar.length || ! socialheader.length || ! progressbar.length) {
		return;
	}

	var bartext = $("#topbartext");
	// var s1 = $("#topbarsocial1");
	// var s2 = $("#topbarsocial2");
	// var s3 = $("#topbarsocial3");
	var s4 = $("#topbaricon");
	var s4a = $("#topbar");
	var bit = $("#bodyicontitle");

	var clo = {timer: null, bar: false, timerbar: null};

	clo.menu = false;
	clo.x = "-100%";
	clo.y = "-100%";

	var resizing = function () {
		// var h = tbar.height() - 8; /* 4px padding top, 4px padding bottom */
		var h = bartext.outerHeight();
		s4.css({height: "" + h + "px"});
		s4a.css({height: "" + (h + 8) + "px"});
		progressbar.css({"margin-top": "" + (h + 4) + "px"});
		bartext.css({"margin-left": "" + h + "px"});

		/*
		var textwidth = s1.outerWidth() + s2.outerWidth() + s3.outerWidth() +
				s4.outerWidth() +
				(bartext.outerWidth() - bartext.width());
		*/
		var textwidth = s4.outerWidth() +
				(bartext.outerWidth() - bartext.width());
		textwidth = Math.max(0, tbar.width() - textwidth * 1.3);
		bartext.css({width: "" + textwidth + "px"});
		// console.log("bar text size " + textwidth);
	};

	$(window).resize(function () {
		resizing();
	});
	setInterval(resizing, 2000);

	var last_pos = 0;

	$(window).scroll(function () {
		var cur = $(document).scrollTop();
		var spos = socialheader.offset().top + socialheader.outerHeight();
		var height = tbar.outerHeight() + 1;
		// console.log("should show bar: " + (cur > spos));
		if (cur > spos) {
			if (cur <= last_pos) {
				if (! clo.bar) {
					console.log("showing top bar - scrolling up");
					clo.bar = true;
					tbar.css({top: "0px"});
				}
			} else {
				if (clo.bar) {
					console.log("hiding top bar - scrolling down");
					clo.bar = false;
					tbar.css({top: "-" + height + "px"});
				}
			}
		} else {
			if (clo.bar) {
				console.log("hiding top bar - top page");
				clo.bar = false;
				tbar.css({top: "-" + height + "px"});
			}
		}

		last_pos = cur;
		var tot = footer.offset().top;
		var win = $(window).height();
		tot -= win;
		var per = 0.0;
		if (tot > 0) {
			per = Math.max(0, Math.min(100, 100.0 * cur / tot));
		}
		progressbar.css({width: "" + per + "%"});
	});
}

/* calculates a suitable height for CSS-calculated width element */
function proportional_height(id, def, tallest, flattest)
{
	def = def || (16.0 / 10.0);
	tallest = tallest || (16.0 / 10.0);
	flattest = flattest || (27.0 / 9.0);

	var gw = $(id).width();
	var proportion = def;

	var w = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
	var h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
	if (w > 0 && h > 0) {
		// proportion of the screen, discounted top bar
		proportion = w / (0.8 * h);
		// do not let it go taller than a certain point
		proportion = Math.max(tallest, proportion);
		// do not let it go flatter than a certain point
		proportion = Math.min(flattest, proportion);
	}

	$(id).height(gw / proportion);
}

$(function () {
	init_titlebar();
});
