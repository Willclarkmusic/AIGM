"""
Database migration utilities for AIGM
"""
from sqlalchemy import text
from sqlalchemy.engine import Engine
from app.db.database import Base, engine
from app.models import *  # Import all models
import logging

logger = logging.getLogger(__name__)

def create_all_tables():
    """
    Create all database tables based on SQLAlchemy models.
    
    This function will:
    1. Create all tables defined in the models
    2. Add any necessary constraints
    3. Create indexes
    """
    try:
        logger.info("Creating all database tables...")
        
        # Create all tables
        Base.metadata.create_all(bind=engine)
        
        logger.info("✅ All database tables created successfully")
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to create database tables: {e}")
        return False

def drop_all_tables():
    """
    Drop all database tables. Use with caution!
    """
    try:
        logger.info("Dropping all database tables...")
        
        Base.metadata.drop_all(bind=engine)
        
        logger.info("✅ All database tables dropped successfully")
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to drop database tables: {e}")
        return False

def recreate_all_tables():
    """
    Drop and recreate all tables. Use for development only!
    """
    logger.info("Recreating all database tables...")
    
    if not drop_all_tables():
        return False
        
    return create_all_tables()

def check_database_connection():
    """
    Check if we can connect to the database
    """
    try:
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1"))
            result.fetchone()
        logger.info("✅ Database connection successful")
        return True
    except Exception as e:
        logger.error(f"❌ Database connection failed: {e}")
        return False

def get_table_count():
    """
    Get the number of tables in the database
    """
    try:
        with engine.connect() as connection:
            result = connection.execute(text("""
                SELECT COUNT(*) as table_count 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
            """))
            count = result.fetchone()[0]
        return count
    except Exception as e:
        logger.error(f"Failed to get table count: {e}")
        return 0

def check_tables_exist():
    """
    Check if all required tables exist in the database
    """
    expected_tables = [
        'users', 'ai_agents', 'servers', 'rooms', 'messages', 
        'files', 'user_servers', 'user_rooms', 'message_reactions',
        'ai_agent_logs', 'friendships', 'direct_conversations', 
        'direct_conversation_members'
    ]
    
    try:
        with engine.connect() as connection:
            result = connection.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
            """))
            existing_tables = [row[0] for row in result.fetchall()]
        
        missing_tables = set(expected_tables) - set(existing_tables)
        
        if missing_tables:
            logger.warning(f"Missing tables: {missing_tables}")
            return False, list(missing_tables)
        else:
            logger.info("✅ All required tables exist")
            return True, []
            
    except Exception as e:
        logger.error(f"Failed to check tables: {e}")
        return False, []

def setup_database():
    """
    Complete database setup - check connection and create tables if needed
    """
    logger.info("🚀 Starting database setup...")
    
    # Check connection
    if not check_database_connection():
        logger.error("❌ Cannot proceed - database connection failed")
        return False
    
    # Check if tables exist
    tables_exist, missing_tables = check_tables_exist()
    
    if not tables_exist:
        logger.info(f"Creating missing tables: {missing_tables}")
        if not create_all_tables():
            return False
    
    # Final verification
    tables_exist, missing_tables = check_tables_exist()
    table_count = get_table_count()
    
    if tables_exist:
        logger.info(f"✅ Database setup complete! {table_count} tables created.")
        return True
    else:
        logger.error(f"❌ Database setup failed. Missing tables: {missing_tables}")
        return False