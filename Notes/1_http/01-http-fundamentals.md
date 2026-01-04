# Part 1: HTTP Fundamentals in Node.js

> **Goal**: Understand HTTP protocol and create your first Node.js HTTP server

---

## 📚 What is HTTP?

**HTTP (HyperText Transfer Protocol)** is the foundation of data communication on the web. It's a **request-response protocol** between a client (browser) and server.

### How HTTP Works

```
┌──────────┐         HTTP Request          ┌──────────┐
│  Client  │  ─────────────────────────►   │  Server  │
│ (Browser)│                               │ (Node.js)│
│          │  ◄─────────────────────────   │          │
└──────────┘         HTTP Response         └──────────┘
```

### Key HTTP Concepts

| Concept | Description |
|---------|-------------|
| **Request** | Client asking server for something |
| **Response** | Server's answer to the client |
| **URL** | Address of the resource |
| **Method** | Type of action (GET, POST, PUT, DELETE) |
| **Headers** | Metadata about request/response |
| **Body** | Actual data being transferred |
| **Status Code** | Result indicator (200, 404, 500, etc.) |

---

## 🔧 Setting Up Your Environment

### Step 1: Check Node.js Installation

```bash
node --version
# Should output v18.x.x or higher
```

### Step 2: Create Project Directory

```bash
mkdir nodejs-http-learning
cd nodejs-http-learning
npm init -y
```

---

## 🚀 Your First HTTP Server

### Step 3: Create `01-basic-server.js`

```javascript
// Import the built-in http module
const http = require('http');

// Define server configuration
const PORT = 3000;
const HOSTNAME = 'localhost';

// Create the server
const server = http.createServer((request, response) => {
    // This callback runs for EVERY incoming request
    
    console.log('Request received!');
    console.log('URL:', request.url);
    console.log('Method:', request.method);
    
    // Set response headers
    response.setHeader('Content-Type', 'text/plain');
    
    // Set status code
    response.statusCode = 200;
    
    // Send response body and end
    response.end('Hello, World! Welcome to Node.js HTTP Server');
});

// Start listening for requests
server.listen(PORT, HOSTNAME, () => {
    console.log(`Server running at http://${HOSTNAME}:${PORT}/`);
});
```

### Step 4: Run the Server

```bash
node 01-basic-server.js
```

### Step 5: Test in Browser

Open `http://localhost:3000` in your browser, or use:

```bash
curl http://localhost:3000
```

---

## 📦 Understanding Request Object

The `request` object contains all information about the incoming request.

### Create `02-request-details.js`

```javascript
const http = require('http');

const server = http.createServer((req, res) => {
    // Important request properties
    console.log('═══════════════════════════════════════');
    console.log('📍 URL:', req.url);
    console.log('📝 Method:', req.method);
    console.log('📋 Headers:', JSON.stringify(req.headers, null, 2));
    console.log('🌐 HTTP Version:', req.httpVersion);
    console.log('═══════════════════════════════════════');
    
    // Send response
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        message: 'Check your terminal for request details!',
        yourUrl: req.url,
        yourMethod: req.method
    }));
});

server.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
    console.log('Try these URLs:');
    console.log('  http://localhost:3000/');
    console.log('  http://localhost:3000/about');
    console.log('  http://localhost:3000/users?id=123');
});
```

### Key Request Properties

| Property | Description | Example |
|----------|-------------|---------|
| `req.url` | Request URL path | `/users?id=123` |
| `req.method` | HTTP method | `GET`, `POST` |
| `req.headers` | Request headers object | `{ 'content-type': 'application/json' }` |
| `req.httpVersion` | HTTP version | `1.1` |

---

## 📤 Understanding Response Object

The `response` object is used to send data back to the client.

### Create `03-response-types.js`

