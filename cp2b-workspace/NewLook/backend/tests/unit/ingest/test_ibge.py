"""IBGE reference constants — the coverage gate stands on these numbers."""

from ingest import ibge


class TestMunicipalityCounts:
    def test_total_is_5571(self):
        assert sum(ibge.MUNICIPALITY_COUNT_BY_UF.values()) == ibge.TOTAL_MUNICIPALITIES == 5571

    def test_all_27_ufs_present(self):
        assert len(ibge.MUNICIPALITY_COUNT_BY_UF) == 27
        assert set(ibge.MUNICIPALITY_COUNT_BY_UF) == set(ibge.CODE_PREFIX_BY_UF)

    def test_sp_is_645(self):
        assert ibge.MUNICIPALITY_COUNT_BY_UF["SP"] == 645

    def test_mt_is_142_after_boa_esperanca_do_norte(self):
        # MMD 2025 split Boa Esperança do Norte (5101837) off Nova Ubiratã.
        # This is the only delta vs DTB 2022's 5,570 — guard it explicitly so a
        # silent revert to 141 fails loudly rather than breaking MT coverage.
        assert ibge.MUNICIPALITY_COUNT_BY_UF["MT"] == 142


class TestNonMunicipalMeshCodes:
    def test_lagoons_are_excluded_from_the_spine(self):
        assert set(ibge.NON_MUNICIPAL_MESH_CODES) == {"4300001", "4300002"}

    def test_lagoon_codes_look_like_ibge_codes_but_are_not_municipalities(self):
        # They pass the shape check (7 digits, RS prefix) — which is exactly why
        # they must be filtered by code, not by any structural heuristic.
        for code in ibge.NON_MUNICIPAL_MESH_CODES:
            assert ibge.is_valid_ibge_code(code)
            assert ibge.uf_of(code) == "RS"


class TestIbgeCodeValidation:
    def test_valid_codes(self):
        assert ibge.is_valid_ibge_code("3550308")  # São Paulo capital
        assert ibge.is_valid_ibge_code(3509502)  # Campinas, int form

    def test_invalid_codes(self):
        assert not ibge.is_valid_ibge_code("350930")  # 6 digits
        assert not ibge.is_valid_ibge_code("9950308")  # unknown UF prefix 99
        assert not ibge.is_valid_ibge_code("35O9502")  # letter O
        assert not ibge.is_valid_ibge_code(None)

    def test_uf_of(self):
        assert ibge.uf_of("3550308") == "SP"
        assert ibge.uf_of("5300108") == "DF"
        assert ibge.uf_of("0000000") is None
