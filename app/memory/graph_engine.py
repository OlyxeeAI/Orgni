import networkx as nx
from sqlmodel import Session, select
from app.models.entities import Entity
from app.models.relationships import Relationship


def build_graph(session: Session) -> nx.DiGraph:
    G = nx.DiGraph()
    entities = session.exec(select(Entity)).all()
    relationships = session.exec(select(Relationship)).all()

    for entity in entities:
        G.add_node(entity.id, name=entity.name, type=entity.type, description=entity.description)

    for rel in relationships:
        G.add_edge(rel.from_entity_id, rel.to_entity_id, relationship=rel.relationship_type, id=rel.id)

    return G


def find_path(G: nx.DiGraph, from_id: int, to_id: int) -> dict:
    try:
        path = nx.shortest_path(G, source=from_id, target=to_id)
        steps = []
        for i in range(len(path) - 1):
            edge_data = G.edges[path[i], path[i + 1]]
            from_node = G.nodes[path[i]]
            to_node = G.nodes[path[i + 1]]
            steps.append({
                "from": {"id": path[i], "name": from_node["name"], "type": from_node["type"]},
                "relationship": edge_data["relationship"],
                "to": {"id": path[i + 1], "name": to_node["name"], "type": to_node["type"]}
            })
        return {"found": True, "path_length": len(path) - 1, "steps": steps}
    except nx.NetworkXNoPath:
        return {"found": False, "path_length": 0, "steps": []}
    except nx.NodeNotFound as e:
        return {"found": False, "error": str(e), "steps": []}


def get_neighbors(G: nx.DiGraph, entity_id: int) -> dict:
    if entity_id not in G:
        return {"entity_id": entity_id, "outgoing": [], "incoming": []}

    outgoing = []
    for neighbor_id in G.successors(entity_id):
        edge_data = G.edges[entity_id, neighbor_id]
        node = G.nodes[neighbor_id]
        outgoing.append({
            "id": neighbor_id,
            "name": node["name"],
            "type": node["type"],
            "relationship": edge_data["relationship"]
        })

    incoming = []
    for neighbor_id in G.predecessors(entity_id):
        edge_data = G.edges[neighbor_id, entity_id]
        node = G.nodes[neighbor_id]
        incoming.append({
            "id": neighbor_id,
            "name": node["name"],
            "type": node["type"],
            "relationship": edge_data["relationship"]
        })

    return {
        "entity_id": entity_id,
        "name": G.nodes[entity_id]["name"],
        "outgoing": outgoing,
        "incoming": incoming
    }


def get_subgraph(G: nx.DiGraph, entity_id: int, depth: int = 2) -> dict:
    if entity_id not in G:
        return {"nodes": [], "edges": []}

    nodes_in_range = nx.single_source_shortest_path_length(G, entity_id, cutoff=depth)
    subgraph = G.subgraph(nodes_in_range.keys())

    nodes = [
        {"id": n, "name": subgraph.nodes[n]["name"], "type": subgraph.nodes[n]["type"]}
        for n in subgraph.nodes
    ]
    edges = [
        {"from": u, "to": v, "relationship": subgraph.edges[u, v]["relationship"]}
        for u, v in subgraph.edges
    ]

    return {"nodes": nodes, "edges": edges}


def get_entity_influence(G: nx.DiGraph, entity_id: int) -> dict:
    if entity_id not in G:
        return {"entity_id": entity_id, "influence_score": 0}

    out_degree = G.out_degree(entity_id)
    in_degree = G.in_degree(entity_id)

    try:
        pagerank = nx.pagerank(G)
        influence = pagerank.get(entity_id, 0)
    except Exception:
        influence = 0

    return {
        "entity_id": entity_id,
        "name": G.nodes[entity_id]["name"],
        "out_connections": out_degree,
        "in_connections": in_degree,
        "influence_score": round(influence, 4)
    }