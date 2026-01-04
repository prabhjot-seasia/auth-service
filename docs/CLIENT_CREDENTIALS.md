# Client Credentials Integration Guide

## Overview

The Client Credentials flow is designed for service-to-service authentication where no user interaction is required. This is ideal for:
- Background services
- API-to-API communication  
- Automated processes
- Microservice authentication

## Flow Overview

```
1. Service requests token using client credentials
2. Auth Service validates credentials and returns JWT token
3. Service uses token for API requests
4. Token expires after 15 minutes (configurable)
```

## Step 1: Register Your Service

Register your service to get client credentials:

```bash
curl -X POST http://localhost:8080/services \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Background Service",
    "scopes": "users:read roles:read services:read"
  }'
```

**Response:**
```json
{
  "id": "service-uuid",
  "name": "Background Service", 
  "client_id": "generated-client-id",
  "client_secret": "generated-client-secret",
  "scopes": "users:read roles:read services:read",
  "is_active": true
}
```

**⚠️ Important:** Save the `client_secret` immediately - it's only shown once!

## Step 2: Obtain Access Token

Request an access token using your client credentials:

```bash
curl -X POST http://localhost:8080/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "client_credentials",
    "client_id": "your-client-id",
    "client_secret": "your-client-secret"
  }'
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer", 
  "expires_in": 900
}
```

## Step 3: Use Token for API Requests

Use the access token to make authenticated requests:

```bash
curl -X GET http://localhost:8080/users \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## Implementation Examples

### Java Spring Boot

```java
@Component
public class AuthServiceClient {
    
    @Value("${auth.service.url}")
    private String authServiceUrl;
    
    @Value("${auth.service.client-id}")
    private String clientId;
    
    @Value("${auth.service.client-secret}")
    private String clientSecret;
    
    private RestTemplate restTemplate = new RestTemplate();
    private String accessToken;
    private Instant tokenExpiry;
    
    public String getAccessToken() {
        if (accessToken == null || Instant.now().isAfter(tokenExpiry)) {
            refreshToken();
        }
        return accessToken;
    }
    
    private void refreshToken() {
        TokenRequest request = new TokenRequest();
        request.setGrantType("client_credentials");
        request.setClientId(clientId);
        request.setClientSecret(clientSecret);
        
        TokenResponse response = restTemplate.postForObject(
            authServiceUrl + "/auth/token",
            request,
            TokenResponse.class
        );
        
        this.accessToken = response.getAccessToken();
        this.tokenExpiry = Instant.now().plusSeconds(response.getExpiresIn() - 60); // 60s buffer
    }
    
    public List<User> getUsers() {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(getAccessToken());
        HttpEntity<String> entity = new HttpEntity<>(headers);
        
        ResponseEntity<User[]> response = restTemplate.exchange(
            authServiceUrl + "/users",
            HttpMethod.GET,
            entity,
            User[].class
        );
        
        return Arrays.asList(response.getBody());
    }
}

// Data classes
@Data
public class TokenRequest {
    @JsonProperty("grant_type")
    private String grantType;
    @JsonProperty("client_id")
    private String clientId;
    @JsonProperty("client_secret")
    private String clientSecret;
}

@Data
public class TokenResponse {
    @JsonProperty("access_token")
    private String accessToken;
    @JsonProperty("token_type")
    private String tokenType;
    @JsonProperty("expires_in")
    private int expiresIn;
}
```

### .NET Core

```csharp
public class AuthServiceClient
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _config;
    private string _accessToken;
    private DateTime _tokenExpiry;
    
    public AuthServiceClient(HttpClient httpClient, IConfiguration config)
    {
        _httpClient = httpClient;
        _config = config;
    }
    
    public async Task<string> GetAccessTokenAsync()
    {
        if (string.IsNullOrEmpty(_accessToken) || DateTime.UtcNow >= _tokenExpiry)
        {
            await RefreshTokenAsync();
        }
        return _accessToken;
    }
    
    private async Task RefreshTokenAsync()
    {
        var tokenRequest = new
        {
            grant_type = "client_credentials",
            client_id = _config["Auth:ClientId"],
            client_secret = _config["Auth:ClientSecret"]
        };
        
        var response = await _httpClient.PostAsJsonAsync(
            $"{_config["Auth:ServiceUrl"]}/auth/token",
            tokenRequest
        );
        
        response.EnsureSuccessStatusCode();
        
        var tokenResponse = await response.Content.ReadFromJsonAsync<TokenResponse>();
        _accessToken = tokenResponse.AccessToken;
        _tokenExpiry = DateTime.UtcNow.AddSeconds(tokenResponse.ExpiresIn - 60); // 60s buffer
    }
    
    public async Task<List<User>> GetUsersAsync()
    {
        var token = await GetAccessTokenAsync();
        _httpClient.DefaultRequestHeaders.Authorization = 
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        
        var response = await _httpClient.GetAsync(
            $"{_config["Auth:ServiceUrl"]}/users"
        );
        
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<List<User>>();
    }
}

