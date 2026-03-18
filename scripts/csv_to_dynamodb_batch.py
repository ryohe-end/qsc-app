#!/usr/bin/env python3
import csv
import json
import sys
from pathlib import Path
from typing import Any, Dict, List

TABLE_NAME = "QSC_MasterTable"
BATCH_SIZE = 25


def to_bool(value: str) -> bool:
    return str(value).strip().upper() in {"TRUE", "1", "YES", "Y"}


def s(value: Any) -> Dict[str, str]:
    return {"S": str(value)}


def b(value: bool) -> Dict[str, bool]:
    return {"BOOL": value}


def clean(row: Dict[str, str]) -> Dict[str, str]:
    return {k: (v.strip() if isinstance(v, str) else v) for k, v in row.items()}


def build_item(row: Dict[str, str]) -> Dict[str, Any]:
    row = clean(row)
    record_type = row.get("type", "")
    is_active = to_bool(row.get("isActive", ""))

    item: Dict[str, Any] = {
        "type": s(record_type),
        "isActive": b(is_active),
    }

    created_at = row.get("createdAt", "")
    updated_at = row.get("updatedAt", "")

    if created_at:
        item["createdAt"] = s(created_at)
    if updated_at:
        item["updatedAt"] = s(updated_at)

    if record_type == "CORP":
        corp_id = row["corpId"]
        corp_name = row["corpName"]

        item["PK"] = s(f"CORP#{corp_id}")
        item["SK"] = s("METADATA")
        item["corpId"] = s(corp_id)
        item["name"] = s(corp_name)

    elif record_type == "BRAND":
        brand_id = row["brandId"]
        brand_name = row["brandName"]

        item["PK"] = s(f"BRAND#{brand_id}")
        item["SK"] = s("METADATA")
        item["brandId"] = s(brand_id)
        item["name"] = s(brand_name)

    elif record_type == "BIZ":
        biz_id = row["bizId"]
        biz_name = row["bizName"]

        item["PK"] = s(f"BIZ#{biz_id}")
        item["SK"] = s("METADATA")
        item["bizId"] = s(biz_id)
        item["name"] = s(biz_name)

    elif record_type == "AREA":
        area_id = row["areaId"]
        area_name = row["areaName"]

        item["PK"] = s(f"AREA#{area_id}")
        item["SK"] = s("METADATA")
        item["areaId"] = s(area_id)
        item["name"] = s(area_name)

    elif record_type == "STORE":
        store_id = row["storeId"]
        club_code = row["clubCode"]
        store_name = row["storeName"]

        item["PK"] = s(f"STORE#{store_id}")
        item["SK"] = s("METADATA")
        item["storeId"] = s(store_id)
        item["clubCode"] = s(club_code)
        item["name"] = s(store_name)

        if row.get("corpId"):
            item["corpId"] = s(row["corpId"])
        if row.get("corpName"):
            item["corpName"] = s(row["corpName"])
        if row.get("brandId"):
            item["brandId"] = s(row["brandId"])
        if row.get("brandName"):
            item["brand"] = s(row["brandName"])
        if row.get("bizId"):
            item["bizId"] = s(row["bizId"])
        if row.get("bizName"):
            item["bizName"] = s(row["bizName"])
        if row.get("areaId"):
            item["areaId"] = s(row["areaId"])
        if row.get("areaName"):
            item["areaName"] = s(row["areaName"])

    else:
        raise ValueError(f"Unsupported type: {record_type}")

    return item


def chunked(lst: List[Any], size: int) -> List[List[Any]]:
    return [lst[i:i + size] for i in range(0, len(lst), size)]


def main() -> None:
    print("START")
    print("argv:", sys.argv)

    if len(sys.argv) < 2:
        print("Usage: python csv_to_dynamodb_batch.py <input.csv> [output_dir]")
        sys.exit(1)

    input_csv = Path(sys.argv[1]).expanduser().resolve()
    print("input_csv:", input_csv)

    if len(sys.argv) >= 3:
        output_dir = Path(sys.argv[2]).expanduser().resolve()
    else:
        output_dir = Path("/Users/user/qsc-app/dynamodb_batches")

    print("output_dir:", output_dir)

    if not input_csv.exists():
        raise FileNotFoundError(f"CSV not found: {input_csv}")

    output_dir.mkdir(parents=True, exist_ok=True)

    with input_csv.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        rows = [clean(r) for r in reader if any(str(v).strip() for v in r.values())]

    print("rows loaded:", len(rows))

    items: List[Dict[str, Any]] = []
    for idx, row in enumerate(rows, start=1):
        try:
            items.append({
                "PutRequest": {
                    "Item": build_item(row)
                }
            })
        except Exception as e:
            raise ValueError(f"Row {idx} failed: {e}\nRow data: {row}") from e

    batches = chunked(items, BATCH_SIZE)

    for i, batch in enumerate(batches, start=1):
        payload = {
            TABLE_NAME: batch
        }
        out_file = output_dir / f"batch_{i:03d}.json"
        with out_file.open("w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)

    print(f"Input rows: {len(rows)}")
    print(f"Output batches: {len(batches)}")
    print(f"Output dir: {output_dir}")
    print("DONE")


if __name__ == "__main__":
    main()