from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="LIUHE_", env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./data/liuhe.db"
    default_lottery_type: int = 2


settings = Settings()
