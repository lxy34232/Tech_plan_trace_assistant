import os
from contextlib import asynccontextmanager
from itertools import islice
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Security
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security.api_key import APIKeyHeader
from neo4j import GraphDatabase, unit_of_work
from neo4j.exceptions import Neo4jError
from neo4j.time import Date, DateTime, Duration
from pydantic import BaseModel, Field

from security import assert_read_only

load_dotenv()

NEO4J_URI = os.getenv("NEO4J_URI", "")
NEO4J_USER = os.getenv("NEO4J_USER", os.getenv("NEO4J_USERNAME", "neo4j"))
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "")
NEO4J_DATABASE = os.getenv("NEO4J_DATABASE", "neo4j")
PROXY_API_KEY = os.getenv("PROXY_API_KEY", "")
ALLOWED_ORIGINS = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "*").split(",")]
QUERY_TIMEOUT = float(os.getenv("QUERY_TIMEOUT_SECONDS", "15"))
MAX_RECORDS = int(os.getenv("MAX_RECORDS", "500"))

driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    driver.close()


app = FastAPI(title="Neo4j Proxy - DOORS Trace Assistant", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

SCHEMA_INFO = {
    "nodes": [
        {
            "label": "TechOutline",
            "alias": "科技规划大纲",
            "properties": ["outlineId", "title", "content", "version", "status", "createdAt", "updatedAt"],
        },
        {
            "label": "TechText",
            "alias": "科技规划文本",
            "properties": ["textId", "title", "content", "version", "status", "approvedDate"],
        },
        {
            "label": "TechRequirement",
            "alias": "科技规划需求",
            "properties": ["reqId", "title", "content", "priority", "version", "status", "department", "createdAt", "updatedAt"],
        },
        {
            "label": "TechTask",
            "alias": "科技规划任务",
            "properties": ["taskId", "title", "description", "owner", "status", "startDate", "endDate"],
        },
        {
            "label": "ResearchProject",
            "alias": "科研项目",
            "properties": ["projectId", "name", "description", "principal", "budget", "status", "startDate", "endDate"],
        },
    ],
    "relationships": [
        {"type": "HAS_OUTLINE", "from": "TechRequirement", "to": "TechOutline", "desc": "需求关联大纲"},
        {"type": "HAS_TEXT", "from": "TechOutline", "to": "TechText", "desc": "大纲关联文本"},
        {"type": "HAS_TASK", "from": "TechText", "to": "TechTask", "desc": "文本关联任务"},
        {"type": "HAS_PROJECT", "from": "TechTask", "to": "ResearchProject", "desc": "任务关联项目"},
    ],
}


def serialize(value: Any) -> Any:
    if isinstance(value, (DateTime, Date)):
        return str(value)
    if isinstance(value, Duration):
        return str(value)
    if isinstance(value, dict):
        return {k: serialize(v) for k, v in value.items()}
    if isinstance(value, list):
        return [serialize(v) for v in value]
    return value


def node_to_dict(node) -> dict:
    labels = list(node.labels)
    props = {k: serialize(v) for k, v in dict(node).items()}
    domain_id = (
        props.get("reqId")
        or props.get("outlineId")
        or props.get("textId")
        or props.get("taskId")
        or props.get("projectId")
        or node.element_id
    )
    display_label = props.get("title") or props.get("name") or domain_id
    return {
        "id": str(node.element_id),
        "domain_id": domain_id,
        "labels": labels,
        "type": labels[0] if labels else "Unknown",
        "label": display_label,
        "properties": props,
    }


def rel_to_dict(rel) -> dict:
    props = {k: serialize(v) for k, v in dict(rel).items()}
    return {
        "id": str(rel.element_id),
        "type": rel.type,
        "source": str(rel.start_node.element_id),
        "target": str(rel.end_node.element_id),
        "properties": props,
    }


class QueryRequest(BaseModel):
    cypher: str
    params: dict = Field(default_factory=dict)


def check_api_key(api_key: str = Security(api_key_header)):
    if PROXY_API_KEY and api_key != PROXY_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")


@app.get("/health")
async def health():
    try:
        driver.verify_connectivity()
        return {"status": "ok", "neo4j": "connected"}
    except Exception:
        return {"status": "degraded", "neo4j": "unreachable"}


@app.get("/schema")
async def get_schema(api_key: str = Security(api_key_header)):
    check_api_key(api_key)
    try:
        with driver.session(database=NEO4J_DATABASE) as session:
            labels_result = list(session.run("CALL db.labels() YIELD label RETURN label ORDER BY label"))
            nodes = []
            for record in labels_result:
                label = record["label"]
                props_result = list(session.run(
                    f"MATCH (n:`{label}`) WITH n LIMIT 25 "
                    "UNWIND keys(n) AS k RETURN collect(DISTINCT k) AS props"
                ))
                props = sorted(props_result[0]["props"]) if props_result else []
                nodes.append({"label": label, "properties": props})

            rels_result = list(session.run(
                "MATCH (a)-[r]->(b) "
                "RETURN DISTINCT labels(a)[0] AS from_label, type(r) AS rel_type, labels(b)[0] AS to_label"
            ))
            relationships = [
                {"type": r["rel_type"], "from": r["from_label"], "to": r["to_label"]}
                for r in rels_result
            ]

            return {"nodes": nodes, "relationships": relationships, "source": "live"}
    except Neo4jError:
        return {**SCHEMA_INFO, "source": "static_fallback"}
    except Exception:
        return {**SCHEMA_INFO, "source": "static_fallback"}


@unit_of_work(timeout=QUERY_TIMEOUT)
def _read_work(tx, cypher: str, params: dict) -> list:
    result = tx.run(cypher, params)
    return list(islice(result, MAX_RECORDS))


@app.post("/query")
async def execute_query(request: QueryRequest, api_key: str = Security(api_key_header)):
    check_api_key(api_key)

    try:
        assert_read_only(request.cypher)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    try:
        with driver.session(database=NEO4J_DATABASE) as session:
            raw_records = session.execute_read(_read_work, request.cypher, request.params)
    except Neo4jError as exc:
        raise HTTPException(status_code=400, detail=f"{exc.code}: {exc.message}")
    except Exception:
        raise HTTPException(status_code=500, detail="Internal proxy error")

    records = []
    nodes: dict[str, dict] = {}
    edges_list: list[dict] = []
    seen_edge_ids: set[str] = set()

    for record in raw_records:
        row: dict = {}
        for key, value in record.items():
            if value is None:
                row[key] = None
            elif hasattr(value, "labels"):
                nd = node_to_dict(value)
                nodes[nd["id"]] = nd
                row[key] = nd
            elif hasattr(value, "type") and hasattr(value, "start_node"):
                rd = rel_to_dict(value)
                sn = node_to_dict(value.start_node)
                tn = node_to_dict(value.end_node)
                nodes[sn["id"]] = sn
                nodes[tn["id"]] = tn
                if rd["id"] not in seen_edge_ids:
                    edges_list.append(rd)
                    seen_edge_ids.add(rd["id"])
                row[key] = rd
            elif hasattr(value, "nodes") and hasattr(value, "relationships"):
                for n in value.nodes:
                    nd = node_to_dict(n)
                    nodes[nd["id"]] = nd
                for r in value.relationships:
                    rd = rel_to_dict(r)
                    if rd["id"] not in seen_edge_ids:
                        edges_list.append(rd)
                        seen_edge_ids.add(rd["id"])
                row[key] = str(value)
            else:
                row[key] = serialize(value)
        records.append(row)

    return {
        "records": records,
        "graph": {"nodes": list(nodes.values()), "edges": edges_list},
        "count": len(records),
        "truncated": len(raw_records) >= MAX_RECORDS,
    }
