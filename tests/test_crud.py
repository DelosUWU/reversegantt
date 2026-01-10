import pytest
from app import crud, models


def test_create_user(db):
    """Тест создания пользователя через CRUD"""
    user = crud.create_user(
        db=db,
        email="crudtest@example.com",
        password="password123",
        first_name="CRUD",
        last_name="Test"
    )
    assert user.email == "crudtest@example.com"
    assert user.first_name == "CRUD"
    assert user.id is not None
    assert user.hashed_password != "password123"  # Пароль должен быть захеширован


def test_get_user(db, test_user):
    """Тест получения пользователя по ID"""
    user = crud.get_user(db, test_user.id)
    assert user is not None
    assert user.email == test_user.email


def test_get_user_by_email(db, test_user):
    """Тест получения пользователя по email"""
    user = crud.get_user_by_email(db, "test@example.com")
    assert user is not None
    assert user.id == test_user.id


def test_verify_password(db):
    """Тест проверки пароля"""
    password = "testpassword123"
    user = crud.create_user(
        db=db,
        email="passwordtest@example.com",
        password=password,
        first_name="Test",
        last_name="User"
    )

    # Правильный пароль
    assert crud.verify_password(password, user.hashed_password) is True

    # Неправильный пароль
    assert crud.verify_password("wrongpassword", user.hashed_password) is False