```javascript
const http = require('http');

const server = http.createServer((req, res) => {
    const url = req.url;
    
    // Different response types based on URL
    if (url === '/text') {
        // Plain text response
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('This is plain text response');
        
    } else if (url === '/html') {
        // HTML response
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
            <!DOCTYPE html>
            <html>
                <head><title>HTML Response</title></head>
                <body>
                    <h1 style="color: blue;">Hello from Node.js!</h1>
                    <p>This is an HTML response</p>
                </body>
            </html>
        `);
        
    } else if (url === '/json') {
        // JSON response (most common for APIs)
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            data: {
                name: 'John Doe',
                age: 25,
                skills: ['JavaScript', 'Node.js', 'Express']
            }
        }));
        
    } else {
        // Default response
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
            <h1>Available Endpoints:</h1>
            <ul>
                <li><a href="/text">/text</a> - Plain text</li>
                <li><a href="/html">/html</a> - HTML page</li>
                <li><a href="/json">/json</a> - JSON data</li>
            </ul>
        `);
    }
});

server.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
```

### Key Response Methods

| Method | Description |
|--------|-------------|
| `res.writeHead(statusCode, headers)` | Set status code and headers at once |
| `res.setHeader(name, value)` | Set individual header |
| `res.statusCode = code` | Set status code |
| `res.write(data)` | Write chunk of data (can call multiple times) |
| `res.end(data)` | End response, optionally with final data |

---

## 🔢 HTTP Status Codes

### Create `04-status-codes.js`

```javascript
const http = require('http');

const server = http.createServer((req, res) => {
    const url = req.url;
    
    switch (url) {
        case '/success':
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: '200 OK - Success!' }));
            break;
            
        case '/created':
            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: '201 Created - Resource created!' }));
            break;
            
        case '/redirect':
            res.writeHead(301, { 'Location': '/success' });
            res.end();
            break;
            
        case '/bad-request':
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: '400 Bad Request - Invalid input!' }));
            break;
            
        case '/unauthorized':
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: '401 Unauthorized - Login required!' }));
            break;
            
        case '/not-found':
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: '404 Not Found - Resource missing!' }));
            break;
            
        case '/server-error':
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: '500 Internal Server Error!' }));
            break;
            
        default:
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
                <h1>Status Code Demo</h1>
                <ul>
                    <li><a href="/success">/success</a> - 200</li>
                    <li><a href="/created">/created</a> - 201</li>
                    <li><a href="/redirect">/redirect</a> - 301 (redirects to /success)</li>
                    <li><a href="/bad-request">/bad-request</a> - 400</li>
                    <li><a href="/unauthorized">/unauthorized</a> - 401</li>
                    <li><a href="/not-found">/not-found</a> - 404</li>
                    <li><a href="/server-error">/server-error</a> - 500</li>
                </ul>
            `);
    }
});

server.listen(3000, () => console.log('Server on http://localhost:3000'));
```

### Status Codes Cheat Sheet

| Range | Category | Common Codes |
|-------|----------|--------------|
| **1xx** | Informational | 100 Continue |
| **2xx** | Success | 200 OK, 201 Created, 204 No Content |
| **3xx** | Redirection | 301 Moved Permanently, 302 Found, 304 Not Modified |
| **4xx** | Client Error | 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found |
| **5xx** | Server Error | 500 Internal Server Error, 502 Bad Gateway, 503 Service Unavailable |

---

## 🌐 HTTP Methods Overview

| Method | Purpose | Has Body | Idempotent |
|--------|---------|----------|------------|
| **GET** | Retrieve data | No | Yes |
| **POST** | Create new data | Yes | No |
| **PUT** | Update/Replace data | Yes | Yes |
| **PATCH** | Partial update | Yes | No |
| **DELETE** | Delete data | Optional | Yes |
| **HEAD** | GET without body | No | Yes |
| **OPTIONS** | Get supported methods | No | Yes |

> **Idempotent**: Making the same request multiple times has the same effect as making it once.

---

## 📝 Complete Example: Simple API Endpoint

### Create `05-simple-api.js`

```javascript
const http = require('http');

