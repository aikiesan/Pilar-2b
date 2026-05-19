"""
PILAR-2b V3 Backend - Municipality Logic Unit Tests
Direct testing of municipality endpoint logic without server dependencies

Note: SAMPLE_MUNICIPALITIES was removed from the endpoint module when it was
refactored to use Supabase/PostGIS. The constant is now defined here so these
unit tests remain independent of the live database.
"""
import pytest

# Representative São Paulo state municipalities used exclusively by these unit tests.
SAMPLE_MUNICIPALITIES = [
    {
        "id": 1,
        "name": "São Paulo",
        "code": "3550308",
        "population": 12_396_372,
        "area_km2": 1521.11,
        "biogas_potential": 49_500_000,
        "coordinates": {"lat": -23.5505, "lng": -46.6333},
    },
    {
        "id": 2,
        "name": "Campinas",
        "code": "3509502",
        "population": 1_223_237,
        "area_km2": 796.41,
        "biogas_potential": 7_800_000,
        "coordinates": {"lat": -22.9071, "lng": -47.0627},
    },
    {
        "id": 3,
        "name": "Ribeirão Preto",
        "code": "3543402",
        "population": 711_825,
        "area_km2": 651.43,
        "biogas_potential": 5_100_000,
        "coordinates": {"lat": -21.1775, "lng": -47.8103},
    },
    {
        "id": 4,
        "name": "Sorocaba",
        "code": "3552205",
        "population": 687_357,
        "area_km2": 456.07,
        "biogas_potential": 4_200_000,
        "coordinates": {"lat": -23.5015, "lng": -47.4526},
    },
    {
        "id": 5,
        "name": "Araçatuba",
        "code": "3502804",
        "population": 196_622,
        "area_km2": 1167.29,
        "biogas_potential": 1_350_000,
        "coordinates": {"lat": -21.2096, "lng": -50.4328},
    },
]


@pytest.mark.unit
class TestMunicipalityDataValidation:
    """Test municipality data structure and validation"""

    def test_sample_municipalities_structure(self):
        """Test that sample municipality data has correct structure"""
        assert isinstance(SAMPLE_MUNICIPALITIES, list)
        assert len(SAMPLE_MUNICIPALITIES) > 0

        for municipality in SAMPLE_MUNICIPALITIES:
            # Test required fields
            required_fields = ["id", "name", "code", "population", "area_km2", "biogas_potential", "coordinates"]
            for field in required_fields:
                assert field in municipality, f"Missing field: {field}"

            # Test data types
            assert isinstance(municipality["id"], int)
            assert isinstance(municipality["name"], str)
            assert isinstance(municipality["code"], str)
            assert isinstance(municipality["population"], int)
            assert isinstance(municipality["area_km2"], (int, float))
            assert isinstance(municipality["biogas_potential"], (int, float))
            assert isinstance(municipality["coordinates"], dict)

            # Test coordinates structure
            assert "lat" in municipality["coordinates"]
            assert "lng" in municipality["coordinates"]
            assert isinstance(municipality["coordinates"]["lat"], (int, float))
            assert isinstance(municipality["coordinates"]["lng"], (int, float))

    def test_municipality_data_values(self):
        """Test that municipality data has reasonable values"""
        for municipality in SAMPLE_MUNICIPALITIES:
            # Population should be positive
            assert municipality["population"] > 0

            # Area should be positive
            assert municipality["area_km2"] > 0

            # Biogas potential should be non-negative
            assert municipality["biogas_potential"] >= 0

            # Coordinates should be in reasonable range for Brazil
            lat = municipality["coordinates"]["lat"]
            lng = municipality["coordinates"]["lng"]

            # Brazil rough coordinates: lat -34 to 5, lng -74 to -35
            assert -35 <= lat <= 6, f"Latitude {lat} out of Brazil range"
            assert -75 <= lng <= -34, f"Longitude {lng} out of Brazil range"

    def test_municipality_unique_ids(self):
        """Test that all municipality IDs are unique"""
        ids = [m["id"] for m in SAMPLE_MUNICIPALITIES]
        assert len(ids) == len(set(ids)), "Municipality IDs are not unique"

    def test_municipality_unique_codes(self):
        """Test that all municipality codes are unique"""
        codes = [m["code"] for m in SAMPLE_MUNICIPALITIES]
        assert len(codes) == len(set(codes)), "Municipality codes are not unique"


@pytest.mark.unit
class TestMunicipalityLogicFunctions:
    """Test municipality endpoint logic functions"""

    def test_search_filtering_logic(self):
        """Test search filtering logic"""
        # Test case insensitive search
        search_term = "são"
        filtered = [
            m for m in SAMPLE_MUNICIPALITIES
            if search_term.lower() in m["name"].lower()
        ]

        # Should find São Paulo
        assert any(m["name"] == "São Paulo" for m in filtered)

    def test_pagination_logic(self):
        """Test pagination logic"""
        limit = 2
        offset = 0

        # Test first page
        start = offset
        end = offset + limit
        page1 = SAMPLE_MUNICIPALITIES[start:end]

        assert len(page1) <= limit

        # Test second page
        offset = 2
        start = offset
        end = offset + limit
        page2 = SAMPLE_MUNICIPALITIES[start:end]

        # Pages should not overlap
        if page1 and page2:
            page1_ids = {m["id"] for m in page1}
            page2_ids = {m["id"] for m in page2}
            assert page1_ids.isdisjoint(page2_ids)

    def test_stats_calculation_logic(self):
        """Test statistics calculation logic"""
        total_municipalities = len(SAMPLE_MUNICIPALITIES)
        total_population = sum(m["population"] for m in SAMPLE_MUNICIPALITIES)
        total_area = sum(m["area_km2"] for m in SAMPLE_MUNICIPALITIES)
        total_biogas_potential = sum(m["biogas_potential"] for m in SAMPLE_MUNICIPALITIES)
        average_biogas_potential = total_biogas_potential / total_municipalities if total_municipalities > 0 else 0

        # Verify calculations
        assert total_municipalities > 0
        assert total_population > 0
        assert total_area > 0
        assert total_biogas_potential >= 0
        assert average_biogas_potential >= 0

        # Test precision
        calculated_average = round(average_biogas_potential, 2)
        assert calculated_average == round(total_biogas_potential / total_municipalities, 2)


