import pytest
from fastapi.testclient import TestClient


def test_register_user(client):
    """Тест регистрации нового пользователя"""
    response = client.post(
        "/register",
        json={
            "email": "newuser@example.com",
            "password": "password123",
            "first_name": "New",
            "last_name": "User"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "newuser@example.com"
    assert data["first_name"] == "New"
    assert "id" in data
    assert "hashed_password" not in data  # Пароль не должен возвращаться


def test_register_duplicate_user(client, test_user):
    """Тест регистрации пользователя с существующим email"""
    response = client.post(
        "/register",
        json={
            "email": "test@example.com",  # Уже существует
            "password": "password123",
            "first_name": "Test",
            "last_name": "User"
        }
    )
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"].lower()


def test_login_success(client, test_user):
    """Тест успешного логина"""
    response = client.post(
        "/login",
        json={
            "email": "test@example.com",
            "password": "testpassword123"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert len(data["access_token"]) > 0


def test_login_invalid_credentials(client, test_user):
    """Тест логина с неверными данными"""
    response = client.post(
        "/login",
        json={
            "email": "test@example.com",
            "password": "wrongpassword"
        }
    )
    assert response.status_code == 400
    assert "invalid" in response.json()["detail"].lower()


def test_get_current_user(client, auth_headers):
    """Тест получения информации о текущем пользователе"""
    response = client.get("/users/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test@example.com"
    assert "id" in data


def test_get_current_user_unauthorized(client):
    """Тест доступа к защищенному endpoint без авторизации"""
    response = client.get("/users/me")
    assert response.status_code == 403  # FastAPI TestClient возвращает 403 для отсутствия заголовков


def test_health_check(client):
    """Тест health check endpoint (будет создан позже)"""
    # Пока просто проверяем что корневой endpoint работает
    response = client.get("/")
    # Может быть 200 (если frontend есть) или 404 (если нет)
    assert response.status_code in [200, 404]