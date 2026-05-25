from fastapi import APIRouter, Depends
from sqlmodel import Session
from app.core.database import get_session
from app.memory.graph_engine import build_graph, find_path, get_neighbors, get_subgraph, get_entity_influence

router = APIRouter(prefix="/memory", tags=["Memory Graph"])


@router.get("/path")
def find_connection_path(from_id: int, to_id: int, session: Session = Depends(get_session)):
    G = build_graph(session)
    return find_path(G, from_id, to_id)


@router.get("/neighbors/{entity_id}")
def get_entity_neighbors(entity_id: int, session: Session = Depends(get_session)):
    G = build_graph(session)
    return get_neighbors(G, entity_id)


@router.get("/subgraph/{entity_id}")
def get_entity_subgraph(entity_id: int, depth: int = 2, session: Session = Depends(get_session)):
    G = build_graph(session)
    return get_subgraph(G, entity_id, depth)


@router.get("/influence/{entity_id}")
def get_influence_score(entity_id: int, session: Session = Depends(get_session)):
    G = build_graph(session)
    return get_entity_influence(G, entity_id)


@router.get("/most-connected")
def get_most_connected(limit: int = 5, session: Session = Depends(get_session)):
    G = build_graph(session)
    if len(G.nodes) == 0:
        return []

    degrees = [(n, G.degree(n), G.nodes[n]["name"], G.nodes[n]["type"]) for n in G.nodes]
    degrees.sort(key=lambda x: x[1], reverse=True)

    return [
        {"id": d[0], "name": d[2], "type": d[3], "connections": d[1]}
        for d in degrees[:limit]
    ]