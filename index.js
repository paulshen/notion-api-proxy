// Cloudflare supports the GET, POST, HEAD, and OPTIONS methods from any origin,
// and allow any header on requests. These headers must be present
// on all responses to all CORS preflight requests. In practice, this means
// all responses to OPTIONS requests.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,HEAD,POST,PATCH,OPTIONS',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Allow-Credentials': 'true',
};

// The URL for the remote third party API you want to fetch from
// but does not implement CORS
const API_URL = 'https://api.notion.com';

async function handleRequest(request) {
  const url = new URL(request.url);
  let apiUrl = `${API_URL}${url.pathname}`;
  const requestOrigin = request.headers.get('Origin') || '*';

  // Rewrite request to point to API URL. This also makes the request mutable
  // so you can add the correct Origin header to make the API server think
  // that this request is not cross-site.
  request = new Request(apiUrl, request);
  request.headers.set('Origin', new URL(apiUrl).origin);
  let response = await fetch(request);

  // Recreate the response so you can modify the headers
  response = new Response(response.body, response);

  // Set CORS headers
  response.headers.set('Access-Control-Allow-Origin', requestOrigin);
  response.headers.set('Access-Control-Allow-Credentials', 'true');

  // Append to/Add Vary header so browser will cache response correctly
  response.headers.append('Vary', 'Origin');

  return response;
}

function handleOptions(request) {
  // Make sure the necessary headers are present
  // for this to be a valid pre-flight request
  let headers = request.headers;
  const origin = headers.get('Origin') || '*';
  if (
    headers.get('Origin') !== null &&
    headers.get('Access-Control-Request-Method') !== null &&
    headers.get('Access-Control-Request-Headers') !== null
  ) {
    // Handle CORS pre-flight request.
    // If you want to check or reject the requested method + headers
    // you can do that here.
    let respHeaders = {
      ...corsHeaders,
      'Access-Control-Allow-Origin': origin,
      // Allow all future content Request headers to go back to browser
      // such as Authorization (Bearer) or X-Client-Name-Version
      'Access-Control-Allow-Headers': request.headers.get('Access-Control-Request-Headers'),
    };

    return new Response(null, {
      headers: respHeaders,
    });
  } else {
    // Handle standard OPTIONS request.
    // If you want to allow other HTTP Methods, you can do that here.
    return new Response(null, {
      headers: {
        Allow: 'GET, HEAD, POST, PATCH, OPTIONS',
      },
    });
  }
}

addEventListener('fetch', event => {
  const request = event.request;
  const method = request.method.toUpperCase();
  if (method === 'OPTIONS') {
    // Handle CORS preflight requests
    event.respondWith(handleOptions(request));
  } else if (method === 'GET' || method === 'HEAD' || method === 'POST' || method === 'PATCH') {
    // Handle requests to the API server
    event.respondWith(handleRequest(request));
  } else {
    event.respondWith(
      new Response(null, {
        status: 405,
        statusText: 'Method Not Allowed',
      })
    );
  }
});