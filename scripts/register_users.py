#!/usr/bin/env python3
import csv
import json
import sys
from pathlib import Path
from typing import Any, Dict, List

TABLE_NAME = "QSC_UserTable"
BATCH_SIZE = 25

def s(value: Any) -> Dict[str, str]:
    return {"S": str(value if value is not None else "")}

def b(value: bool) -> Dict[str, bool]:
    return {"BOOL": value}

def l_str(values: List[str]) -> Dict[str, List[Dict[str, str]]]:
    return {"L": [{"S": v.strip()} for v in values if v.strip()]}

def clean(row: Dict[str, str]) -> Dict[str, str]:
    return {k: (v.strip() if isinstance(v, str) else v) for k, v in row.items()}

def build_user_item(row: Dict[str, str]) -> Dict[str, Any]:
    row = clean(row)
    
    user_id = row.get("userId")
    email = row.get("email")
    corp_id = row.get("corpId") # QSC_MasterTableのCORP#IDに対応
    
    if not user_id or not email:
        raise ValueError(f"userId と email は必須です: {row}")

    item: Dict[str, Any] = {
        "PK": s(f"USER#{user_id}"),
        "SK": s("METADATA"),
        "userId": s(user_id),
        "name": s(row.get("name", "未設定")),
        "email": s(email),
        "password": s(row.get("password", "")),
        "role": s(row.get("role", "inspector")),
        "corpId": s(corp_id if corp_id else ""), # ここにマスターのIDを入れる
        "status": s(row.get("status", "invited")),
        "clubCodes": l_str(row.get("clubCodes", "").replace("、", ",").split(",") if row.get("clubCodes") else []),
        "isActive": b(row.get("status") == "active"),
        "createdAt": s(row.get("createdAt", "2024-04-01T00:00:00Z")),
        "updatedAt": s(row.get("updatedAt", "2024-04-01T00:00:00Z")),
    }

    if row.get("lastLogin"):
        item["lastLogin"] = s(row["lastLogin"])

    return item

# (以降、chunked関数とmain関数は以前のスクリプトと同じ)
def chunked(lst: List[Any], size: int) -> List[List[Any]]:
    return [lst[i:i + size] for i in range(0, len(lst), size)]

def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: python3 register_users.py <users.csv>")
        sys.exit(1)

    input_csv = Path(sys.argv[1]).expanduser().resolve()
    output_dir = Path("./user_batches")
    output_dir.mkdir(parents=True, exist_ok=True)

    with input_csv.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        rows = [r for r in reader if any(v.strip() for v in r.values())]

    items = [{"PutRequest": {"Item": build_user_item(row)}} for row in rows]
    batches = chunked(items, BATCH_SIZE)

    for i, batch in enumerate(batches, start=1):
        out_file = output_dir / f"user_batch_{i:03d}.json"
        with out_file.open("w", encoding="utf-8") as f:
            json.dump({TABLE_NAME: batch}, f, ensure_ascii=False, indent=2)

    print(f"Processed {len(items)} users -> {len(batches)} batches.")

if __name__ == "__main__":
    main()