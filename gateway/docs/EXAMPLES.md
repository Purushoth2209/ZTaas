# STS Examples

## Example JWKS Response

```json
{
  "keys": [
    {
      "kty": "RSA",
      "use": "sig",
      "alg": "RS256",
      "kid": "gateway-key-1703123456789",
      "n": "71jPF5rQlYiBP06DzdmS7z_EB9zZAPW0hjRzUo3NZwEWv6bNsdhyF2iyCgF97LZvHMDr4da7ymgHZ-hZxrL71Iv2n5mInHN9yYZ8Ga15RhVDvbLuBVIGROSOKyphQIT6N7-ET2qChHTyuQSo7mkVZF03UwG0hH04TME7KZjQEpIsN10jQpvl8pBt1ctLJ_TVAoVM6TkQZQGvUW5NTJPb-cg6mBhk8ZUaFHc85f4pQ3ClQCTPUXNgUKkvykHPCv5ZwK_9NB8vONE4zVZNF_VqOQrfcdtxgRLXVjdW4tnXwBBI_qAIXH32yXBta2jsT-npMqaAu9U3SMtLaB8l4J6qOw",
      "e": "AQAB"
    }
  ]
}
```

## Example JWT Header

```json
{
  "alg": "RS256",
  "typ": "JWT",
  "kid": "gateway-key-1703123456789"
}
```

## Example JWT Payload

```json
{
  "sub": "user123",
  "aud": "api-clients",
  "iss": "https://gateway.internal",
  "iat": 1703123456,
  "exp": 1703127056,
  "scope": "read write"
}
```

## Complete JWT Token Example

```
eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImdhdGV3YXkta2V5LTE3MDMxMjM0NTY3ODkifQ.eyJzdWIiOiJ1c2VyMTIzIiwiYXVkIjoiYXBpLWNsaWVudHMiLCJpc3MiOiJodHRwczovL2dhdGV3YXkuaW50ZXJuYWwiLCJpYXQiOjE3MDMxMjM0NTYsImV4cCI6MTcwMzEyNzA1Niwic2NvcGUiOiJyZWFkIHdyaXRlIn0.signature_here
```