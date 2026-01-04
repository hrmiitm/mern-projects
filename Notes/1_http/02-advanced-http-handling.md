# Part 2: Advanced HTTP Handling in Node.js

> **Goal**: Master routing, request parsing, and building a custom router from scratch

---

## 📚 Prerequisites

Make sure you've completed Part 1 and understand:
- Creating HTTP servers
- Request and Response objects
- HTTP methods and status codes

---

## 🛣️ Routing Without Frameworks

Routing is mapping URLs to specific handler functions.

### Create `06-basic-routing.js`

```javascript
const http = require('http');

// Route handlers
const homeHandler = (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<h1>🏠 Home Page</h1><p>Welcome to our website!</p>');
};

const aboutHandler = (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<h1>ℹ️ About Us</h1><p>We are Node.js developers!</p>');
};

const contactHandler = (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<h1>📧 Contact</h1><p>Email: hello@example.com</p>');
};

const notFoundHandler = (req, res) => {
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end('<h1>404 - Page Not Found</h1>');
};

// Route table
const routes = {
    '/': homeHandler,
    '/home': homeHandler,
    '/about': aboutHandler,
    '/contact': contactHandler
};

// Server with router
const server = http.createServer((req, res) => {
    // Get handler from route table, or use 404 handler
    const handler = routes[req.url] || notFoundHandler;
    handler(req, res);
});

server.listen(3000, () => {
    console.log('Router server on http://localhost:3000');
});
```

---

## 🔗 Parsing URLs and Query Parameters

### Create `07-url-parsing.js`

```javascript
const http = require('http');
const url = require('url');  // Built-in URL module

const server = http.createServer((req, res) => {
    // Parse the URL
    const parsedUrl = url.parse(req.url, true);  // 'true' parses query string
    
    console.log('═══════════════════════════════════════');
    console.log('Full URL:', req.url);
    console.log('Pathname:', parsedUrl.pathname);
    console.log('Query:', parsedUrl.query);
    console.log('═══════════════════════════════════════');
    
    // Example: /search?q=nodejs&page=2
    if (parsedUrl.pathname === '/search') {
        const { q, page = 1 } = parsedUrl.query;
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            message: 'Search results',
            query: q || 'No query provided',
            page: parseInt(page),
            results: q ? [`Result 1 for "${q}"`, `Result 2 for "${q}"`] : []
        }));
        return;
    }
    
    // Example: /greet?name=John
    if (parsedUrl.pathname === '/greet') {
        const name = parsedUrl.query.name || 'Guest';
        
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`<h1>Hello, ${name}! 👋</h1>`);
        return;
    }
    
    // Default response with examples
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
        <h1>URL Parsing Demo</h1>
        <h3>Try these URLs:</h3>
        <ul>
            <li><a href="/search?q=javascript&page=1">/search?q=javascript&page=1</a></li>
            <li><a href="/greet?name=Developer">/greet?name=Developer</a></li>
        </ul>
    `);
});

server.listen(3000, () => console.log('Server on http://localhost:3000'));
```

### Modern URL Parsing (Node.js 10+)

```javascript
const http = require('http');

const server = http.createServer((req, res) => {
    // Modern way using URL constructor
    const baseURL = `http://${req.headers.host}`;
    const parsedUrl = new URL(req.url, baseURL);
    
    console.log('Pathname:', parsedUrl.pathname);
    console.log('Search Params:', Object.fromEntries(parsedUrl.searchParams));
    
    // Access individual params
    const name = parsedUrl.searchParams.get('name');
    const age = parsedUrl.searchParams.get('age');
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ pathname: parsedUrl.pathname, name, age }));
});

server.listen(3000);
```

---

## 📥 Handling POST Requests & Request Body

The request body comes as a **stream** and must be collected in chunks.

### Create `08-post-requests.js`

```javascript
const http = require('http');
const url = require('url');

// Helper function to parse JSON body
const parseJSONBody = (req) => {
    return new Promise((resolve, reject) => {
        let body = '';
        
        // Collect data chunks
        req.on('data', chunk => {
            body += chunk.toString();
            
            // Prevent too large payloads (1MB limit)
            if (body.length > 1e6) {
                req.destroy();
                reject(new Error('Payload too large'));
            }
        });
        
        // All data received
        req.on('end', () => {
            try {
                const parsed = body ? JSON.parse(body) : {};
                resolve(parsed);
            } catch (e) {
                reject(new Error('Invalid JSON'));
            }
        });
        
        req.on('error', reject);
    });
};

// In-memory data store
let todos = [
    { id: 1, task: 'Learn Node.js', completed: false },
    { id: 2, task: 'Build HTTP server', completed: true }
];
let nextId = 3;

