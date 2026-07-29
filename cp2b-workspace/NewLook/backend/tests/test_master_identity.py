import hashlib
import json
import os
import unittest

class TestMasterIdentity(unittest.TestCase):
    def test_canonical_master_sha256(self):
        canonical_path = r"c:\Users\Lucas\Documents\Pilar2b\cp2b-workspace\NewLook\data\canonical_parameters\SP_master_residue_streams_2023_FINAL.csv"
        provenance_path = r"c:\Users\Lucas\Documents\Pilar2b\cp2b-workspace\NewLook\data\canonical_parameters\blocker_13_provenance.json"
        
        self.assertTrue(os.path.exists(canonical_path), f"Master file missing: {canonical_path}")
        self.assertTrue(os.path.exists(provenance_path), f"Provenance file missing: {provenance_path}")
        
        with open(provenance_path, 'r', encoding='utf-8') as f:
            prov = json.load(f)
            
        expected_sha = prov.get('sha256_hash')
        
        with open(canonical_path, 'rb') as f:
            actual_bytes = f.read()
            
        actual_sha = hashlib.sha256(actual_bytes).hexdigest()
        self.assertEqual(actual_sha, expected_sha, f"SHA-256 mismatch! Expected {expected_sha}, got {actual_sha}")
        
        # Verify secondary mirrors match canonical
        secondary_paths = [
            r"c:\Users\Lucas\Documents\Pilar2b\analysis\data\01_master_residue_streams_SP_2023.csv",
            r"c:\Users\Lucas\Documents\Pilar2b\docs\data\SP_master_residue_streams_2023_FINAL.csv"
        ]
        for sec in secondary_paths:
            if os.path.exists(sec):
                with open(sec, 'rb') as f:
                    sec_sha = hashlib.sha256(f.read()).hexdigest()
                self.assertEqual(sec_sha, expected_sha, f"Secondary mirror {sec} differs from canonical SHA-256!")

if __name__ == '__main__':
    unittest.main()
