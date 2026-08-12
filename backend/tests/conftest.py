import pytest
from sqlalchemy.orm import Session

from app.db import Base, make_engine


@pytest.fixture()
def db_session():
    engine = make_engine("sqlite://")
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
    engine.dispose()