// In-memory data store
let users = [
    { id: 1, name: 'Alice', email: 'alice@example.com' },
    { id: 2, name: 'Bob', email: 'bob@example.com' }
];

const server = http.createServer((req, res) => {
    // Set CORS headers (for browser requests)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    
    const { url, method } = req;
    
    // GET /api/users - Get all users
    if (url === '/api/users' && method === 'GET') {
        res.writeHead(200);
        res.end(JSON.stringify({
            success: true,
            count: users.length,
            data: users
        }));
        return;
    }
    
    // GET /api/users/:id - Get user by ID
    if (url.startsWith('/api/users/') && method === 'GET') {
        const id = parseInt(url.split('/')[3]);
        const user = users.find(u => u.id === id);
        
        if (user) {
            res.writeHead(200);
            res.end(JSON.stringify({ success: true, data: user }));
        } else {
            res.writeHead(404);
            res.end(JSON.stringify({ success: false, error: 'User not found' }));
        }
        return;
    }
    
    // API documentation for other routes
    res.writeHead(200);
    res.end(JSON.stringify({
        message: 'Welcome to Users API',
        endpoints: {
            'GET /api/users': 'Get all users',
            'GET /api/users/:id': 'Get user by ID'
        }
    }));
});

server.listen(3000, () => {
    console.log('API Server running on http://localhost:3000');
    console.log('Try: http://localhost:3000/api/users');
    console.log('Try: http://localhost:3000/api/users/1');
});
```

---

## ❓ Interview Questions

### Conceptual Questions

**Q1: What is HTTP and how does it work?**
> HTTP is a stateless, application-layer protocol for transmitting hypermedia documents. It works on a request-response model where the client sends a request and the server sends back a response.

**Q2: What is the difference between `res.write()` and `res.end()`?**
> `res.write()` sends a chunk of the response body and can be called multiple times. `res.end()` signals that the response is complete. You can pass data to `res.end()` for the final chunk.

**Q3: Why is HTTP called "stateless"?**
> Each request is independent; the server doesn't maintain client state between requests. Sessions/cookies/tokens are used to maintain state.

**Q4: What's the difference between `writeHead()` and `setHeader()`?**
> `writeHead(statusCode, headers)` sets status code and multiple headers at once, and must be called before `write()` or `end()`. `setHeader()` sets one header at a time and is more flexible.

**Q5: Explain the purpose of different HTTP status code ranges.**
> - 1xx: Informational (request received, continuing)
> - 2xx: Success (request successfully received and processed)
> - 3xx: Redirection (further action needed)
> - 4xx: Client Error (bad request syntax or cannot be fulfilled)
> - 5xx: Server Error (server failed to fulfill valid request)

### Coding Questions

**Q6: Write code to create a server that responds with current timestamp.**

```javascript
const http = require('http');

http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        timestamp: new Date().toISOString(),
        unix: Date.now()
    }));
}).listen(3000);
```

**Q7: Write code to handle different routes without using any framework.**

```javascript
const http = require('http');

const routes = {
    '/': 'Home Page',
    '/about': 'About Us',
    '/contact': 'Contact Page'
};

http.createServer((req, res) => {
    const content = routes[req.url];
    
    if (content) {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end(content);
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 - Page Not Found');
    }
}).listen(3000);
```

---

## ✅ Practice Exercises

1. **Create a server** that responds with different greetings based on the URL path (`/morning`, `/afternoon`, `/evening`)

2. **Build an endpoint** that returns your system information (platform, memory, uptime) as JSON

3. **Create a server** that tracks and displays how many times it has received requests (hint: use a counter variable)

---

## 🔜 What's Next?

In **Part 2**, we'll cover:
- Advanced routing patterns
- Handling POST requests and parsing request body
- Query parameters and URL parsing
- Building a proper router without frameworks

---

> 💡 **Pro Tip**: Understanding HTTP at this level will make Express.js concepts much clearer. Express is just a wrapper that simplifies these operations!
