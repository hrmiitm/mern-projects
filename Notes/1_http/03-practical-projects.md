# Part 3: Two Practical Projects

> **Goal**: Build two complete projects that consolidate all HTTP concepts learned

---

## 📚 Prerequisites

Complete Parts 1 & 2 before starting these projects. You should understand:
- Creating HTTP servers
- Routing and URL parsing
- Request body parsing
- Headers and status codes
- Basic middleware concepts

---

## 🎯 Project 1: RESTful Notes API

A complete CRUD API for managing notes with file-based persistence.

### Project Structure

```
notes-api/
├── server.js        # Main server file
├── router.js        # Router utility
├── data/
│   └── notes.json   # Data persistence
└── package.json
```

### Step 1: Initialize Project

```bash
mkdir notes-api && cd notes-api
npm init -y
mkdir data
echo "[]" > data/notes.json
```

### Step 2: Create `router.js` - Reusable Router Module

```javascript
// router.js
const url = require('url');

class Router {
    constructor() {
        this.routes = { GET: [], POST: [], PUT: [], DELETE: [], PATCH: [] };
        this.middlewares = [];
    }
    
    use(fn) {
        this.middlewares.push(fn);
    }
    
    addRoute(method, path, handler) {
        // Convert path pattern like /notes/:id to regex
        const paramNames = [];
        const regexPath = path.replace(/:([^/]+)/g, (_, paramName) => {
            paramNames.push(paramName);
            return '([^/]+)';
        });
        
        this.routes[method].push({
            pattern: new RegExp(`^${regexPath}$`),
            handler,
            paramNames
        });
    }
    
    get(path, handler) { this.addRoute('GET', path, handler); }
    post(path, handler) { this.addRoute('POST', path, handler); }
    put(path, handler) { this.addRoute('PUT', path, handler); }
    delete(path, handler) { this.addRoute('DELETE', path, handler); }
    patch(path, handler) { this.addRoute('PATCH', path, handler); }
    
    async parseBody(req) {
        return new Promise((resolve) => {
            let body = '';
            req.on('data', chunk => body += chunk.toString());
            req.on('end', () => {
                try { resolve(JSON.parse(body)); }
                catch { resolve({}); }
            });
        });
    }
    
    async handle(req, res) {
        const parsedUrl = url.parse(req.url, true);
        req.pathname = parsedUrl.pathname;
        req.query = parsedUrl.query;
        req.params = {};
        
        // JSON response helper
        res.json = (data, status = 200) => {
            res.writeHead(status, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data, null, 2));
        };
        
        // Status helper
        res.status = (code) => { res.statusCode = code; return res; };
        
        // Run middlewares
        for (const mw of this.middlewares) {
            await mw(req, res);
            if (res.writableEnded) return;
        }
        
        // Find matching route
        const routes = this.routes[req.method] || [];
        for (const route of routes) {
            const match = req.pathname.match(route.pattern);
            if (match) {
                // Extract params
                route.paramNames.forEach((name, i) => {
                    req.params[name] = match[i + 1];
                });
                req.body = await this.parseBody(req);
                return route.handler(req, res);
            }
        }
        
        res.json({ success: false, error: 'Route not found' }, 404);
    }
    
    listen(port, cb) {
        const http = require('http');
        const server = http.createServer((req, res) => this.handle(req, res));
        server.listen(port, cb);
        return server;
    }
}

module.exports = Router;
```

### Step 3: Create `server.js` - Main Application

```javascript
// server.js
const Router = require('./router');
const fs = require('fs');
const path = require('path');

const app = new Router();
const DATA_FILE = path.join(__dirname, 'data', 'notes.json');

// ============= Helper Functions =============

const readNotes = () => {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch {
        return [];
    }
};

const writeNotes = (notes) => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(notes, null, 2));
};

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

// ============= Middleware =============

// Logger middleware
app.use((req, res) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.pathname}`);
});

// CORS middleware
app.use((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
});

// ============= Routes =============

// GET / - API Documentation
app.get('/', (req, res) => {
    res.json({
        name: 'Notes API',
        version: '1.0.0',
        endpoints: {
            'GET /notes': 'Get all notes (supports ?search=term)',
            'GET /notes/:id': 'Get single note',
            'POST /notes': 'Create note { title, content, tags[] }',
            'PUT /notes/:id': 'Update note',
            'PATCH /notes/:id': 'Partial update',
            'DELETE /notes/:id': 'Delete note',
            'GET /notes/tag/:tag': 'Get notes by tag'
        }
    });
});

