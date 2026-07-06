import pytest

from security import assert_read_only


@pytest.mark.parametrize("cypher", [
    "MATCH (n) RETURN n LIMIT 10",
    "MATCH path = (a)-[:HAS_OUTLINE]->(b) RETURN path",
    "MATCH ()-[r]->() RETURN type(r), count(r)",
    "MATCH (n:TechRequirement) WHERE n.priority = '高' RETURN n",
])
def test_read_queries_pass(cypher):
    assert_read_only(cypher)


@pytest.mark.parametrize("cypher", [
    "CREATE (n:Hack) RETURN n",
    "MATCH (n) SET n.x = 1 RETURN n",
    "MATCH (n) DETACH DELETE n",
    "MERGE (n:X) RETURN n",
    "MATCH (n) REMOVE n.title RETURN n",
    "match (n) delete n",
    "MATCH (n)\nWITH n\nSET n.x = 1",
    'LOAD CSV FROM "http://evil" AS row RETURN row',
    'CALL apoc.periodic.iterate("", "", {})',
    "CALL dbms.listConfig()",
    "FOREACH (x IN [1] | CREATE (:Y))",
])
def test_write_queries_blocked(cypher):
    with pytest.raises(ValueError):
        assert_read_only(cypher)
