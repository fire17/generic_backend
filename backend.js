import bcrypt from 'https://cdn.skypack.dev/bcryptjs';

const allowedOrigin = 'https://front.akeyo.io/'; // Replace with your frontend URL
// const sharedSecret = 'your-shared-secret'; // Replace with your secure shared secret
const upstashUrl = 'live-dog-21100.upstash.io'; // Replace with your Upstash Redis REST API URL
const upstashToken = 'AVJsAAIjcDEwZjBlYzU5NjA4MDY0ZDAzYjBmZTIyMWNhNWMxYTIzMnAxMA'; // Replace with your Upstash Redis token
const tokenExpirationMinutes = 30;

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
  const path = url.pathname.slice(1);

  if (path === 'todos') {
    if (event.request.method === 'GET') {
      const todos = await redisRequest('lrange', 'todos', 0, -1);
      const todoList = todos.result.map(text => ({ text }));
      event.respondWith(new Response(JSON.stringify(todoList), { status: 200 }));
    } else if (event.request.method === 'POST') {
      const { text } = await event.request.json();
      await redisRequest('rpush', 'todos', text);
      event.respondWith(new Response(JSON.stringify({ success: true }), { status: 200 }));
    } else {
      event.respondWith(new Response(null, { status: 405 })); // Method Not Allowed
    }
  } else {
    event.respondWith(new Response(null, { status: 404 })); // Not Found
  }
});