// GET /notes - Get all notes with optional search
app.get('/notes', (req, res) => {
    let notes = readNotes();
    const { search, sortBy = 'createdAt', order = 'desc' } = req.query;
    
    // Filter by search term
    if (search) {
        const term = search.toLowerCase();
        notes = notes.filter(n => 
            n.title.toLowerCase().includes(term) || 
            n.content.toLowerCase().includes(term)
        );
    }
    
    // Sort notes
    notes.sort((a, b) => {
        if (order === 'asc') return a[sortBy] > b[sortBy] ? 1 : -1;
        return a[sortBy] < b[sortBy] ? 1 : -1;
    });
    
    res.json({
        success: true,
        count: notes.length,
        data: notes
    });
});

// GET /notes/:id - Get single note
app.get('/notes/:id', (req, res) => {
    const notes = readNotes();
    const note = notes.find(n => n.id === req.params.id);
    
    if (!note) {
        return res.json({ success: false, error: 'Note not found' }, 404);
    }
    
    res.json({ success: true, data: note });
});

// POST /notes - Create new note
app.post('/notes', (req, res) => {
    const { title, content, tags = [] } = req.body;
    
    // Validation
    if (!title || !content) {
        return res.json({ 
            success: false, 
            error: 'Title and content are required' 
        }, 400);
    }
    
    const notes = readNotes();
    const newNote = {
        id: generateId(),
        title: title.trim(),
        content: content.trim(),
        tags: Array.isArray(tags) ? tags : [tags],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    notes.push(newNote);
    writeNotes(notes);
    
    console.log(`✅ Created note: ${newNote.id}`);
    res.json({ success: true, data: newNote }, 201);
});

// PUT /notes/:id - Full update
app.put('/notes/:id', (req, res) => {
    const notes = readNotes();
    const index = notes.findIndex(n => n.id === req.params.id);
    
    if (index === -1) {
        return res.json({ success: false, error: 'Note not found' }, 404);
    }
    
    const { title, content, tags = [] } = req.body;
    
    if (!title || !content) {
        return res.json({ 
            success: false, 
            error: 'Title and content are required for PUT' 
        }, 400);
    }
    
    notes[index] = {
        ...notes[index],
        title: title.trim(),
        content: content.trim(),
        tags: Array.isArray(tags) ? tags : [tags],
        updatedAt: new Date().toISOString()
    };
    
    writeNotes(notes);
    console.log(`📝 Updated note: ${req.params.id}`);
    res.json({ success: true, data: notes[index] });
});

// PATCH /notes/:id - Partial update
app.patch('/notes/:id', (req, res) => {
    const notes = readNotes();
    const index = notes.findIndex(n => n.id === req.params.id);
    
    if (index === -1) {
        return res.json({ success: false, error: 'Note not found' }, 404);
    }
    
    const allowedFields = ['title', 'content', 'tags'];
    const updates = {};
    
    for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
            updates[field] = req.body[field];
        }
    }
    
    notes[index] = {
        ...notes[index],
        ...updates,
        updatedAt: new Date().toISOString()
    };
    
    writeNotes(notes);
    res.json({ success: true, data: notes[index] });
});

// DELETE /notes/:id - Delete note
app.delete('/notes/:id', (req, res) => {
    const notes = readNotes();
    const index = notes.findIndex(n => n.id === req.params.id);
    
    if (index === -1) {
        return res.json({ success: false, error: 'Note not found' }, 404);
    }
    
    const deleted = notes.splice(index, 1)[0];
    writeNotes(notes);
    
    console.log(`🗑️ Deleted note: ${req.params.id}`);
    res.json({ success: true, data: deleted, message: 'Note deleted' });
});

// GET /notes/tag/:tag - Get notes by tag
app.get('/notes/tag/:tag', (req, res) => {
    const notes = readNotes();
    const tag = req.params.tag.toLowerCase();
    const filtered = notes.filter(n => 
        n.tags.some(t => t.toLowerCase() === tag)
    );
    
    res.json({
        success: true,
        tag: req.params.tag,
        count: filtered.length,
        data: filtered
    });
});