const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;
    const method = req.method;
    
    // Set common headers
    res.setHeader('Content-Type', 'application/json');
    
    try {
        // GET /todos - Get all todos
        if (path === '/todos' && method === 'GET') {
            res.writeHead(200);
            res.end(JSON.stringify({ success: true, data: todos }));
            return;
        }
        
        // POST /todos - Create new todo
        if (path === '/todos' && method === 'POST') {
            const body = await parseJSONBody(req);
            
            if (!body.task) {
                res.writeHead(400);
                res.end(JSON.stringify({ success: false, error: 'Task is required' }));
                return;
            }
            
            const newTodo = {
                id: nextId++,
                task: body.task,
                completed: false
            };
            todos.push(newTodo);
            
            res.writeHead(201);
            res.end(JSON.stringify({ success: true, data: newTodo }));
            return;
        }
        
        // PUT /todos/:id - Update todo
        if (path.startsWith('/todos/') && method === 'PUT') {
            const id = parseInt(path.split('/')[2]);
            const todoIndex = todos.findIndex(t => t.id === id);
            
            if (todoIndex === -1) {
                res.writeHead(404);
                res.end(JSON.stringify({ success: false, error: 'Todo not found' }));
                return;
            }
            
            const body = await parseJSONBody(req);
            todos[todoIndex] = { ...todos[todoIndex], ...body };
            
            res.writeHead(200);
            res.end(JSON.stringify({ success: true, data: todos[todoIndex] }));
            return;
        }
        
        // DELETE /todos/:id - Delete todo
        if (path.startsWith('/todos/') && method === 'DELETE') {
            const id = parseInt(path.split('/')[2]);
            const todoIndex = todos.findIndex(t => t.id === id);
            
            if (todoIndex === -1) {
                res.writeHead(404);
                res.end(JSON.stringify({ success: false, error: 'Todo not found' }));
                return;
            }
            
            const deleted = todos.splice(todoIndex, 1)[0];
            res.writeHead(200);
            res.end(JSON.stringify({ success: true, data: deleted }));
            return;
        }
        
        // Default - API info
        res.writeHead(200);
        res.end(JSON.stringify({
            message: 'Todo API',
            endpoints: {
                'GET /todos': 'Get all todos',
                'POST /todos': 'Create todo (body: { task: string })',
                'PUT /todos/:id': 'Update todo',
                'DELETE /todos/:id': 'Delete todo'
            }
        }));
        
    } catch (error) {
        res.writeHead(400);
        res.end(JSON.stringify({ success: false, error: error.message }));
    }
});

server.listen(3000, () => {
    console.log('Todo API on http://localhost:3000');
    console.log('\nTest with curl:');
    console.log('  GET:    curl http://localhost:3000/todos');
    console.log('  POST:   curl -X POST -H "Content-Type: application/json" -d \'{"task":"New task"}\' http://localhost:3000/todos');
    console.log('  PUT:    curl -X PUT -H "Content-Type: application/json" -d \'{"completed":true}\' http://localhost:3000/todos/1');
    console.log('  DELETE: curl -X DELETE http://localhost:3000/todos/1');
});
```

---

## 📋 Handling Form Data

### Create `09-form-handling.js`

```javascript
const http = require('http');
const querystring = require('querystring');

// Parse URL-encoded form data
const parseFormBody = (req) => {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => resolve(querystring.parse(body)));
        req.on('error', reject);
    });
};

const server = http.createServer(async (req, res) => {
    // Serve HTML form
    if (req.url === '/' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Registration Form</title>
                <style>
                    body { font-family: Arial; max-width: 400px; margin: 50px auto; }
                    input, button { margin: 10px 0; padding: 10px; width: 100%; box-sizing: border-box; }
                    button { background: #007bff; color: white; border: none; cursor: pointer; }
                </style>
            </head>
            <body>
                <h1>Registration Form</h1>
                <form action="/register" method="POST">
                    <input type="text" name="username" placeholder="Username" required>
                    <input type="email" name="email" placeholder="Email" required>
                    <input type="password" name="password" placeholder="Password" required>
                    <button type="submit">Register</button>
                </form>
            </body>
            </html>
        `);
        return;
    }
    
    // Handle form submission
    if (req.url === '/register' && req.method === 'POST') {
        const formData = await parseFormBody(req);
        
        console.log('Form Data Received:', formData);
        
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
            <h1>Registration Successful! ✅</h1>
            <p><strong>Username:</strong> ${formData.username}</p>
            <p><strong>Email:</strong> ${formData.email}</p>
            <p><a href="/">Back to form</a></p>
        `);
        return;
    }
    
    res.writeHead(404);
    res.end('Not Found');
});

