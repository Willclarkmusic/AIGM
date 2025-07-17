"""
SQLite setup for local development when PostgreSQL is not available
"""
import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.database import Base
from app.models import *  # Import all models
import logging

logger = logging.getLogger(__name__)

# Force SQLite for testing
SQLITE_DATABASE_URL = "sqlite:///./aigm_test.db"

def setup_sqlite_database():
    """
    Set up SQLite database for testing
    """
    try:
        logger.info("Setting up SQLite database for testing...")
        
        # Create SQLite engine
        engine = create_engine(
            SQLITE_DATABASE_URL, 
            connect_args={"check_same_thread": False}  # Required for SQLite
        )
        
        # Create all tables
        Base.metadata.create_all(bind=engine)
        
        # Test connection
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        with SessionLocal() as session:
            session.execute("SELECT 1")
        
        logger.info("✅ SQLite database setup successful!")
        logger.info(f"📁 Database file: {os.path.abspath('aigm_test.db')}")
        
        return True, engine
        
    except Exception as e:
        logger.error(f"❌ SQLite setup failed: {e}")
        return False, None

if __name__ == "__main__":
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    success, engine = setup_sqlite_database()
    if success:
        print("✅ SQLite database ready for testing!")
    else:
        print("❌ Failed to set up SQLite database")
        sys.exit(1)