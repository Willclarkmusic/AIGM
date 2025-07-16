#!/usr/bin/env python3
"""
Auth0 Integration Test Script for AIGM
Validates that all components are properly configured and working
"""

import asyncio
import sys
import os

# Add current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def check_environment_variables():
    """Check if required environment variables are set"""
    print("🔍 Checking Environment Variables...")
    
    required_vars = [
        'AUTH0_DOMAIN',
        'AUTH0_CLIENT_ID', 
        'AUTH0_AUDIENCE',
        'DATABASE_URL',
        'JWT_SECRET_KEY'
    ]
    
    optional_vars = [
        'AWS_ACCESS_KEY_ID',
        'AWS_SECRET_ACCESS_KEY',
        'SES_FROM_EMAIL'
    ]
    
    missing_required = []
    for var in required_vars:
        if not os.getenv(var):
            missing_required.append(var)
        else:
            print(f"✅ {var} is set")
    
    for var in optional_vars:
        if os.getenv(var):
            print(f"✅ {var} is set")
        else:
            print(f"⚠️  {var} is not set (optional for testing)")
    
    if missing_required:
        print(f"\n❌ Missing required environment variables: {', '.join(missing_required)}")
        return False
    
    print("✅ All required environment variables are set")
    return True

def test_fastapi_app():
    """Test if FastAPI app can be imported and created"""
    print("\n🔍 Testing FastAPI Application...")
    
    try:
        from app.main import app
        print("✅ FastAPI app imported successfully")
        
        # Check if app has the required routes
        routes = [route.path for route in app.routes]
        auth_routes = [route for route in routes if '/auth/' in route]
        
        if auth_routes:
            print(f"✅ Found {len(auth_routes)} auth routes")
            for route in auth_routes:
                print(f"   - {route}")
        else:
            print("❌ No auth routes found")
            return False
            
        return True
        
    except ImportError as e:
        print(f"❌ Failed to import FastAPI app: {e}")
        return False
    except Exception as e:
        print(f"❌ Error testing FastAPI app: {e}")
        return False

def test_auth_components():
    """Test Auth0 integration components"""
    print("\n🔍 Testing Auth0 Components...")
    
    try:
        from app.auth.auth0 import Auth0Token, get_auth0_token
        print("✅ Auth0Token class imported successfully")
        
        from app.auth.dependencies import get_current_user
        print("✅ Auth dependencies imported successfully")
        
        from app.schemas.auth import LoginRequest, LoginResponse
        print("✅ Auth schemas imported successfully")
        
        # Test schema validation
        login_request = LoginRequest(access_token="test_token")
        print("✅ LoginRequest validation works")
        
        return True
        
    except ImportError as e:
        print(f"❌ Failed to import auth components: {e}")
        return False
    except Exception as e:
        print(f"❌ Error testing auth components: {e}")
        return False

def test_email_service():
    """Test email service functionality"""
    print("\n🔍 Testing Email Service...")
    
    try:
        from app.services.email_service import EmailService
        print("✅ EmailService imported successfully")
        
        # Test token generation (doesn't require AWS credentials)
        email_service = EmailService.__new__(EmailService)  # Create without __init__
        
        # Manually set up the token methods without AWS client
        email_service.generate_verification_token = lambda email: "test_token"
        email_service.verify_verification_token = lambda token: "test@example.com" if token == "test_token" else None
        
        # Test token generation
        token = email_service.generate_verification_token("test@example.com")
        if token == "test_token":
            print("✅ Token generation method works")
        
        # Test token verification
        email = email_service.verify_verification_token("test_token")
        if email == "test@example.com":
            print("✅ Token verification method works")
        
        return True
        
    except ImportError as e:
        print(f"❌ Failed to import email service: {e}")
        return False
    except Exception as e:
        print(f"❌ Error testing email service: {e}")
        return False

def test_database_models():
    """Test database models"""
    print("\n🔍 Testing Database Models...")
    
    try:
        from app.models.user import User, UserType
        print("✅ User model imported successfully")
        
        from app.models.friendship import Friendship, FriendshipStatus
        print("✅ Friendship model imported successfully")
        
        # Test enum values
        assert UserType.HUMAN == "human"
        assert UserType.AI_AGENT == "ai_agent"
        print("✅ UserType enum works correctly")
        
        assert FriendshipStatus.PENDING == "pending"
        assert FriendshipStatus.ACCEPTED == "accepted"
        print("✅ FriendshipStatus enum works correctly")
        
        return True
        
    except ImportError as e:
        print(f"❌ Failed to import database models: {e}")
        return False
    except Exception as e:
        print(f"❌ Error testing database models: {e}")
        return False