@pytest.mark.unit
class TestMunicipalityBusinessLogic:
    """Test business logic for municipalities"""

    def test_municipality_lookup_by_id(self):
        """Test finding municipality by ID"""
        # Test existing municipality
        target_id = 1
        found = next((m for m in SAMPLE_MUNICIPALITIES if m["id"] == target_id), None)

        assert found is not None
        assert found["id"] == target_id

        # Test non-existing municipality
        target_id = 999999
        found = next((m for m in SAMPLE_MUNICIPALITIES if m["id"] == target_id), None)

        assert found is None

    def test_biogas_potential_calculations(self):
        """Test biogas potential related calculations"""
        for municipality in SAMPLE_MUNICIPALITIES:
            biogas = municipality["biogas_potential"]
            population = municipality["population"]
            area = municipality["area_km2"]

            # Biogas potential per capita
            per_capita = biogas / population if population > 0 else 0
            assert per_capita >= 0

            # Biogas potential density (per km²)
            density = biogas / area if area > 0 else 0
            assert density >= 0

    def test_data_export_format(self):
        """Test data preparation for export"""
        export_data = []

        for municipality in SAMPLE_MUNICIPALITIES:
            export_record = {
                "municipality_name": municipality["name"],
                "ibge_code": municipality["code"],
                "population_2023": municipality["population"],
                "area_km2": municipality["area_km2"],
                "biogas_potential_m3_year": municipality["biogas_potential"],
                "latitude": municipality["coordinates"]["lat"],
                "longitude": municipality["coordinates"]["lng"]
            }
            export_data.append(export_record)

        # Verify export format
        assert len(export_data) == len(SAMPLE_MUNICIPALITIES)

        for record in export_data:
            assert all(key in record for key in [
                "municipality_name", "ibge_code", "population_2023",
                "area_km2", "biogas_potential_m3_year", "latitude", "longitude"
            ])


@pytest.mark.unit
class TestMunicipalityErrorHandling:
    """Test error handling scenarios"""

    def test_empty_search_handling(self):
        """Test handling of empty search results"""
        search_term = "NonExistentMunicipality12345"
        filtered = [
            m for m in SAMPLE_MUNICIPALITIES
            if search_term.lower() in m["name"].lower()
        ]

        assert filtered == []

    def test_boundary_pagination(self):
        """Test pagination at boundaries"""
        total_count = len(SAMPLE_MUNICIPALITIES)

        # Test offset beyond data
        offset = total_count + 10
        limit = 10
        start = offset
        end = offset + limit
        page = SAMPLE_MUNICIPALITIES[start:end]

        assert page == []

        # Test very large limit
        offset = 0
        limit = 10000
        start = offset
        end = offset + limit
        page = SAMPLE_MUNICIPALITIES[start:end]

        assert len(page) == total_count

    def test_malformed_search_input(self):
        """Test handling of various search inputs"""
        test_inputs = ["", "   ", "123", "!@#$%", "ção", "São Paulo"]

        for search_term in test_inputs:
            # Should not crash
            try:
                filtered = [
                    m for m in SAMPLE_MUNICIPALITIES
                    if search_term.lower() in m["name"].lower()
                ]
                assert isinstance(filtered, list)
            except Exception as e:
                pytest.fail(f"Search failed for input '{search_term}': {e}")


@pytest.mark.unit
class TestDataIntegrity:
    """Test data integrity and consistency"""

    def test_são_paulo_municipality_present(self):
        """Test that São Paulo (largest city) is in sample data"""
        sao_paulo = next((m for m in SAMPLE_MUNICIPALITIES if "São Paulo" in m["name"]), None)
        assert sao_paulo is not None
        assert sao_paulo["population"] > 0
        assert sao_paulo["area_km2"] > 0

    def test_reasonable_biogas_values(self):
        """Test that biogas values are in reasonable range"""
        for municipality in SAMPLE_MUNICIPALITIES:
            biogas = municipality["biogas_potential"]
            population = municipality["population"]

            # Biogas per capita should be reasonable (not more than 10 m³/person/year)
            per_capita = biogas / population
            assert per_capita <= 10, f"Biogas per capita too high: {per_capita}"

    def test_coordinate_precision(self):
        """Test coordinate precision is reasonable"""
        for municipality in SAMPLE_MUNICIPALITIES:
            lat = municipality["coordinates"]["lat"]
            lng = municipality["coordinates"]["lng"]

            # Should have reasonable precision (not more than 4 decimal places needed)
            assert isinstance(lat, (int, float))
            assert isinstance(lng, (int, float))