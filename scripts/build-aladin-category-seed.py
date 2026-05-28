#!/usr/bin/env python3
"""알라딘 국내도서 CID CSV → public/분야/default.json (대분류·중분류)"""

from __future__ import annotations

import csv
import json
import sys
from collections import OrderedDict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CSV = Path.home() / "Downloads" / "aladin_category_CID_20260316 - 국내도서.csv"
OUT = ROOT / "public" / "분야" / "default.json"


def build(csv_path: Path) -> dict:
    rows = list(csv.DictReader(csv_path.open(encoding="utf-8-sig")))
    d1_order: OrderedDict[str, str] = OrderedDict()
    d2_map: dict[tuple[str, str], str] = {}

    for r in rows:
        d1_cid = r["대분류CID"].strip()
        d1_label = r["대분류(1depth)"].strip()
        d2_cid = r["중분류CID"].strip()
        d2_label = r["중분류(2depth)"].strip()
        if d1_cid not in d1_order:
            d1_order[d1_cid] = d1_label
        d2_map[(d1_cid, d2_cid)] = d2_label

    depth1 = [
        {"id": cid, "label": label, "order": i, "isActive": True}
        for i, (cid, label) in enumerate(d1_order.items())
    ]

    depth2 = []
    order_by_d1 = {cid: 0 for cid in d1_order}
    d1_keys = list(d1_order.keys())

    for (d1_cid, d2_cid), d2_label in sorted(
        d2_map.items(), key=lambda x: (d1_keys.index(x[0][0]), x[1])
    ):
        depth2.append(
            {
                "id": f"{d1_cid}_{d2_cid}",
                "parentId": d1_cid,
                "aladinCid": d2_cid,
                "label": d2_label,
                "order": order_by_d1[d1_cid],
                "isActive": True,
                "isOther": d2_label.strip() == "기타",
            }
        )
        order_by_d1[d1_cid] += 1

    for d1_cid in d1_order:
        other_id = f"{d1_cid}_other"
        has_other = any(
            d["parentId"] == d1_cid and (d.get("isOther") or d["label"] == "기타")
            for d in depth2
        )
        if not has_other:
            depth2.append(
                {
                    "id": other_id,
                    "parentId": d1_cid,
                    "label": "기타",
                    "order": order_by_d1[d1_cid],
                    "isActive": True,
                    "isOther": True,
                }
            )
            order_by_d1[d1_cid] += 1

    return {
        "version": 3,
        "description": "알라딘 국내도서 대분류·중분류. 중분류 id는 {대분류CID}_{중분류CID} 형식(전역 유일).",
        "대분류": depth1,
        "중분류": depth2,
    }


def main() -> None:
    csv_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_CSV
    if not csv_path.is_file():
        print(f"CSV 없음: {csv_path}", file=sys.stderr)
        sys.exit(1)
    payload = build(csv_path)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(
        f"대분류 {len(payload['대분류'])} · 중분류 {len(payload['중분류'])} → {OUT}"
    )


if __name__ == "__main__":
    main()
