import bcrypt from 'https://cdn.skypack.dev/bcryptjs';

const allowedOrigin = 'https://front.akeyo.io/'; // Replace with your frontend URL
// const sharedSecret = 'your-shared-secret'; // Replace with your secure shared secret
const upstashUrl = 'live-dog-21100.upstash.io'; // Replace with your Upstash Redis REST API URL
const upstashToken = 'AVJsAAIjcDEwZjBlYzU5NjA4MDY0ZDAzYjBmZTIyMWNhNWMxYTIzMnAxMA'; // Replace with your Upstash Redis token
const tokenExpirationMinutes = 30;


    // Attach CORS headers to all responses

// Helper function to create a response
function createResponse(data, status = 200, origin = null) {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (origin === allowedOrigin) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
  data = {...data || {} , origin: origin}
  return new Response(JSON.stringify(data), { status, headers });
}

// Helper function to verify and parse a token
function verifyToken(token) {
  try {
    const [username, expiration, secret] = atob(token).split(':');
    const isExpired = new Date(expiration) < new Date();
    if (secret === sharedSecret && !isExpired) {
      return username;
    }
  } catch {
    // Token verification failed
  }
  return null;
}

// Helper function to generate a token
function generateToken(username) {
  const expiration = new Date();
  expiration.setMinutes(expiration.getMinutes() + tokenExpirationMinutes);
  return btoa(`${username}:${expiration.toISOString()}:${sharedSecret}`);
}

// Helper function to interact with Upstash Redis
async function redisRequest(command, ...args) {
  const url = `${upstashUrl}/${command}/${args.map(encodeURIComponent).join('/')}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${upstashToken}` },
  });
  return response.json();
}

self.addEventListener('fetch', async (event) => {
  const url = new URL(event.request.url);
  const path = url.pathname.slice(1); // Remove leading slash
  const headers = event.request.headers;
  const origin = headers.get('Origin');
  const cors_origin = event.request.headers.get('Origin');

  
const method = event.request.method;
const corsHeaders = {
      'Access-Control-Allow-Origin': cors_origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    };

    // Handle preflight request
    if (method === 'OPTIONS') {
      event.respondWith(new Response(null, { status: 204, headers: corsHeaders }));
      return;
    
  /*
  // Handle CORS preflight requests // REMOVE && true
  if (event.request.method === 'OPTIONS') {
    // if (cors_origin === allowedOrigin) {
    if (true) {
      event.respondWith(createResponse({res: "WORKING - ALLOWED"}, 204, origin));
    } else {
      event.respondWith(createResponse({ error: `x1 Access denied from origin: cors: ${cors_origin}, ${origin}` }, 403));
    }
    return;
  } 
  */

  // Restrict access to allowed origin // REMOVE || true
//  if (origin !== allowedOrigin || true ) {
  if ( false ) {

    event.respondWith(createResponse({ error: `x2 Access denied from origin: ${origin}, cors: ${cors_origin}` }, 403));
    //event.respondWith(new Response('Forbidden', { status: 403 }));
    return;
  }

  if (path === 'signup') {
    // Handle user signup
    const { username, password } = await event.request.json();
    const existingUser = await redisRequest('hget', `users/${username}`, 'password');

    if (existingUser.result) {
      event.respondWith(createResponse({ error: 'User already exists' }, 400, origin));
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user metadata and default todos
    const metadata = { user_signup_datetime: new Date().toISOString() };
    const todos = [
      { text: 'First-Todo', creationDate: new Date().toISOString(), checked: false },
    ];

    // Save user to Redis
    await redisRequest('hset', `users/${username}`, 'password', hashedPassword);
    await redisRequest('hset', `users/${username}`, 'userdata', JSON.stringify(metadata));
    await redisRequest('hset', `users/${username}`, 'todos', JSON.stringify(todos));

    const token = generateToken(username);
    event.respondWith(createResponse({ token }, 200, origin));
  } else if (path === 'login') {
    // Handle user login
    const { username, password } = await event.request.json();
    const storedPassword = await redisRequest('hget', `users/${username}`, 'password');

    if (!storedPassword.result || !(await bcrypt.compare(password, storedPassword.result))) {
      event.respondWith(createResponse({ error: 'Invalid username or password' }, 401, origin));
      return;
    }

    

    const token = generateToken(username);
    const response = createResponse({ token }, 200, origin);
    Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value));
    event.respondWith(response);
    
    //event.respondWith(createResponse({ token }, 200, origin));
    //event.respondWith(createResponse({ token, debugOrigin: origin }, 200, origin));
  } else if (path === 'userdata') {
    // Fetch user metadata
    const token = headers.get('Authorization')?.split(' ')[1];
    const username = verifyToken(token);
    if (!username) {
      event.respondWith(createResponse({ error: 'Invalid or expired token' }, 401, origin));
      return;
    }

    const userdata = await redisRequest('hget', `users/${username}`, 'userdata');
    //event.respondWith(createResponse(JSON.parse(userdata.result || '{}'), 200, origin));
    event.respondWith(createResponse({ ...JSON.parse(userdata.result || '{}'), debugOrigin: origin }, 200, origin));
  } else if (path === 'todos') {
    const token = headers.get('Authorization')?.split(' ')[1];
    const username = verifyToken(token);
    if (!username) {
      event.respondWith(createResponse({ error: 'Invalid or expired token' }, 401, origin));
      return;
    }

    if (event.request.method === 'GET') {
      const todos = await redisRequest('hget', `users/${username}`, 'todos');
      event.respondWith(createResponse(JSON.parse(todos.result || '[]'), 200, origin));
    } else if (event.request.method === 'POST') {
      const { text } = await event.request.json();
      const todos = await redisRequest('hget', `users/${username}`, 'todos');
      const todosList = JSON.parse(todos.result || '[]');
      todosList.push({
//        text,
        text, debugOrigin: origin,
        creationDate: new Date().toISOString(),
        checked: false,
      });
      await redisRequest('hset', `users/${username}`, 'todos', JSON.stringify(todosList));
      event.respondWith(createResponse({ success: true }, 200, origin));
    } else if (event.request.method === 'DELETE') {
      const index = parseInt(url.searchParams.get('index'), 10);
      const todos = await redisRequest('hget', `users/${username}`, 'todos');
      const todosList = JSON.parse(todos.result || '[]');
      if (index >= 0 && index < todosList.length) {
        todosList.splice(index, 1);
        await redisRequest('hset', `users/${username}`, 'todos', JSON.stringify(todosList));
      }
      event.respondWith(createResponse({ success: true }, 200, origin));
    } else if (event.request.method === 'PUT') {
      const index = parseInt(url.searchParams.get('index'), 10);
      const todos = await redisRequest('hget', `users/${username}`, 'todos');
      const todosList = JSON.parse(todos.result || '[]');
      if (index >= 0 && index < todosList.length) {
        todosList[index].checked = !todosList[index].checked;
        await redisRequest('hset', `users/${username}`, 'todos', JSON.stringify(todosList));
      }
      // event.respondWith(createResponse({ success: true }, 200, origin));
      event.respondWith(createResponse({ success: true, debugOrigin: origin }, 200, origin));

    }
  } else {
    event.respondWith(createResponse({ error: 'Invalid endpoint' }, 404, origin));
  }
});