public class TokenResponse
{
    [JsonPropertyName("access_token")]
    public string AccessToken { get; set; }
    
    [JsonPropertyName("token_type")]
    public string TokenType { get; set; }
    
    [JsonPropertyName("expires_in")]
    public int ExpiresIn { get; set; }
}

// Dependency Injection Setup
public void ConfigureServices(IServiceCollection services)
{
    services.AddHttpClient<AuthServiceClient>();
}
```

### Node.js

```javascript
const axios = require('axios');

class AuthServiceClient {
    constructor(config) {
        this.authServiceUrl = config.authServiceUrl;
        this.clientId = config.clientId;
        this.clientSecret = config.clientSecret;
        this.accessToken = null;
        this.tokenExpiry = null;
    }
    
    async getAccessToken() {
        if (!this.accessToken || Date.now() >= this.tokenExpiry) {
            await this.refreshToken();
        }
        return this.accessToken;
    }
    
    async refreshToken() {
        try {
            const response = await axios.post(`${this.authServiceUrl}/auth/token`, {
                grant_type: 'client_credentials',
                client_id: this.clientId,
                client_secret: this.clientSecret
            });
            
            this.accessToken = response.data.access_token;
            // Set expiry with 60 second buffer
            this.tokenExpiry = Date.now() + (response.data.expires_in - 60) * 1000;
        } catch (error) {
            console.error('Failed to refresh token:', error.message);
            throw error;
        }
    }
    
    async getUsers() {
        const token = await this.getAccessToken();
        
        try {
            const response = await axios.get(`${this.authServiceUrl}/users`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            if (error.response?.status === 401) {
                // Token might be expired, clear it and retry once
                this.accessToken = null;
                const newToken = await this.getAccessToken();
                
                const retryResponse = await axios.get(`${this.authServiceUrl}/users`, {
                    headers: {
                        Authorization: `Bearer ${newToken}`
                    }
                });
                return retryResponse.data;
            }
            throw error;
        }
    }
}

// Usage
const authClient = new AuthServiceClient({
    authServiceUrl: process.env.AUTH_SERVICE_URL,
    clientId: process.env.AUTH_CLIENT_ID,
    clientSecret: process.env.AUTH_CLIENT_SECRET
});

// Express middleware
const authenticateService = async (req, res, next) => {
    try {
        const token = await authClient.getAccessToken();
        req.authToken = token;
        next();
    } catch (error) {
        res.status(500).json({ error: 'Authentication failed' });
    }
};

module.exports = { AuthServiceClient, authenticateService };
```

### Python

```python
import requests
import time
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

class AuthServiceClient:
    def __init__(self, auth_service_url: str, client_id: str, client_secret: str):
        self.auth_service_url = auth_service_url
        self.client_id = client_id
        self.client_secret = client_secret
        self.access_token: Optional[str] = None
        self.token_expiry: Optional[datetime] = None
        
    def get_access_token(self) -> str:
        if not self.access_token or datetime.now() >= self.token_expiry:
            self._refresh_token()
        return self.access_token
    
    def _refresh_token(self):
        token_data = {
            'grant_type': 'client_credentials',
            'client_id': self.client_id,
            'client_secret': self.client_secret
        }
        
        response = requests.post(
            f'{self.auth_service_url}/auth/token',
            json=token_data
        )
        response.raise_for_status()
        
        token_response = response.json()
        self.access_token = token_response['access_token']
        # Set expiry with 60 second buffer
        expires_in = token_response['expires_in'] - 60
        self.token_expiry = datetime.now() + timedelta(seconds=expires_in)
    
    def get_users(self) -> list:
        token = self.get_access_token()
        headers = {'Authorization': f'Bearer {token}'}
        
        response = requests.get(
            f'{self.auth_service_url}/users',
            headers=headers
        )
        
