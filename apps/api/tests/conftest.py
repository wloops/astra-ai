import os
from pathlib import Path


TEST_DATABASE_PATH = Path("data/astra-test.db")

# 测试必须在导入应用前切换数据库，避免写入本地开发库 data/astra.db。
os.environ.setdefault("ASTRA_DATABASE_URL", f"sqlite:///{TEST_DATABASE_PATH.as_posix()}")
# 默认测试环境保持向后兼容的无鉴权模式；需要鉴权的测试会用 monkeypatch 显式开启。
os.environ.setdefault("ASTRA_API_KEY", "")
os.environ.setdefault("ASTRA_JWT_SECRET", "")
os.environ.setdefault("ASTRA_ADMIN_PASSWORD", "")


def pytest_sessionstart() -> None:
    """每轮测试使用干净数据库，避免跨测试运行残留角色、用户或会话数据。"""

    if TEST_DATABASE_PATH.exists():
        TEST_DATABASE_PATH.unlink()