server.listen(3000, () => console.log('Form server on http://localhost:3000'));
```

---

## 🏗️ Building a Simple Router Class

### Create `10-custom-router.js`

```javascript
const http = require('http');
const url = require('url');

// Simple Router Class
class Router {
    constructor() {
        this.routes = {
            GET: {},
            POST: {},
            PUT: {},
            DELETE: {},
            PATCH: {}
        };
        this.middlewares = [];
    }
    
    // Add middleware
    use(fn) {
        this.middlewares.push(fn);
    }
    
    // Register routes
    get(path, handler) {
        this.routes.GET[path] = handler;
    }
    
    post(path, handler) {
        this.routes.POST[path] = handler;
    }
    
    put(path, handler) {
        this.routes.PUT[path] = handler;
    }
    
    delete(path, handler) {
        this.routes.DELETE[path] = handler;
    }
    
    // Parse JSON body helper attached to request
    async parseBody(req) {
        return new Promise((resolve, reject) => {
            let body = '';
            req.on('data', chunk => body += chunk.toString());
            req.on('end', () => {
                try {
                    resolve(body ? JSON.parse(body) : {});
                } catch (e) {
                    resolve({});
                }
            });
        });
    }
    
    // Handle incoming requests
    async handle(req, res) {
        const parsedUrl = url.parse(req.url, true);
        req.pathname = parsedUrl.pathname;
        req.query = parsedUrl.query;
        
        // Helper to send JSON response
        res.json = (data, statusCode = 200) => {
            res.writeHead(statusCode, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
        };
        
        // Run middlewares
        for (const middleware of this.middlewares) {
            await middleware(req, res);
        }
        
        // Find and execute route handler
        const handler = this.routes[req.method]?.[req.pathname];
        
        if (handler) {
            req.body = await this.parseBody(req);
            await handler(req, res);
        } else {
            res.json({ error: 'Route not found' }, 404);
        }
    }
    
    // Create HTTP server
    listen(port, callback) {
        const server = http.createServer((req, res) => this.handle(req, res));
        server.listen(port, callback);
        return server;
    }
}

// ============= Usage Example =============

const app = new Router();

// Middleware: Logging
app.use((req, res) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
});

// Routes
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to Custom Router!' });
});

app.get('/users', (req, res) => {
    res.json({ users: [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }] });
});

app.post('/users', (req, res) => {
    const { name, email } = req.body;
    res.json({ message: 'User created', data: { name, email } }, 201);
});

app.get('/search', (req, res) => {
    const { q, limit = 10 } = req.query;
    res.json({ query: q, limit: parseInt(limit) });
});

// Start server
app.listen(3000, () => {
    console.log('Custom Router on http://localhost:3000');
    console.log('\nAvailable routes:');
    console.log('  GET  /');
    console.log('  GET  /users');
    console.log('  POST /users');
    console.log('  GET  /search?q=term&limit=5');
});
```

---

## 🔐 Working with Headers

### Create `11-headers-demo.js`

```javascript
const http = require('http');

const server = http.createServer((req, res) => {
    // Read request headers
    const userAgent = req.headers['user-agent'];
    const contentType = req.headers['content-type'];
    const authorization = req.headers['authorization'];
    
    if (req.url === '/headers') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            message: 'Your request headers',
            headers: req.headers
        }, null, 2));
        return;
    }
    
    if (req.url === '/protected') {
        // Simple auth check
        if (!authorization || authorization !== 'Bearer secret123') {
            res.writeHead(401, {
                'Content-Type': 'application/json',
                'WWW-Authenticate': 'Bearer realm="Access to protected resource"'
            });
            res.end(JSON.stringify({ error: 'Unauthorized. Send Authorization: Bearer secret123' }));
            return;
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Welcome to protected route!' }));
        return;
    }
    
    // Set various response headers
    res.writeHead(200, {
        'Content-Type': 'text/html',
        'X-Powered-By': 'Node.js Custom Server',
        'X-Request-Id': Date.now().toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*'
    });
    
    res.end(`
        <h1>Headers Demo</h1>
        <p>Your User-Agent: ${userAgent}</p>
        <ul>
            <li><a href="/headers">/headers</a> - View all your request headers</li>
            <li><a href="/protected">/protected</a> - Protected route (needs auth header)</li>
        </ul>
        <h3>Test protected route:</h3>
        <code>curl -H "Authorization: Bearer secret123" http://localhost:3000/protected</code>
    `);
});

server.listen(3000, () => console.log('Server on http://localhost:3000'));
```

---

## 🍪 Cookies Basics

### Create `12-cookies.js`

```javascript
const http = require('http');

// Parse cookies from request header
const parseCookies = (cookieHeader) => {
    const cookies = {};
    if (cookieHeader) {
        cookieHeader.split(';').forEach(cookie => {
            const [name, value] = cookie.trim().split('=');
            cookies[name] = decodeURIComponent(value);
        });
    }
    return cookies;
};

