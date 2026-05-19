# 📡 PILAR-2b V3 - API Documentation

**Base URL**: `https://newlook-production.up.railway.app`  
**Version**: 3.0.0  
**Last Updated**: November 18, 2025

---

## 📋 Table of Contents

1. [Authentication](#authentication)
2. [Proximity Analysis](#proximity-analysis)
3. [Geospatial Data](#geospatial-data)
4. [Health & Monitoring](#health--monitoring)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)

---

## 🔐 Authentication

All API endpoints except health checks require authentication.

### Get Supabase Token

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
})

const token = data.session?.access_token
```

### Use Token in Requests

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://newlook-production.up.railway.app/api/v1/geospatial/municipalities
```

---

## 📍 Proximity Analysis

### POST /api/v1/proximity/analyze

Perform comprehensive spatial analysis around a point.

**Sprint 4 Enhancements**:
- ✅ Caching (5min TTL)
- ✅ Input validation
- ✅ 30s timeout
- ✅ Rate limiting (10 req/min)

#### Request

```json
{
  "latitude": -22.9,
  "longitude": -47.06,
  "radius_km": 25,
  "options": {
    "include_mapbiomas": true,
    "include_biogas_potential": true,
    "include_infrastructure": true
  },
  "infrastructure_types": ["railway", "pipeline", "substation"]
}
```

#### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `latitude` | float | ✅ | Center point latitude (-90 to 90) |
| `longitude` | float | ✅ | Center point longitude (-180 to 180) |
| `radius_km` | float | ✅ | Analysis radius in kilometers (1-100) |
| `options.include_mapbiomas` | boolean | ❌ | Include land use analysis (default: true) |
| `options.include_biogas_potential` | boolean | ❌ | Include biogas aggregation (default: true) |
| `options.include_infrastructure` | boolean | ❌ | Include infrastructure search (default: true) |
| `infrastructure_types` | array | ❌ | Types to search: railway, pipeline, substation |

#### Response (200 OK)

```json
{
  "analysis_id": "550e8400-e29b-41d4-a716-446655440000",
  "request": {
    "latitude": -22.9,
    "longitude": -47.06,
    "radius_km": 25
  },
  "results": {
    "buffer_geometry": {
      "type": "Feature",
      "geometry": { "type": "Polygon", "coordinates": [...] }
    },
    "municipalities": [
      {
        "name": "Campinas",
        "ibge_code": "3509502",
        "distance_km": 5.2,
        "biogas_m3_year": 45000000,
        "population": 1213792,
        "area_km2": 795.7,
        "centroid": { "lat": -22.905, "lng": -47.06 }
      }
    ],
    "biogas_potential": {
      "total": 150000000,
      "urban": 45000000,
      "agricultural": 85000000,
      "livestock": 20000000,
      "by_municipality": [...]
    },
    "land_use": {
      "total_area_km2": 1963.5,
      "agricultural_percentage": 42.5,
      "dominant_class": "Agricultura",
      "by_class": {
        "Agricultura": { "area_km2": 834.5, "percentage": 42.5 },
        "Pastagem": { "area_km2": 589.0, "percentage": 30.0 },
        "Floresta": { "area_km2": 392.7, "percentage": 20.0 },
        "Urbano": { "area_km2": 147.3, "percentage": 7.5 }
      }
    },
    "infrastructure": [
      {
        "type": "railway",
        "name": "Estação Campinas",
        "distance_km": 3.8,
        "coordinates": { "latitude": -22.91, "longitude": -47.05 }
      }
    ]
  },
  "summary": {
    "total_area_km2": 1963.5,
    "total_municipalities": 12,
    "total_population": 3200000,
    "total_biogas_m3_year": 150000000,
    "energy_potential_mwh_year": 975000,
    "radius_recommendation": "optimal"
  },
  "metadata": {
    "analysis_timestamp": "2025-11-18T14:30:00Z",
    "processing_time_ms": 2100
  },
  "from_cache": false,
  "warnings": []
}
```

#### Validation Errors (400 Bad Request)

```json
{
  "detail": {
    "error": "❌ Ponto fora do Estado de São Paulo",
    "code": "INVALID_COORDINATES",
    "suggestion": "💡 Selecione um ponto dentro dos limites estaduais."
  }
}
```

**Error Codes**:
- `INVALID_COORDINATES`: Point outside São Paulo State
- `INVALID_RADIUS`: Radius <1km or >100km
- `POINT_IN_OCEAN`: Point in ocean/water body

#### Rate Limit Error (429 Too Many Requests)

```json
{
  "detail": "Taxa de requisições excedida. Tente novamente em 45 segundos.",
  "error_code": "RATE_LIMIT_EXCEEDED",
  "retry_after": 45,
  "limit": 10,
  "window_minutes": 1
}
```

**Headers**:
```
Retry-After: 45
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 45
```

---

### GET /api/v1/proximity/recommendations

Get radius recommendations based on use case.

#### Response (200 OK)

```json
{
  "recommendations": [
    {
      "radius_km": 10,
      "category": "optimal",
      "color": "#10B981",
      "description": "Ideal para análises locais",
      "typical_use_case": "Município individual"
    },
    {
      "radius_km": 25,
      "category": "good",
      "color": "#3B82F6",
      "description": "Bom para análises regionais",
      "typical_use_case": "Microrregião"
    },
    {
      "radius_km": 50,
      "category": "acceptable",
      "color": "#F59E0B",
      "description": "Aceitável para análises amplas",
      "typical_use_case": "Região administrativa"
    }
  ]
}
```

---

### GET /api/v1/proximity/validate-point

Validate if a point is suitable for analysis.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `lat` | float | ✅ | Latitude |
| `lng` | float | ✅ | Longitude |

#### Response (200 OK)

```json
{
  "valid": true,
  "within_sao_paulo": true,
  "in_ocean": false,
  "message": "✅ Ponto válido para análise"
}
```

---

## 🗺️ Geospatial Data

### GET /api/v1/geospatial/municipalities

Get all municipalities with biogas potential data.

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `region` | string | Filter by administrative region |
| `min_biogas` | float | Minimum biogas potential (m³/year) |
| `limit` | int | Max results (default: 100) |
| `offset` | int | Pagination offset (default: 0) |

#### Response (200 OK)

```json
{
  "municipalities": [
    {
      "id": 1,
      "ibge_code": "3509502",
      "municipality_name": "Campinas",
      "administrative_region": "Campinas",
      "population": 1213792,
      "area_km2": 795.7,
      "total_biogas_m3_year": 45000000,
      "agricultural_biogas_m3_year": 25000000,
      "livestock_biogas_m3_year": 10000000,
      "urban_biogas_m3_year": 10000000,
      "energy_potential_mwh_year": 292500,
      "co2_reduction_tons_year": 90000,
      "potential_category": "ALTO",
      "centroid": {
        "type": "Point",
        "coordinates": [-47.06, -22.905]
      }
    }
  ],
  "total": 645,
  "limit": 100,
  "offset": 0
}
```

---

### GET /api/v1/geospatial/municipalities/{ibge_code}

Get detailed data for a specific municipality.

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `ibge_code` | string | IBGE 7-digit code |

#### Response (200 OK)

```json
{
  "id": 1,
  "ibge_code": "3509502",
  "municipality_name": "Campinas",
  "administrative_region": "Campinas",
  "immediate_region": "Campinas",
  "intermediate_region": "Campinas",
  "population": 1213792,
  "area_km2": 795.7,
  "population_density": 1525.5,
  "total_biogas_m3_year": 45000000,
  "agricultural_biogas_m3_year": 25000000,
  "livestock_biogas_m3_year": 10000000,
  "urban_biogas_m3_year": 10000000,
  "sugarcane_biogas_m3_year": 15000000,
  "cattle_biogas_m3_year": 5000000,
  "swine_biogas_m3_year": 3000000,
  "poultry_biogas_m3_year": 2000000,
  "rsu_biogas_m3_year": 8000000,
  "rpo_biogas_m3_year": 2000000,
  "energy_potential_mwh_year": 292500,
  "co2_reduction_tons_year": 90000,
  "potential_category": "ALTO",
  "centroid": {
    "type": "Point",
    "coordinates": [-47.06, -22.905]
  },
  "created_at": "2025-11-18T12:00:00Z",
  "updated_at": "2025-11-18T12:00:00Z"
}
```

---

### GET /api/v1/geospatial/summary

Get summary statistics for all municipalities.

#### Response (200 OK)

```json
{
  "total_municipalities": 645,
  "total_population": 46000000,
  "total_area_km2": 248222,
  "total_biogas_m3_year": 15000000000,
  "total_energy_mwh_year": 97500000,
  "total_co2_reduction_tons_year": 30000000,
  "by_region": {
    "Campinas": {
      "municipalities": 90,
      "biogas_m3_year": 3000000000
    }
  },
  "by_category": {
    "ALTO": { "count": 120, "percentage": 18.6 },
    "MEDIO": { "count": 280, "percentage": 43.4 },
    "BAIXO": { "count": 245, "percentage": 38.0 }
  }
}
```

---

## 🏥 Health & Monitoring

### GET /health

Comprehensive health check with database verification.

#### Response (200 OK - Healthy)

```json
{
  "status": "healthy",
  "timestamp": "2025-11-18T14:30:00Z",
  "version": "3.0.0",
  "environment": "production",
  "database": "connected"
}
```

#### Response (200 OK - Degraded)

```json
{
  "status": "degraded",
  "timestamp": "2025-11-18T14:30:00Z",
  "version": "3.0.0",
  "environment": "production",
  "database": "error"
}
```

#### Response (503 Service Unavailable - Unhealthy)

```json
{
  "status": "unhealthy",
  "timestamp": "2025-11-18T14:30:00Z",
  "database": "disconnected",
  "error": "Connection timeout"
}
```

---

### GET /health/ready

Kubernetes-style readiness probe.

#### Response (200 OK)

```json
{
  "ready": true,
  "timestamp": "2025-11-18T14:30:00Z"
}
```

#### Response (503 Service Unavailable)

```json
{
  "ready": false,
  "reason": "database_unavailable"
}
```

---

### GET /health/live

Kubernetes-style liveness probe.

#### Response (200 OK)

```json
{
  "alive": true,
  "timestamp": "2025-11-18T14:30:00Z"
}
```

---

### GET /stats/cache

Cache performance statistics (Sprint 4).

#### Response (200 OK)

```json
{
  "timestamp": "2025-11-18T14:30:00Z",
  "caches": {
    "proximity": {
      "size": 234,
      "max_size": 500,
      "hits": 1580,
      "misses": 890,
      "evictions": 12,
      "hit_rate_percent": 63.97,
      "total_requests": 2470
    },
    "mapbiomas": {
      "size": 87,
      "max_size": 200,
      "hits": 450,
      "misses": 120,
      "evictions": 3,
      "hit_rate_percent": 78.95,
      "total_requests": 570
    },
    "municipality": {
      "size": 645,
      "max_size": 1000,
      "hits": 3200,
      "misses": 800,
      "evictions": 0,
      "hit_rate_percent": 80.0,
      "total_requests": 4000
    }
  }
}
```

---

## ❌ Error Handling

### Standard Error Response

```json
{
  "detail": "Error message",
  "error_code": "ERROR_CODE",
  "suggestion": "Helpful suggestion",
  "timestamp": "2025-11-18T14:30:00Z"
}
```

### HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | Success | Request completed |
| 400 | Bad Request | Invalid coordinates |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Municipality not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Database error |
| 503 | Service Unavailable | Database disconnected |

---

## 🚦 Rate Limiting

### Limits (Sprint 4)

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/proximity/analyze` | 10 requests | 1 minute |
| All other endpoints | 100 requests | 1 minute |

### Rate Limit Headers

All responses include:
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Window: 1m
```

When limit exceeded:
```
HTTP/1.1 429 Too Many Requests
Retry-After: 45
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 45
```

---

## 📦 Response Compression

All responses >1KB are automatically compressed with gzip when client supports it.

**Request Header**:
```
Accept-Encoding: gzip
```

**Response Header**:
```
Content-Encoding: gzip
Content-Length: 12345
```

**Compression Ratio**: Typical 60-70% reduction

---

## 🔗 API Base URLs

| Environment | URL |
|-------------|-----|
| Production | `https://newlook-production.up.railway.app` |
| Development | `http://localhost:8000` |

---

## 📚 Interactive Documentation

- **Swagger UI**: https://newlook-production.up.railway.app/docs
- **ReDoc**: https://newlook-production.up.railway.app/redoc

---

## 📝 Changelog

### Version 3.0.0 (Sprint 4 - Nov 18, 2025)
- ✅ Added caching (proximity, mapbiomas, municipality)
- ✅ Added rate limiting (10 analyses/min)
- ✅ Added response compression (gzip)
- ✅ Added input validation (coordinates, radius)
- ✅ Added timeout handling (30s)
- ✅ Added cache statistics endpoint
- ✅ Enhanced error messages

### Version 2.0.0 (Sprint 3)
- Added MapBiomas integration
- Added proximity analysis endpoints
- Added infrastructure proximity search

### Version 1.0.0 (Sprint 1-2)
- Initial API release
- Municipality data endpoints
- Basic geospatial queries

---

**Last Updated**: November 18, 2025  
**Maintained By**: CP2B Development Team  
**Support**: See DEPLOYMENT_CHECKLIST.md for contacts

