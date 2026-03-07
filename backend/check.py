import sqlite3

def check_my_data():
    try:
        # Connect to your local database file
        conn = sqlite3.connect('neuroguard.db')
        cursor = conn.cursor()

        # 1. See what tables you have
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        print(f"📂 Tables found in database: {tables}")

        # 2. Try to read from the SeizureEvent table
        # Note: If your table name is different, change it here
        print("\n📊 --- SEIZURE HISTORY DATA ---")
        cursor.execute("SELECT * FROM seizure_events") # or 'seizure_history'
        rows = cursor.fetchall()

        if not rows:
            print("⚠️ The table is EMPTY. No records found from the 5th.")
        else:
            for row in rows:
                print(row)
            print(f"\n✅ Total records found: {len(rows)}")

        conn.close()
    except Exception as e:
        print(f"❌ Error reading database: {e}")

if __name__ == "__main__":
    check_my_data()