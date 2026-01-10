import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app import crud, models

# Тестовая база данных (в памяти SQLite)
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db():
    """Фикстура для создания тестовой базы данных"""
    # Создаем все таблицы
    Base.metadata.create_all(bind=engine)

    # Создаем сессию
    db = TestingSessionLocal()

    try:
        yield db
    finally:
        db.close()
        # Удаляем все таблицы после теста
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db):
    """Фикстура для создания тестового клиента FastAPI"""

    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def test_user(db):
    """Фикстура для создания тестового пользователя"""
    user = crud.create_user(
        db=db,
        email="test@example.com",
        password="testpassword123",
        first_name="Test",
        last_name="User"
    )
    return user


@pytest.fixture
def auth_headers(client, test_user):
    """Фикстура для получения заголовков авторизации"""
    # Логинимся
    response = client.post(
        "/login",
        json={
            "email": "test@example.com",
            "password": "testpassword123"
        }
    )
    assert response.status_code == 200
    token = response.json()["access_token"]

    return {"Authorization": f"Bearer {token}"}