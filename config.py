import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'krg_tech_super_secret_key_2026')
    
    # Check if MySQL environment variables are provided, otherwise use SQLite
    MYSQL_USER = os.environ.get('MYSQL_USER')
    MYSQL_PASSWORD = os.environ.get('MYSQL_PASSWORD')
    MYSQL_DB = os.environ.get('MYSQL_DB')
    MYSQL_HOST = os.environ.get('MYSQL_HOST', 'localhost')
    
    if MYSQL_USER and MYSQL_DB:
        SQLALCHEMY_DATABASE_URI = f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}/{MYSQL_DB}"
    else:
        # Default to SQLite for easy out-of-the-box local testing
        SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'sqlite:///krg_helpdesk.db')
        
    SQLALCHEMY_TRACK_MODIFICATIONS = False
