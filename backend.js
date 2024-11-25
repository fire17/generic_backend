import bcrypt from 'https://cdn.skypack.dev/bcryptjs';

// const sharedSecret = 'your-shared-secret'; // Replace with your secure shared secret
const upstashUrl = 'live-dog-21100.upstash.io'; // Replace with your Upstash Redis REST API URL
const upstashToken = 'AVJsAAIjcDEwZjBlYzU5NjA4MDY0ZDAzYjBmZTIyMWNhNWMxYTIzMnAxMA'; // Replace with your Upstash Redis token
const tokenExpirationMinutes = 30;

// Helper function to create a response
function createResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
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

  if (path === 'signup') {
    // Handle user signup
    const { username, password } = await event.request.json();
    const existingUser = await redisRequest('hget', `users/${username}`, 'password');

    if (existingUser.result) {
      event.respondWith(createResponse({ error: 'User already exists' }, 400));
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
    event.respondWith(createResponse({ token }));
  } else if (path === 'login') {
    // Handle user login
    const { username, password } = await event.request.json();
    const storedPassword = await redisRequest('hget', `users/${username}`, 'password');

    if (!storedPassword.result || !(await bcrypt.compare(password, storedPassword.result))) {
      event.respondWith(createResponse({ error: 'Invalid username or password' }, 401));
      return;
    }

    const token = generateToken(username);
    event.respondWith(createResponse({ token }));
  } else if (path === 'userdata') {
    // Fetch user metadata
    const token = headers.get('Authorization')?.split(' ')[1];
    const username = verifyToken(token);
    if (!username) {
      event.respondWith(createResponse({ error: 'Invalid or expired token' }, 401));
      return;
    }

    const userdata = await redisRequest('hget', `users/${username}`, 'userdata');
    event.respondWith(createResponse(JSON.parse(userdata.result || '{}')));
  } else if (path === 'todos') {
    const token = headers.get('Authorization')?.split(' ')[1];
    const username = verifyToken(token);
    if (!username) {
      event.respondWith(createResponse({ error: 'Invalid or expired token' }, 401));
      return;
    }

    if (event.request.method === 'GET') {
      const todos = await redisRequest('hget', `users/${username}`, 'todos');
      event.respondWith(createResponse(JSON.parse(todos.result || '[]')));
    } else if (event.request.method === 'POST') {
      const { text } = await event.request.json();
      const todos = await redisRequest('hget', `users/${username}`, 'todos');
      const todosList = JSON.parse(todos.result || '[]');
      todosList.push({
        text,
        creationDate: new Date().toISOString(),
        checked: false,
      });
      await redisRequest('hset', `users/${username}`, 'todos', JSON.stringify(todosList));
      event.respondWith(createResponse({ success: true }));
    } else if (event.request.method === 'DELETE') {
      const index = parseInt(url.searchParams.get('index'), 10);
      const todos = await redisRequest('hget', `users/${username}`, 'todos');
      const todosList = JSON.parse(todos.result || '[]');
      if (index >= 0 && index < todosList.length) {
        todosList.splice(index, 1);
        await redisRequest('hset', `users/${username}`, 'todos', JSON.stringify(todosList));
      }
      event.respondWith(createResponse({ success: true }));
    } else if (event.request.method === 'PUT') {
      const index = parseInt(url.searchParams.get('index'), 10);
      const todos = await redisRequest('hget', `users/${username}`, 'todos');
      const todosList = JSON.parse(todos.result || '[]');
      if (index >= 0 && index < todosList.length) {
        todosList[index].checked = !todosList[index].checked;
        await redisRequest('hset', `users/${username}`, 'todos', JSON.stringify(todosList));
      }
      event.respondWith(createResponse({ success: true }));
    }
  } else {
    event.respondWith(createResponse({ error: 'Invalid endpoint' }, 404));
  }
});
