const http = require('http');
const server = http.createServer((req, res) => {
 res.statusCode = 200;
 res.setHeader('Content-Type', 'text/plain');
 res.end('Hello World\n');
}).listen(process.env.PORT || 3000, () => {
 console.log(`Server running.`);
});