        if response.status_code == 401:
            # Token might be expired, refresh and retry
            self.access_token = None
            token = self.get_access_token()
            headers = {'Authorization': f'Bearer {token}'}
            response = requests.get(
                f'{self.auth_service_url}/users',
                headers=headers
            )
        
        response.raise_for_status()
        return response.json()

# Usage
import os

auth_client = AuthServiceClient(
    auth_service_url=os.getenv('AUTH_SERVICE_URL'),
    client_id=os.getenv('AUTH_CLIENT_ID'),
    client_secret=os.getenv('AUTH_CLIENT_SECRET')
)

# Get users
users = auth_client.get_users()
print(f"Retrieved {len(users)} users")
```

## Best Practices

### 1. Token Management
- Cache tokens until expiry (15 minutes by default)
- Implement automatic refresh with buffer time (60 seconds before expiry)
- Handle 401 responses by refreshing token and retrying once

### 2. Security
- Store client secrets securely (environment variables, key vault)
- Use HTTPS for all communications
- Rotate client secrets regularly
- Monitor for unusual usage patterns

### 3. Error Handling
- Implement exponential backoff for retry logic
- Handle network timeouts gracefully  
- Log authentication failures for monitoring
- Provide circuit breaker for Auth Service calls

### 4. Performance
- Reuse HTTP connections (connection pooling)
- Cache tokens appropriately
- Implement proper timeout configurations

## Configuration Examples

### Environment Variables

```bash
# .env file
AUTH_SERVICE_URL=http://localhost:8080
AUTH_CLIENT_ID=your-client-id
AUTH_CLIENT_SECRET=your-client-secret
```

### application.yml (Spring Boot)

```yaml
auth:
  service:
    url: ${AUTH_SERVICE_URL:http://localhost:8080}
    client-id: ${AUTH_CLIENT_ID}
    client-secret: ${AUTH_CLIENT_SECRET}
    timeout: 30s
```

### appsettings.json (.NET)

```json
{
  "Auth": {
    "ServiceUrl": "http://localhost:8080",
    "ClientId": "your-client-id",
    "ClientSecret": "your-client-secret",
    "TimeoutSeconds": 30
  }
}
```

## Monitoring and Alerting

### Key Metrics to Monitor
- Token request success/failure rate
- Token refresh frequency
- API call success rate with client credentials
- Auth Service response time

### Sample Monitoring Code

```javascript
// Node.js example with metrics
const promClient = require('prom-client');

const tokenRequestsTotal = new promClient.Counter({
    name: 'auth_token_requests_total',
    help: 'Total number of token requests',
    labelNames: ['status']
});

const authServiceResponseTime = new promClient.Histogram({
    name: 'auth_service_response_time_seconds',
    help: 'Auth service response time'
});

class MonitoredAuthServiceClient extends AuthServiceClient {
    async refreshToken() {
        const start = Date.now();
        try {
            await super.refreshToken();
            tokenRequestsTotal.inc({ status: 'success' });
        } catch (error) {
            tokenRequestsTotal.inc({ status: 'error' });
            throw error;
        } finally {
            authServiceResponseTime.observe((Date.now() - start) / 1000);
        }
    }
}
```

## Troubleshooting

### Common Issues

1. **Invalid Client Credentials (401)**
   ```bash
   # Test credentials
   curl -X POST http://localhost:8080/auth/token \
     -H "Content-Type: application/json" \
     -d '{
       "grant_type": "client_credentials",
       "client_id": "test-id",
       "client_secret": "test-secret"
     }'
   ```

2. **Service Not Active**
   - Check if service is enabled in Auth Service
   - Verify service hasn't been disabled

3. **Token Expired**
   - Implement proper token refresh logic
   - Check system clock synchronization

4. **Permission Denied (403)**
   - Verify service has required scopes
   - Check if service is assigned to correct groups

### Debug Commands

```bash
# Validate token
curl -X GET http://localhost:8080/me/permissions \
  -H "Authorization: Bearer <token>"

# Check service status  
curl -X GET http://localhost:8080/services/<service-id> \
  -H "Authorization: Bearer <admin-token>"
```

## API Reference

For complete API documentation, see [API.md](./API.md)

## Related Guides

- [SSO Integration Guide](./SSO_INTEGRATION.md)
- [Frontend Integration Guide](./FRONTEND_INTEGRATION.md)