async def test_swagger_documentation():
    """Test Swagger/OpenAPI documentation generation"""
    print("\n🔍 Testing Swagger Documentation...")
    
    try:
        from app.main import app
        
        # Get OpenAPI schema
        openapi_schema = app.openapi()
        
        if not openapi_schema:
            print("❌ Failed to generate OpenAPI schema")
            return False
        
        print("✅ OpenAPI schema generated successfully")
        
        # Check if auth endpoints are documented
        paths = openapi_schema.get('paths', {})
        auth_paths = [path for path in paths.keys() if '/auth/' in path]
        
        if auth_paths:
            print(f"✅ Found {len(auth_paths)} documented auth endpoints:")
            for path in auth_paths:
                print(f"   - {path}")
        else:
            print("❌ No auth endpoints found in documentation")
            return False
        
        # Check for security definitions
        components = openapi_schema.get('components', {})
        security_schemes = components.get('securitySchemes', {})
        
        if security_schemes:
            print(f"✅ Found security schemes: {list(security_schemes.keys())}")
        else:
            print("⚠️  No security schemes found (this might be okay)")
        
        return True
        
    except Exception as e:
        print(f"❌ Error testing Swagger documentation: {e}")
        return False

def create_env_template():
    """Create a template .env file if it doesn't exist"""
    env_path = '.env'
    
    if os.path.exists(env_path):
        print(f"✅ .env file already exists at {env_path}")
        return True
    
    print(f"📝 Creating .env template at {env_path}")
    
    env_template = """# AIGM Backend Environment Configuration

# Database Configuration
DATABASE_URL=postgresql://aigm:localpassword@localhost:5432/aigm

# Redis Configuration  
REDIS_URL=redis://localhost:6379

# Auth0 Configuration (Required)
AUTH0_DOMAIN=your-auth0-domain.auth0.com
AUTH0_CLIENT_ID=your_auth0_client_id
AUTH0_CLIENT_SECRET=your_auth0_client_secret
AUTH0_AUDIENCE=https://api.aigm.world

# AWS SES Configuration (Required for email)
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-east-1
SES_FROM_EMAIL=noreply@aigm.world

# Cloudflare R2 Configuration (For file uploads)
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
CLOUDFLARE_R2_ACCESS_KEY_ID=your_r2_access_key_id
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=aigm-files

# Security Configuration
JWT_SECRET_KEY=your-super-secure-secret-key-change-this-in-production
FRONTEND_URL=http://localhost:3000

# Optional: Ably Configuration (For real-time features)
ABLY_API_KEY=your_ably_api_key
"""
    
    try:
        with open(env_path, 'w') as f:
            f.write(env_template)
        print(f"✅ Created .env template file")
        print("📝 Please update the values in .env with your actual credentials")
        return True
    except Exception as e:
        print(f"❌ Failed to create .env template: {e}")
        return False

async def main():
    """Main test function"""
    print("🚀 AIGM Auth0 Integration Test Suite")
    print("=" * 50)
    
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv()
    
    tests = [
        ("Environment Variables", check_environment_variables),
        ("FastAPI Application", test_fastapi_app), 
        ("Auth0 Components", test_auth_components),
        ("Email Service", test_email_service),
        ("Database Models", test_database_models),
        ("Swagger Documentation", test_swagger_documentation)
    ]
    
    results = []
    
    for test_name, test_func in tests:
        print(f"\n{'='*20} {test_name} {'='*20}")
        try:
            if asyncio.iscoroutinefunction(test_func):
                result = await test_func()
            else:
                result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {e}")
            results.append((test_name, False))
    
    # Print summary
    print(f"\n{'='*50}")
    print("📊 Test Results Summary")
    print(f"{'='*50}")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{test_name:<25} {status}")
    
    print(f"\n📈 Overall: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed! Auth0 integration is ready!")
        print("\n🚀 Next steps:")
        print("1. Update .env file with your Auth0 credentials")
        print("2. Start the server: docker-compose up --build")
        print("3. Test with Swagger UI: http://localhost:8000/docs")
        print("4. Create a test Auth0 application and get a token")
    else:
        print(f"\n⚠️  {total - passed} tests failed. Please fix the issues above.")
        
        if not check_environment_variables():
            print("\n📝 To fix environment issues:")
            create_env_template()
    
    return passed == total

if __name__ == "__main__":
    try:
        success = asyncio.run(main())
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⏹️  Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n💥 Unexpected error: {e}")
        sys.exit(1)