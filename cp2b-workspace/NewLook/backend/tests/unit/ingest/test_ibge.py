"""IBGE reference constants — the coverage gate stands on these numbers."""

from ingest import ibge


class TestMunicipalityCounts:
    def test_total_is_5570(self):
        assert sum(ibge.MUNICIPALITY_COUNT_BY_UF.values()) == ibge.TOTAL_MUNICIPALITIES == 5570

    def test_all_27_ufs_present(self):
        assert len(ibge.MUNICIPALITY_COUNT_BY_UF) == 27
        assert set(ibge.MUNICIPALITY_COUNT_BY_UF) == set(ibge.CODE_PREFIX_BY_UF)

    def test_sp_is_645(self):
        assert ibge.MUNICIPALITY_COUNT_BY_UF["SP"] == 645


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