// ============= Start Server =============

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log('═══════════════════════════════════════════');
    console.log(`🚀 Notes API running on http://localhost:${PORT}`);
    console.log('═══════════════════════════════════════════');
    console.log('\n📝 Test commands:');
    console.log('');
    console.log('# Get all notes');
    console.log(`curl http://localhost:${PORT}/notes`);
    console.log('');
    console.log('# Create a note');
    console.log(`curl -X POST -H "Content-Type: application/json" \\
     -d '{"title":"Learn Node.js","content":"Study HTTP module","tags":["nodejs","learning"]}' \\
     http://localhost:${PORT}/notes`);
    console.log('');
    console.log('# Search notes');
    console.log(`curl "http://localhost:${PORT}/notes?search=node"`);
    console.log('═══════════════════════════════════════════\n');
});
```

### Step 4: Run and Test

```bash
node server.js
```

**Test Commands:**

```bash
# Create notes
curl -X POST -H "Content-Type: application/json" \
  -d '{"title":"Learn JavaScript","content":"Master ES6+ features","tags":["js","learning"]}' \
  http://localhost:3000/notes

curl -X POST -H "Content-Type: application/json" \
  -d '{"title":"Build REST API","content":"Using pure Node.js","tags":["nodejs","api"]}' \
  http://localhost:3000/notes

# Get all notes
curl http://localhost:3000/notes

# Search
curl "http://localhost:3000/notes?search=javascript"

# Get by tag
curl http://localhost:3000/notes/tag/nodejs

# Update (use actual ID from create response)
curl -X PATCH -H "Content-Type: application/json" \
  -d '{"title":"Learn JavaScript - Updated"}' \
  http://localhost:3000/notes/YOUR_ID

# Delete
curl -X DELETE http://localhost:3000/notes/YOUR_ID
```

---

## 📁 Project 2: Static File Server

A complete static file server with MIME types, directory listing, and caching.

### Project Structure

```
static-server/
├── server.js         # Main server
├── public/           # Static files directory
│   ├── index.html
│   ├── styles.css
│   ├── script.js
│   └── images/
│       └── logo.png
└── package.json
```

### Step 1: Initialize Project

```bash
mkdir static-server && cd static-server
npm init -y
mkdir -p public/images
```

### Step 2: Create `public/index.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Static Server Demo</title>
    <link rel="stylesheet" href="/styles.css">
</head>
<body>
    <div class="container">
        <header>
            <h1>🚀 Node.js Static File Server</h1>
            <p>Serving files without any framework!</p>
        </header>
        
        <main>
            <section class="card">
                <h2>About This Server</h2>
                <p>This page is served by a pure Node.js HTTP server. No Express, no frameworks - just the built-in <code>http</code> and <code>fs</code> modules.</p>
            </section>
            
            <section class="card">
                <h2>Features</h2>
                <ul>
                    <li>✅ Serves static files (HTML, CSS, JS, images)</li>
                    <li>✅ Proper MIME type handling</li>
                    <li>✅ Directory listing</li>
                    <li>✅ 404 error handling</li>
                    <li>✅ Cache control headers</li>
                    <li>✅ ETag support</li>
                </ul>
            </section>
            
            <section class="card">
                <h2>Dynamic Content</h2>
                <p>Current time: <span id="time">Loading...</span></p>
                <button id="btn">Click Me!</button>
                <p id="output"></p>
            </section>
        </main>
        
        <footer>
            <p>Built with ❤️ using pure Node.js</p>
        </footer>
    </div>
    
    <script src="/script.js"></script>
</body>
</html>
```

### Step 3: Create `public/styles.css`

```css
:root {
    --primary: #6366f1;
    --bg: #0f172a;
    --card-bg: #1e293b;
    --text: #e2e8f0;
    --text-muted: #94a3b8;
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Segoe UI', system-ui, sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.6;
    min-height: 100vh;
}

.container {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
}

header {
    text-align: center;
    padding: 3rem 0;
}

