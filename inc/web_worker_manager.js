importScripts("mersennetwister.js");

var console;
if (typeof window !== "undefined") {
	console = window.console;
}
else {
	console = {};
	// TODO: Handle multiple args.
	console.log = function(data) {
		postMessage({
			action: "console_log",
			data: data
		});
	};
	console.error = function(data) {
		postMessage({
			action: "console_error",
			data: data
		});
	};
}

var workerID;
var workerScramblers = {};
var workerScramblersInitialized = {};
var initialized = false;
var randomSource = undefined;

var initialize = function(iniWorkerID, eventIDs, scramblerFiles, randomSeed) {

	workerID = iniWorkerID;

	randomSource = new MersenneTwisterObject(randomSeed);

	for (i in eventIDs) {
		var eventID = eventIDs[i];

		importScripts(scramblerFiles[eventID]);

		workerScramblers[eventID] = scramblers[eventID];
		workerScramblers[eventID].setRandomSource(randomSource);

		workerScramblersInitialized[eventID] = false;

	}

	initialized = true;

	postMessage({
		action: "initialized",
		info: ["Successfully initialized web worker for [" + eventIDs.toString() + "]."]
	});
}

var getRandomScramble = function (eventID, returnData) {

	if (!initialized) {
		console.error("Web worker for " + eventID + " is not initialized yet.");
	}

	if (!workerScramblersInitialized[eventID]) {

		postMessage({
			action: "get_random_scramble_initializing_scrambler",
			return_data: returnData
		});

		workerScramblers[eventID].initialize();

		workerScramblersInitialized[eventID] = true;

	}

	postMessage({
		action: "get_random_scramble_starting",
		return_data: returnData
	});

	var scramble = workerScramblers[eventID].getRandomScramble();
	postMessage({
		action: "get_random_scramble_response",
		scramble: scramble,
		event_id: eventID,
		return_data: returnData
	});
}

var initializeBenchmark = function(randomSeed) {

	randomSource.init(randomSeed);
	console.log("Seed " + randomSeed + ", " + randomSource.random());

	postMessage({action: "initialize_benchmark_response", worker_id: workerID});
}

onmessage = function(e) {
	try {
		switch(e.data.action) {
			case "initialize":
				initialize(e.data.worker_id, e.data.event_ids, e.data.scrambler_files, e.data.random_seed);
			break;

			case "get_random_scramble":
				getRandomScramble(e.data.event_id, e.data.return_data);
			break;

			case "echo":
				postMessage({action: "echo_response", info: e.data});
			break;

			case "initialize_benchmark":
				initializeBenchmark(e.data.random_seed);
			break;

			default:
				console.error("Unknown message.");
			break;
		}
	}
	catch (e) {
		postMessage({action: "message_exception", data: JSON.stringify(e)});
	}
}