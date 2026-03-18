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


def n(value: Any) -> Dict[str, str]:
    return {"N": str(value)}


def b(value: bool) -> Dict[str, bool]:
    return {"BOOL": value}


def clean(row: Dict[str, str]) -> Dict[str, str]:
    return {k: (v.strip() if isinstance(v, str) else v) for k, v in row.items()}


def build_item(row: Dict[str, str]) -> Dict[str, Any]:
    row = clean(row)

    question_id = row["questionId"]
    place = row["place"]
    no = row["no"]
    category = row["category"]
    text = row["text"]
    weight = row.get("weight", "1")
    required = to_bool(row.get("required", "true"))
    is_active = to_bool(row.get("isActive", "true"))
    updated_at = row.get("updatedAt", "")

    item: Dict[str, Any] = {
        "PK": s(f"QUESTION#{question_id}"),
        "SK": s("METADATA"),
        "type": s("QUESTION"),
        "questionId": s(question_id),
        "place": s(place),
        "no": n(no),
        "category": s(category),
        "text": s(text),
        "weight": n(weight),
        "required": b(required),
        "isActive": b(is_active),
    }

    if updated_at:
        item["updatedAt"] = s(updated_at)

    return item


def chunked(lst: List[Any], size: int) -> List[List[Any]]:
    return [lst[i:i + size] for i in range(0, len(lst), size)]


def main() -> None:
    print("START")
    print("argv:", sys.argv)

    if len(sys.argv) < 2:
        print("Usage: python csv_to_dynamodb_batch_questions.py <input.csv> [output_dir]")
        sys.exit(1)

    input_csv = Path(sys.argv[1]).expanduser().resolve()
    print("input_csv:", input_csv)

    if len(sys.argv) >= 3:
        output_dir = Path(sys.argv[2]).expanduser().resolve()
    else:
        output_dir = Path("/Users/user/qsc-app/dynamodb_batches_questions")

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