header h1 {
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
    background: linear-gradient(135deg, var(--primary), #a78bfa);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

header p {
    color: var(--text-muted);
}

.card {
    background: var(--card-bg);
    border-radius: 12px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
}

.card h2 {
    color: var(--primary);
    margin-bottom: 1rem;
    font-size: 1.25rem;
}

.card ul {
    list-style: none;
    padding-left: 0;
}

.card li {
    padding: 0.5rem 0;
    border-bottom: 1px solid rgba(255,255,255,0.1);
}

.card li:last-child {
    border-bottom: none;
}

code {
    background: rgba(99, 102, 241, 0.2);
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    font-size: 0.9em;
}

button {
    background: var(--primary);
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    cursor: pointer;
    font-size: 1rem;
    transition: transform 0.2s, box-shadow 0.2s;
}

button:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
}

#output {
    margin-top: 1rem;
    padding: 1rem;
    background: rgba(0,0,0,0.3);
    border-radius: 8px;
    min-height: 50px;
}

footer {
    text-align: center;
    padding: 2rem;
    color: var(--text-muted);
}
```

### Step 4: Create `public/script.js`

```javascript
// Update time every second
function updateTime() {
    const timeEl = document.getElementById('time');
    timeEl.textContent = new Date().toLocaleTimeString();
}
updateTime();
setInterval(updateTime, 1000);

// Button click counter
let clickCount = 0;
const btn = document.getElementById('btn');
const output = document.getElementById('output');

btn.addEventListener('click', () => {
    clickCount++;
    output.innerHTML = `
        <strong>Button clicked ${clickCount} time${clickCount !== 1 ? 's' : ''}!</strong><br>
        <small>This JavaScript was served by our Node.js static server</small>
    `;
});

console.log('🚀 Script loaded from static server!');
```

### Step 5: Create `server.js` - The Static File Server

```javascript
// server.js - Static File Server
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configuration
const PORT = 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// MIME types mapping
const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.pdf': 'application/pdf',
    '.mp4': 'video/mp4',
    '.mp3': 'audio/mpeg',
    '.txt': 'text/plain'
};

// Get MIME type from file extension
const getMimeType = (filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    return MIME_TYPES[ext] || 'application/octet-stream';
};

// Generate ETag for caching
const generateETag = (content) => {
    return crypto.createHash('md5').update(content).digest('hex');
};