let visitCount = {};

const server = http.createServer((req, res) => {
    const cookies = parseCookies(req.headers.cookie);
    
    if (req.url === '/') {
        // Check for existing session
        const sessionId = cookies.sessionId || `session_${Date.now()}`;
        visitCount[sessionId] = (visitCount[sessionId] || 0) + 1;
        
        // Set cookie if not exists
        res.setHeader('Set-Cookie', [
            `sessionId=${sessionId}; HttpOnly; Path=/`,
            `lastVisit=${new Date().toISOString()}; Path=/`
        ]);
        
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
            <h1>Cookie Demo 🍪</h1>
            <p>Your session ID: <code>${sessionId}</code></p>
            <p>Visit count: <strong>${visitCount[sessionId]}</strong></p>
            <p>Refresh the page to see count increase!</p>
            <br>
            <a href="/clear">Clear cookies</a>
        `);
        return;
    }
    
    if (req.url === '/clear') {
        // Clear cookies by setting expiry in past
        res.setHeader('Set-Cookie', [
            'sessionId=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/',
            'lastVisit=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/'
        ]);
        res.writeHead(302, { 'Location': '/' });
        res.end();
        return;
    }
    
    res.writeHead(404);
    res.end('Not Found');
});

server.listen(3000, () => console.log('Cookie demo on http://localhost:3000'));
```

---

## ❓ Interview Questions

### Conceptual Questions

**Q1: How do you extract query parameters from a URL in Node.js?**
> Use `url.parse(req.url, true).query` or modern `new URL(req.url, baseURL).searchParams`

**Q2: Why does the request body come as a stream? How do you handle it?**
> HTTP allows large payloads that can't fit in memory at once. We collect data chunks using `req.on('data')` event and process when `req.on('end')` fires.

**Q3: What is the difference between `Content-Type: application/json` and `Content-Type: application/x-www-form-urlencoded`?**
> - `application/json`: Body is JSON string, parsed with `JSON.parse()`
> - `application/x-www-form-urlencoded`: Body is URL-encoded key=value pairs (default for HTML forms), parsed with `querystring.parse()`

**Q4: What is middleware in the context of HTTP servers?**
> Functions that execute between receiving the request and sending the response. They can modify req/res objects, perform authentication, logging, etc.

**Q5: Explain the purpose of CORS headers.**
> CORS (Cross-Origin Resource Sharing) headers like `Access-Control-Allow-Origin` allow servers to specify which origins can access their resources, preventing unauthorized cross-origin requests.

### Coding Questions

**Q6: Write a function to parse cookies from request header string.**

```javascript
const parseCookies = (cookieStr) => {
    return cookieStr?.split(';').reduce((acc, cookie) => {
        const [key, val] = cookie.trim().split('=');
        acc[key] = decodeURIComponent(val);
        return acc;
    }, {}) || {};
};
```

**Q7: Create a simple rate limiter middleware.**

```javascript
const rateLimit = (windowMs, maxRequests) => {
    const requests = new Map();
    
    return (req, res, next) => {
        const ip = req.socket.remoteAddress;
        const now = Date.now();
        const windowStart = now - windowMs;
        
        // Get requests for this IP within window
        const ipRequests = requests.get(ip) || [];
        const recentRequests = ipRequests.filter(time => time > windowStart);
        
        if (recentRequests.length >= maxRequests) {
            res.writeHead(429, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Too many requests' }));
            return;
        }
        
        recentRequests.push(now);
        requests.set(ip, recentRequests);
        next();
    };
};
```

**Q8: Write code to handle both JSON and form-urlencoded POST bodies.**

```javascript
const parseBody = async (req) => {
    const contentType = req.headers['content-type'] || '';
    
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            if (contentType.includes('application/json')) {
                resolve(JSON.parse(body));
            } else if (contentType.includes('urlencoded')) {
                resolve(Object.fromEntries(new URLSearchParams(body)));
            } else {
                resolve(body);
            }
        });
    });
};
```

---

## ✅ Practice Exercises

1. **Build a URL shortener** that stores short codes in memory and redirects to original URLs

2. **Create a simple authentication system** using cookies for session management

3. **Build an API** with rate limiting that allows only 10 requests per minute per IP

4. **Extend the Router class** to support route parameters like `/users/:id`

---

## 🔜 What's Next?

In **Part 3**, we'll build two complete projects:
1. **RESTful API** - Full CRUD with data persistence
2. **Static File Server** - Serve HTML, CSS, JS, images

---

> 💡 **Pro Tip**: The custom router we built is similar to how Express.js works internally. Understanding this makes Express much easier to learn!
