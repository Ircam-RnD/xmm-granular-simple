var http = require('http');
var connect = require('connect');
var serveStatic = require('serve-static');
var ws = require('websocket').server;
var xmm = require('xmm-node');

var port = 8000;

//=========== serve static files using connect and serve-static : ============//
var app = connect();
app.use(serveStatic('public'));
var server = http.createServer(app);

server.listen(port, function() {
	console.log(`server listening to port ${port}`);
});

//============================= setting up xmm ===============================//

var hhmm = new xmm('hhmm');
hhmm.setConfig({
	states: 20,
	relative_regularization: 0.2,
	absolute_regularization: 0.2,
	// transition_mode: 'ergodic'
});
// console.log(hhmm.getConfig());

//========================= socket communication : ===========================//
var wsServer = new ws({
	httpServer: server
});

wsServer.on('request', function(req) {
	console.log('Connection from ' + req.origin);

	var connection = req.accept(null, req.origin);

	connection.on('message', function(msg) {
		if (msg.type !== 'utf8') {
			console.error('ws contents is not utf8');
			return;
		}
		msg = JSON.parse(msg.utf8Data);

		// msg will always have "user", "msg", and "data" fields
		// each user generates his own "user" id on socket initialization
		// with Date.now() and keeps it until page is reloaded
		switch (msg.msg) {
			case 'phrase':
				hhmm.addPhrase(msg.data);
				hhmm.train(function(err, res) {
					connection.send(JSON.stringify({
						user: msg.user,
						msg: 'model',
						data: res
					}));
				});
				break;

			case 'reset':
				hhmm.clearTrainingSet();
				connection.send(JSON.stringify({
					user: msg.user,
					msg: 'model',
					data: {}
				}));
				break;

			default:
				break;
		}
	});

	connection.on('close', function(connection) {
		console.log('connection closed');
	});
});