import { API_URL } from '../config';
import React, { useState } from 'react';
import './ApiDocumentation.css';

interface ApiEndpoint {
  method: string;
  path: string;
  description: string;
  requestBody?: any;
  responseExample?: string;
  parameters?: Array<{
    name: string;
    type: string;
    in: 'query' | 'path' | 'header';
    description: string;
    required: boolean;
  }>;
}

interface ApiSection {
  title: string;
  description: string;
  endpoints: ApiEndpoint[];
}

export const ApiDocumentation: React.FC = () => {
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({});
  const [testingEndpoint, setTestingEndpoint] = useState<string | null>(null);
  const [requestParams, setRequestParams] = useState<{ [key: string]: any }>({});
  const [requestBody, setRequestBody] = useState<string>('');
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const toggleSection = (sectionKey: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const getAuthToken = () => {
    return localStorage.getItem('authToken') || '';
  };

  const executeRequest = async (endpoint: ApiEndpoint) => {
    setLoading(true);
    setResponse(null);

    try {
      const baseUrl = API_URL + '';
      let url = baseUrl + endpoint.path;

      const pathParams = endpoint.parameters?.filter(p => p.in === 'path') || [];
      pathParams.forEach(param => {
        const value = requestParams[param.name];
        if (value) {
          url = url.replace(`{${param.name}}`, value);
        }
      });

      const queryParams = endpoint.parameters?.filter(p => p.in === 'query') || [];
      const queryString = queryParams
        .map(param => {
          const value = requestParams[param.name];
          if (value !== undefined && value !== '') {
            return `${param.name}=${encodeURIComponent(value)}`;
          }
          return null;
        })
        .filter(Boolean)
        .join('&');

      if (queryString) {
        url += '?' + queryString;
      }

      const headers: any = {
        'Content-Type': 'application/json',
      };

      const token = getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const headerParams = endpoint.parameters?.filter(p => p.in === 'header') || [];
      headerParams.forEach(param => {
        const value = requestParams[param.name];
        if (value) {
          headers[param.name] = value;
        }
      });

      const options: RequestInit = {
        method: endpoint.method,
        headers,
      };

      if (['POST', 'PUT', 'PATCH'].includes(endpoint.method) && requestBody) {
        options.body = requestBody;
      }

      const startTime = Date.now();
      const res = await fetch(url, options);
      const responseTime = Date.now() - startTime;

      let responseData;
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        responseData = await res.json();
      } else {
        responseData = await res.text();
      }

      setResponse({
        status: res.status,
        statusText: res.statusText,
        data: responseData,
        headers: Object.fromEntries(res.headers.entries()),
        responseTime,
      });
    } catch (error: any) {
      setResponse({
        error: error.message || 'Request failed',
        status: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const apiSections: ApiSection[] = [
    {
      title: "SSO Login Flow",
      description: "APIs used by external services to authenticate users via SSO",
      endpoints: [
        {
          method: "GET",
          path: "/sso/login",
          description: "SSO authorization endpoint. If the user has a valid token, redirects to redirect_uri with code. Otherwise redirects to auth-service login page.",
          parameters: [
            { name: "client_id", type: "string", in: "query", description: "Service client ID", required: true },
            { name: "redirect_uri", type: "string", in: "query", description: "Callback URL after auth", required: true },
            { name: "response_type", type: "string", in: "query", description: "Must be 'code'", required: true },
            { name: "scope", type: "string", in: "query", description: "Requested scopes (e.g. documents:read documents:write)", required: false },
            { name: "state", type: "string", in: "query", description: "CSRF protection string", required: false },
            { name: "token", type: "string", in: "query", description: "Existing JWT token for SSO redirect", required: false }
          ],
          responseExample: `302 Redirect to:
{redirect_uri}?code={JWT}&state={state}`
        },
        {
          method: "POST",
          path: "/auth/token",
          description: "Exchange authorization code for access token. Also supports refresh_token and client_credentials grants.",
          requestBody: {
            grant_type: "authorization_code",
            code: "eyJhbGciOiJIUzI1NiIs...",
            client_id: "document-base-clientid",
            redirect_uri: "http://localhost:3001/auth/callback"
          },
          responseExample: `{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "",
  "token_type": "Bearer",
  "expires_in": 900
}`
        },
        {
          method: "GET",
          path: "/sso/validate",
          description: "Validate JWT token from Authorization header and return user info with permissions. Called by service backends on every authenticated request.",
          parameters: [
            { name: "Authorization", type: "string", in: "header", description: "Bearer {JWT}", required: true },
            { name: "X-Client-ID", type: "string", in: "header", description: "Service client ID", required: true },
            { name: "X-Client-Secret", type: "string", in: "header", description: "Service client secret", required: true }
          ],
          responseExample: `{
  "valid": true,
  "user_id": "cccc1010-cccc-1010-cccc-101010101010",
  "username": "doc_admin",
  "email": "docadmin@example.com",
  "roles": ["document_administrator"],
  "groups": ["document_administrator"],
  "permissions": [
    {"resource": "documents", "action": "read"},
    {"resource": "documents", "action": "write"},
    {"resource": "permissions", "action": "read"}
  ],
  "service_id": "22222222-2222-2222-2222-222222222222",
  "service_name": "document-base-service",
  "expires_at": 1774157808
}`
        },
        {
          method: "POST",
          path: "/sso/validate",
          description: "Validate JWT token using request body instead of headers.",
          requestBody: {
            token: "eyJhbGciOiJIUzI1NiIs...",
            client_id: "document-base-clientid",
            client_secret: "document-base-clientsecret"
          },
          responseExample: `{
  "valid": true,
  "user_id": "cccc1010-cccc-1010-cccc-101010101010",
  "username": "doc_admin",
  "email": "docadmin@example.com",
  "roles": ["document_administrator"],
  "groups": ["document_administrator"],
  "permissions": [
    {"resource": "documents", "action": "read"},
    {"resource": "documents", "action": "write"}
  ],
  "service_id": "22222222-2222-2222-2222-222222222222",
  "service_name": "document-base-service",
  "expires_at": 1774157808
}`
        },
        {
          method: "POST",
          path: "/sso/check-permission",
          description: "Check if a user has a specific permission for a resource.",
          requestBody: {
            token: "eyJhbGciOiJIUzI1NiIs...",
            resource: "documents",
            action: "write",
            client_id: "document-base-clientid",
            client_secret: "document-base-clientsecret"
          },
          responseExample: `{
  "allowed": true
}`
        },
        {
          method: "POST",
          path: "/sso/logout",
          description: "Blacklist a JWT token so it can no longer be used.",
          requestBody: {
            token: "eyJhbGciOiJIUzI1NiIs..."
          },
          responseExample: `{
  "success": true
}`
        },
        {
          method: "POST",
          path: "/auth/token",
          description: "Refresh an expired access token using a refresh token.",
          requestBody: {
            grant_type: "refresh_token",
            refresh_token: "eyJhbGciOiJIUzI1NiIs..."
          },
          responseExample: `{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 900
}`
        }
      ]
    },
    {
      title: "Current User",
      description: "Endpoints for the logged-in user's profile, permissions, and accessible services (requires Bearer token)",
      endpoints: [
        {
          method: "GET",
          path: "/me/permissions",
          description: "Get current user's profile with roles, groups, and effective permissions. Used by the dashboard to display user info.",
          responseExample: `{
  "username": "doc_admin",
  "email": "docadmin@example.com",
  "roles": ["document_administrator"],
  "groups": ["document_administrator"],
  "effective_permissions": [
    {"resource": "documents", "action": "read"},
    {"resource": "documents", "action": "write"},
    {"resource": "permissions", "action": "read"}
  ]
}`
        },
        {
          method: "GET",
          path: "/me/check-permission",
          description: "Check if the current user has a specific permission.",
          parameters: [
            { name: "resource", type: "string", in: "query", description: "Resource name (e.g. documents, users)", required: true },
            { name: "action", type: "string", in: "query", description: "Action name (e.g. read, write)", required: true }
          ],
          responseExample: `{
  "permission": "read:documents",
  "allowed": true
}`
        },
        {
          method: "GET",
          path: "/me/services",
          description: "Get services the current user can access. Powers the service navigation links in the user menu.",
          responseExample: `{
  "user_id": "cccc1010-cccc-1010-cccc-101010101010",
  "username": "doc_admin",
  "services": [
    {
      "id": "22222222-2222-2222-2222-222222222222",
      "name": "document-base-service",
      "client_id": "document-base-clientid",
      "redirect_uri": "http://localhost:3001/auth/callback",
      "scopes": "documents:read documents:write",
      "is_active": true
    }
  ]
}`
        }
      ]
    }
  ];

  const renderEndpointTester = (endpoint: ApiEndpoint, key: string) => {
    const isActive = testingEndpoint === key;

    return (
      <div style={{ marginTop: '20px' }}>
        <button
          onClick={() => {
            if (isActive) {
              setTestingEndpoint(null);
              setRequestParams({});
              setRequestBody('');
              setResponse(null);
            } else {
              setTestingEndpoint(key);
              setRequestParams({});
              setRequestBody(endpoint.requestBody ? JSON.stringify(endpoint.requestBody, null, 2) : '');
              setResponse(null);
            }
          }}
          style={{
            background: isActive ? '#dc3545' : '#667eea',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          {isActive ? 'Close Tester' : 'Test Endpoint'}
        </button>

        {isActive && (
          <div style={{
            marginTop: '20px',
            padding: '20px',
            background: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #dee2e6'
          }}>
            <h4 style={{ marginTop: 0, color: '#495057' }}>API Endpoint Tester</h4>

            {endpoint.parameters && endpoint.parameters.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h5 style={{ color: '#666' }}>Parameters:</h5>
                {endpoint.parameters.map(param => (
                  <div key={param.name} style={{ marginBottom: '10px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
                      {param.name} ({param.in})
                      {param.required && <span style={{ color: '#dc3545' }}> *</span>}
                    </label>
                    <input
                      type="text"
                      value={requestParams[param.name] || ''}
                      onChange={(e) => setRequestParams({
                        ...requestParams,
                        [param.name]: e.target.value
                      })}
                      placeholder={param.description}
                      style={{
                        width: '100%',
                        padding: '8px',
                        borderRadius: '4px',
                        border: '1px solid #ced4da',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                ))}
              </div>
            )}

            {['POST', 'PUT', 'PATCH'].includes(endpoint.method) && (
              <div style={{ marginBottom: '20px' }}>
                <h5 style={{ color: '#666' }}>Request Body:</h5>
                <textarea
                  value={requestBody}
                  onChange={(e) => setRequestBody(e.target.value)}
                  placeholder="Enter JSON request body"
                  style={{
                    width: '100%',
                    height: '150px',
                    padding: '10px',
                    borderRadius: '4px',
                    border: '1px solid #ced4da',
                    fontFamily: 'monospace',
                    fontSize: '13px'
                  }}
                />
              </div>
            )}

            <button
              onClick={() => executeRequest(endpoint)}
              disabled={loading}
              style={{
                background: loading ? '#6c757d' : '#28a745',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '5px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              {loading ? 'Sending...' : 'Send Request'}
            </button>

            {response && (
              <div style={{ marginTop: '20px' }}>
                <h5 style={{ color: '#666' }}>Response:</h5>

                <div style={{ marginBottom: '10px' }}>
                  <span style={{
                    background: response.status >= 200 && response.status < 300 ? '#28a745' :
                               response.status >= 400 ? '#dc3545' : '#ffc107',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    marginRight: '10px'
                  }}>
                    {response.status} {response.statusText}
                  </span>
                  {response.responseTime && (
                    <span style={{ color: '#6c757d', fontSize: '12px' }}>
                      Response time: {response.responseTime}ms
                    </span>
                  )}
                </div>

                {response.headers && (
                  <details style={{ marginBottom: '10px' }}>
                    <summary style={{ cursor: 'pointer', color: '#666', fontSize: '14px' }}>
                      Response Headers
                    </summary>
                    <pre style={{
                      background: 'white',
                      padding: '10px',
                      borderRadius: '4px',
                      overflow: 'auto',
                      fontSize: '12px',
                      marginTop: '5px'
                    }}>
                      {JSON.stringify(response.headers, null, 2)}
                    </pre>
                  </details>
                )}

                <div>
                  <div style={{ color: '#666', fontSize: '14px', marginBottom: '5px' }}>
                    Response Body:
                  </div>
                  <pre style={{
                    background: 'white',
                    padding: '15px',
                    borderRadius: '4px',
                    overflow: 'auto',
                    fontSize: '13px',
                    maxHeight: '400px',
                    border: '1px solid #dee2e6'
                  }}>
                    {response.error ?
                      `Error: ${response.error}` :
                      typeof response.data === 'object' ?
                        JSON.stringify(response.data, null, 2) :
                        response.data
                    }
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="api-documentation">
      <h1>SSO API Documentation</h1>
      <p style={{ color: '#6c757d', marginBottom: '30px' }}>
        APIs for integrating external services with auth-service SSO. Click "Test Endpoint" to try any API call.
      </p>

      {/* SSO Flow Overview */}
      <div style={{
        background: '#e8f4f8',
        border: '2px solid #007bff',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '30px'
      }}>
        <h3 style={{ color: '#007bff', marginTop: 0 }}>SSO Flow</h3>
        <pre style={{
          background: '#f8f9fa',
          padding: '15px',
          borderRadius: '5px',
          fontSize: '13px',
          margin: 0,
          overflow: 'auto'
        }}>
{`1. Frontend redirects to  ->  GET /sso/login (with token)
2. Auth-service validates  ->  Redirects to redirect_uri?code={JWT}
3. Frontend exchanges code ->  POST /auth/token (authorization_code grant)
4. Backend validates token ->  GET /sso/validate (on every request)
5. User logs out           ->  POST /sso/logout (blacklists token)`}
        </pre>
      </div>

      {/* Document-Base Example */}
      <div className="api-section" style={{ marginBottom: '25px' }}>
        <div
          className="section-header"
          onClick={() => toggleSection('doc-base-example')}
          style={{
            cursor: 'pointer',
            padding: '15px',
            background: '#d4edda',
            borderRadius: '5px',
            marginBottom: '10px',
            border: '2px solid #28a745'
          }}
        >
          <h2 style={{ margin: 0, color: '#28a745' }}>
            {expandedSections['doc-base-example'] ? '\u25BC' : '\u25B6'} Document-Base Integration Example
          </h2>
          <p style={{ margin: '5px 0 0 0', color: '#495057', fontSize: '14px' }}>
            How document-base-service (localhost:3001) integrates with auth-service
          </p>
        </div>

        {expandedSections['doc-base-example'] && (
          <div style={{ background: 'white', border: '2px solid #28a745', borderRadius: '8px', padding: '30px' }}>

            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ color: '#28a745', marginTop: 0 }}>Configuration</h3>
              <p><strong>Backend</strong> (document-base backend/.env):</p>
              <pre style={{ background: '#343a40', color: '#fff', padding: '15px', borderRadius: '5px', fontSize: '13px' }}>
{`AUTH_SERVICE_URL=http://localhost:8080
CLIENT_ID=document-base-clientid
CLIENT_SECRET=document-base-clientsecret`}
              </pre>
              <p style={{ marginTop: '15px' }}><strong>Frontend</strong> (document-base environment):</p>
              <pre style={{ background: '#343a40', color: '#fff', padding: '15px', borderRadius: '5px', fontSize: '13px' }}>
{`REACT_APP_AUTH_SERVICE_URL=http://localhost:8080
REACT_APP_CLIENT_ID=document-base-clientid`}
              </pre>
            </div>

            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ color: '#28a745' }}>1. Frontend: Initiate SSO Login</h3>
              <p>Redirect user to auth-service with the current JWT token for seamless SSO.</p>
              <pre style={{ background: '#f8f9fa', padding: '15px', borderRadius: '5px', fontSize: '13px', border: '1px solid #dee2e6', overflow: 'auto' }}>
{`// authProvider.tsx - initiateLogin()
const loginUrl = \`\${AUTH_SERVICE_URL}/sso/login?\` + new URLSearchParams({
  client_id: 'document-base-clientid',
  redirect_uri: \`\${window.location.origin}/auth/callback\`,
  response_type: 'code',
  scope: 'documents:read documents:write',
  state: crypto.randomUUID(),
  token: localStorage.getItem('jwt') || '',
});
window.location.href = loginUrl;`}
              </pre>
            </div>

            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ color: '#28a745' }}>2. Frontend: Exchange Code for Token</h3>
              <p>After auth-service redirects back with <code>?code=JWT</code>, exchange it:</p>
              <pre style={{ background: '#f8f9fa', padding: '15px', borderRadius: '5px', fontSize: '13px', border: '1px solid #dee2e6', overflow: 'auto' }}>
{`// AuthCallback.tsx
const response = await axios.post(\`\${AUTH_SERVICE_URL}/auth/token\`, {
  grant_type: 'authorization_code',
  code: new URLSearchParams(window.location.search).get('code'),
  client_id: 'document-base-clientid',
  redirect_uri: \`\${window.location.origin}/auth/callback\`,
});
localStorage.setItem('jwt', response.data.access_token);
window.location.replace('/');`}
              </pre>
            </div>

            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ color: '#28a745' }}>3. Backend: Validate Token on Every Request</h3>
              <p>The backend middleware calls auth-service to validate the JWT and get user permissions:</p>
              <pre style={{ background: '#f8f9fa', padding: '15px', borderRadius: '5px', fontSize: '13px', border: '1px solid #dee2e6', overflow: 'auto' }}>
{`// ssoClient.ts
const response = await axios.get(\`\${AUTH_SERVICE_URL}/sso/validate\`, {
  headers: {
    'Authorization': \`Bearer \${token}\`,
    'X-Client-ID': 'document-base-clientid',
    'X-Client-Secret': 'document-base-clientsecret',
  },
  timeout: 10000,
});

if (response.data.valid) {
  // Check permissions locally from the response
  const canWrite = response.data.permissions.some(
    p => p.resource === 'documents' && p.action === 'write'
  );
}`}
              </pre>
            </div>

            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ color: '#28a745' }}>4. Frontend: Logout</h3>
              <pre style={{ background: '#f8f9fa', padding: '15px', borderRadius: '5px', fontSize: '13px', border: '1px solid #dee2e6', overflow: 'auto' }}>
{`// authProvider.tsx - logout()
await axios.post(\`\${AUTH_SERVICE_URL}/sso/logout\`, {
  token: localStorage.getItem('jwt'),
});
localStorage.removeItem('jwt');
localStorage.removeItem('refresh_token');`}
              </pre>
            </div>

            <div style={{ background: '#fff3cd', padding: '15px', borderRadius: '8px', border: '1px solid #ffeaa7' }}>
              <h4 style={{ marginTop: 0, color: '#856404' }}>Summary</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ background: '#ffeaa7' }}>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Where</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>API</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Purpose</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>Frontend login</td><td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}><code>GET /sso/login</code></td><td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>Redirect to auth-service</td></tr>
                  <tr><td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>Frontend callback</td><td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}><code>POST /auth/token</code></td><td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>Exchange code for JWT</td></tr>
                  <tr><td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>Frontend refresh</td><td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}><code>POST /auth/token</code></td><td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>Refresh expired token</td></tr>
                  <tr><td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>Frontend logout</td><td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}><code>POST /sso/logout</code></td><td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>Blacklist token</td></tr>
                  <tr><td style={{ padding: '8px' }}>Backend middleware</td><td style={{ padding: '8px' }}><code>GET /sso/validate</code></td><td style={{ padding: '8px' }}>Validate token + get permissions</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* API Sections */}
      {apiSections.map((section, sectionIndex) => (
        <div key={sectionIndex} className="api-section" style={{ marginBottom: '25px' }}>
          <div
            className="section-header"
            onClick={() => toggleSection(section.title)}
            style={{
              cursor: 'pointer',
              padding: '15px',
              background: '#f8f9fa',
              borderRadius: '5px',
              marginBottom: '10px',
              border: '1px solid #dee2e6'
            }}
          >
            <h2 style={{ margin: 0, color: '#495057' }}>
              {expandedSections[section.title] ? '\u25BC' : '\u25B6'} {section.title}
            </h2>
            <p style={{ margin: '5px 0 0 0', color: '#6c757d', fontSize: '14px' }}>
              {section.description}
            </p>
          </div>

          {expandedSections[section.title] && (
            <div style={{ background: 'white', border: '1px solid #dee2e6', borderRadius: '8px' }}>
              {section.endpoints.map((endpoint, endpointIndex) => {
                const endpointKey = `${section.title}-${endpointIndex}`;
                return (
                  <div
                    key={endpointIndex}
                    style={{
                      padding: '20px',
                      borderBottom: endpointIndex < section.endpoints.length - 1 ? '1px solid #eee' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap' }}>
                      <span style={{
                        background: endpoint.method === 'GET' ? '#28a745' :
                                   endpoint.method === 'POST' ? '#007bff' :
                                   endpoint.method === 'PUT' ? '#ffc107' :
                                   endpoint.method === 'DELETE' ? '#dc3545' : '#6c757d',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        marginRight: '10px'
                      }}>
                        {endpoint.method}
                      </span>
                      <code style={{
                        background: '#f8f9fa',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        marginRight: '10px'
                      }}>
                        {endpoint.path}
                      </code>
                    </div>

                    <p style={{ margin: '0 0 15px 0', color: '#666' }}>
                      {endpoint.description}
                    </p>

                    {endpoint.parameters && endpoint.parameters.length > 0 && (
                      <div style={{ marginBottom: '15px' }}>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#333' }}>
                          Parameters:
                        </h4>
                        <table style={{
                          width: '100%',
                          borderCollapse: 'collapse',
                          fontSize: '13px'
                        }}>
                          <thead>
                            <tr style={{ background: '#f8f9fa' }}>
                              <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Name</th>
                              <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>In</th>
                              <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Description</th>
                              <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Required</th>
                            </tr>
                          </thead>
                          <tbody>
                            {endpoint.parameters.map((param, paramIndex) => (
                              <tr key={paramIndex}>
                                <td style={{ padding: '8px', borderBottom: '1px solid #dee2e6' }}>
                                  <code>{param.name}</code>
                                </td>
                                <td style={{ padding: '8px', borderBottom: '1px solid #dee2e6' }}>{param.in}</td>
                                <td style={{ padding: '8px', borderBottom: '1px solid #dee2e6' }}>{param.description}</td>
                                <td style={{ padding: '8px', borderBottom: '1px solid #dee2e6' }}>
                                  <span style={{
                                    background: param.required ? '#dc3545' : '#6c757d',
                                    color: 'white',
                                    padding: '2px 6px',
                                    borderRadius: '3px',
                                    fontSize: '11px'
                                  }}>
                                    {param.required ? 'Yes' : 'No'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
                      {endpoint.requestBody && (
                        <div style={{ flex: 1 }}>
                          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#333' }}>
                            Request Body:
                          </h4>
                          <pre style={{
                            background: '#f8f9fa',
                            padding: '10px',
                            borderRadius: '5px',
                            overflow: 'auto',
                            fontSize: '12px',
                            margin: 0,
                            border: '1px solid #dee2e6'
                          }}>
                            <code>
                              {typeof endpoint.requestBody === 'object' ?
                                JSON.stringify(endpoint.requestBody, null, 2) :
                                endpoint.requestBody}
                            </code>
                          </pre>
                        </div>
                      )}

                      {endpoint.responseExample && (
                        <div style={{ flex: 1 }}>
                          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#333' }}>
                            Response Example:
                          </h4>
                          <pre style={{
                            background: '#f8f9fa',
                            padding: '10px',
                            borderRadius: '5px',
                            overflow: 'auto',
                            fontSize: '12px',
                            margin: 0,
                            border: '1px solid #dee2e6'
                          }}>
                            <code>{endpoint.responseExample}</code>
                          </pre>
                        </div>
                      )}
                    </div>

                    {renderEndpointTester(endpoint, endpointKey)}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
