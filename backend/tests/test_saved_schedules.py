"""Several named schedules: the administrator creates new ones without losing the old ones and picks the active one."""
from tests.conftest import STUDENT, _client_as, place_student


def entries(client):
    return sorted((e["materia_id"], e["aula_id"], e["dia_semana"], e["hora_inicio"]) for e in client.get("/schedules").json())


def saved(client):
    return client.get("/saved-schedules").json()


def test_the_current_schedule_is_listed_as_the_main_one(client):
    [main] = saved(client)
    assert main["nombre"] == "Horario principal" and main["activo"] is True and main["total_bloques"] == 0


def test_creating_a_schedule_keeps_the_previous_one(client, demo_data):
    client.post("/schedules/generate")
    first = entries(client)

    r = client.post("/saved-schedules", json={"nombre": "Propuesta B"})
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["horario"]["nombre"] == "Propuesta B" and body["horario"]["activo"] is True
    assert body["horario"]["total_bloques"] == len(entries(client)) > 0

    listed = {s["nombre"]: s for s in saved(client)}
    assert listed["Horario principal"]["activo"] is False
    assert listed["Horario principal"]["total_bloques"] == len(first)  # the old schedule was kept, block by block

    main_id = listed["Horario principal"]["id"]
    r = client.post(f"/saved-schedules/{main_id}/activate")
    assert r.status_code == 200 and r.json()["bloques_omitidos"] == 0
    assert entries(client) == first  # exactly the same blocks come back
    assert {s["nombre"]: s["activo"] for s in saved(client)} == {"Horario principal": True, "Propuesta B": False}


def test_activating_keeps_the_schedule_free_of_clashes(client, demo_data):
    client.post("/schedules/generate")
    client.post("/saved-schedules", json={"nombre": "Segundo semestre"})
    main_id = next(s["id"] for s in saved(client) if s["nombre"] == "Horario principal")
    client.post(f"/saved-schedules/{main_id}/activate")
    assert client.get("/conflicts").json()["total"] == 0


def test_names_are_unique_ignoring_case(client, demo_data):
    assert client.post("/saved-schedules", json={"nombre": "horario PRINCIPAL"}).status_code == 409
    assert client.post("/saved-schedules", json={"nombre": "x"}).status_code == 422  # too short


def test_if_generation_fails_nothing_changes(client):
    r = client.post("/saved-schedules", json={"nombre": "Sin datos"})
    assert r.status_code == 409
    assert [s["nombre"] for s in saved(client)] == ["Horario principal"]


def test_the_active_schedule_cannot_be_deleted_but_the_others_can(client, demo_data):
    client.post("/schedules/generate")
    created = client.post("/saved-schedules", json={"nombre": "Propuesta B"}).json()["horario"]
    assert client.delete(f"/saved-schedules/{created['id']}").status_code == 409

    main_id = next(s["id"] for s in saved(client) if s["nombre"] == "Horario principal")
    client.post(f"/saved-schedules/{main_id}/activate")
    assert client.delete(f"/saved-schedules/{created['id']}").status_code == 200
    assert [s["nombre"] for s in saved(client)] == ["Horario principal"]
    assert client.delete("/saved-schedules/9999").status_code == 404


def test_rename(client):
    main_id = saved(client)[0]["id"]
    r = client.patch(f"/saved-schedules/{main_id}", json={"nombre": "Semestre 2026-2"})
    assert r.status_code == 200 and r.json()["nombre"] == "Semestre 2026-2"


def test_blocks_of_deleted_subjects_are_skipped_when_activating(client, demo_data):
    client.post("/schedules/generate")
    client.post("/saved-schedules", json={"nombre": "Propuesta B"})
    main = next(s for s in saved(client) if s["nombre"] == "Horario principal")
    subject_id = client.get("/subjects").json()[0]["id"]
    assert client.delete(f"/subjects/{subject_id}").status_code == 200

    r = client.post(f"/saved-schedules/{main['id']}/activate")
    assert r.status_code == 200 and r.json()["bloques_omitidos"] > 0
    assert all(e["materia_id"] != subject_id for e in client.get("/schedules").json())


def test_only_the_administrator_creates_or_changes_schedules(client, reader_client, demo_data):
    main_id = saved(client)[0]["id"]
    place_student(client)
    student = _client_as(STUDENT["email"])
    for other in (reader_client, student):
        assert other.get("/saved-schedules").status_code == 200  # everyone signed in can see the list
        assert other.post("/saved-schedules", json={"nombre": "Mío"}).status_code == 403
        assert other.post(f"/saved-schedules/{main_id}/activate").status_code == 403
        assert other.patch(f"/saved-schedules/{main_id}", json={"nombre": "Otro"}).status_code == 403
        assert other.delete(f"/saved-schedules/{main_id}").status_code == 403


def test_anonymous_users_get_401(anonymous_client):
    assert anonymous_client.get("/saved-schedules").status_code == 401


def test_loading_demo_data_drops_the_saved_copies(client, demo_data):
    client.post("/schedules/generate")
    client.post("/saved-schedules", json={"nombre": "Propuesta B"})
    assert client.post("/seed?reset=true").status_code == 200
    # The old copy pointed to subjects that no longer exist; the active schedule keeps its name
    assert [(s["nombre"], s["activo"]) for s in saved(client)] == [("Propuesta B", True)]
