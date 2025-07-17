#!/usr/bin/env python3
"""
SQLite setup for local development when PostgreSQL is not available
"""
import os
import sys

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.db.database import Base
from app.models import *  # Import all models
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

# Force SQLite for testing
SQLITE_DATABASE_URL = "sqlite:///./aigm_test.db"

def setup_sqlite_database():
    """
    Set up SQLite database for testing
    """
    try:
        logger.info("🚀 Setting up SQLite database for testing...")
        
        # Remove existing database file if it exists
        db_file = "aigm_test.db"
        if os.path.exists(db_file):
            os.remove(db_file)
            logger.info(f"🗑️ Removed existing database file: {db_file}")
        
        # Create SQLite engine
        engine = create_engine(
            SQLITE_DATABASE_URL, 
            connect_args={"check_same_thread": False}  # Required for SQLite
        )
        
        # Create all tables
        logger.info("📊 Creating database tables...")
        Base.metadata.create_all(bind=engine)
        
        # Test connection and count tables
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        with SessionLocal() as session:
            result = session.execute(text("SELECT name FROM sqlite_master WHERE type='table'"))
            tables = [row[0] for row in result.fetchall()]
            
        logger.info("✅ SQLite database setup successful!")
        logger.info(f"📁 Database file: {os.path.abspath(db_file)}")
        logger.info(f"📊 Tables created: {len(tables)}")
        logger.info(f"📋 Table list: {', '.join(tables)}")
        
        return True, engine
        
    except Exception as e:
        logger.error(f"❌ SQLite setup failed: {e}")
        return False, None

def main():
    """
    Main function to set up SQLite database
    """
    logger.info("🚀 AIGM SQLite Database Setup")
    logger.info("=" * 50)
    
    success, engine = setup_sqlite_database()
    if success:
        logger.info("=" * 50)
        logger.info("🎉 SQLite database ready for testing!")
        logger.info("✅ You can now run the FastAPI server for development")
    else:
        logger.error("❌ Failed to set up SQLite database")
        sys.exit(1)

if __name__ == "__main__":
    main()