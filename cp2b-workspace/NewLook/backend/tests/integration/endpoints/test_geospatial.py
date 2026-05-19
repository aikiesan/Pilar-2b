"""
Integration tests for Geospatial API endpoints
Tests PostGIS-based spatial queries, GeoJSON generation, and municipality data
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch, MagicMock
from contextlib import contextmanager
from app.main import app

client = TestClient(app)


class MockCursor:
    """Mock database cursor for PostGIS queries"""
    def __init__(self, return_value=None):
        self.return_value = return_value
        self.executed_queries = []
        self.executed_params = []

    def execute(self, query, params=None):
        self.executed_queries.append(query)
        self.executed_params.append(params)

    def fetchone(self):
        return self.return_value

    def fetchall(self):
        if isinstance(self.return_value, list):
            return self.return_value
        return [self.return_value] if self.return_value else []

    def close(self):
        pass


class MockConnection:
    """Mock database connection"""
    def __init__(self, cursor):
        self._cursor = cursor

    def cursor(self):
        return self._cursor


@contextmanager
def mock_db_context(cursor):
    """Mock get_db context manager"""
    yield MockConnection(cursor)


@pytest.fixture
def mock_get_db():
    """Fixture to mock database connection"""
    with patch("app.api.v1.endpoints.geospatial.get_db") as mock:
        yield mock


@pytest.fixture
def mock_shapefile_loader():
    """Fixture to mock shapefile loader"""
    with patch("app.api.v1.endpoints.geospatial.shapefile_loader") as mock:
        yield mock


class TestMunicipalitiesGeoJSON:
    """Tests for GET /geospatial/municipalities/geojson"""

    def test_get_municipalities_geojson_basic(self, mock_get_db):
        """Test getting municipalities as GeoJSON"""
        mock_cursor = MockCursor({
            'geojson': {
                'type': 'FeatureCollection',
                'features': [
                    {
                        'type': 'Feature',
                        'id': 1,
                        'geometry': {
                            'type': 'Polygon',
                            'coordinates': [[[-46.6, -23.5], [-46.5, -23.5], [-46.5, -23.4], [-46.6, -23.5]]]
                        },
                        'properties': {
                            'id': 1,
                            'name': 'São Paulo',
                            'total_biogas_m3_year': 200000000
                        }
                    }
                ]
            }
        })
        mock_get_db.return_value = mock_db_context(mock_cursor)

        response = client.get("/api/v1/geospatial/municipalities/geojson")

        assert response.status_code == 200
        data = response.json()

        assert data['type'] == 'FeatureCollection'
        assert len(data['features']) == 1
        assert data['features'][0]['type'] == 'Feature'
        assert 'geometry' in data['features'][0]
        assert 'properties' in data['features'][0]

    def test_get_municipalities_geojson_with_limit(self, mock_get_db):
        """Test limiting number of features"""
        mock_cursor = MockCursor({'geojson': {'type': 'FeatureCollection', 'features': []}})
        mock_get_db.return_value = mock_db_context(mock_cursor)

        response = client.get("/api/v1/geospatial/municipalities/geojson?limit=50")

        assert response.status_code == 200
        # Verify LIMIT was in executed query
        assert any('LIMIT' in q for q in mock_cursor.executed_queries)

    def test_get_municipalities_geojson_with_min_biogas(self, mock_get_db):
        """Test filtering by minimum biogas"""
        mock_cursor = MockCursor({'geojson': {'type': 'FeatureCollection', 'features': []}})
        mock_get_db.return_value = mock_db_context(mock_cursor)

        response = client.get("/api/v1/geospatial/municipalities/geojson?min_biogas=100000000")

        assert response.status_code == 200
        # Verify filter was applied
        assert any('total_biogas_m3_year >=' in q for q in mock_cursor.executed_queries)

    def test_get_municipalities_geojson_with_valid_region(self, mock_get_db):
        """Test filtering by valid administrative region"""
        mock_cursor = MockCursor({'geojson': {'type': 'FeatureCollection', 'features': []}})
        mock_get_db.return_value = mock_db_context(mock_cursor)

        response = client.get("/api/v1/geospatial/municipalities/geojson?region=Campinas")

        assert response.status_code == 200
        # Verify region filter was applied
        assert any('administrative_region' in q for q in mock_cursor.executed_queries)

    def test_get_municipalities_geojson_with_invalid_region(self, mock_get_db):
        """Test error handling for invalid region"""
        mock_cursor = MockCursor({})
        mock_get_db.return_value = mock_db_context(mock_cursor)

        response = client.get("/api/v1/geospatial/municipalities/geojson?region=InvalidRegion")

        assert response.status_code == 400
        assert "Invalid region" in response.json()['detail']

    def test_get_municipalities_geojson_empty_result(self, mock_get_db):
        """Test handling of empty query result"""
        mock_cursor = MockCursor(None)
        mock_get_db.return_value = mock_db_context(mock_cursor)

        response = client.get("/api/v1/geospatial/municipalities/geojson")

        assert response.status_code == 200
        data = response.json()
        assert data['type'] == 'FeatureCollection'
        assert data['features'] == []

    def test_get_municipalities_geojson_database_error(self, mock_get_db):
        """Test database error handling"""
        import psycopg2

        mock_cursor = MockCursor()
        mock_cursor.execute = Mock(side_effect=psycopg2.Error("Connection failed"))
        mock_get_db.return_value = mock_db_context(mock_cursor)

        response = client.get("/api/v1/geospatial/municipalities/geojson")

        assert response.status_code == 500
        assert "Database query failed" in response.json()['detail']


class TestMunicipalityCentroids:
    """Tests for GET /geospatial/municipalities/centroids"""

    def test_get_centroids_basic(self, mock_get_db):
        """Test getting municipality centroids"""
        mock_cursor = MockCursor({
            'geojson': {
                'type': 'FeatureCollection',
                'features': [
                    {
                        'type': 'Feature',
                        'id': 1,
                        'geometry': {'type': 'Point', 'coordinates': [-46.6333, -23.5505]},
                        'properties': {'id': 1, 'name': 'São Paulo', 'biogas': 200000000}
                    }
                ]
            }
        })
        mock_get_db.return_value = mock_db_context(mock_cursor)

        response = client.get("/api/v1/geospatial/municipalities/centroids")

        assert response.status_code == 200
        data = response.json()

        assert data['type'] == 'FeatureCollection'
        assert len(data['features']) == 1
        feature = data['features'][0]
        assert feature['geometry']['type'] == 'Point'

    def test_get_centroids_with_params(self, mock_get_db):
        """Test centroids with limit and min_biogas"""
        mock_cursor = MockCursor({'geojson': {'type': 'FeatureCollection', 'features': []}})
        mock_get_db.return_value = mock_db_context(mock_cursor)

        response = client.get("/api/v1/geospatial/municipalities/centroids?limit=10&min_biogas=50000000")

        assert response.status_code == 200

    def test_get_centroids_empty_result(self, mock_get_db):
        """Test empty result handling"""
        mock_cursor = MockCursor(None)
        mock_get_db.return_value = mock_db_context(mock_cursor)

        response = client.get("/api/v1/geospatial/municipalities/centroids")

        assert response.status_code == 200
        data = response.json()
        assert data['type'] == 'FeatureCollection'
        assert data['features'] == []


class TestMunicipalityPolygons:
    """Tests for GET /geospatial/municipalities/polygons"""

    def test_get_polygons_from_shapefile(self, mock_get_db, mock_shapefile_loader):
        """Test getting polygons from shapefile joined with database data"""
        # Mock shapefile data
        mock_shapefile_loader.load_shapefile_as_geojson.return_value = {
            'type': 'FeatureCollection',
            'features': [
                {
                    'type': 'Feature',
                    'geometry': {'type': 'Polygon', 'coordinates': [[[-46.6, -23.5]]]},
                    'properties': {
                        'CD_MUN': '3550308',
                        'NM_MUN': 'SÃO PAULO'
                    }
                }
            ]
        }

        # Mock database biogas data
        mock_cursor = MockCursor([
            {
                'ibge_code': '3550308',
                'municipality_name': 'São Paulo',
                'total_biogas_m3_year': 200000000,
                'urban_biogas_m3_year': 120000000,
                'agricultural_biogas_m3_year': 50000000,
                'livestock_biogas_m3_year': 30000000,
                'energy_potential_mwh_year': 400000,
                'co2_reduction_tons_year': 100000,
                'population': 12000000,
                'administrative_region': 'Metropolitana de São Paulo',
                'immediate_region': 'São Paulo',
                'intermediate_region': 'São Paulo',
                'area_km2': 1521.0
            }
        ])
        mock_get_db.return_value = mock_db_context(mock_cursor)

        response = client.get("/api/v1/geospatial/municipalities/polygons")

        assert response.status_code == 200
        data = response.json()

        assert data['type'] == 'FeatureCollection'
        assert 'features' in data
        assert 'metadata' in data

        # Verify enrichment happened
        feature = data['features'][0]
        assert 'total_biogas_m3_year' in feature['properties']
        assert feature['properties']['potential_category'] in ['ALTO', 'MEDIO', 'BAIXO', 'SEM DADOS']

    def test_get_polygons_shapefile_error(self, mock_shapefile_loader):
        """Test error handling when shapefile loading fails"""
        mock_shapefile_loader.load_shapefile_as_geojson.side_effect = Exception("Shapefile not found")

        response = client.get("/api/v1/geospatial/municipalities/polygons")

        assert response.status_code == 500
        assert "Failed to load municipality boundaries" in response.json()['detail']

    def test_get_polygons_categorization(self, mock_get_db, mock_shapefile_loader):
        """Test potential category assignment logic"""
        mock_shapefile_loader.load_shapefile_as_geojson.return_value = {
            'type': 'FeatureCollection',
            'features': [
                {'geometry': {}, 'properties': {'CD_MUN': '001', 'NM_MUN': 'High'}},
                {'geometry': {}, 'properties': {'CD_MUN': '002', 'NM_MUN': 'Medium'}},
                {'geometry': {}, 'properties': {'CD_MUN': '003', 'NM_MUN': 'Low'}},
                {'geometry': {}, 'properties': {'CD_MUN': '004', 'NM_MUN': 'None'}}
            ]
        }

        mock_cursor = MockCursor([
            {'ibge_code': '001', 'municipality_name': 'High', 'total_biogas_m3_year': 150000000,
             'urban_biogas_m3_year': 0, 'agricultural_biogas_m3_year': 0, 'livestock_biogas_m3_year': 0,
             'energy_potential_mwh_year': 0, 'co2_reduction_tons_year': 0, 'population': 100000,
             'administrative_region': '', 'immediate_region': '', 'intermediate_region': '', 'area_km2': 500},
            {'ibge_code': '002', 'municipality_name': 'Medium', 'total_biogas_m3_year': 50000000,
             'urban_biogas_m3_year': 0, 'agricultural_biogas_m3_year': 0, 'livestock_biogas_m3_year': 0,
             'energy_potential_mwh_year': 0, 'co2_reduction_tons_year': 0, 'population': 50000,
             'administrative_region': '', 'immediate_region': '', 'intermediate_region': '', 'area_km2': 300},
            {'ibge_code': '003', 'municipality_name': 'Low', 'total_biogas_m3_year': 5000000,
             'urban_biogas_m3_year': 0, 'agricultural_biogas_m3_year': 0, 'livestock_biogas_m3_year': 0,
             'energy_potential_mwh_year': 0, 'co2_reduction_tons_year': 0, 'population': 10000,
             'administrative_region': '', 'immediate_region': '', 'intermediate_region': '', 'area_km2': 100},
            {'ibge_code': '004', 'municipality_name': 'None', 'total_biogas_m3_year': 0,
             'urban_biogas_m3_year': 0, 'agricultural_biogas_m3_year': 0, 'livestock_biogas_m3_year': 0,
             'energy_potential_mwh_year': 0, 'co2_reduction_tons_year': 0, 'population': 1000,
             'administrative_region': '', 'immediate_region': '', 'intermediate_region': '', 'area_km2': 50}
        ])
        mock_get_db.return_value = mock_db_context(mock_cursor)

        response = client.get("/api/v1/geospatial/municipalities/polygons")

        assert response.status_code == 200
        data = response.json()

        # Verify categories: >100M = ALTO, >10M = MEDIO, >0 = BAIXO, 0 = SEM DADOS
        categories = [f['properties']['potential_category'] for f in data['features']]
        assert 'ALTO' in categories
        assert 'MEDIO' in categories
        assert 'BAIXO' in categories
        assert 'SEM DADOS' in categories


class TestListMunicipalities:
    """Tests for GET /geospatial/municipalities"""

    def test_list_municipalities_default_params(self, mock_get_db):
        """Test listing municipalities with default parameters"""
        mock_cursor = MockCursor([
            {
                'id': 1,
                'municipality_name': 'São Paulo',
                'total_biogas_m3_year': 200000000,
                'energy_potential_mwh_year': 400000,
                'ranking': 1
            }
        ])
        mock_get_db.return_value = mock_db_context(mock_cursor)

        response = client.get("/api/v1/geospatial/municipalities")

        assert response.status_code == 200
        data = response.json()

        assert isinstance(data, list)
        assert len(data) == 1
        assert data[0]['id'] == 1
        assert data[0]['municipality_name'] == 'São Paulo'

    def test_list_municipalities_with_pagination(self, mock_get_db):
        """Test pagination parameters"""
        mock_cursor = MockCursor([])
        mock_get_db.return_value = mock_db_context(mock_cursor)

        response = client.get("/api/v1/geospatial/municipalities?limit=50&offset=100")

        assert response.status_code == 200

        # Verify LIMIT and OFFSET in query
        query = mock_cursor.executed_queries[0]
        assert 'LIMIT' in query
        assert 'OFFSET' in query

    def test_list_municipalities_sort_by_name(self, mock_get_db):
        """Test sorting by municipality name"""
        mock_cursor = MockCursor([])
        mock_get_db.return_value = mock_db_context(mock_cursor)

        response = client.get("/api/v1/geospatial/municipalities?sort_by=name&order=asc")

        assert response.status_code == 200

        # Verify sort column used
        query = mock_cursor.executed_queries[0]
        assert 'municipality_name' in query
        assert 'ASC' in query

    def test_list_municipalities_sort_by_population(self, mock_get_db):
        """Test sorting by population"""
        mock_cursor = MockCursor([])
        mock_get_db.return_value = mock_db_context(mock_cursor)

        response = client.get("/api/v1/geospatial/municipalities?sort_by=population&order=desc")

        assert response.status_code == 200

        query = mock_cursor.executed_queries[0]
        assert 'population' in query
        assert 'DESC' in query

    def test_list_municipalities_invalid_sort_column(self, mock_get_db):
        """Test SQL injection prevention - invalid sort column defaults to biogas"""
        mock_cursor = MockCursor([])
        mock_get_db.return_value = mock_db_context(mock_cursor)

        # Try to inject SQL via sort_by (should fail validation)
        response = client.get("/api/v1/geospatial/municipalities?sort_by=invalid_column")

        # Should fail validation (422) or use default
        assert response.status_code in [200, 422]


class TestGetMunicipality:
    """Tests for GET /geospatial/municipalities/{municipality_id}"""

    def test_get_municipality_detail(self, mock_get_db):
        """Test getting detailed municipality information"""
        mock_cursor = MockCursor({
            'id': 1,
            'municipality_name': 'São Paulo',
            'ibge_code': '3550308',
            'area_km2': 1521.0,
            'population_density': 7891.0,
            'total_biogas_m3_year': 200000000,
            'total_biogas_m3_day': 547945,
            'urban_biogas_m3_year': 120000000,
            'agricultural_biogas_m3_year': 50000000,
            'livestock_biogas_m3_year': 30000000,
            'rsu_biogas_m3_year': 80000000,
            'rpo_biogas_m3_year': 40000000,
            'sugarcane_biogas_m3_year': 30000000,
            'soybean_biogas_m3_year': 10000000,
            'corn_biogas_m3_year': 5000000,
            'coffee_biogas_m3_year': 3000000,
            'citrus_biogas_m3_year': 2000000,
            'cattle_biogas_m3_year': 15000000,
            'swine_biogas_m3_year': 10000000,
            'poultry_biogas_m3_year': 4000000,
            'aquaculture_biogas_m3_year': 1000000,
            'energy_potential_kwh_day': 1000000,
            'energy_potential_mwh_year': 400000,
            'co2_reduction_tons_year': 100000,
            'population': 12000000,
            'urban_population': 11000000,
            'rural_population': 1000000,
            'gdp_total': 700000000000,
            'gdp_per_capita': 58333,
            'centroid': {'type': 'Point', 'coordinates': [-46.6333, -23.5505]},
            'administrative_region': 'Metropolitana de São Paulo',
            'immediate_region': 'São Paulo',
            'intermediate_region': 'São Paulo'
        })
        mock_get_db.return_value = mock_db_context(mock_cursor)

        response = client.get("/api/v1/geospatial/municipalities/1")

        assert response.status_code == 200
        data = response.json()

        assert data['id'] == 1
        assert data['municipality_name'] == 'São Paulo'
        assert data['total_biogas_m3_year'] == 200000000
        assert 'sugarcane_biogas_m3_year' in data
        assert 'cattle_biogas_m3_year' in data
        assert 'centroid' in data

    def test_get_municipality_not_found(self, mock_get_db):
        """Test 404 when municipality not found"""
        mock_cursor = MockCursor(None)
        mock_get_db.return_value = mock_db_context(mock_cursor)

        response = client.get("/api/v1/geospatial/municipalities/99999")

        assert response.status_code == 404
        assert "Municipality not found" in response.json()['detail']

    def test_get_municipality_database_error(self, mock_get_db):
        """Test database error handling"""
        import psycopg2

        mock_cursor = MockCursor()
        mock_cursor.execute = Mock(side_effect=psycopg2.Error("Query failed"))
        mock_get_db.return_value = mock_db_context(mock_cursor)

        response = client.get("/api/v1/geospatial/municipalities/1")

        assert response.status_code == 500


class TestProximityAnalysis:
    """Tests for POST /geospatial/proximity"""

    def test_proximity_analysis_basic(self, mock_get_db):
        """Test basic proximity analysis"""
        mock_cursor = MockCursor([
            {
                'municipality_id': 1,
                'municipality_name': 'São Paulo',
                'distance_km': 5.2
            },
            {
                'municipality_id': 2,
                'municipality_name': 'Guarulhos',
                'distance_km': 15.8
            }
        ])
        mock_get_db.return_value = mock_db_context(mock_cursor)

        query_data = {
            'latitude': -23.5505,
            'longitude': -46.6333,
            'radius_km': 50.0
        }

        response = client.post("/api/v1/geospatial/proximity", json=query_data)

        assert response.status_code == 200
        data = response.json()

        assert 'query' in data
        assert 'results' in data
        assert 'total_found' in data

        assert data['query']['latitude'] == -23.5505
        assert data['total_found'] == 2
        assert len(data['results']) == 2

    def test_proximity_analysis_validation_latitude(self):
        """Test latitude validation"""
        # Invalid latitude > 90
        response = client.post("/api/v1/geospatial/proximity", json={
            'latitude': 91.0,
            'longitude': -46.6333,
            'radius_km': 50.0
        })
        assert response.status_code == 422

        # Invalid latitude < -90
        response = client.post("/api/v1/geospatial/proximity", json={
            'latitude': -91.0,
            'longitude': -46.6333,
            'radius_km': 50.0
        })
        assert response.status_code == 422

    def test_proximity_analysis_validation_longitude(self):
        """Test longitude validation"""
        # Invalid longitude > 180
        response = client.post("/api/v1/geospatial/proximity", json={
            'latitude': -23.5505,
            'longitude': 181.0,
            'radius_km': 50.0
        })
        assert response.status_code == 422

    def test_proximity_analysis_validation_radius(self):
        """Test radius validation"""
        # Invalid radius (0)
        response = client.post("/api/v1/geospatial/proximity", json={
            'latitude': -23.5505,
            'longitude': -46.6333,
            'radius_km': 0
        })
        assert response.status_code == 422

        # Invalid radius > 500
        response = client.post("/api/v1/geospatial/proximity", json={
            'latitude': -23.5505,
            'longitude': -46.6333,
            'radius_km': 501
        })
        assert response.status_code == 422

    def test_proximity_analysis_no_results(self, mock_get_db):
        """Test when no municipalities found in radius"""
        mock_cursor = MockCursor([])
        mock_get_db.return_value = mock_db_context(mock_cursor)

        response = client.post("/api/v1/geospatial/proximity", json={
            'latitude': -23.5505,
            'longitude': -46.6333,
            'radius_km': 1.0
        })

        assert response.status_code == 200
        data = response.json()
        assert data['total_found'] == 0
        assert data['results'] == []


class TestRankings:
    """Tests for GET /geospatial/rankings"""

    def test_rankings_total_biogas(self, mock_get_db):
        """Test rankings by total biogas"""
        mock_cursor = MockCursor([
            {
                'municipality_name': 'São Paulo',
                'biogas_potential': 200000000,
                'energy_potential_mwh_year': 400000,
                'ranking': 1
            },
            {
                'municipality_name': 'Campinas',
                'biogas_potential': 150000000,
                'energy_potential_mwh_year': 300000,
                'ranking': 2
            }
        ])
        mock_get_db.return_value = mock_db_context(mock_cursor)

        response = client.get("/api/v1/geospatial/rankings?criteria=total&limit=20")

        assert response.status_code == 200
        data = response.json()

        assert data['criteria'] == 'total'
        assert len(data['rankings']) == 2
        assert data['rankings'][0]['rank'] == 1
        assert data['rankings'][0]['municipality'] == 'São Paulo'

    def test_rankings_urban_biogas(self, mock_get_db):
        """Test rankings by urban biogas"""
        mock_cursor = MockCursor([])
        mock_get_db.return_value = mock_db_context(mock_cursor)

        response = client.get("/api/v1/geospatial/rankings?criteria=urban")

        assert response.status_code == 200
        data = response.json()
        assert data['criteria'] == 'urban'

    def test_rankings_agricultural_biogas(self, mock_get_db):
        """Test rankings by agricultural biogas"""
        mock_cursor = MockCursor([])
        mock_get_db.return_value = mock_db_context(mock_cursor)

        response = client.get("/api/v1/geospatial/rankings?criteria=agricultural")

        assert response.status_code == 200

    def test_rankings_livestock_biogas(self, mock_get_db):
        """Test rankings by livestock biogas"""
        mock_cursor = MockCursor([])
        mock_get_db.return_value = mock_db_context(mock_cursor)

        response = client.get("/api/v1/geospatial/rankings?criteria=livestock")

        assert response.status_code == 200

    def test_rankings_limit_validation(self, mock_get_db):
        """Test limit parameter validation"""
        mock_cursor = MockCursor([])
        mock_get_db.return_value = mock_db_context(mock_cursor)

        # Valid limit
        response = client.get("/api/v1/geospatial/rankings?limit=50")
        assert response.status_code == 200

        # Invalid limit (>100)
        response = client.get("/api/v1/geospatial/rankings?limit=101")
        assert response.status_code == 422


class TestSummaryStatistics:
    """Tests for GET /geospatial/statistics/summary"""

    def test_summary_statistics_complete(self, mock_get_db):
        """Test complete summary statistics"""
        # Mock statistics query
        stats_cursor = MockCursor({
            'total_municipalities': 645,
            'total_biogas_potential': 50000000000,
            'avg_biogas_potential': 77519379,
            'total_energy_potential': 100000000,
            'total_co2_reduction': 25000000,
            'total_population': 44000000,
            'total_agricultural': 20000000000,
            'total_livestock': 15000000000,
            'total_urban': 15000000000
        })

        # Mock top municipalities query - will be called after stats
        top_munis = [
            {'municipality_name': 'São Paulo', 'total_biogas_m3_year': 200000000},
            {'municipality_name': 'Campinas', 'total_biogas_m3_year': 150000000}
        ]

        # Create a cursor that returns different values for different queries
        call_count = [0]

        def side_effect_fetchone():
            call_count[0] += 1
            if call_count[0] == 1:
                return stats_cursor.return_value
            return None

        def side_effect_fetchall():
            call_count[0] += 1
            if call_count[0] == 2:
                return top_munis
            return []

        mock_cursor = MockCursor()
        mock_cursor.fetchone = side_effect_fetchone
        mock_cursor.fetchall = side_effect_fetchall

        mock_get_db.return_value = mock_db_context(mock_cursor)

        response = client.get("/api/v1/geospatial/statistics/summary")

        assert response.status_code == 200
        data = response.json()

        assert data['total_municipalities'] == 645
        assert data['total_biogas_m3_year'] == 50000000000
        assert 'top_municipality' in data
        assert 'sector_breakdown' in data
        assert 'sector_percentages' in data

        # Verify sector percentages sum to ~100%
        total_pct = sum(data['sector_percentages'].values())
        assert 99 <= total_pct <= 101

    def test_summary_statistics_null_handling(self, mock_get_db):
        """Test NULL value handling in statistics"""
        mock_cursor = MockCursor({
            'total_municipalities': 100,
            'total_biogas_potential': None,  # NULL value
            'avg_biogas_potential': 0,
            'total_energy_potential': None,
            'total_co2_reduction': None,
            'total_population': 1000000,
            'total_agricultural': None,
            'total_livestock': None,
            'total_urban': None
        })

        def side_effect_fetchone():
            return mock_cursor.return_value

        def side_effect_fetchall():
            return []

        mock_cursor.fetchone = side_effect_fetchone
        mock_cursor.fetchall = side_effect_fetchall

        mock_get_db.return_value = mock_db_context(mock_cursor)

        response = client.get("/api/v1/geospatial/statistics/summary")

        assert response.status_code == 200
        data = response.json()

        # Should handle NULLs gracefully with 0 defaults
        assert data['total_biogas_m3_year'] == 0

    def test_summary_statistics_database_error(self, mock_get_db):
        """Test database error returns safe defaults"""
        import psycopg2

        mock_cursor = MockCursor()
        mock_cursor.execute = Mock(side_effect=psycopg2.Error("Connection failed"))
        mock_get_db.return_value = mock_db_context(mock_cursor)

        response = client.get("/api/v1/geospatial/statistics/summary")

        # Should return 200 with default values instead of 500
        assert response.status_code == 200
        data = response.json()

        assert data['total_municipalities'] == 0
        assert 'error' in data


class TestBiogasPlants:
    """Tests for GET /geospatial/infrastructure/biogas-plants"""

    def test_get_biogas_plants(self, mock_get_db):
        """Test getting biogas plants infrastructure"""
        mock_cursor = MockCursor({
            'geojson': {
                'type': 'FeatureCollection',
                'features': [
                    {
                        'type': 'Feature',
                        'geometry': {'type': 'Point', 'coordinates': [-46.6333, -23.5505]},
                        'properties': {
                            'name': 'Planta São Paulo',
                            'type': 'Industrial',
                            'status': 'Operational',
                            'capacity': 5000
                        }
                    }
                ]
            }
        })
        mock_get_db.return_value = mock_db_context(mock_cursor)

        response = client.get("/api/v1/geospatial/infrastructure/biogas-plants")

        assert response.status_code == 200
        data = response.json()

        assert data['type'] == 'FeatureCollection'
        assert len(data['features']) == 1

        feature = data['features'][0]
        assert feature['geometry']['type'] == 'Point'
        assert feature['properties']['name'] == 'Planta São Paulo'

    def test_get_biogas_plants_empty(self, mock_get_db):
        """Test when no biogas plants exist"""
        mock_cursor = MockCursor(None)
        mock_get_db.return_value = mock_db_context(mock_cursor)

        response = client.get("/api/v1/geospatial/infrastructure/biogas-plants")

        assert response.status_code == 200
        data = response.json()

        assert data['type'] == 'FeatureCollection'
        assert data['features'] == []

    def test_get_biogas_plants_database_error(self, mock_get_db):
        """Test database error handling"""
        import psycopg2

        mock_cursor = MockCursor()
        mock_cursor.execute = Mock(side_effect=psycopg2.Error("Query failed"))
        mock_get_db.return_value = mock_db_context(mock_cursor)

        response = client.get("/api/v1/geospatial/infrastructure/biogas-plants")

        assert response.status_code == 500
        assert "Database query failed" in response.json()['detail']
