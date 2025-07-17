#!/usr/bin/env python3
"""
Database initialization script for AIGM
Run this to set up the database for the first time
"""
import sys
import os

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.migrations import setup_database, check_database_connection, get_table_count
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

def main():
    """
    Initialize the database
    """
    logger.info("🚀 AIGM Database Initialization")
    logger.info("=" * 50)
    
    # Test database connection first
    logger.info("Testing database connection...")
    if not check_database_connection():
        logger.error("❌ Failed to connect to database. Please check your DATABASE_URL setting.")
        sys.exit(1)
    
    # Set up database
    if setup_database():
        table_count = get_table_count()
        logger.info("=" * 50)
        logger.info("🎉 Database initialization completed successfully!")
        logger.info(f"📊 Total tables created: {table_count}")
        logger.info("✅ Ready for development!")
    else:
        logger.error("❌ Database initialization failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()