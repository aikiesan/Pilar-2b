import pandas as pd
import numpy as np

def generate_sql_from_excel(file_path, table_name):
    """
    Reads an Excel file, generates CREATE TABLE and INSERT statements.
    """
    try:
        # Read the Excel file
        df = pd.read_excel(file_path, sheet_name=0) # Read the first sheet

        # --- Generate CREATE TABLE statement ---
        sql_type_mapping = {
            'object': 'TEXT',
            'int64': 'BIGINT',
            'float64': 'FLOAT',
            'datetime64[ns]': 'TIMESTAMP',
            'bool': 'BOOLEAN'
        }

        # Sanitize column names for SQL (replace spaces, etc.)
        df.columns = [col.strip().replace(' ', '_').replace('(', '').replace(')', '').replace('/', '_').lower() for col in df.columns]
        
        # Add a primary key column if one doesn't exist
        if 'id' not in df.columns:
            df.insert(0, 'id', range(1, 1 + len(df)))

        create_table_statement = f"CREATE TABLE IF NOT EXISTS {table_name} (\n"
        for col_name, dtype in df.dtypes.items():
            sql_type = sql_type_mapping.get(str(dtype), 'TEXT')
            if col_name == 'id':
                create_table_statement += f"    {col_name} BIGINT PRIMARY KEY,\n"
            else:
                create_table_statement += f"    {col_name} {sql_type},\n"
        create_table_statement = create_table_statement.rstrip(',\n') + "\n);"
        
        print("-- Generated CREATE TABLE statement:")
        print(create_table_statement)
        print("\n-- Make sure to drop the table first if you want to re-create it with a new schema.")
        print(f"-- DROP TABLE IF EXISTS {table_name};")
        print("\n" + "="*50 + "\n")


        # --- Generate INSERT statements ---
        insert_statements = []
        for index, row in df.iterrows():
            insert_statement = f"INSERT INTO {table_name} ({', '.join(df.columns)}) VALUES (" 
            values = []
            for col_name, value in row.items():
                if pd.isna(value):
                    values.append("NULL")
                elif isinstance(value, str):
                    # Escape single quotes
                    values.append(f"'{str(value).replace("'", "''")}'")
                elif isinstance(value, (int, np.integer, float, np.floating, np.int64)):
                     # Check for numpy integer types as well
                    if np.isinf(value):
                        values.append("NULL") # Or handle as per DB capabilities
                    else:
                        values.append(str(value))
                else:
                    values.append(f"'{str(value)}'")
            
            insert_statement += ', '.join(values) + ");"
            insert_statements.append(insert_statement)

        print("-- Generated INSERT statements:")
        for stmt in insert_statements:
            print(stmt)

    except FileNotFoundError:
        print(f"Error: The file was not found at {file_path}")
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    EXCEL_FILE_PATH = 'cp2b-workspace/NewLook/backend/data/FDE_Disponibilidade_Residuos_CP2B.xlsx'
    TABLE_NAME = 'fde_residue_availability'
    generate_sql_from_excel(EXCEL_FILE_PATH, TABLE_NAME)
