from copy import deepcopy
from urllib.parse import quote

import pytest
from fastapi.testclient import TestClient

from src.app import app, activities


ORIGINAL = deepcopy(activities)

client = TestClient(app)


def setup_function(fn):
    # restore in-memory activities before each test
    activities.clear()
    activities.update(deepcopy(ORIGINAL))


def url_for(activity, email):
    return f"/activities/{quote(activity)}/signup?email={quote(email)}"


def test_get_activities():
    r = client.get("/activities")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, dict)
    assert "Chess Club" in data


def test_signup_success():
    email = "testuser@example.com"
    r = client.post(url_for("Chess Club", email))
    assert r.status_code == 200
    assert email in activities["Chess Club"]["participants"]


def test_signup_already_signed():
    # michael@mergington.edu is in initial participants for Chess Club
    email = "michael@mergington.edu"
    r = client.post(url_for("Chess Club", email))
    assert r.status_code == 400


def test_unregister_success():
    email = "to_remove@example.com"
    # sign up first
    r = client.post(url_for("Chess Club", email))
    assert r.status_code == 200

    # now unregister
    r = client.delete(url_for("Chess Club", email))
    assert r.status_code == 200
    assert email not in activities["Chess Club"]["participants"]


def test_unregister_not_signed():
    email = "nobody@example.com"
    r = client.delete(url_for("Chess Club", email))
    assert r.status_code == 404
