self.addEventListener('fetch', async (event) => {
  const url = new URL(event.request.url);
  const path = url.pathname.slice(1); // Get the path after the leading '/'
  const headers = event.request.headers;

  if (path === 'signup') {
    // Handle signup logic
    // Respond with JSON only
    event.respondWith(createResponse({ message: 'Signup endpoint hit' }));
  } else if (path === 'todos') {
    // Handle todos logic
    // Return a JSON response for todos
    event.respondWith(createResponse({ todos: 'Sample todo list' }));
  } else {
    // Catch-all: return 404 or redirect to index.html
    event.respondWith(
      new Response('Not Found', {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    );
  }
});

/***
// Redirect all API requests to the index.html page with query params
self.addEventListener("fetch", async (event) => {
  const url = new URL(event.request.url);
  const path = url.pathname.slice(1); // Get path without leading slash

  // Define a list of valid endpoints for the API
  const validPaths = ["signup", "login", "todos"];

  // If the requested path is valid, continue to process the request
  if (validPaths.includes(path)) {
    // If it's a valid path, continue with the API request
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response("Error processing request", { status: 500 });
      })
    );
  } else {
    // If the path is not valid, redirect to index.html
    const redirectUrl = new URL("/index.html", event.request.url);
    redirectUrl.searchParams.append("path", path);
    redirectUrl.searchParams.append("_method", event.request.method);
    event.respondWith(Response.redirect(redirectUrl, 301));
  }
});


/*********************


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
  const path = url.pathname.slice(1); // Remove leading slash

  if (path === 'todos') {
    if (event.request.method === 'GET') {
      const todos = await redisRequest('lrange', 'todos', 0, -1);
      const todoList = todos.result.map(text => ({ text }));
      event.respondWith(
        new Response(JSON.stringify(todoList), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        })
      );
    } else if (event.request.method === 'POST') {
      const { text } = await event.request.json();
      await redisRequest('rpush', 'todos', text);
      event.respondWith(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        })
      );
    } else {
      event.respondWith(
        new Response(JSON.stringify({ error: 'Method not allowed' }), {
          status: 405,
          headers: { 'Access-Control-Allow-Origin': '*' },
        })
      );
    }
  } else {
    event.respondWith(
      new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Access-Control-Allow-Origin': '*' },
      })
    );
  }
});

*******/
