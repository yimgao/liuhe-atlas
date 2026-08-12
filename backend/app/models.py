import datetime

from sqlalchemy import BigInteger, CheckConstraint, Date, DateTime, ForeignKeyConstraint, SmallInteger, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class Draw(Base):
    __tablename__ = "draws"

    lottery_type: Mapped[int] = mapped_column(SmallInteger, primary_key=True)
    period_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    draw_date: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    source_url: Mapped[str] = mapped_column(String, nullable=False)
    fetched_at: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False)

    numbers: Mapped[list["DrawNumber"]] = relationship(
        back_populates="draw", cascade="all, delete-orphan", order_by="DrawNumber.position"
    )


class DrawNumber(Base):
    __tablename__ = "draw_numbers"
    __table_args__ = (
        ForeignKeyConstraint(
            ["lottery_type", "period_id"], ["draws.lottery_type", "draws.period_id"]
        ),
        CheckConstraint("position >= 1 AND position <= 7", name="ck_draw_numbers_position_range"),
        CheckConstraint("ball >= 1 AND ball <= 49", name="ck_draw_numbers_ball_range"),
        UniqueConstraint("lottery_type", "period_id", "ball", name="uq_draw_numbers_period_ball"),
    )

    lottery_type: Mapped[int] = mapped_column(SmallInteger, primary_key=True)
    period_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    position: Mapped[int] = mapped_column(SmallInteger, primary_key=True)
    ball: Mapped[int] = mapped_column(SmallInteger, nullable=False)

    draw: Mapped["Draw"] = relationship(back_populates="numbers")
