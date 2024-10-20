'use strict';

/**
 * Configuration
 */
const PREFIX_ACCESS = '/3lwqk'; // Access protection prefix
const PREFIX_GH = '/gh/';  // Prefix for GitHub routing

/**
 * Regular expressions to match GitHub URLs
 */
const GITHUB_URL_REGEX = /^github\.com\/([^\/]+)\/([^\/]+)\/(releases\/download\/.*)$/i;

/**
 * Main fetch event handler
 * @param {FetchEvent} event
 */
addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request));
});

/**
 * Handle incoming requests
 * @param {Request} request
 * @returns {Promise<Response>}
 */
async function handleRequest(request) {
    const url = new URL(request.url);
    let path = url.pathname;

    // Check if the path starts with the access prefix
    if (!path.startsWith(PREFIX_ACCESS)) {
        return new Response('404 Not Found', { status: 404 });
    }

    // Remove the access prefix
    path = path.replace(PREFIX_ACCESS, '');

    // Check if the path is for GitHub
    if (path.startsWith(PREFIX_GH)) {
        return await handleGitHubRequest(path, request);
    }

    return new Response('404 Not Found', { status: 404 });
}

/**
 * Handle GitHub requests
 * @param {string} path
 * @param {Request} request
 * @returns {Promise<Response>}
 */
async function handleGitHubRequest(path, request) {
    // Match for GitHub releases download
    const releaseMatch = path.match(/^\/gh\/([^\/]+)\/([^\/]+)\/releases\/download\/([^\/]+)\/(.*)$/);
    
    // Match for GitHub versioning
    const versionMatch = path.match(/^\/gh\/([^\/]+)\/([^\/]+)@([^\/]+)\/(.*)$/);
    
    // Match for GitHub blob
    const blobMatch = path.match(/^\/gh\/([^\/]+)\/([^\/]+)\/blob\/([^\/]+)\/(.*)$/);
    
    // Match for GitHub raw
    const rawMatch = path.match(/^\/gh\/([^\/]+)\/([^\/]+)\/raw\/([^\/]+)\/(.*)$/);

    if (!releaseMatch && !versionMatch && !blobMatch && !rawMatch) {
        return new Response(generateUsageGuide(), { status: 400, headers: { 'Content-Type': 'text/html' } });
    }

    let user, repo, version, filePath;

    if (releaseMatch) {
        // If it's a release download match
        [, user, repo, version, filePath] = releaseMatch;
    } else if (versionMatch) {
        // If it's a version match
        [, user, repo, version, filePath] = versionMatch;
        const githubUrl = `https://github.com/${user}/${repo}/raw/refs/tags/${version}/${filePath}`;
        return await fetchWithCors(githubUrl, request);
    } else if (blobMatch) {
        // If it's a blob match
        [, user, repo, version, filePath] = blobMatch;
        const githubUrl = `https://raw.githubusercontent.com/${user}/${repo}/${version}/${filePath}`;
        return await fetchWithCors(githubUrl, request);
    } else if (rawMatch) {
        // If it's a raw match, construct the URL directly
        [, user, repo, version, filePath] = rawMatch;
        const githubUrl = `https://raw.githubusercontent.com/${user}/${repo}/${version}/${filePath}`;
        return await fetchWithCors(githubUrl, request);
    }

    // If we reached here, it should be a release download URL
    const githubUrl = `https://github.com/${user}/${repo}/releases/download/${version}/${filePath}`;

    try {
        const response = await fetch(githubUrl);
        if (!response.ok) {
            console.log("GitHub response not OK:", response.status); // Debugging output
            return new Response("File not found", { status: 404 });
        }

        // Return the response with CORS headers
        return await fetchWithCors(githubUrl, request);
    } catch (error) {
        return new Response("Internal Server Error", { status: 500 });
    }
}

/**
 * Check if the GitHub parameter is valid
 * @param {string} param
 * @returns {boolean}
 */
function isValidGitHubParameter(param) {
    return param && /^[a-zA-Z0-9_.-]+$/.test(param);
}

/**
 * Fetch the content and handle CORS
 * @param {string} url
 * @param {Request} request
 * @returns {Promise<Response>}
 */
async function fetchWithCors(url, request) {
    const res = await fetch(url);
    const resHdrNew = new Headers(res.headers);

    // Handle CORS and other headers
    resHdrNew.set('access-control-allow-origin', '*');

    return new Response(res.body, {
        status: res.status,
        headers: resHdrNew,
    });
}

/**
 * Generate an HTML usage guide for the API
 * @returns {string}
 */
function generateUsageGuide() {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Usage Guide</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 20px;
                    padding: 20px;
                    background-color: #f4f4f4;
                    color: #333;
                }
                h1 {
                    color: #007bff;
                }
                pre {
                    background-color: #eee;
                    padding: 10px;
                    border-radius: 5px;
                }
                code {
                    font-family: monospace;
                    background-color: #f9f9f9;
                    padding: 2px 4px;
                    border-radius: 4px;
                }
            </style>
        </head>
        <body>
            <h1>Usage Guide</h1>
            <p>Use the following endpoints to access GitHub releases:</p>
            <h2>GitHub Releases</h2>
            <pre>
<code>https://dl09.net/3lwqk/gh/user/repo@version/file</code>
            </pre>
            <p>Examples:</p>
            <pre>
<code>https://dl09.net/3lwqk/gh/containerd/containerd@v1.6.4/cri-containerd-cni-1.6.4-linux-amd64.tar.gz</code>
            </pre>
            <pre>
<code>https://dl09.net/3lwqk/gh/jquery/jquery@3.6.4/dist/jquery.min.js</code>
            </pre>
            <pre>
<code>https://dl09.net/3lwqk/gh/nginx/nginx@1.2.6/CHANGELOG</code>
            </pre>
            <h2>Notes</h2>
            <ul>
                <li>Make sure to use valid user, repo, and version names.</li>
                <li>Only alphanumeric characters, dashes, and underscores are allowed.</li>
                <li>For the latest version of a repository, omit the version part.</li>
            </ul>
        </body>
        </html>
    `;
}

/**
 * 默认导出
 */
export default {
    fetch: handleRequest,
};