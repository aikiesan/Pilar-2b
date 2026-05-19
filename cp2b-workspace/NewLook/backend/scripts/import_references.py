import json
import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

# Add the parent directory to sys.path to allow importing from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def connect_db():
    load_dotenv()
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("Error: DATABASE_URL not found in environment variables")
        sys.exit(1)
    return psycopg2.connect(db_url)

def import_references(json_file_path):
    print(f"Loading references from {json_file_path}...")
    
    try:
        with open(json_file_path, 'r', encoding='utf-8') as f:
            references = json.load(f)
    except FileNotFoundError:
        print(f"Error: File {json_file_path} not found.")
        return
    except json.JSONDecodeError:
        print(f"Error: Failed to decode JSON from {json_file_path}.")
        return

    conn = connect_db()
    cur = conn.cursor()

    success_count = 0
    error_count = 0

    print(f"Found {len(references)} references to process.")

    for ref in references:
        try:
            # First, find the residue_id based on the code (codigo)
            residuo_codigo = ref.get("residuo_codigo")
            if not residuo_codigo:
                print(f"Skipping reference: missing 'residuo_codigo'")
                error_count += 1
                continue

            cur.execute("SELECT id FROM residuos WHERE codigo = %s", (residuo_codigo,))
            result = cur.fetchone()
            
            if not result:
                print(f"Warning: Residue with code '{residuo_codigo}' not found. Skipping.")
                error_count += 1
                continue
            
            residuo_id = result[0]

            # Prepare insertion
            query = """
                INSERT INTO residuo_references (
                    residuo_id, parameter_type, citation, authors, title, 
                    journal, year, doi, url, reported_value, reported_unit, 
                    validation_status
                ) VALUES (
                    %s, %s, %s, %s, %s, 
                    %s, %s, %s, %s, %s, %s, 
                    %s
                )
            """
            
            values = (
                residuo_id,
                ref.get("parameter_type", "unknown"),
                ref.get("citation"),
                ref.get("authors"),
                ref.get("title"),
                ref.get("journal"),
                ref.get("year"),
                ref.get("doi"),
                ref.get("url"),
                ref.get("reported_value"),
                ref.get("reported_unit"),
                ref.get("validation_status", "pending")
            )

            cur.execute(query, values)
            success_count += 1

        except Exception as e:
            print(f"Error processing reference for {ref.get('residuo_codigo', 'unknown')}: {e}")
            conn.rollback()
            error_count += 1
            continue

    conn.commit()
    cur.close()
    conn.close()

    print(f"\nImport completed.")
    print(f"Successfully imported: {success_count}")
    print(f"Errors/Skipped: {error_count}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python import_references.py <path_to_json_file>")
    else:
        import_references(sys.argv[1])