// Format bytes for display
const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Serve directory listing
const serveDirectoryListing = (res, dirPath, urlPath) => {
    fs.readdir(dirPath, { withFileTypes: true }, (err, files) => {
        if (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Error reading directory');
            return;
        }
        
        const items = files.map(file => {
            const fullPath = path.join(dirPath, file.name);
            const stats = fs.statSync(fullPath);
            const isDir = file.isDirectory();
            
            return {
                name: file.name + (isDir ? '/' : ''),
                isDir,
                size: isDir ? '-' : formatBytes(stats.size),
                modified: stats.mtime.toLocaleDateString()
            };
        });
        
        // Sort: directories first, then files
        items.sort((a, b) => {
            if (a.isDir && !b.isDir) return -1;
            if (!a.isDir && b.isDir) return 1;
            return a.name.localeCompare(b.name);
        });
        
        const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Index of ${urlPath}</title>
    <style>
        body { font-family: monospace; background: #1a1a2e; color: #eee; padding: 2rem; }
        h1 { color: #00d4ff; }
        table { border-collapse: collapse; width: 100%; max-width: 800px; }
        th, td { text-align: left; padding: 0.5rem 1rem; border-bottom: 1px solid #333; }
        th { background: #16213e; }
        a { color: #00d4ff; text-decoration: none; }
        a:hover { text-decoration: underline; }
        .dir { color: #ffd700; }
        .size { color: #888; }
    </style>
</head>
<body>
    <h1>📁 Index of ${urlPath}</h1>
    <table>
        <tr><th>Name</th><th>Size</th><th>Modified</th></tr>
        ${urlPath !== '/' ? '<tr><td><a href="../">../</a></td><td>-</td><td>-</td></tr>' : ''}
        ${items.map(item => `
            <tr>
                <td><a href="${item.name}" class="${item.isDir ? 'dir' : ''}">${item.name}</a></td>
                <td class="size">${item.size}</td>
                <td class="size">${item.modified}</td>
            </tr>
        `).join('')}
    </table>
    <p style="margin-top:2rem;color:#666;">Node.js Static Server</p>
</body>
</html>`;
        
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
    });
};

// Serve 404 page
const serve404 = (res, urlPath) => {
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end(`
<!DOCTYPE html>
<html>
<head>
    <title>404 - Not Found</title>
    <style>
        body { 
            font-family: system-ui; 
            background: linear-gradient(135deg, #1a1a2e, #16213e); 
            color: #eee; 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            min-height: 100vh;
            margin: 0;
        }
        .container { text-align: center; }
        h1 { font-size: 6rem; margin: 0; color: #ff6b6b; }
        p { color: #888; font-size: 1.2rem; }
        a { color: #00d4ff; }
    </style>
</head>
<body>
    <div class="container">
        <h1>404</h1>
        <p>The file <code>${urlPath}</code> was not found.</p>
        <p><a href="/">← Back to Home</a></p>
    </div>
</body>
</html>
    `);
};

// Main server
const server = http.createServer((req, res) => {
    // Only handle GET requests
    if (req.method !== 'GET') {
        res.writeHead(405, { 'Content-Type': 'text/plain' });
        res.end('Method Not Allowed');
        return;
    }
    
    // Parse URL and decode
    const urlPath = decodeURIComponent(req.url.split('?')[0]);
    
    // Prevent directory traversal attacks
    const safePath = path.normalize(urlPath).replace(/^(\.\.(\/|\\|$))+/, '');
    const filePath = path.join(PUBLIC_DIR, safePath);
    
    // Check if path is within PUBLIC_DIR
    if (!filePath.startsWith(PUBLIC_DIR)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Forbidden');
        return;
    }
    
    fs.stat(filePath, (err, stats) => {
        if (err) {
            console.log(`❌ 404: ${urlPath}`);
            serve404(res, urlPath);
            return;
        }
        
        // If directory, try index.html or show listing
        if (stats.isDirectory()) {
            const indexPath = path.join(filePath, 'index.html');
            
            if (fs.existsSync(indexPath)) {
                serveFile(res, indexPath, req);
            } else {
                serveDirectoryListing(res, filePath, urlPath);
            }
            return;
        }
        
        // Serve the file
        serveFile(res, filePath, req);
    });
});

// Serve a file with proper headers
function serveFile(res, filePath, req) {
    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Internal Server Error');
            return;
        }
        
        const mimeType = getMimeType(filePath);
        const etag = generateETag(content);
        
        // Check if client has cached version
        if (req.headers['if-none-match'] === etag) {
            res.writeHead(304);
            res.end();
            return;
        }
        
        console.log(`✅ 200: ${path.relative(PUBLIC_DIR, filePath)} (${formatBytes(content.length)})`);
        
        res.writeHead(200, {
            'Content-Type': mimeType,
            'Content-Length': content.length,
            'ETag': etag,
            'Cache-Control': 'public, max-age=3600',
            'X-Content-Type-Options': 'nosniff'
        });
        
        res.end(content);
    });
}

// Start server
server.listen(PORT, () => {
    console.log('═══════════════════════════════════════════');
    console.log(`📁 Static Server running on http://localhost:${PORT}`);
    console.log(`📂 Serving files from: ${PUBLIC_DIR}`);
    console.log('═══════════════════════════════════════════');
});
```

### Step 6: Run and Test

```bash
node server.js
```

Open `http://localhost:3000` in your browser!

---

## ❓ Interview Questions

### Conceptual Questions

**Q1: What is a RESTful API? List REST principles.**
> REST (Representational State Transfer) is an architectural style:
> - **Stateless**: Each request contains all info needed
> - **Client-Server**: Separation of concerns
> - **Cacheable**: Responses can be cached
> - **Uniform Interface**: Consistent resource naming (nouns, not verbs)
> - **Layered System**: Can have intermediary layers

**Q2: What's the difference between PUT and PATCH?**
> - **PUT**: Replaces the entire resource (full update)
> - **PATCH**: Partially updates the resource (partial update)

**Q3: How do you handle large file uploads in Node.js?**
> Use streams to handle data in chunks rather than loading everything in memory. Listen to `data` events and write to disk or process incrementally.

**Q4: What are ETags and how do they help with caching?**
> ETags are identifiers assigned to specific versions of a resource. When a client sends `If-None-Match` header with a cached ETag, the server can return 304 (Not Modified) if unchanged, saving bandwidth.

**Q5: How would you prevent directory traversal attacks?**
> - Normalize the path using `path.normalize()`
> - Remove `..` sequences
> - Verify the resolved path starts with the intended public directory
> - Never directly concatenate user input with file paths

**Q6: Explain the purpose of MIME types.**
> MIME types tell the browser how to interpret the response content. `text/html` renders as HTML, `application/json` is parsed as JSON, `image/png` displays as image, etc.

### Coding Questions

**Q7: Write a function to parse route parameters from a path pattern.**

```javascript
const parseRouteParams = (pattern, path) => {
    const paramNames = [];
    const regex = pattern.replace(/:([^/]+)/g, (_, name) => {
        paramNames.push(name);
        return '([^/]+)';
    });
    
    const match = path.match(new RegExp(`^${regex}$`));
    if (!match) return null;
    
    return paramNames.reduce((params, name, i) => {
        params[name] = match[i + 1];
        return params;
    }, {});
};

// Usage
parseRouteParams('/users/:userId/posts/:postId', '/users/123/posts/456');
// { userId: '123', postId: '456' }
```

**Q8: Write a simple caching utility for API responses.**

```javascript
class Cache {
    constructor(ttlMs = 60000) {
        this.cache = new Map();
        this.ttl = ttlMs;
    }
    
    set(key, value) {
        this.cache.set(key, {
            value,
            expiry: Date.now() + this.ttl
        });
    }
    
    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;
        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            return null;
        }
        return item.value;
    }
    
    invalidate(key) {
        this.cache.delete(key);
    }
}

// Usage in route
const cache = new Cache(30000); // 30 sec

app.get('/data', (req, res) => {
    const cached = cache.get('data');
    if (cached) return res.json(cached);
    
    const data = fetchExpensiveData();
    cache.set('data', data);
    res.json(data);
});
```

**Q9: Implement rate limiting for the Notes API.**

```javascript
const rateLimit = (windowMs, max) => {
    const requests = new Map();
    
    return (req, res) => {
        const ip = req.socket.remoteAddress;
        const now = Date.now();
        const windowStart = now - windowMs;
        
        let ipData = requests.get(ip) || [];
        ipData = ipData.filter(t => t > windowStart);
        
        if (ipData.length >= max) {
            res.json({
                error: 'Too many requests',
                retryAfter: Math.ceil((ipData[0] + windowMs - now) / 1000)
            }, 429);
            return false; // Signal to stop processing
        }
        
        ipData.push(now);
        requests.set(ip, ipData);
        return true; // Continue processing
    };
};

// Apply to router
const limiter = rateLimit(60000, 100); // 100 requests per minute
app.use((req, res) => {
    if (!limiter(req, res)) {
        res.writableEnded = true; // Stop further processing
    }
});
```

---

## ✅ Final Practice Challenges

1. **Add authentication** to the Notes API using JWT or simple token-based auth

2. **Add image upload** to the Notes API that saves files to disk

3. **Add gzip compression** to the Static File Server for text files

4. **Create a WebSocket-ready** upgrade handler in the Static Server

5. **Implement request validation** using a schema object (like Joi/Zod pattern)

---

## 🎓 Summary: What You've Learned

| Topic | Covered In |
|-------|------------|
| HTTP Server Creation | Part 1 |
| Request/Response Objects | Part 1 |
| HTTP Methods & Status Codes | Part 1 |
| URL & Query Parsing | Part 2 |
| POST Body Handling | Part 2 |
| Custom Router Implementation | Part 2, 3 |
| Route Parameters | Part 3 |
| File System Operations | Part 3 |
| MIME Types & Headers | Part 3 |
| Caching (ETags) | Part 3 |
| Security Basics | Part 3 |

---

## 🚀 Ready for Express.js!

You now understand what Express.js does under the hood:

| Raw Node.js | Express.js Equivalent |
|-------------|----------------------|
| `http.createServer()` | `express()` |
| Manual route matching | `app.get()`, `app.post()`, etc. |
| `url.parse()` | `req.params`, `req.query` |
| Manual body parsing | `express.json()` middleware |
| `res.writeHead() + res.end()` | `res.json()`, `res.send()` |
| Custom router class | `express.Router()` |
| Static file serving | `express.static()` |

**Express.js simplifies these patterns** - but now you understand what's happening behind the scenes!

---

> 💡 **Pro Tip**: When debugging Express.js apps, knowing HTTP fundamentals helps you understand error messages and network issues much faster!
