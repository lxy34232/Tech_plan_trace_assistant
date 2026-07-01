import os
import re
from typing import Any
from fastapi import FastAPI, HTTPException, Security
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security.api_key import APIKeyHeader
from neo4j import GraphDatabase
from neo4j.time import DateTime, Date, Duration
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Neo4j Proxy — DOORS Trace Assistant")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

NEO4J_URI = os.getenv("NEO4J_URI", "")
NEO4J_USER = os.getenv("NEO4J_USER", os.getenv("NEO4J_USERNAME", "neo4j"))
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "")
NEO4J_DATABASE = os.getenv("NEO4J_DATABASE", "neo4j")
PROXY_API_KEY = os.getenv("PROXY_API_KEY", "")

driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

# Read-only Cypher guard — block write keywords at statement start
WRITE_PATTERN = re.compile(
    r"^\s*(CREATE|MERGE|DELETE|DETACH|SET|REMOVE|DROP|CALL\s+db\.)",
    re.IGNORECASE | re.MULTILINE,
)

SCHEMA_INFO = {
    "nodes": [
        {"label": "TechOutline", "alias": "科技规划大纲",
         "properties": ["outlineId", "title", "content", "version", "status", "createdAt", "updatedAt"]},
        {"label": "TechText", "alias": "科技规划文本",
         "properties": ["textId", "title", "content", "version", "status", "approvedDate"]},
        {"label": "TechRequirement", "alias": "科技规划需求",
         "properties": ["reqId", "title", "content", "priority", "version", "status", "department", "createdAt", "updatedAt"]},
        {"label": "TechTask", "alias": "科技规划任务",
         "properties": ["taskId", "title", "description", "owner", "status", "startDate", "endDate"]},
        {"label": "ResearchProject", "alias": "科研项目",
         "properties": ["projectId", "name", "description", "principal", "budget", "status", "startDate", "endDate"]},
    ],
    "relationships": [
        {"type": "CONTAINS",       "from": "TechOutline",     "to": "TechText",         "desc": "大纲包含文本"},
        {"type": "SPECIFIES",      "from": "TechText",        "to": "TechRequirement",  "desc": "文本规定需求"},
        {"type": "DECOMPOSES_TO",  "from": "TechRequirement", "to": "TechTask",         "desc": "需求分解为任务"},
        {"type": "IMPLEMENTED_BY", "from": "TechTask",        "to": "ResearchProject",  "desc": "任务由科研项目实现"},
        {"type": "REFINES",        "from": "TechRequirement", "to": "TechRequirement",  "desc": "需求细化/子需求"},
        {"type": "DEPENDS_ON",     "from": "TechTask",        "to": "TechTask",         "desc": "任务依赖"},
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
    # Use the domain ID if present, else fall back to element_id
    domain_id = (
        props.get("reqId") or props.get("outlineId") or props.get("textId")
        or props.get("taskId") or props.get("projectId")
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
    params: dict = {}


def check_api_key(api_key: str = Security(api_key_header)):
    if PROXY_API_KEY and api_key != PROXY_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/schema")
async def get_schema(api_key: str = Security(api_key_header)):
    check_api_key(api_key)
    try:
        with driver.session(database=NEO4J_DATABASE) as session:
            # Discover all node labels and their properties
            labels_result = list(session.run("CALL db.labels() YIELD label RETURN label ORDER BY label"))
            nodes = []
            for record in labels_result:
                label = record["label"]
                props_result = list(session.run(
                    f"MATCH (n:`{label}`) RETURN keys(n) AS props LIMIT 1"
                ))
                props = sorted(props_result[0]["props"]) if props_result else []
                nodes.append({"label": label, "properties": props})

            # Discover all relationship types with their actual source/target labels
            rels_result = list(session.run(
                "MATCH (a)-[r]->(b) "
                "RETURN DISTINCT labels(a)[0] AS from_label, type(r) AS rel_type, labels(b)[0] AS to_label"
            ))
            relationships = [
                {"type": r["rel_type"], "from": r["from_label"], "to": r["to_label"]}
                for r in rels_result
            ]

            return {"nodes": nodes, "relationships": relationships}
    except Exception as exc:
        # Fall back to static schema if dynamic discovery fails
        return SCHEMA_INFO


@app.post("/query")
async def execute_query(request: QueryRequest, api_key: str = Security(api_key_header)):
    check_api_key(api_key)

    if WRITE_PATTERN.search(request.cypher):
        raise HTTPException(status_code=400, detail="Only read-only Cypher (MATCH) is allowed.")

    try:
        with driver.session(database=NEO4J_DATABASE) as session:
            result = session.run(request.cypher, request.params)
            records = []
            nodes: dict[str, dict] = {}
            edges_list: list[dict] = []
            seen_edge_ids: set[str] = set()

            for record in result:
                row: dict = {}
                for key, value in record.items():
                    if value is None:
                        row[key] = None
                    elif hasattr(value, "labels"):  # Node
                        nd = node_to_dict(value)
                        nodes[nd["id"]] = nd
                        row[key] = nd
                    elif hasattr(value, "type") and hasattr(value, "start_node"):  # Relationship
                        rd = rel_to_dict(value)
                        # Also capture the connected nodes
                        sn = node_to_dict(value.start_node)
                        tn = node_to_dict(value.end_node)
                        nodes[sn["id"]] = sn
                        nodes[tn["id"]] = tn
                        if rd["id"] not in seen_edge_ids:
                            edges_list.append(rd)
                            seen_edge_ids.add(rd["id"])
                        row[key] = rd
                    elif hasattr(value, "nodes") and hasattr(value, "relationships"):  # Path
                        for n in value.nodes:
                            nd = node_to_dict(n)
                            nodes[nd["id"]] = nd
                        for r in value.relationships:
                            rd = rel_to_dict(r)
                            if rd["id"] not in seen_edge_ids:
                                edges_list.append(rd)
                                seen_edge_ids.add(rd["id"])
                        row[key] = str(value)
                    elif isinstance(value, list):
                        row[key] = serialize(value)
                    else:
                        row[key] = serialize(value)
                records.append(row)

            return {
                "records": records,
                "graph": {
                    "nodes": list(nodes.values()),
                    "edges": edges_list,
                },
                "count": len(records),
            }
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))
