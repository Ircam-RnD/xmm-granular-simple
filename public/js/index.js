(function () {

	// on iOS audio is locked until user input trigs some audio so we need a flag
	var locked = true;

	var userID = -1; 				 // for multi-user socket communication
	var recording = false;	 // gesture recording state
	var currentDuration = 0; // duration of current sound

	var soundIds = [
		'hendrix',
		'amen',
		'vent',	
		'nage'
	];

	var soundFilenames = [
		'sounds/hendrix.wav',
		'sounds/amen.mp3',
		'sounds/vent.mp3',
		'sounds/nage.mp3'
	];

	//======================== deal with DOM elements ==========================//

	var canvas = null, ctx = null,
			toggle = null, select = null;

	window.onload = function() {
		toggle = document.querySelector('#playBtn');
		toggle.addEventListener('click', function() {
			// the "trick" to unlock webaudio on iOS :
			if(locked) {
				var buffer = audioContext.createBuffer(1, 1, 22050);
				var source = audioContext.createBufferSource();
				source.buffer = buffer;
				source.connect(audioContext.destination);
				source.start();
				locked = false;
			}

			// fade is a gainNode defined in a lower section
			var now = audioContext.currentTime;
			var currentValue = fade.gain.value;
			if (!toggle.classList.contains('active')) {
				toggle.classList.add('active');
				fade.gain.cancelScheduledValues(now);
				fade.gain.setValueAtTime(currentValue, now);
				fade.gain.linearRampToValueAtTime(1.0, now + 0.5);
			} else {
				toggle.classList.remove('active');
				fade.gain.cancelScheduledValues(now);
				fade.gain.setValueAtTime(currentValue, now);
				fade.gain.linearRampToValueAtTime(0, now + 0.5);
			}
		});

		select = document.querySelector('.xmmSelect');
		select.addEventListener('change', function() {
			setNewBuffer(select.selectedIndex);
		});

		var rec = document.querySelector('#recBtn');
		var recOffColor = rec.style.background;
		rec.addEventListener('click', function() {
			if (!rec.classList.contains('active')) {
				recording = true;
				rec.innerHTML = 'STOP';
				rec.classList.add('active');
				rec.style.background = '#ff0000';
				phraseMaker.reset();
			} else {
				recording = false;
				rec.innerHTML = 'REC';
				rec.classList.remove('active');
				rec.style.background = recOffColor;
			}
		});

		var send = document.querySelector('#sendBtn');
		send.addEventListener('click', function() {
			if (!recording) {
				connection.send(userID, 'phrase', phraseMaker.phrase);
			}
		})

		var reset = document.querySelector('#resetBtn');
		reset.addEventListener('click', function() {
			connection.send(userID, 'reset');
			hhmmDecoder.model = undefined;
		});

		canvas = document.querySelector('#hhmmCanvas');
		if (canvas) {
			ctx = canvas.getContext('2d');
		}
	}

	//======================= websocket initialization =========================//

	var WebSocket = window.WebSocket || window.MozWebSocket;
	var connection = new WebSocket('ws://' + window.location.host);

	connection.send = function(user, msg, data) {
		WebSocket.prototype.send.call(this, JSON.stringify({
			user: user,
			msg: msg,
			data: data
		}));
	}

	connection.onopen = function() {
		console.log('socket open');
		userID = Date.now();
	};

	connection.onerror = function() {
		console.log('socket error');
	};

	connection.onmessage = function(msg) {
		var m = JSON.parse(msg.data);
		if (m.user !== userID) return;
		switch (m.msg) {
			case 'model':
				hhmmDecoder.model = m.data;
				break;

			default:
				break;
		}
	}

	//================= XMM gesture recorder / model decoder ===================//

	var phraseMaker = new xmmClient.PhraseMaker();
	phraseMaker.config = {
		bimodal: false,
		dimension: 6,
		dimension_input: 0,
		column_names: ['accX', 'accY', 'accZ', 'gyrX', 'gyrY', 'gyrZ'],
		label: 'gesture'
	};

	var hhmmDecoder = new xmmClient.HhmmDecoder();

	// simple moving average filter to smooth time progression value
	var prevNormPos = 0;
	var avgFilterSize = 20;
	var avgFilter = [];
	for (var i = 0; i < avgFilterSize; i++) {
		avgFilter.push(0);
	}
	var filterIndex = 0;

	//====================== devicemotion initialization =======================//

	var features = new motionFeatures.MotionFeatures({
		descriptors: ['accRaw', 'accIntensity']
	});

	if (window.DeviceMotionEvent) {
		window.addEventListener('devicemotion', deviceMotionHandler);
	}

	function deviceMotionHandler(e) {
		var sextet = [
			e.acceleration.x, e.acceleration.y, e.acceleration.z,
			e.rotationRate.alpha, e.rotationRate.beta, e.rotationRate.gamma
		];

		// in adition to gesture following control of the granular player's position,
		// the granular player's volume is controlled by gesture intensity
		features.setAccelerometer(sextet[0], sextet[1], sextet[2]);
		features.setGyroscope(sextet[3], sextet[4], sextet[5]);
		features.update(function(err, res) {
			volume.gain.value = Math.min(res.accIntensity.norm * 0.1, 1);
		});

		if (recording) {
			phraseMaker.addObservation(sextet);
		}

		hhmmDecoder.filter(sextet, function(err,res) {
			if (!err) {
				if (res.timeProgressions[0]) {

					// constrain time progression between 0 and 1 :
					var normPos = Math.min(1, Math.max(0, res.timeProgressions[0]));

					// if the new value jumps far enough from the previous one,
					// reset the filter to this new value so that it jumps directly to it
					// (we only want to filter small moves)
					// the 0.5 threshold is an arbitrary value, it should depend on the
					// number of states of the model
					if (Math.abs(normPos - prevNormPos) > 0.5) {
						for (var i = 0; i < avgFilterSize; i++) {
							avgFilter[i] = normPos;
						}
					}

					// apply filter on the time progression :
					avgFilter[filterIndex] = normPos;
					filteredNormPos = 0;
					for (var i = 0; i < avgFilterSize; i++) {
						filteredNormPos += avgFilter[i];
					}
					filteredNormPos /= avgFilterSize;
					filterIndex = (filterIndex + 1) % avgFilterSize;
					prevNormPos = normPos;

					// draw the time progression :
					if (ctx) {
						ctx.clearRect(0, 0, canvas.width, canvas.height);
						ctx.fillStyle = '#fff';
						ctx.fillRect(0, 0, filteredNormPos * canvas.width, canvas.height);
					}

					// set the granular player's position according to the time progression :
					if (scheduledGranularEngine) {
						scheduledGranularEngine.position = filteredNormPos * currentDuration;
					}
				}
			}
		});
	}

	//=================== waves loaders / granular player ======================//

	var audioContext = wavesAudio.audioContext;
	var bufferLoader = new wavesLoaders.AudioBufferLoader();
	var soundBuffers = [];
	var scheduler = null, scheduledGranularEngine = null;

	var volume = audioContext.createGain();
	volume.gain.value = 0;
	volume.connect(audioContext.destination);

	var fade = audioContext.createGain();
	fade.gain.value = 0;
	fade.connect(volume);

	bufferLoader.load(soundFilenames)
	.then(function(bufs) {
		for (var i = 0; i < bufs.length; i++) {
			soundBuffers.push(bufs[i]);
	  	var opt = document.createElement('option');
	  	opt.value = soundIds[i];
	  	opt.innerHTML = soundIds[i];
	  	select.appendChild(opt);
		}

		scheduler = wavesAudio.getScheduler();
		setNewBuffer(0);
	})
	.catch(function(error) {
		console.error(error);
	});


	function setNewBuffer(index) {
		if (scheduler) {
			if (scheduledGranularEngine) {
				scheduler.remove(scheduledGranularEngine);
			}
			scheduledGranularEngine = new wavesAudio.GranularEngine({
				buffer: soundBuffers[index]
			});

			scheduledGranularEngine.connect(fade);
			scheduler.add(scheduledGranularEngine);

			currentDuration = soundBuffers[index].duration;

			scheduledGranularEngine.periodAbs = 0.04;
			scheduledGranularEngine.durationAbs = 0.08;
			scheduledGranularEngine.resampling = 0;
			scheduledGranularEngine.resamplingVar = 0;
			scheduledGranularEngine.position = currentDuration / 2;
			scheduledGranularEngine.positionVar = 0;
		}		
	}

})();