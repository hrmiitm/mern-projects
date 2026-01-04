const http = require('http');

const server = http.createServer((req, res) => {
	console.log("Request Received", req.url, req.method);

	res.setHeader('Content-Type', 'text/plain');
	res.statusCode = 200;
	res.end('Hi');
})

server.listen(3000, 'localhost', () => { console.log("Server is running") })
// server.listen(PORT, HOST, BACKLOG, callback)

// Complusory is only PORT

// HOSTNAME: must resolve to  local IP
// Backlog: max pending TCP connection(511)
// 			TCP waiting queue

// CALLBACK: run once after os binds port, ASYNC